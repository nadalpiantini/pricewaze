/**
 * Apify Webhook Endpoint
 *
 * Simple endpoint for receiving data directly from Apify actors/webhooks.
 * Authenticates via SCRAPER_SERVICE_KEY and forwards to ingest pipeline.
 *
 * Usage from Apify:
 * await fetch("https://pricewaze.com/api/webhook/apify", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": "Bearer YOUR_SCRAPER_SERVICE_KEY"
 *   },
 *   body: JSON.stringify({
 *     source: "supercasas",
 *     items: datasetItems
 *   })
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getScraperConfig } from '@/lib/scraper/configs';
import type { ScraperName } from '@/types/scraper';

interface ApifyWebhookPayload {
  source: ScraperName;
  items: unknown[];
  run_id?: string;
  actor_id?: string;
}

// Verify webhook authentication
function verifyWebhookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const serviceKey = process.env.SCRAPER_SERVICE_KEY;

  if (!serviceKey) {
    logger.warn('SCRAPER_SERVICE_KEY not configured');
    return false;
  }

  if (authHeader === `Bearer ${serviceKey}`) {
    return true;
  }

  // Also check X-Apify-Webhook-Secret header
  const apifySecret = request.headers.get('x-apify-webhook-secret');
  if (apifySecret === serviceKey) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    if (!verifyWebhookAuth(request)) {
      logger.warn('Apify webhook auth failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Parse payload
    const payload: ApifyWebhookPayload = await request.json();

    if (!payload.source || !Array.isArray(payload.items)) {
      return NextResponse.json(
        { error: 'Invalid payload: requires source and items array' },
        { status: 400 }
      );
    }

    // Get scraper config for transformer
    let config;
    try {
      config = getScraperConfig(payload.source);
    } catch {
      return NextResponse.json(
        { error: `Unknown source: ${payload.source}` },
        { status: 400 }
      );
    }

    // Transform and ingest items
    const results = {
      total_received: payload.items.length,
      total_processed: 0,
      total_created: 0,
      total_updated: 0,
      total_skipped: 0,
      total_failed: 0,
      errors: [] as { index: number; error: string }[],
      property_ids: [] as string[],
    };

    for (let i = 0; i < payload.items.length; i++) {
      const raw = payload.items[i];

      try {
        // Transform using scraper config transformer
        const normalized = config.transform(raw);

        if (!normalized) {
          results.total_skipped++;
          results.errors.push({
            index: i,
            error: 'Transform returned null (invalid data)',
          });
          continue;
        }

        // Check for existing by source_url (deduplication)
        const sourceUrl = normalized.source_url;
        let existingId: string | null = null;

        if (sourceUrl) {
          const { data: existing } = await supabaseAdmin
            .from('pricewaze_properties')
            .select('id')
            .eq('source_url', sourceUrl)
            .single();

          existingId = existing?.id || null;
        }

        // Prepare property data
        const propertyData = {
          title: normalized.title,
          price: normalized.price,
          currency: normalized.currency || 'USD',
          area: normalized.area,
          address: normalized.address,
          city: normalized.city,
          zone: normalized.zone,
          property_type: normalized.property_type,
          bedrooms: normalized.bedrooms,
          bathrooms: normalized.bathrooms,
          parking_spaces: normalized.parking_spaces,
          description: `${normalized.description || ''}\n\n---\nsource:scraper source_name:${config.name}`,
          source_url: sourceUrl,
          status: 'active' as const,
          updated_at: new Date().toISOString(),
        };

        let propertyId: string;

        if (existingId) {
          // Update existing
          const { error } = await supabaseAdmin
            .from('pricewaze_properties')
            .update(propertyData)
            .eq('id', existingId);

          if (error) throw error;

          propertyId = existingId;
          results.total_updated++;
        } else {
          // Insert new
          const { data, error } = await supabaseAdmin
            .from('pricewaze_properties')
            .insert({
              ...propertyData,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (error) throw error;

          propertyId = data.id;
          results.total_created++;
        }

        results.property_ids.push(propertyId);

        // Handle images
        if (normalized.images && normalized.images.length > 0) {
          // Delete existing media for this property (refresh)
          await supabaseAdmin
            .from('pricewaze_property_media')
            .delete()
            .eq('property_id', propertyId)
            .eq('media_type', 'image');

          // Insert new images
          const mediaInserts = normalized.images.map((url, idx) => ({
            property_id: propertyId,
            media_type: 'image',
            category: idx === 0 ? 'exterior' : 'interior',
            url,
            order_index: idx,
            metadata: { source: config.name },
          }));

          if (mediaInserts.length > 0) {
            await supabaseAdmin
              .from('pricewaze_property_media')
              .insert(mediaInserts);
          }
        }

        results.total_processed++;

      } catch (err) {
        results.total_failed++;
        results.errors.push({
          index: i,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Apify webhook processed', {
      source: payload.source,
      run_id: payload.run_id,
      duration_ms: duration,
      ...results,
    });

    return NextResponse.json({
      ok: true,
      ...results,
      duration_ms: duration,
    });

  } catch (error) {
    logger.error('Apify webhook error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// GET for status check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhook/apify',
    method: 'POST',
    auth: 'Bearer SCRAPER_SERVICE_KEY',
    payload: {
      source: 'supercasas | corotos',
      items: '[array of scraped items]',
      run_id: 'optional apify run id',
    },
  });
}

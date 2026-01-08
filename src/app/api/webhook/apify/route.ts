/**
 * Apify Webhook Endpoint
 *
 * Handles TWO payload formats:
 *
 * 1. AUTOMATIC APIFY WEBHOOK (configured in Apify Console):
 *    Sent when actor run completes. Payload contains eventType, eventData, resource.
 *    We then fetch items from the dataset using Apify API.
 *
 * 2. DIRECT POST FROM ACTOR CODE:
 *    Actor code POSTs items directly. Payload: { source, items }
 *
 * Authentication: Bearer SCRAPER_SERVICE_KEY or X-Apify-Webhook-Secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getScraperConfig } from '@/lib/scraper/configs';
import { getScrapedItems } from '@/lib/scraper/apify-client';
import type { ScraperName } from '@/types/scraper';

// Format 1: Direct POST from actor
interface DirectPayload {
  source: ScraperName;
  items: unknown[];
  run_id?: string;
  actor_id?: string;
}

// Format 2: Automatic Apify webhook
interface ApifyWebhookPayload {
  eventType: string;
  eventData: {
    actorId: string;
    actorRunId: string;
  };
  resource: {
    id: string;
    actId: string;
    status: string;
    statusMessage?: string;
    startedAt: string;
    finishedAt?: string;
    defaultDatasetId?: string;
    usageTotalUsd?: number;
  };
}

// Map actor IDs to scraper names
const ACTOR_TO_SCRAPER: Record<string, ScraperName> = {
  'nadalpiantini/supercasas-scraper': 'supercasas',
  'nadalpiantini~supercasas-scraper': 'supercasas',
  'nadalpiantini/corotos-scraper': 'corotos',
  'nadalpiantini~corotos-scraper': 'corotos',
};

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

// Check if payload is automatic Apify webhook format
function isApifyWebhookPayload(payload: unknown): payload is ApifyWebhookPayload {
  const p = payload as ApifyWebhookPayload;
  return !!(p.eventType && p.eventData?.actorRunId && p.resource?.id);
}

// Check if payload is direct POST format
function isDirectPayload(payload: unknown): payload is DirectPayload {
  const p = payload as DirectPayload;
  return !!(p.source && Array.isArray(p.items));
}

// Get scraper name from actor ID
function getScraperFromActorId(actorId: string): ScraperName | null {
  // Check direct mapping
  if (ACTOR_TO_SCRAPER[actorId]) {
    return ACTOR_TO_SCRAPER[actorId];
  }

  // Check env var mapping
  const supercasasActor = process.env.APIFY_ACTOR_SUPERCASAS;
  const corotosActor = process.env.APIFY_ACTOR_COROTOS;

  if (supercasasActor && actorId.includes(supercasasActor.replace('/', '~'))) {
    return 'supercasas';
  }
  if (corotosActor && actorId.includes(corotosActor.replace('/', '~'))) {
    return 'corotos';
  }

  return null;
}

// Process items through transformer and save to database
async function processItems(
  items: unknown[],
  scraperName: ScraperName,
  runId?: string
): Promise<{
  total_received: number;
  total_processed: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  total_failed: number;
  errors: { index: number; error: string }[];
  property_ids: string[];
}> {
  const config = getScraperConfig(scraperName);

  const results = {
    total_received: items.length,
    total_processed: 0,
    total_created: 0,
    total_updated: 0,
    total_skipped: 0,
    total_failed: 0,
    errors: [] as { index: number; error: string }[],
    property_ids: [] as string[],
  };

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];

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

      if (sourceUrl && supabaseAdmin) {
        const { data: existing } = await supabaseAdmin
          .from('pricewaze_properties')
          .select('id')
          .eq('source_url', sourceUrl)
          .single();

        existingId = existing?.id || null;
      }

      // Build address from available data
      let address = normalized.address || '';
      if (!address && (normalized.city || normalized.zone)) {
        address = [normalized.zone, normalized.city].filter(Boolean).join(', ');
      }
      if (!address) {
        address = `${config.displayName} listing`;
      }

      // Prepare property data with correct DB field names
      // Migrations applied: nullable columns (20260116000002) + source columns (20260116000003)
      const propertyData = {
        title: normalized.title,
        price: normalized.price,
        area_m2: normalized.area || null,
        address,
        // Null for scraped properties (geocoding can be done later)
        latitude: null as number | null,
        longitude: null as number | null,
        property_type: normalized.property_type || 'house',
        bedrooms: normalized.bedrooms || null,
        bathrooms: normalized.bathrooms || null,
        parking_spaces: normalized.parking_spaces || null,
        description: `${normalized.description || ''}\n\n---\n[Scraped from ${config.displayName}]${runId ? `\nRun ID: ${runId}` : ''}`,
        images: normalized.images || [],
        features: normalized.features || [],
        // Source tracking columns
        source_type: 'scraper',
        source_name: config.name,
        source_id: normalized.source_id || null,
        source_url: sourceUrl || null,
        source_updated_at: normalized.source_updated_at || null,
        // owner_id is NULL for scraped properties
        owner_id: null as string | null,
        status: 'active' as const,
        updated_at: new Date().toISOString(),
      };

      let propertyId: string;

      if (existingId && supabaseAdmin) {
        // Update existing
        const { error } = await supabaseAdmin
          .from('pricewaze_properties')
          .update(propertyData)
          .eq('id', existingId);

        if (error) throw error;

        propertyId = existingId;
        results.total_updated++;
      } else if (supabaseAdmin) {
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
      } else {
        throw new Error('Database not available');
      }

      results.property_ids.push(propertyId);

      // Handle images in property_media table
      if (normalized.images && normalized.images.length > 0 && supabaseAdmin) {
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
      // Capture more error details - Supabase errors may not be Error instances
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        errorMessage = String(e.message || e.error || e.details || e.hint || JSON.stringify(err));
      } else if (err) {
        errorMessage = String(err);
      }
      results.errors.push({
        index: i,
        error: errorMessage,
      });
    }
  }

  return results;
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
    const payload = await request.json();

    // FORMAT 1: Automatic Apify webhook
    if (isApifyWebhookPayload(payload)) {
      logger.info('Received Apify automatic webhook', {
        eventType: payload.eventType,
        actorId: payload.eventData.actorId,
        runId: payload.eventData.actorRunId,
        status: payload.resource.status,
      });

      // Only process successful runs
      if (payload.resource.status !== 'SUCCEEDED') {
        logger.warn('Apify run did not succeed', {
          status: payload.resource.status,
          message: payload.resource.statusMessage,
        });
        return NextResponse.json({
          ok: false,
          message: `Run status: ${payload.resource.status}`,
          skipped: true,
        });
      }

      // Determine scraper from actor ID
      const scraperName = getScraperFromActorId(payload.eventData.actorId);
      if (!scraperName) {
        logger.error('Unknown actor ID', { actorId: payload.eventData.actorId });
        return NextResponse.json(
          { error: `Unknown actor: ${payload.eventData.actorId}` },
          { status: 400 }
        );
      }

      // Fetch items from Apify dataset
      let items: unknown[];
      try {
        items = await getScrapedItems(payload.eventData.actorRunId);
      } catch (err) {
        logger.error('Failed to fetch Apify dataset', err);
        return NextResponse.json(
          { error: 'Failed to fetch dataset from Apify' },
          { status: 502 }
        );
      }

      if (!items || items.length === 0) {
        return NextResponse.json({
          ok: true,
          message: 'No items in dataset',
          total_received: 0,
        });
      }

      // Process items
      const results = await processItems(items, scraperName, payload.eventData.actorRunId);
      const duration = Date.now() - startTime;

      logger.info('Apify webhook (automatic) processed', {
        source: scraperName,
        run_id: payload.eventData.actorRunId,
        duration_ms: duration,
        ...results,
      });

      return NextResponse.json({
        ok: true,
        format: 'apify_webhook',
        source: scraperName,
        run_id: payload.eventData.actorRunId,
        ...results,
        duration_ms: duration,
      });
    }

    // FORMAT 2: Direct POST from actor
    if (isDirectPayload(payload)) {
      // Get scraper config for validation
      let config;
      try {
        config = getScraperConfig(payload.source);
      } catch {
        return NextResponse.json(
          { error: `Unknown source: ${payload.source}` },
          { status: 400 }
        );
      }

      // Process items
      const results = await processItems(payload.items, payload.source, payload.run_id);
      const duration = Date.now() - startTime;

      logger.info('Apify webhook (direct) processed', {
        source: payload.source,
        run_id: payload.run_id,
        duration_ms: duration,
        ...results,
      });

      return NextResponse.json({
        ok: true,
        format: 'direct',
        source: config.name,
        ...results,
        duration_ms: duration,
      });
    }

    // Unknown format
    return NextResponse.json(
      {
        error: 'Invalid payload format',
        hint: 'Expected either { source, items } or Apify webhook format',
      },
      { status: 400 }
    );

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
  const supercasasActor = process.env.APIFY_ACTOR_SUPERCASAS || 'not configured';
  const corotosActor = process.env.APIFY_ACTOR_COROTOS || 'not configured';

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhook/apify',
    method: 'POST',
    auth: 'Bearer SCRAPER_SERVICE_KEY or X-Apify-Webhook-Secret header',
    formats: {
      direct: {
        description: 'POST items directly from actor code',
        payload: {
          source: 'supercasas | corotos',
          items: '[array of scraped items]',
          run_id: 'optional',
        },
      },
      automatic: {
        description: 'Automatic webhook from Apify Console',
        note: 'Configure webhook in Apify to trigger on ACTOR.RUN.SUCCEEDED',
      },
    },
    configured_actors: {
      supercasas: supercasasActor,
      corotos: corotosActor,
    },
  });
}

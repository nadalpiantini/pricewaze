import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
  normalizeProperties,
  findDuplicates,
  addSourceTracking,
  validateOutliers,
  calculateTrustScore,
  SOURCE_WEIGHTS,
} from '@/lib/ingest';
import type {
  IngestRequest,
  IngestResult,
  IngestError,
  PropertySource,
} from '@/types/ingest';

// Validation schema
const rawPropertySchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().optional(),
  area: z.number().optional(),
  area_unit: z.enum(['m2', 'sqft', 'varas']).optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
  postal_code: z.string().optional(),
  property_type: z.string().optional(),
  bedrooms: z.union([z.number(), z.string()]).optional(),
  bathrooms: z.union([z.number(), z.string()]).optional(),
  parking_spaces: z.union([z.number(), z.string()]).optional(),
  year_built: z.union([z.number(), z.string()]).optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  source_url: z.string().optional(),
  source_id: z.string().optional(),
  source_updated_at: z.string().optional(),
  raw_data: z.record(z.string(), z.unknown()).optional(),
});

const ingestRequestSchema = z.object({
  source: z.enum(['user', 'scraper', 'opendata', 'api', 'import', 'seed']),
  source_name: z.string().optional(),
  market_code: z.enum(['DO', 'US', 'MX', 'ES', 'CO', 'global']).optional(),
  properties: z.array(rawPropertySchema).min(1).max(100),
  options: z.object({
    skip_duplicates: z.boolean().optional(),
    update_existing: z.boolean().optional(),
    dry_run: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/ingest - Bulk property ingestion
 *
 * Accepts properties from multiple sources, normalizes them,
 * checks for duplicates, validates outliers, and inserts into database.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient(request);

    // Check authentication (required for non-user sources)
    const { data: { user } } = await supabase.auth.getUser();

    // Parse and validate request
    const body = await request.json();
    const validation = ingestRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const req = validation.data as IngestRequest;
    const options = req.options || {};
    const marketCode = req.market_code || 'global';

    // Source validation - some sources require authentication
    if (['scraper', 'opendata', 'api', 'import'].includes(req.source)) {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for this source type' },
          { status: 401 }
        );
      }

      // TODO: Add role-based access control for admin-only sources
    }

    // Results tracking
    const result: IngestResult = {
      success: true,
      total_received: req.properties.length,
      total_processed: 0,
      total_created: 0,
      total_updated: 0,
      total_skipped: 0,
      total_failed: 0,
      errors: [],
      created_ids: [],
      dry_run: options.dry_run || false,
    };

    // Step 1: Normalize all properties
    const { normalized, failed } = normalizeProperties(req.properties, marketCode);

    // Add normalization failures to errors
    for (const f of failed) {
      result.errors.push({
        index: f.index,
        source_id: f.raw.source_id,
        message: f.error,
      });
      result.total_failed++;
    }

    // Step 2: Process each normalized property
    for (const item of normalized) {
      try {
        const { property, warnings } = item;

        // Add warnings to result
        if (warnings.length > 0) {
          logger.warn(`Property ${item.index} warnings`, { warnings });
        }

        // Step 2a: Check for duplicates
        if (options.skip_duplicates !== false) {
          const duplicates = await findDuplicates(supabase, property);

          if (duplicates.length > 0) {
            const bestMatch = duplicates[0];

            if (bestMatch.match_type === 'exact' && bestMatch.confidence >= 80) {
              // Skip exact duplicates
              result.total_skipped++;
              result.errors.push({
                index: item.index,
                source_id: req.properties[item.index].source_id,
                message: `Duplicate detected (${bestMatch.confidence}% confidence)`,
              });
              continue;
            }

            // Log potential duplicates for review
            if (bestMatch.confidence >= 60) {
              logger.info(`Potential duplicate`, {
                index: item.index,
                match: bestMatch,
              });
            }
          }
        }

        // Step 2b: Validate outliers
        const outlierCheck = await validateOutliers(
          supabase,
          property,
          marketCode,
          null // TODO: Get zone_id from coordinates
        );

        // Step 2c: Calculate trust score
        const baseWeight = SOURCE_WEIGHTS[req.source as PropertySource] || 0.5;
        const trustScore = calculateTrustScore(
          baseWeight,
          property,
          outlierCheck,
          property.images.length > 0,
          false, // No documents in basic ingest
          0 // New property
        );

        // Step 2d: Prepare property for insertion
        const sourceTracking = addSourceTracking(
          property.description,
          req.source,
          req.source_name || req.source,
          req.properties[item.index].source_id
        );

        const propertyData = {
          ...property,
          description: sourceTracking,
          owner_id: user?.id || null, // System user for automated sources
          status: outlierCheck.is_outlier ? 'pending' as const : 'active' as const,
        };

        // Step 2e: Insert or skip based on dry_run
        if (options.dry_run) {
          result.total_processed++;
          logger.info(`[DRY RUN] Would create property`, {
            index: item.index,
            title: property.title,
            trust_score: trustScore,
            is_outlier: outlierCheck.is_outlier,
          });
          continue;
        }

        // Insert into database
        const { data, error } = await supabase
          .from('pricewaze_properties')
          .insert(propertyData)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        result.total_created++;
        result.created_ids.push(data.id);
        result.total_processed++;

        // Log outliers for review
        if (outlierCheck.is_outlier) {
          logger.warn(`Outlier property created`, {
            property_id: data.id,
            reasons: outlierCheck.reasons,
            suggestions: outlierCheck.suggestions,
          });
        }

      } catch (err) {
        result.total_failed++;
        result.errors.push({
          index: item.index,
          source_id: req.properties[item.index].source_id,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        logger.error(`Failed to process property ${item.index}`, err);
      }
    }

    // Final result
    result.success = result.total_failed === 0;

    const duration = Date.now() - startTime;
    logger.info(`Ingest completed`, {
      source: req.source,
      duration_ms: duration,
      ...result,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 207, // 207 Multi-Status if partial success
    });

  } catch (error) {
    logger.error('Ingest endpoint error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest - Get ingest status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);

    // Get property counts by source
    const { data, error } = await supabase
      .from('pricewaze_properties')
      .select('description, status')
      .like('description', '%source:%');

    if (error) {
      throw error;
    }

    // Parse source counts from descriptions
    const sourceCounts: Record<string, number> = {
      user: 0,
      scraper: 0,
      opendata: 0,
      api: 0,
      import: 0,
      seed: 0,
      unknown: 0,
    };

    for (const prop of data || []) {
      const match = prop.description?.match(/source:(\w+)/);
      if (match && match[1] in sourceCounts) {
        sourceCounts[match[1]]++;
      } else {
        sourceCounts.unknown++;
      }
    }

    // Get total active properties
    const { count: totalActive } = await supabase
      .from('pricewaze_properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get pending review count
    const { count: pendingReview } = await supabase
      .from('pricewaze_properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      status: 'healthy',
      stats: {
        total_active: totalActive || 0,
        pending_review: pendingReview || 0,
        by_source: sourceCounts,
      },
      adapters: {
        user: { enabled: true, weight: SOURCE_WEIGHTS.user },
        scraper: { enabled: false, weight: SOURCE_WEIGHTS.scraper },
        opendata: { enabled: false, weight: SOURCE_WEIGHTS.opendata },
        api: { enabled: false, weight: SOURCE_WEIGHTS.api },
      },
    });

  } catch (error) {
    logger.error('Ingest status error', error);
    return NextResponse.json(
      { error: 'Failed to get ingest status' },
      { status: 500 }
    );
  }
}

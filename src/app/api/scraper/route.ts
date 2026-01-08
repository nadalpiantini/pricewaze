import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { createScraperService, getEnabledScrapers } from '@/lib/scraper';
import { z } from 'zod';
import type { ScraperName } from '@/types/scraper';

// Validation schemas
const runScraperSchema = z.object({
  scraper: z.enum(['supercasas', 'corotos', 'inmuebles24', 'fotocasa', 'craigslist']),
  params: z.object({
    maxItems: z.number().min(1).max(500).optional(),
    city: z.string().optional(),
    propertyType: z.string().optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    minArea: z.number().positive().optional(),
    maxArea: z.number().positive().optional(),
    bedrooms: z.number().min(0).optional(),
  }).optional(),
  options: z.object({
    dryRun: z.boolean().optional(),
    skipDuplicates: z.boolean().optional(),
    async: z.boolean().optional(), // Run in background
  }).optional(),
});

/**
 * POST /api/scraper - Run a scraper
 *
 * Requires authentication and admin role.
 * Can run synchronously (wait for completion) or async (return immediately).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin role (optional - uncomment in production)
    // const { data: profile } = await supabase
    //   .from('pricewaze_profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();
    //
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }

    // Parse and validate request
    const body = await request.json();
    const validation = runScraperSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { scraper, params, options } = validation.data;

    // Create scraper service
    const service = createScraperService(supabase);

    // Check if async run requested
    if (options?.async) {
      const { historyId, apifyRunId } = await service.startScraper(
        scraper as ScraperName,
        params
      );

      logger.info(`Started async scraper: ${scraper}`, { historyId, apifyRunId });

      return NextResponse.json({
        message: 'Scraper started',
        historyId,
        apifyRunId,
        checkStatusUrl: `/api/scraper/${historyId}`,
      });
    }

    // Synchronous run (wait for completion)
    const result = await service.runAndIngest(
      scraper as ScraperName,
      params,
      {
        dryRun: options?.dryRun,
        skipDuplicates: options?.skipDuplicates,
      }
    );

    logger.info(`Scraper completed: ${scraper}`, {
      itemsScraped: result.itemsScraped,
      itemsIngested: result.itemsIngested,
    });

    return NextResponse.json({
      success: result.status === 'succeeded',
      ...result,
    });

  } catch (error) {
    logger.error('Scraper API error', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not configured') ? 503 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

/**
 * GET /api/scraper - Get scraper system status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const service = createScraperService(supabase);

    // Get system status
    const systemStatus = await service.getSystemStatus();

    // Get stats for all scrapers
    const stats = await service.getStats();

    // Get recent history
    const history = await service.getHistory(10);

    // Get enabled scrapers info
    const enabledScrapers = getEnabledScrapers().map(config => ({
      name: config.name,
      displayName: config.displayName,
      country: config.country,
      marketCode: config.marketCode,
      baseUrl: config.baseUrl,
      configured: systemStatus.scrapers.find(s => s.name === config.name)?.configured || false,
    }));

    return NextResponse.json({
      status: 'ok',
      apify: systemStatus.apify,
      scrapers: enabledScrapers,
      stats,
      recentRuns: history.map(h => ({
        id: h.id,
        scraper: h.scraper,
        status: h.status,
        startedAt: h.started_at,
        finishedAt: h.finished_at,
        itemsScraped: h.items_scraped,
        itemsIngested: h.items_ingested,
      })),
    });

  } catch (error) {
    logger.error('Scraper status API error', error);
    return NextResponse.json(
      { error: 'Failed to get scraper status' },
      { status: 500 }
    );
  }
}

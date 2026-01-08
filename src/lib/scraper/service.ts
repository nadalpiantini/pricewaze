// Scraper Service
// Orchestrates scraping, transformation, and ingestion

import { logger } from '@/lib/logger';
import { getScraperConfig, getEnabledScrapers } from './configs';
import {
  isApifyConfigured,
  isScraperConfigured,
  runScraper,
  startScraper,
  getScraperStatus,
  getScrapedItems,
  abortScraper,
  getApifyUsage,
  validateApifyConnection,
} from './apify-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawPropertyInput } from '@/types/ingest';
import type {
  ScraperName,
  ScraperParams,
  ScraperRunRequest,
  ScraperRunStatus,
  ScraperStats,
  ScraperHistoryRecord,
} from '@/types/scraper';

// ============================================
// SCRAPER SERVICE
// ============================================

export class ScraperService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Run a scraper and wait for completion (blocking)
   */
  async runAndIngest(
    scraperName: ScraperName,
    params: ScraperParams = {},
    options: ScraperRunRequest['options'] = {}
  ): Promise<ScraperRunStatus> {
    const config = getScraperConfig(scraperName);
    const startTime = Date.now();

    // Validate configuration
    if (!isApifyConfigured()) {
      throw new Error('Apify is not configured. Set APIFY_API_TOKEN.');
    }

    if (!isScraperConfigured(scraperName)) {
      throw new Error(`Scraper ${scraperName} is not configured. Set APIFY_ACTOR_${scraperName.toUpperCase()}.`);
    }

    logger.info(`Starting scraper: ${scraperName}`, { params, options });

    // Create history record
    const historyId = await this.createHistoryRecord(scraperName, params);

    try {
      // Run scraper
      const mergedParams = { ...config.defaultParams, ...params };
      const { runId, status } = await runScraper(scraperName, mergedParams);

      // Update history with Apify run ID
      await this.updateHistoryRecord(historyId, {
        apify_run_id: runId,
        status: status,
      });

      // Get status
      const finalStatus = await getScraperStatus(runId);
      finalStatus.scraper = scraperName;

      if (finalStatus.status !== 'succeeded') {
        await this.updateHistoryRecord(historyId, {
          status: finalStatus.status,
          finished_at: new Date().toISOString(),
          items_scraped: finalStatus.itemsScraped,
          error_log: [`Scraper finished with status: ${finalStatus.status}`],
        });
        return finalStatus;
      }

      // Get scraped items
      const rawItems = await getScrapedItems(runId);
      finalStatus.itemsScraped = rawItems.length;

      logger.info(`Scraper ${scraperName} completed`, {
        itemsScraped: rawItems.length,
        duration: Date.now() - startTime,
      });

      // Transform items
      const transformed: RawPropertyInput[] = [];
      const errors: string[] = [];

      for (let i = 0; i < rawItems.length; i++) {
        try {
          const result = config.transform(rawItems[i]);
          if (result) {
            transformed.push(result);
          } else {
            finalStatus.itemsSkipped++;
          }
        } catch (err) {
          errors.push(`Item ${i}: ${err instanceof Error ? err.message : 'Transform error'}`);
          finalStatus.itemsFailed++;
        }
      }

      logger.info(`Transformed ${transformed.length} items from ${scraperName}`);

      // Ingest if not dry run
      if (!options.dryRun && transformed.length > 0) {
        const ingestResult = await this.ingestProperties(
          transformed,
          scraperName,
          config.marketCode,
          options.skipDuplicates !== false
        );

        finalStatus.itemsIngested = ingestResult.created;
        finalStatus.itemsSkipped += ingestResult.skipped;
        finalStatus.itemsFailed += ingestResult.failed;
        finalStatus.errors = [...errors, ...ingestResult.errors];
      } else {
        finalStatus.errors = errors;
      }

      // Update history record
      await this.updateHistoryRecord(historyId, {
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        items_scraped: finalStatus.itemsScraped,
        items_ingested: finalStatus.itemsIngested,
        items_skipped: finalStatus.itemsSkipped,
        items_failed: finalStatus.itemsFailed,
        error_log: finalStatus.errors,
        cost: finalStatus.cost,
      });

      return finalStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.updateHistoryRecord(historyId, {
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_log: [errorMessage],
      });

      throw error;
    }
  }

  /**
   * Start a scraper (non-blocking)
   */
  async startScraper(
    scraperName: ScraperName,
    params: ScraperParams = {}
  ): Promise<{ historyId: string; apifyRunId: string }> {
    const config = getScraperConfig(scraperName);

    if (!isApifyConfigured() || !isScraperConfigured(scraperName)) {
      throw new Error(`Scraper ${scraperName} is not properly configured.`);
    }

    const mergedParams = { ...config.defaultParams, ...params };
    const apifyRunId = await startScraper(scraperName, mergedParams);

    const historyId = await this.createHistoryRecord(scraperName, mergedParams);
    await this.updateHistoryRecord(historyId, {
      apify_run_id: apifyRunId,
      status: 'running',
    });

    return { historyId, apifyRunId };
  }

  /**
   * Check status of a running scraper
   */
  async checkStatus(historyId: string): Promise<ScraperRunStatus | null> {
    const { data, error } = await this.supabase
      .from('pricewaze_scraper_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (error || !data) return null;

    const record = data as ScraperHistoryRecord;

    // If running, check Apify status
    if (record.status === 'running' && record.apify_run_id) {
      try {
        const apifyStatus = await getScraperStatus(record.apify_run_id);

        // If completed, process results
        if (apifyStatus.status === 'succeeded') {
          await this.processCompletedRun(record);
        } else if (apifyStatus.status === 'failed' || apifyStatus.status === 'aborted') {
          await this.updateHistoryRecord(historyId, {
            status: apifyStatus.status,
            finished_at: new Date().toISOString(),
          });
        }

        return {
          ...apifyStatus,
          id: historyId,
          scraper: record.scraper as ScraperName,
        };
      } catch (err) {
        logger.error(`Failed to check Apify status for ${historyId}`, err);
      }
    }

    return {
      id: record.id,
      scraper: record.scraper as ScraperName,
      status: record.status as ScraperRunStatus['status'],
      startedAt: record.started_at,
      finishedAt: record.finished_at,
      itemsScraped: record.items_scraped,
      itemsIngested: record.items_ingested,
      itemsSkipped: record.items_skipped,
      itemsFailed: record.items_failed,
      errors: record.error_log || [],
      apifyRunId: record.apify_run_id,
      cost: record.cost,
    };
  }

  /**
   * Process a completed Apify run
   */
  private async processCompletedRun(record: ScraperHistoryRecord): Promise<void> {
    if (!record.apify_run_id) return;

    const config = getScraperConfig(record.scraper as ScraperName);

    try {
      const rawItems = await getScrapedItems(record.apify_run_id);
      const transformed: RawPropertyInput[] = [];
      const errors: string[] = [];
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < rawItems.length; i++) {
        try {
          const result = config.transform(rawItems[i]);
          if (result) {
            transformed.push(result);
          } else {
            skipped++;
          }
        } catch (err) {
          errors.push(`Item ${i}: ${err instanceof Error ? err.message : 'Transform error'}`);
          failed++;
        }
      }

      // Ingest
      const ingestResult = await this.ingestProperties(
        transformed,
        record.scraper as ScraperName,
        config.marketCode,
        true
      );

      await this.updateHistoryRecord(record.id, {
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        items_scraped: rawItems.length,
        items_ingested: ingestResult.created,
        items_skipped: skipped + ingestResult.skipped,
        items_failed: failed + ingestResult.failed,
        error_log: [...errors, ...ingestResult.errors],
      });

    } catch (error) {
      await this.updateHistoryRecord(record.id, {
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_log: [error instanceof Error ? error.message : 'Processing failed'],
      });
    }
  }

  /**
   * Abort a running scraper
   */
  async abort(historyId: string): Promise<void> {
    const { data } = await this.supabase
      .from('pricewaze_scraper_history')
      .select('apify_run_id')
      .eq('id', historyId)
      .single();

    if (data?.apify_run_id) {
      await abortScraper(data.apify_run_id);
    }

    await this.updateHistoryRecord(historyId, {
      status: 'aborted',
      finished_at: new Date().toISOString(),
    });
  }

  /**
   * Get scraper statistics
   */
  async getStats(scraperName?: ScraperName): Promise<ScraperStats[]> {
    let query = this.supabase
      .from('pricewaze_scraper_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (scraperName) {
      query = query.eq('scraper', scraperName);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Group by scraper
    const grouped = new Map<string, ScraperHistoryRecord[]>();
    for (const record of data as ScraperHistoryRecord[]) {
      const existing = grouped.get(record.scraper) || [];
      existing.push(record);
      grouped.set(record.scraper, existing);
    }

    // Calculate stats
    const stats: ScraperStats[] = [];
    for (const [name, records] of grouped) {
      const succeeded = records.filter(r => r.status === 'succeeded');
      const totalScraped = records.reduce((sum, r) => sum + r.items_scraped, 0);
      const totalIngested = records.reduce((sum, r) => sum + r.items_ingested, 0);

      stats.push({
        scraper: name as ScraperName,
        totalRuns: records.length,
        lastRun: records[0]?.started_at,
        lastStatus: records[0]?.status as ScraperRunStatus['status'],
        totalItemsScraped: totalScraped,
        totalItemsIngested: totalIngested,
        successRate: records.length > 0 ? succeeded.length / records.length : 0,
        avgItemsPerRun: records.length > 0 ? totalScraped / records.length : 0,
      });
    }

    return stats;
  }

  /**
   * Get recent history
   */
  async getHistory(limit: number = 20, scraperName?: ScraperName): Promise<ScraperHistoryRecord[]> {
    let query = this.supabase
      .from('pricewaze_scraper_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scraperName) {
      query = query.eq('scraper', scraperName);
    }

    const { data, error } = await query;
    return error ? [] : (data as ScraperHistoryRecord[]);
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    apify: {
      connected: boolean;
      user?: string;
      plan?: string;
      usage?: {
        usedUsd: number;
        limitUsd: number;
        remainingUsd: number;
      };
      error?: string;
    };
    scrapers: Array<{
      name: ScraperName;
      displayName: string;
      configured: boolean;
      enabled: boolean;
      marketCode: string;
    }>;
  }> {
    const apifyConnection = await validateApifyConnection();

    let usage;
    if (apifyConnection.connected) {
      try {
        usage = await getApifyUsage();
      } catch {
        // Ignore usage errors
      }
    }

    const enabledScrapers = getEnabledScrapers();
    const scrapers = enabledScrapers.map(config => ({
      name: config.name,
      displayName: config.displayName,
      configured: isScraperConfigured(config.name),
      enabled: config.enabled,
      marketCode: config.marketCode,
    }));

    return {
      apify: {
        connected: apifyConnection.connected,
        user: apifyConnection.user,
        plan: apifyConnection.plan,
        usage,
        error: apifyConnection.error,
      },
      scrapers,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Ingest properties into database
   */
  private async ingestProperties(
    properties: RawPropertyInput[],
    scraperName: ScraperName,
    marketCode: string,
    skipDuplicates: boolean
  ): Promise<{
    created: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    // Use the existing ingest endpoint internally
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ingest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use service role for internal calls
          'x-service-key': process.env.SCRAPER_SERVICE_KEY || '',
        },
        body: JSON.stringify({
          source: 'scraper',
          source_name: scraperName,
          market_code: marketCode,
          properties,
          options: {
            skip_duplicates: skipDuplicates,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Ingest API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      created: result.total_created || 0,
      skipped: result.total_skipped || 0,
      failed: result.total_failed || 0,
      errors: result.errors?.map((e: { message: string }) => e.message) || [],
    };
  }

  /**
   * Create history record
   */
  private async createHistoryRecord(
    scraperName: ScraperName,
    params: ScraperParams
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('pricewaze_scraper_history')
      .insert({
        scraper: scraperName,
        status: 'pending',
        started_at: new Date().toISOString(),
        items_scraped: 0,
        items_ingested: 0,
        items_skipped: 0,
        items_failed: 0,
        params,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create history record: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update history record
   */
  private async updateHistoryRecord(
    id: string,
    updates: Partial<ScraperHistoryRecord>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('pricewaze_scraper_history')
      .update(updates)
      .eq('id', id);

    if (error) {
      logger.error(`Failed to update history record ${id}`, error);
    }
  }
}

/**
 * Create scraper service instance
 */
export function createScraperService(supabase: SupabaseClient): ScraperService {
  return new ScraperService(supabase);
}

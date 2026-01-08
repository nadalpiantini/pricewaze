// Apify Client Wrapper
// Handles communication with Apify platform

import { ApifyClient } from 'apify-client';
import { logger } from '@/lib/logger';
import type { ScraperName, ScraperParams, ScraperRunStatus } from '@/types/scraper';

// Initialize Apify client
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Actor IDs for each scraper (can be custom or from Apify Store)
// These will be created/configured in Apify console
const ACTOR_IDS: Record<ScraperName, string | null> = {
  supercasas: process.env.APIFY_ACTOR_SUPERCASAS || null,
  corotos: process.env.APIFY_ACTOR_COROTOS || null,
  inmuebles24: process.env.APIFY_ACTOR_INMUEBLES24 || null,
  fotocasa: process.env.APIFY_ACTOR_FOTOCASA || null,
  craigslist: process.env.APIFY_ACTOR_CRAIGSLIST || null,
};

// Default run options
const DEFAULT_RUN_OPTIONS = {
  memory: 512,           // MB
  timeout: 600,          // seconds (10 minutes)
  maxItems: 100,
};

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN;
}

/**
 * Check if a specific scraper actor is configured
 */
export function isScraperConfigured(scraper: ScraperName): boolean {
  return !!ACTOR_IDS[scraper];
}

/**
 * Get available scrapers
 */
export function getAvailableScrapers(): ScraperName[] {
  return (Object.entries(ACTOR_IDS) as [ScraperName, string | null][])
    .filter(([_, actorId]) => actorId !== null)
    .map(([name]) => name);
}

/**
 * Run a scraper actor
 */
export async function runScraper(
  scraper: ScraperName,
  params: ScraperParams = {}
): Promise<{
  runId: string;
  status: ScraperRunStatus['status'];
}> {
  const actorId = ACTOR_IDS[scraper];

  if (!actorId) {
    throw new Error(`Scraper ${scraper} is not configured. Set APIFY_ACTOR_${scraper.toUpperCase()} environment variable.`);
  }

  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured. Set APIFY_API_TOKEN environment variable.');
  }

  logger.info(`Starting scraper: ${scraper}`, { params });

  try {
    const run = await client.actor(actorId).call(
      {
        ...params,
        maxItems: params.maxItems || DEFAULT_RUN_OPTIONS.maxItems,
      },
      {
        memory: DEFAULT_RUN_OPTIONS.memory,
        timeout: DEFAULT_RUN_OPTIONS.timeout,
      }
    );

    logger.info(`Scraper ${scraper} started`, { runId: run.id, status: run.status });

    return {
      runId: run.id,
      status: mapApifyStatus(run.status),
    };
  } catch (error) {
    logger.error(`Failed to start scraper ${scraper}`, error);
    throw error;
  }
}

/**
 * Start a scraper actor (non-blocking)
 */
export async function startScraper(
  scraper: ScraperName,
  params: ScraperParams = {}
): Promise<string> {
  const actorId = ACTOR_IDS[scraper];

  if (!actorId) {
    throw new Error(`Scraper ${scraper} is not configured.`);
  }

  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured.');
  }

  logger.info(`Starting scraper (async): ${scraper}`, { params });

  const run = await client.actor(actorId).start(
    {
      ...params,
      maxItems: params.maxItems || DEFAULT_RUN_OPTIONS.maxItems,
    },
    {
      memory: DEFAULT_RUN_OPTIONS.memory,
      timeout: DEFAULT_RUN_OPTIONS.timeout,
    }
  );

  logger.info(`Scraper ${scraper} started (async)`, { runId: run.id });

  return run.id;
}

/**
 * Get scraper run status
 */
export async function getScraperStatus(runId: string): Promise<ScraperRunStatus> {
  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured.');
  }

  const run = await client.run(runId).get();

  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  return {
    id: run.id,
    scraper: 'supercasas', // Will be overwritten by caller
    status: mapApifyStatus(run.status),
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    itemsScraped: run.stats?.itemsScraped || 0,
    itemsIngested: 0, // Will be updated after ingestion
    itemsSkipped: 0,
    itemsFailed: 0,
    errors: [],
    apifyRunId: run.id,
    cost: run.stats?.computeUnits,
  };
}

/**
 * Get scraped items from a run
 */
export async function getScrapedItems<T = unknown>(runId: string): Promise<T[]> {
  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured.');
  }

  const dataset = await client.run(runId).dataset();
  const { items } = await dataset.listItems();

  return items as T[];
}

/**
 * Abort a running scraper
 */
export async function abortScraper(runId: string): Promise<void> {
  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured.');
  }

  await client.run(runId).abort();
  logger.info(`Scraper run ${runId} aborted`);
}

/**
 * Get account usage stats
 */
export async function getApifyUsage(): Promise<{
  plan: string;
  usedUsd: number;
  limitUsd: number;
  remainingUsd: number;
}> {
  if (!isApifyConfigured()) {
    throw new Error('Apify is not configured.');
  }

  const user = await client.user().get();

  return {
    plan: user?.plan?.id || 'free',
    usedUsd: user?.plan?.usageUsd || 0,
    limitUsd: user?.plan?.limitUsd || 5, // Free tier is $5/month
    remainingUsd: (user?.plan?.limitUsd || 5) - (user?.plan?.usageUsd || 0),
  };
}

/**
 * Map Apify status to our status
 */
function mapApifyStatus(status: string): ScraperRunStatus['status'] {
  switch (status) {
    case 'READY':
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
      return 'running';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
    case 'TIMED-OUT':
      return 'failed';
    case 'ABORTED':
      return 'aborted';
    default:
      return 'pending';
  }
}

/**
 * Validate Apify connection
 */
export async function validateApifyConnection(): Promise<{
  connected: boolean;
  user?: string;
  plan?: string;
  error?: string;
}> {
  if (!isApifyConfigured()) {
    return {
      connected: false,
      error: 'APIFY_API_TOKEN not configured',
    };
  }

  try {
    const user = await client.user().get();
    return {
      connected: true,
      user: user?.username,
      plan: user?.plan?.id,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

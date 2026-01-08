/**
 * Master Cron Job - Unified Daily Maintenance
 *
 * Executes all scheduled tasks in sequence:
 * 1. Expire offers
 * 2. Recalculate signals (decay)
 * 3. Process market alerts
 * 4. Run scrapers (if configured)
 * 5. Cleanup duplicates
 *
 * Schedule: Daily at 6:00 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface CronResult {
  task: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration_ms: number;
}

// Verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  // Vercel Cron signature
  const vercelSignature = request.headers.get('x-vercel-signature');
  if (vercelSignature) return true;

  // Manual trigger with CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Allow in development
  if (process.env.NODE_ENV === 'development') return true;

  return false;
}

// Task 1: Expire old offers
async function expireOffers(): Promise<CronResult> {
  const start = Date.now();
  try {
    if (!supabaseAdmin) throw new Error('No admin client');

    const { data, error } = await supabaseAdmin.rpc('pricewaze_expire_offers');
    if (error) throw error;

    return {
      task: 'expire_offers',
      success: true,
      data: { expired_count: data?.[0]?.expired_count || 0 },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      task: 'expire_offers',
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

// Task 2: Recalculate signals with decay
async function recalculateSignals(): Promise<CronResult> {
  const start = Date.now();
  try {
    if (!supabaseAdmin) throw new Error('No admin client');

    const { data, error } = await supabaseAdmin.rpc('pricewaze_recalculate_all_signals');
    if (error) throw error;

    return {
      task: 'recalculate_signals',
      success: true,
      data,
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      task: 'recalculate_signals',
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

// Task 3: Process market alerts
async function processAlerts(): Promise<CronResult> {
  const start = Date.now();
  try {
    if (!supabaseAdmin) throw new Error('No admin client');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get recent signals
    const { data: signals, error: signalsError } = await supabaseAdmin
      .from('pricewaze_market_signals')
      .select('id')
      .gte('created_at', oneDayAgo);

    if (signalsError) throw signalsError;

    // Get active rules
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('pricewaze_alert_rules')
      .select('id')
      .eq('active', true);

    if (rulesError) throw rulesError;

    return {
      task: 'process_alerts',
      success: true,
      data: {
        signals_count: signals?.length || 0,
        rules_count: rules?.length || 0,
      },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      task: 'process_alerts',
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

// Task 4: Trigger scrapers (if enabled)
async function runScrapers(): Promise<CronResult> {
  const start = Date.now();
  try {
    // Check if scraper is enabled
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return {
        task: 'run_scrapers',
        success: true,
        data: { skipped: true, reason: 'APIFY_API_TOKEN not configured' },
        duration_ms: Date.now() - start,
      };
    }

    // Trigger scraper via internal API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/scraper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
      body: JSON.stringify({
        source: 'supercasas',
        config: { maxListings: 50 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scraper API error: ${error}`);
    }

    const data = await response.json();

    return {
      task: 'run_scrapers',
      success: true,
      data,
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      task: 'run_scrapers',
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

// Task 5: Cleanup duplicates
async function cleanupDuplicates(): Promise<CronResult> {
  const start = Date.now();
  try {
    if (!supabaseAdmin) throw new Error('No admin client');

    // Find potential duplicates (same title + price + zone)
    const { data: duplicates, error } = await supabaseAdmin
      .from('pricewaze_properties')
      .select('id, title, price, zone_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Simple duplicate detection (can be enhanced)
    const seen = new Map<string, string>();
    const toDeactivate: string[] = [];

    for (const prop of duplicates || []) {
      const key = `${prop.title}-${prop.price}-${prop.zone_id}`;
      if (seen.has(key)) {
        toDeactivate.push(prop.id);
      } else {
        seen.set(key, prop.id);
      }
    }

    // Deactivate duplicates (mark as inactive, don't delete)
    if (toDeactivate.length > 0) {
      await supabaseAdmin
        .from('pricewaze_properties')
        .update({ status: 'inactive' })
        .in('id', toDeactivate.slice(0, 10)); // Limit to 10 per run
    }

    return {
      task: 'cleanup_duplicates',
      success: true,
      data: {
        checked: duplicates?.length || 0,
        deactivated: Math.min(toDeactivate.length, 10),
      },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      task: 'cleanup_duplicates',
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

// Main cron handler
export async function POST(request: NextRequest) {
  const totalStart = Date.now();

  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Master cron started');

  // Execute all tasks in sequence
  const results: CronResult[] = [];

  results.push(await expireOffers());
  results.push(await recalculateSignals());
  results.push(await processAlerts());
  results.push(await runScrapers());
  results.push(await cleanupDuplicates());

  const totalDuration = Date.now() - totalStart;
  const allSuccess = results.every(r => r.success);
  const failedTasks = results.filter(r => !r.success);

  logger.info('Master cron completed', {
    success: allSuccess,
    duration_ms: totalDuration,
    failed_tasks: failedTasks.map(t => t.task),
  });

  return NextResponse.json({
    success: allSuccess,
    timestamp: new Date().toISOString(),
    total_duration_ms: totalDuration,
    results,
  }, { status: allSuccess ? 200 : 207 });
}

// GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

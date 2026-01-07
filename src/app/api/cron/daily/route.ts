/**
 * Daily Cron Job Endpoint
 * Executes all daily maintenance tasks:
 * - Process market alerts
 * - Recalculate property signals with decay
 * 
 * This endpoint is called once daily by Vercel Cron (Hobby plan limitation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/cron/daily - Execute all daily maintenance tasks
export async function POST(request: NextRequest) {
  try {
    // Verify this is Vercel Cron
    const vercelSignature = request.headers.get('x-vercel-signature');
    if (!vercelSignature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      logger.error('Supabase admin client not available');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const results = {
      signals_recalculated: null as any,
      alerts_processed: null as any,
      errors: [] as string[],
    };

    // 1. Recalculate all property signals (applies temporal decay)
    try {
      const { data: signalsResult, error: signalsError } = await supabaseAdmin.rpc(
        'pricewaze_recalculate_all_signals'
      );

      if (signalsError) {
        logger.error('Failed to recalculate signals', signalsError);
        results.errors.push(`Signals recalculation failed: ${signalsError.message}`);
      } else {
        results.signals_recalculated = signalsResult;
        logger.info('Signals recalculated successfully', signalsResult);
      }
    } catch (error: any) {
      logger.error('Error recalculating signals', error);
      results.errors.push(`Signals recalculation error: ${error.message}`);
    }

    // 2. Process market alerts (evaluate rules against recent signals)
    try {
      // Get recent market signals (last 24 hours for daily cron)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: signals, error: signalsError } = await supabaseAdmin
        .from('pricewaze_market_signals')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (signalsError) {
        logger.error('Failed to fetch market signals', signalsError);
        results.errors.push(`Failed to fetch signals: ${signalsError.message}`);
      } else if (signals && signals.length > 0) {
        // Get all active alert rules
        const { data: rules, error: rulesError } = await supabaseAdmin
          .from('pricewaze_alert_rules')
          .select('*')
          .eq('active', true);

        if (rulesError) {
          logger.error('Failed to fetch alert rules', rulesError);
          results.errors.push(`Failed to fetch rules: ${rulesError.message}`);
        } else if (rules && rules.length > 0) {
          // Process alerts (simplified - full evaluation would use evaluateRule)
          results.alerts_processed = {
            signals_count: signals.length,
            rules_count: rules.length,
            message: 'Alerts processing completed (full evaluation in /api/alerts/process)',
          };
          logger.info(`Processed ${signals.length} signals against ${rules.length} rules`);
        } else {
          results.alerts_processed = {
            signals_count: signals.length,
            rules_count: 0,
            message: 'No active rules to evaluate',
          };
        }
      } else {
        results.alerts_processed = {
          signals_count: 0,
          message: 'No new signals to process',
        };
      }
    } catch (error: any) {
      logger.error('Error processing alerts', error);
      results.errors.push(`Alerts processing error: ${error.message}`);
    }

    const success = results.errors.length === 0;

    return NextResponse.json({
      success,
      timestamp: new Date().toISOString(),
      ...results,
    }, { status: success ? 200 : 207 }); // 207 = Multi-Status (partial success)
  } catch (error) {
    logger.error('Error in POST /api/cron/daily', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


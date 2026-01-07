/**
 * Process Market Signals and Trigger Alert Rules
 * This endpoint evaluates all active alert rules against recent market signals
 * Should be called by a cron job (e.g., every 15 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, supabaseAdmin } from '@/lib/supabase/server';
import { evaluateRule } from '@/lib/alerts/evaluateRule';
import { logger } from '@/lib/logger';
import type { MarketSignal, AlertRule } from '@/types/database';

// POST /api/alerts/process - Process signals and trigger alerts
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal/system call
    // Allow Vercel Cron (has x-vercel-signature header) or token auth
    const authHeader = request.headers.get('authorization');
    const vercelSignature = request.headers.get('x-vercel-signature');
    const expectedToken = process.env.INTERNAL_API_TOKEN;

    // Vercel Cron sends x-vercel-signature header, or use token
    const isVercelCron = !!vercelSignature;
    const hasValidToken = expectedToken && authHeader === `Bearer ${expectedToken}`;

    if (!isVercelCron && !hasValidToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      logger.error('Supabase admin client not available');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get recent market signals (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: signals, error: signalsError } = await supabaseAdmin
      .from('pricewaze_market_signals')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (signalsError) {
      logger.error('Failed to fetch market signals', signalsError);
      return NextResponse.json(
        { error: 'Failed to fetch signals' },
        { status: 500 }
      );
    }

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        processed: 0,
        alerts_created: 0,
        message: 'No new signals to process',
      });
    }

    // Get all active alert rules
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('pricewaze_alert_rules')
      .select('*')
      .eq('active', true);

    if (rulesError) {
      logger.error('Failed to fetch alert rules', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch rules' },
        { status: 500 }
      );
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        processed: signals.length,
        alerts_created: 0,
        message: 'No active rules to evaluate',
      });
    }

    // Evaluate rules against signals
    let alertsCreated = 0;
    const alertEvents: Array<{
      user_id: string;
      rule_id: string;
      signal_id: string;
      message: string;
      severity: string;
    }> = [];
    
    // Track processed combinations to avoid duplicates
    const processedCombinations = new Set<string>();

    for (const signal of signals as MarketSignal[]) {
      for (const rule of rules as AlertRule[]) {
        // Skip if rule is zone-specific and doesn't match
        if (rule.zone_id && rule.zone_id !== signal.zone_id) {
          continue;
        }

        // Skip if rule is property-specific and doesn't match
        if (rule.property_id && rule.property_id !== signal.property_id) {
          continue;
        }

        // Check if we've already processed this rule+signal combination
        const combinationKey = `${rule.id}:${signal.id}`;
        if (processedCombinations.has(combinationKey)) {
          continue;
        }

        // Evaluate rule against signal payload
        const result = evaluateRule(rule.rule, signal.payload);

        if (result.matches) {
          // Generate alert message
          const message = generateAlertMessage(rule.name, signal);

          alertEvents.push({
            user_id: rule.user_id,
            rule_id: rule.id,
            signal_id: signal.id,
            message,
            severity: signal.severity || 'info',
          });

          processedCombinations.add(combinationKey);
          alertsCreated++;
        }
      }
    }

    // Bulk insert alert events (with conflict handling to avoid duplicates)
    if (alertEvents.length > 0) {
      // Check for existing alerts to avoid duplicates
      const existingAlerts = await supabaseAdmin
        .from('pricewaze_alert_events')
        .select('rule_id, signal_id')
        .in('rule_id', alertEvents.map(e => e.rule_id))
        .in('signal_id', alertEvents.map(e => e.signal_id));

      const existingKeys = new Set<string>();
      if (existingAlerts.data) {
        existingAlerts.data.forEach((alert: { rule_id: string; signal_id: string }) => {
          existingKeys.add(`${alert.rule_id}:${alert.signal_id}`);
        });
      }

      // Filter out duplicates
      const newAlertEvents = alertEvents.filter(
        (event) => !existingKeys.has(`${event.rule_id}:${event.signal_id}`)
      );

      if (newAlertEvents.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('pricewaze_alert_events')
          .insert(newAlertEvents);

        if (insertError) {
          logger.error('Failed to create alert events', insertError);
          return NextResponse.json(
            { error: 'Failed to create alerts' },
            { status: 500 }
          );
        }
        
        alertsCreated = newAlertEvents.length;
      } else {
        alertsCreated = 0;
      }
    }

    logger.info(`Processed ${signals.length} signals, created ${alertsCreated} alerts`);

    return NextResponse.json({
      processed: signals.length,
      alerts_created: alertsCreated,
      rules_evaluated: rules.length,
    });
  } catch (error) {
    logger.error('Error in POST /api/alerts/process', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate human-readable alert message
 */
function generateAlertMessage(ruleName: string, signal: MarketSignal): string {
  const signalType = signal.signal_type;
  const payload = signal.payload || {};

  switch (signalType) {
    case 'price_drop':
      return `💰 Price dropped ${payload.price_drop_pct || '?'}% in ${ruleName}`;
    case 'price_increase':
      return `📈 Price increased ${payload.price_increase_pct || '?'}% in ${ruleName}`;
    case 'inventory_spike':
      return `📦 Inventory increased ${payload.inventory_change || '?'}% in ${ruleName}`;
    case 'inventory_drop':
      return `📉 Inventory decreased ${payload.inventory_change || '?'}% in ${ruleName}`;
    case 'trend_change':
      return `⚠️ Market trend changed in ${ruleName}`;
    case 'new_listing':
      return `🆕 New listing in ${ruleName}`;
    case 'status_change':
      return `🔄 Status changed in ${ruleName}`;
    default:
      return `🚨 Alert: ${ruleName}`;
  }
}


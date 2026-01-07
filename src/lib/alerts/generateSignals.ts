/**
 * Market Signal Generator
 * Generates market signals from property/zone changes
 * Should be called by triggers or cron jobs
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface SignalPayload {
  price_drop_pct?: number;
  price_increase_pct?: number;
  inventory_change?: number;
  trend_score?: number;
  days?: number;
  zone_price_change_pct?: number;
  [key: string]: unknown;
}

/**
 * Generate a price drop signal
 */
export async function generatePriceDropSignal(
  propertyId: string,
  zoneId: string | null,
  oldPrice: number,
  newPrice: number
) {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return;
  }

  const priceDropPct = ((oldPrice - newPrice) / oldPrice) * 100;
  const days = 0; // Could calculate from property created_at

  if (priceDropPct > 0) {
    const payload: SignalPayload = {
      price_drop_pct: Math.round(priceDropPct * 100) / 100,
      days,
      old_price: oldPrice,
      new_price: newPrice,
    };

    const { error } = await supabaseAdmin.from('pricewaze_market_signals').insert({
      property_id: propertyId,
      zone_id: zoneId,
      signal_type: 'price_drop',
      severity: priceDropPct > 10 ? 'critical' : priceDropPct > 5 ? 'warning' : 'info',
      payload,
    });

    if (error) {
      logger.error('Failed to generate price drop signal', error);
    } else {
      logger.info(`Generated price drop signal: ${priceDropPct.toFixed(2)}% for property ${propertyId}`);
    }
  }
}

/**
 * Generate an inventory spike signal for a zone
 */
export async function generateInventorySpikeSignal(
  zoneId: string,
  previousCount: number,
  currentCount: number
) {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return;
  }

  const inventoryChange = ((currentCount - previousCount) / previousCount) * 100;

  if (inventoryChange > 0) {
    const payload: SignalPayload = {
      inventory_change: Math.round(inventoryChange * 100) / 100,
      previous_count: previousCount,
      current_count: currentCount,
    };

    const { error } = await supabaseAdmin.from('pricewaze_market_signals').insert({
      zone_id: zoneId,
      signal_type: 'inventory_spike',
      severity: inventoryChange > 20 ? 'warning' : 'info',
      payload,
    });

    if (error) {
      logger.error('Failed to generate inventory spike signal', error);
    } else {
      logger.info(`Generated inventory spike signal: ${inventoryChange.toFixed(2)}% for zone ${zoneId}`);
    }
  }
}

/**
 * Generate a price increase signal
 */
export async function generatePriceIncreaseSignal(
  propertyId: string,
  zoneId: string | null,
  oldPrice: number,
  newPrice: number
) {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return;
  }

  const priceIncreasePct = ((newPrice - oldPrice) / oldPrice) * 100;
  const days = 0; // Could calculate from property created_at

  if (priceIncreasePct > 0) {
    const payload: SignalPayload = {
      price_increase_pct: Math.round(priceIncreasePct * 100) / 100,
      days,
      old_price: oldPrice,
      new_price: newPrice,
    };

    const { error } = await supabaseAdmin.from('pricewaze_market_signals').insert({
      property_id: propertyId,
      zone_id: zoneId,
      signal_type: 'price_increase',
      severity: priceIncreasePct > 10 ? 'warning' : 'info',
      payload,
    });

    if (error) {
      logger.error('Failed to generate price increase signal', error);
    } else {
      logger.info(`Generated price increase signal: ${priceIncreasePct.toFixed(2)}% for property ${propertyId}`);
    }
  }
}

/**
 * Generate a new listing signal
 */
export async function generateNewListingSignal(propertyId: string, zoneId: string | null) {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return;
  }

  const payload: SignalPayload = {
    property_id: propertyId,
  };

  const { error } = await supabaseAdmin.from('pricewaze_market_signals').insert({
    property_id: propertyId,
    zone_id: zoneId,
    signal_type: 'new_listing',
    severity: 'info',
    payload,
  });

  if (error) {
    logger.error('Failed to generate new listing signal', error);
  }
}


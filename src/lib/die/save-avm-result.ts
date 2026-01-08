/**
 * Save AVM Result
 * 
 * Saves DIE uncertainty results to pricewaze_avm_results table
 * for future use by fairness functions and other components.
 */

import { createClient } from '@/lib/supabase/server';
import type { PriceAssessment } from '@/types/die';

interface SaveAVMResultOptions {
  propertyId: string;
  priceAssessment: PriceAssessment;
  comparableCount?: number;
  expiresInDays?: number; // Default: 7 days
  propertyData?: {
    price?: number;
    area_m2?: number;
    zone_avg_price_m2?: number;
    days_on_market?: number;
  };
}

/**
 * Save price assessment results to AVM results table
 */
export async function saveAVMResult(
  options: SaveAVMResultOptions
): Promise<void> {
  const { propertyId, priceAssessment, comparableCount = 0, expiresInDays = 7, propertyData } = options;

  const supabase = await createClient();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Calculate confidence from uncertainty level
  const confidenceMap = {
    low: 0.90,
    medium: 0.75,
    high: 0.60,
  };
  const confidence = confidenceMap[priceAssessment.uncertainty] || 0.75;

  // Build factors from available property data
  const topFactors: Record<string, number> = {};

  if (propertyData) {
    // Location factor based on zone average
    if (propertyData.zone_avg_price_m2 && propertyData.price && propertyData.area_m2) {
      const expectedPrice = propertyData.zone_avg_price_m2 * propertyData.area_m2;
      const priceRatio = propertyData.price / expectedPrice;
      // Positive if below zone average (good deal), negative if above
      topFactors.location = Number(((1 - priceRatio) * 0.2).toFixed(3));
    }

    // Size factor
    if (propertyData.area_m2) {
      // Larger properties often have diminishing returns
      const sizeFactor = propertyData.area_m2 > 200 ? -0.05 : propertyData.area_m2 > 100 ? 0.02 : 0.05;
      topFactors.size = sizeFactor;
    }

    // Days on market factor
    if (propertyData.days_on_market !== undefined) {
      if (propertyData.days_on_market > 90) {
        topFactors.market_duration = -0.08; // Long time = possible issues
      } else if (propertyData.days_on_market < 14) {
        topFactors.market_duration = 0.05; // New listing premium
      }
    }

    // Price per sqm vs median factor
    if (propertyData.price && propertyData.area_m2) {
      const pricePerM2 = propertyData.price / propertyData.area_m2;
      if (priceAssessment.priceRange.median && propertyData.area_m2) {
        const medianPerM2 = priceAssessment.priceRange.median / propertyData.area_m2;
        const deviation = (pricePerM2 - medianPerM2) / medianPerM2;
        topFactors.price_efficiency = Number((-deviation * 0.15).toFixed(3));
      }
    }
  }

  const { error } = await supabase
    .from('pricewaze_avm_results')
    .insert({
      property_id: propertyId,
      model_version: 'DIE-1',
      estimate: priceAssessment.priceRange.median,
      low_estimate: priceAssessment.priceRange.min,
      high_estimate: priceAssessment.priceRange.max,
      confidence,
      uncertainty_level: priceAssessment.uncertainty,
      top_factors: topFactors,
      comparable_count: comparableCount,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Error saving AVM result:', error);
    // Don't throw - this is optional caching
  }
}


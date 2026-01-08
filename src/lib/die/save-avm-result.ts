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
}

/**
 * Save price assessment results to AVM results table
 */
export async function saveAVMResult(
  options: SaveAVMResultOptions
): Promise<void> {
  const { propertyId, priceAssessment, comparableCount = 0, expiresInDays = 7 } = options;

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
      top_factors: {}, // TODO: Add factors if available
      comparable_count: comparableCount,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Error saving AVM result:', error);
    // Don't throw - this is optional caching
  }
}


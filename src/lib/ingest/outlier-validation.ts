// Outlier Validation
// Detect and handle suspicious property data

import type { NormalizedProperty } from '@/types/ingest';
import type { SupabaseClient } from '@supabase/supabase-js';

export type OutlierReason =
  | 'price_too_high'
  | 'price_too_low'
  | 'price_per_m2_outlier'
  | 'area_too_large'
  | 'area_too_small'
  | 'bedroom_area_mismatch'
  | 'year_invalid'
  | 'suspicious_pattern';

export interface OutlierCheckResult {
  is_outlier: boolean;
  reasons: OutlierReason[];
  suggestions: OutlierSuggestion[];
  trust_penalty: number;  // 0-1, subtract from base trust
}

export interface OutlierSuggestion {
  field: string;
  current_value: number | string;
  suggested_value: number | string;
  reason: string;
}

// Price bounds by market (in local currency)
const PRICE_BOUNDS: Record<string, { min: number; max: number }> = {
  'DO': { min: 500000, max: 100000000 },      // DOP: 500K - 100M
  'US': { min: 10000, max: 50000000 },        // USD: 10K - 50M
  'MX': { min: 100000, max: 500000000 },      // MXN: 100K - 500M
  'ES': { min: 10000, max: 50000000 },        // EUR: 10K - 50M
  'CO': { min: 10000000, max: 50000000000 },  // COP: 10M - 50B
  'global': { min: 1000, max: 100000000 },    // USD default
};

// Price per m2 bounds (in USD equivalent for comparison)
const PRICE_PER_M2_BOUNDS = {
  min: 50,      // $50/m2 minimum (very rural)
  max: 50000,   // $50K/m2 maximum (luxury NYC/Monaco)
};

// Area bounds in m2
const AREA_BOUNDS = {
  apartment: { min: 20, max: 1000 },
  house: { min: 40, max: 5000 },
  land: { min: 100, max: 1000000 },
  commercial: { min: 20, max: 50000 },
  office: { min: 10, max: 10000 },
};

// Bedroom to area ratio (m2 per bedroom)
const M2_PER_BEDROOM = {
  min: 8,   // Tiny studio
  max: 100, // Mansion bedrooms
};

/**
 * Detect if price might be in wrong units
 */
function detectPriceUnitError(
  price: number,
  area_m2: number,
  marketCode: string
): OutlierSuggestion | null {
  const pricePerM2 = price / area_m2;

  // Check if price looks like it's in thousands when should be full
  if (pricePerM2 < 10 && price < 1000) {
    return {
      field: 'price',
      current_value: price,
      suggested_value: price * 1000,
      reason: `Price seems very low. Did you mean ${(price * 1000).toLocaleString()}?`,
    };
  }

  // Check if price looks like it's missing zeros
  if (pricePerM2 < 50 && area_m2 > 50) {
    const suggestedPrice = price * 1000;
    const suggestedPerM2 = suggestedPrice / area_m2;

    if (suggestedPerM2 >= 500 && suggestedPerM2 <= 10000) {
      return {
        field: 'price',
        current_value: price,
        suggested_value: suggestedPrice,
        reason: `Price per m² is unusually low. Did you mean ${suggestedPrice.toLocaleString()}?`,
      };
    }
  }

  return null;
}

/**
 * Check property against zone statistics
 */
async function checkAgainstZoneStats(
  supabase: SupabaseClient,
  property: NormalizedProperty,
  zoneId: string | null
): Promise<{ isOutlier: boolean; reason?: OutlierReason; stdDevs?: number }> {
  if (!zoneId) return { isOutlier: false };

  // Get zone statistics
  const { data: properties, error } = await supabase
    .from('pricewaze_properties')
    .select('price, area_m2')
    .eq('zone_id', zoneId)
    .eq('status', 'active')
    .gt('area_m2', 0);

  if (error || !properties || properties.length < 3) {
    return { isOutlier: false }; // Not enough data to determine
  }

  const pricesPerM2 = properties.map((p: any) => p.price / p.area_m2);
  const mean = pricesPerM2.reduce((a: number, b: number) => a + b, 0) / pricesPerM2.length;
  const variance = pricesPerM2.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / pricesPerM2.length;
  const stdDev = Math.sqrt(variance);

  const propertyPricePerM2 = property.price / property.area_m2;
  const zScore = Math.abs(propertyPricePerM2 - mean) / stdDev;

  // Flag if more than 3 standard deviations from mean
  if (zScore > 3) {
    return {
      isOutlier: true,
      reason: 'price_per_m2_outlier',
      stdDevs: zScore,
    };
  }

  return { isOutlier: false };
}

/**
 * Main outlier validation function
 */
export async function validateOutliers(
  supabase: SupabaseClient,
  property: NormalizedProperty,
  marketCode: string = 'global',
  zoneId: string | null = null
): Promise<OutlierCheckResult> {
  const reasons: OutlierReason[] = [];
  const suggestions: OutlierSuggestion[] = [];
  let trustPenalty = 0;

  // 1. Price bounds check
  const priceBounds = PRICE_BOUNDS[marketCode] || PRICE_BOUNDS.global;

  if (property.price < priceBounds.min) {
    reasons.push('price_too_low');
    trustPenalty += 0.3;
  }

  if (property.price > priceBounds.max) {
    reasons.push('price_too_high');
    trustPenalty += 0.3;
  }

  // 2. Price per m2 check (if area provided)
  if (property.area_m2 > 0) {
    const pricePerM2 = property.price / property.area_m2;

    // Check absolute bounds
    if (pricePerM2 < PRICE_PER_M2_BOUNDS.min || pricePerM2 > PRICE_PER_M2_BOUNDS.max) {
      reasons.push('price_per_m2_outlier');
      trustPenalty += 0.4;
    }

    // Check for unit errors
    const unitSuggestion = detectPriceUnitError(property.price, property.area_m2, marketCode);
    if (unitSuggestion) {
      suggestions.push(unitSuggestion);
    }

    // 3. Area bounds check
    const areaBounds = AREA_BOUNDS[property.property_type] || AREA_BOUNDS.apartment;

    if (property.area_m2 < areaBounds.min) {
      reasons.push('area_too_small');
      trustPenalty += 0.2;
    }

    if (property.area_m2 > areaBounds.max) {
      reasons.push('area_too_large');
      trustPenalty += 0.2;
    }

    // 4. Bedroom to area ratio check
    if (property.bedrooms && property.bedrooms > 0) {
      const m2PerBedroom = property.area_m2 / property.bedrooms;

      if (m2PerBedroom < M2_PER_BEDROOM.min || m2PerBedroom > M2_PER_BEDROOM.max) {
        reasons.push('bedroom_area_mismatch');
        trustPenalty += 0.15;

        // Suggest correction
        const suggestedBedrooms = Math.round(property.area_m2 / 30); // Assume 30m² per bedroom avg
        if (suggestedBedrooms !== property.bedrooms) {
          suggestions.push({
            field: 'bedrooms',
            current_value: property.bedrooms,
            suggested_value: suggestedBedrooms,
            reason: `${property.area_m2}m² typically has ${suggestedBedrooms} bedroom(s), not ${property.bedrooms}`,
          });
        }
      }
    }
  }

  // 5. Year built check
  if (property.year_built) {
    const currentYear = new Date().getFullYear();
    if (property.year_built < 1800 || property.year_built > currentYear + 2) {
      reasons.push('year_invalid');
      trustPenalty += 0.1;
    }
  }

  // 6. Zone statistics check (async)
  const zoneCheck = await checkAgainstZoneStats(supabase, property, zoneId);
  if (zoneCheck.isOutlier && zoneCheck.reason) {
    if (!reasons.includes(zoneCheck.reason)) {
      reasons.push(zoneCheck.reason);
    }
    trustPenalty += 0.3;

    if (zoneCheck.stdDevs) {
      suggestions.push({
        field: 'price',
        current_value: property.price,
        suggested_value: 'Review price',
        reason: `Price is ${zoneCheck.stdDevs.toFixed(1)} standard deviations from zone average`,
      });
    }
  }

  return {
    is_outlier: reasons.length > 0,
    reasons,
    suggestions,
    trust_penalty: Math.min(trustPenalty, 0.9), // Max 90% penalty
  };
}

/**
 * Calculate trust score for a property
 */
export function calculateTrustScore(
  baseWeight: number,
  property: NormalizedProperty,
  outlierResult: OutlierCheckResult,
  hasImages: boolean = false,
  hasDocuments: boolean = false,
  daysSinceCreated: number = 0
): number {
  // Completeness score (0-1)
  const totalFields = 10;
  let filledFields = 0;

  if (property.title) filledFields++;
  if (property.description) filledFields++;
  if (property.price > 0) filledFields++;
  if (property.area_m2 > 0) filledFields++;
  if (property.bedrooms !== null) filledFields++;
  if (property.bathrooms !== null) filledFields++;
  if (property.address) filledFields++;
  if (property.latitude !== 0) filledFields++;
  if (property.images.length > 0) filledFields++;
  if (property.features.length > 0) filledFields++;

  const completeness = filledFields / totalFields;

  // Recency score (exponential decay: 1.0 → 0.5 in 180 days)
  const halfLife = 180;
  const recency = Math.pow(0.5, daysSinceCreated / halfLife);

  // Verification bonus
  let verificationBonus = 0;
  if (hasImages) verificationBonus += 0.15;
  if (hasDocuments) verificationBonus += 0.1;

  // Calculate final score
  let score = baseWeight * completeness * recency + verificationBonus;

  // Apply outlier penalty
  score -= outlierResult.trust_penalty * score;

  // Clamp to 0-1
  return Math.max(0, Math.min(1, score));
}

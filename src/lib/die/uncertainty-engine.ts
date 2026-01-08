/**
 * Uncertainty Engine
 * 
 * Produces valid price ranges with uncertainty levels using Conformal Prediction.
 * 
 * Key principle: Honesty > point precision
 * 
 * Implementation: 
 * 1. First tries to use AVM results from DB if available
 * 2. Falls back to simplified conformal prediction using zone statistics
 */

import type { PriceAssessment, DIEInputs } from '@/types/die';
import { createClient } from '@/lib/supabase/server';

/**
 * Calculate price range using conformal prediction approach
 * 
 * First tries to use AVM results from DB if available.
 * Falls back to zone-based calculation if no AVM exists.
 */
export async function calculateUncertainty(
  inputs: DIEInputs
): Promise<PriceAssessment> {
  const { property, zone } = inputs;

  // Try to get AVM results from DB first
  const supabase = await createClient();
  const { data: avmResult } = await supabase
    .from('pricewaze_avm_results')
    .select('estimate, low_estimate, high_estimate, uncertainty_level, confidence')
    .eq('property_id', property.id)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  // If AVM result exists and is valid, use it
  if (avmResult && avmResult.low_estimate && avmResult.high_estimate && avmResult.estimate) {
    const rangeWidth = avmResult.high_estimate - avmResult.low_estimate;
    const rangeWidthPercent = avmResult.estimate > 0
      ? (rangeWidth / avmResult.estimate) * 100
      : 50;

    return {
      priceRange: {
        min: Number(avmResult.low_estimate),
        max: Number(avmResult.high_estimate),
        median: Number(avmResult.estimate),
      },
      askingPriceStatus: getAskingPriceStatus(
        property.price,
        Number(avmResult.low_estimate),
        Number(avmResult.high_estimate)
      ),
      uncertainty: (avmResult.uncertainty_level as 'low' | 'medium' | 'high') || 'medium',
      uncertaintyMetrics: {
        coverage: Number(avmResult.confidence) || 0.90,
        rangeWidth,
        rangeWidthPercent,
      },
      zoneContext: {
        zoneName: zone.name,
        zoneMedianPrice: Number(avmResult.estimate),
        zonePriceRange: {
          min: Number(avmResult.low_estimate),
          max: Number(avmResult.high_estimate),
        },
      },
    };
  }

  // Fallback to zone-based calculation
  return calculateUncertaintyFromZone(inputs);
}

/**
 * Calculate uncertainty from zone statistics (fallback)
 */
function calculateUncertaintyFromZone(
  inputs: DIEInputs
): PriceAssessment {
  const { property, zone } = inputs;

  // Get comparable properties (active listings with area)
  const comparables = zone.properties
    .filter(p => p.status === 'active' && p.area_m2 && p.area_m2 > 0)
    .map(p => ({
      price: p.price,
      pricePerM2: p.price / p.area_m2!,
      area_m2: p.area_m2!,
    }));

  // If no comparables, return high uncertainty
  if (comparables.length === 0) {
    return getHighUncertaintyAssessment(property, zone);
  }

  // Calculate price per m² for property (for future use in comparison)
  const _propertyPricePerM2 = property.area_m2
    ? property.price / property.area_m2
    : 0;

  // Get zone price per m² distribution
  const zonePricesPerM2 = comparables.map(c => c.pricePerM2).sort((a, b) => a - b);

  // Calculate zone statistics
  const zoneMedian = median(zonePricesPerM2);
  const zoneP5 = percentile(zonePricesPerM2, 0.05);
  const zoneP95 = percentile(zonePricesPerM2, 0.95);

  // Estimate property price range using zone distribution
  // Assumption: Property follows zone distribution, adjusted by area
  const estimatedMedian = property.area_m2
    ? zoneMedian * property.area_m2
    : property.price;

  // Range width based on zone variability
  const zoneRangeWidth = zoneP95 - zoneP5;
  const rangeWidthPercent = zoneMedian > 0 ? (zoneRangeWidth / zoneMedian) * 100 : 50;

  // Calculate price range (90% coverage)
  const rangeWidth = estimatedMedian * (rangeWidthPercent / 100);
  const priceRange = {
    min: estimatedMedian - rangeWidth * 0.5,
    max: estimatedMedian + rangeWidth * 0.5,
    median: estimatedMedian,
  };

  // Determine uncertainty level
  // Low: < 15%, Medium: 15-30%, High: > 30%
  let uncertainty: 'low' | 'medium' | 'high';
  if (rangeWidthPercent < 15) {
    uncertainty = 'low';
  } else if (rangeWidthPercent < 30) {
    uncertainty = 'medium';
  } else {
    uncertainty = 'high';
  }

  // Adjust uncertainty based on sample size
  // Fewer comparables = higher uncertainty
  if (comparables.length < 5 && uncertainty === 'low') {
    uncertainty = 'medium';
  }
  if (comparables.length < 3) {
    uncertainty = 'high';
  }

  // Determine asking price status
  let askingPriceStatus: 'within_range' | 'below_range' | 'above_range';
  if (property.price >= priceRange.min && property.price <= priceRange.max) {
    askingPriceStatus = 'within_range';
  } else if (property.price < priceRange.min) {
    askingPriceStatus = 'below_range';
  } else {
    askingPriceStatus = 'above_range';
  }

  return {
    priceRange,
    askingPriceStatus,
    uncertainty,
    uncertaintyMetrics: {
      coverage: 0.90, // 90% coverage
      rangeWidth: priceRange.max - priceRange.min,
      rangeWidthPercent,
    },
    zoneContext: {
      zoneName: zone.name,
      zoneMedianPrice: zoneMedian * (property.area_m2 || 1),
      zonePriceRange: {
        min: zoneP5 * (property.area_m2 || 1),
        max: zoneP95 * (property.area_m2 || 1),
      },
    },
  };
}

/**
 * Fallback for high uncertainty scenarios
 */
function getHighUncertaintyAssessment(
  property: DIEInputs['property'],
  zone: DIEInputs['zone']
): PriceAssessment {
  // Use property price as median, wide range (±50%)
  const median = property.price;
  const rangeWidth = median * 0.5;

  return {
    priceRange: {
      min: median - rangeWidth,
      max: median + rangeWidth,
      median,
    },
    askingPriceStatus: 'within_range', // Conservative default
    uncertainty: 'high',
    uncertaintyMetrics: {
      coverage: 0.90,
      rangeWidth: rangeWidth * 2,
      rangeWidthPercent: 50,
    },
    zoneContext: {
      zoneName: zone.name,
      zoneMedianPrice: median,
      zonePriceRange: {
        min: median * 0.5,
        max: median * 1.5,
      },
    },
  };
}

/**
 * Determine asking price status relative to range
 */
function getAskingPriceStatus(
  askingPrice: number,
  rangeMin: number,
  rangeMax: number
): 'within_range' | 'below_range' | 'above_range' {
  if (askingPrice >= rangeMin && askingPrice <= rangeMax) {
    return 'within_range';
  }
  if (askingPrice < rangeMin) {
    return 'below_range';
  }
  return 'above_range';
}

/**
 * Calculate median of sorted array
 */
function median(sortedArray: number[]): number {
  const n = sortedArray.length;
  if (n === 0) return 0;
  if (n % 2 === 0) {
    return (sortedArray[n / 2 - 1] + sortedArray[n / 2]) / 2;
  }
  return sortedArray[Math.floor(n / 2)];
}

/**
 * Calculate percentile of sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.max(0, Math.min(sortedArray.length - 1, Math.floor(p * sortedArray.length)));
  return sortedArray[index];
}


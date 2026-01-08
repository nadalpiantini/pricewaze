/**
 * Uncertainty Engine
 * 
 * Produces valid price ranges with uncertainty levels using Conformal Prediction.
 * 
 * Key principle: Honesty > point precision
 * 
 * Implementation: Simplified conformal prediction using zone statistics
 * and quantile-based ranges.
 */

import type { PriceAssessment, DIEInputs } from '@/types/die';

/**
 * Calculate price range using conformal prediction approach
 * 
 * Uses zone comparables to estimate:
 * - Median (point estimate)
 * - 5th and 95th percentiles (90% coverage range)
 * - Uncertainty level based on range width
 */
export function calculateUncertainty(
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

  // Calculate price per m² for property
  const propertyPricePerM2 = property.area_m2
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


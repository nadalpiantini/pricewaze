/**
 * Market Dynamics Engine
 * 
 * Detects market velocity and regime changes using change-point detection.
 * 
 * Key principle: Timing like Waze (when NOT to wait)
 * 
 * Implementation: Simplified change-point detection using:
 * - Price trends (last 30/60/90 days)
 * - Inventory changes
 * - Days on market trends
 */

import type { MarketDynamics, ChangePoint, DIEInputs } from '@/types/die';

/**
 * Analyze market dynamics for a property/zone
 */
export function analyzeMarketDynamics(
  inputs: DIEInputs
): MarketDynamics {
  const { zone } = inputs;

  // Get time-bucketed properties
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Bucket properties by time
  const last30Days = zone.properties.filter(
    p => now - new Date(p.created_at).getTime() <= 30 * dayMs
  );
  const last60Days = zone.properties.filter(
    p => now - new Date(p.created_at).getTime() <= 60 * dayMs
  );
  const last90Days = zone.properties.filter(
    p => now - new Date(p.created_at).getTime() <= 90 * dayMs
  );

  // Calculate average prices per period
  const avgPrice30 = calculateAvgPrice(last30Days);
  const avgPrice60 = calculateAvgPrice(last60Days);
  const avgPrice90 = calculateAvgPrice(last90Days);

  // Calculate inventory changes
  const inventory30 = last30Days.length;
  const inventory60 = last60Days.length;
  const inventory90 = last90Days.length;

  // Detect change points
  const changePoints = detectChangePoints(
    { avgPrice30, avgPrice60, avgPrice90 },
    { inventory30, inventory60, inventory90 }
  );

  // Calculate velocity
  const velocity = calculateVelocity(avgPrice30, avgPrice60, avgPrice90, changePoints);

  // Determine current regime
  const currentRegime = determineRegime(avgPrice30, inventory30, velocity);

  // Calculate trends
  const priceTrend = determinePriceTrend(avgPrice30, avgPrice60, avgPrice90);
  const inventoryTrend = determineInventoryTrend(inventory30, inventory60, inventory90);
  const daysOnMarketTrend = 'stable'; // TODO: Calculate from property data if available

  // Calculate trend score (-1 to 1)
  // Positive = accelerating, Negative = decelerating
  const trendScore = calculateTrendScore(priceTrend, inventoryTrend, velocity);

  return {
    velocity,
    velocityMetrics: {
      trendScore,
      changePoints,
      daysSinceLastChange: changePoints.length > 0
        ? Math.floor((now - new Date(changePoints[0].detectedAt).getTime()) / dayMs)
        : null,
    },
    currentRegime,
    timeSeries: {
      priceTrend,
      inventoryTrend,
      daysOnMarketTrend,
    },
  };
}

/**
 * Calculate average price from properties
 */
function calculateAvgPrice(properties: Array<{ price: number }>): number {
  if (properties.length === 0) return 0;
  const sum = properties.reduce((acc, p) => acc + p.price, 0);
  return sum / properties.length;
}

/**
 * Detect change points in market
 */
function detectChangePoints(
  prices: { avgPrice30: number; avgPrice60: number; avgPrice90: number },
  inventory: { inventory30: number; inventory60: number; inventory90: number }
): ChangePoint[] {
  const changePoints: ChangePoint[] = [];
  const now = new Date().toISOString();

  // Price acceleration (30d vs 60d)
  const priceChange30vs60 = prices.avgPrice30 > 0 && prices.avgPrice60 > 0
    ? ((prices.avgPrice30 - prices.avgPrice60) / prices.avgPrice60) * 100
    : 0;

  // Price acceleration (60d vs 90d)
  const priceChange60vs90 = prices.avgPrice60 > 0 && prices.avgPrice90 > 0
    ? ((prices.avgPrice60 - prices.avgPrice90) / prices.avgPrice90) * 100
    : 0;

  // Detect acceleration (>10% increase in rate of change)
  if (priceChange30vs60 > priceChange60vs90 + 10) {
    changePoints.push({
      detectedAt: now,
      type: 'acceleration',
      confidence: Math.min(0.9, Math.abs(priceChange30vs60) / 20),
      description: `Price acceleration detected: ${priceChange30vs60.toFixed(1)}% vs ${priceChange60vs90.toFixed(1)}%`,
    });
  }

  // Detect deceleration (>10% decrease in rate of change)
  if (priceChange30vs60 < priceChange60vs90 - 10) {
    changePoints.push({
      detectedAt: now,
      type: 'deceleration',
      confidence: Math.min(0.9, Math.abs(priceChange30vs60) / 20),
      description: `Price deceleration detected: ${priceChange30vs60.toFixed(1)}% vs ${priceChange60vs90.toFixed(1)}%`,
    });
  }

  // Inventory spike (30d inventory > 50% of 60d)
  const inventoryRatio = inventory.inventory60 > 0
    ? inventory.inventory30 / inventory.inventory60
    : 0;

  if (inventoryRatio > 0.5 && inventory.inventory30 > 5) {
    changePoints.push({
      detectedAt: now,
      type: 'regime_shift',
      confidence: Math.min(0.8, inventoryRatio),
      description: `Inventory spike: ${inventory.inventory30} listings in last 30 days`,
    });
  }

  return changePoints;
}

/**
 * Calculate market velocity
 */
function calculateVelocity(
  avgPrice30: number,
  avgPrice60: number,
  avgPrice90: number,
  changePoints: ChangePoint[]
): 'stable' | 'accelerating' | 'decelerating' {
  // If we have change points, use them
  const accelerationPoints = changePoints.filter(cp => cp.type === 'acceleration');
  const decelerationPoints = changePoints.filter(cp => cp.type === 'deceleration');

  if (accelerationPoints.length > decelerationPoints.length) {
    return 'accelerating';
  }
  if (decelerationPoints.length > accelerationPoints.length) {
    return 'decelerating';
  }

  // Otherwise, use price trends
  if (avgPrice30 === 0 || avgPrice60 === 0 || avgPrice90 === 0) {
    return 'stable';
  }

  const rate30vs60 = (avgPrice30 - avgPrice60) / avgPrice60;
  const rate60vs90 = (avgPrice60 - avgPrice90) / avgPrice90;

  // Acceleration: rate is increasing
  if (rate30vs60 > rate60vs90 + 0.05) {
    return 'accelerating';
  }

  // Deceleration: rate is decreasing
  if (rate30vs60 < rate60vs90 - 0.05) {
    return 'decelerating';
  }

  return 'stable';
}

/**
 * Determine current market regime
 */
function determineRegime(
  avgPrice30: number,
  inventory30: number,
  velocity: 'stable' | 'accelerating' | 'decelerating'
): 'hot' | 'warm' | 'cool' | 'cold' {
  // Hot: accelerating + low inventory
  if (velocity === 'accelerating' && inventory30 < 10) {
    return 'hot';
  }

  // Cold: decelerating + high inventory
  if (velocity === 'decelerating' && inventory30 > 20) {
    return 'cold';
  }

  // Warm: stable or moderate conditions
  if (velocity === 'stable' || (inventory30 >= 10 && inventory30 <= 20)) {
    return 'warm';
  }

  // Cool: decelerating or high inventory
  return 'cool';
}

/**
 * Determine price trend
 */
function determinePriceTrend(
  avgPrice30: number,
  avgPrice60: number,
  avgPrice90: number
): 'rising' | 'stable' | 'falling' {
  if (avgPrice30 === 0 || avgPrice60 === 0 || avgPrice90 === 0) {
    return 'stable';
  }

  const change30vs60 = (avgPrice30 - avgPrice60) / avgPrice60;
  const change60vs90 = (avgPrice60 - avgPrice90) / avgPrice90;

  // Rising: both periods show increase
  if (change30vs60 > 0.02 && change60vs90 > 0.02) {
    return 'rising';
  }

  // Falling: both periods show decrease
  if (change30vs60 < -0.02 && change60vs90 < -0.02) {
    return 'falling';
  }

  return 'stable';
}

/**
 * Determine inventory trend
 */
function determineInventoryTrend(
  inventory30: number,
  inventory60: number,
  inventory90: number
): 'rising' | 'stable' | 'falling' {
  // Rising: inventory increasing
  if (inventory30 > inventory60 * 1.2) {
    return 'rising';
  }

  // Falling: inventory decreasing
  if (inventory30 < inventory60 * 0.8) {
    return 'falling';
  }

  return 'stable';
}

/**
 * Calculate trend score (-1 to 1)
 */
function calculateTrendScore(
  priceTrend: 'rising' | 'stable' | 'falling',
  inventoryTrend: 'rising' | 'stable' | 'falling',
  velocity: 'stable' | 'accelerating' | 'decelerating'
): number {
  let score = 0;

  // Price trend contribution
  if (priceTrend === 'rising') score += 0.3;
  if (priceTrend === 'falling') score -= 0.3;

  // Inventory trend contribution (inverse: more inventory = lower score)
  if (inventoryTrend === 'falling') score += 0.2;
  if (inventoryTrend === 'rising') score -= 0.2;

  // Velocity contribution
  if (velocity === 'accelerating') score += 0.5;
  if (velocity === 'decelerating') score -= 0.5;

  return Math.max(-1, Math.min(1, score));
}


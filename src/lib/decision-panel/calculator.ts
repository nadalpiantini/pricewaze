// ============================================================================
// DECISION PANEL CALCULATOR
// ============================================================================
// Implements the logic rules for calculating Decision Panel v2 states
// ============================================================================

import type {
  DecisionPanelCalculation,
  PricePosition,
  UncertaintyLevel,
  WaitRiskLevel,
  MarketVelocity,
  MarketPressure,
  ProfileApplied,
} from '@/types/decision-panel';

interface AVMData {
  estimate: number;
  low_estimate: number;
  high_estimate: number;
  uncertainty_level: 'low' | 'medium' | 'high';
  comparable_count: number;
}

interface MarketPressureData {
  pressure_level: 'low' | 'medium' | 'high';
  active_offers: number;
  recent_visits: number;
  competing_offers: boolean;
}

interface MarketDynamicsData {
  velocity: 'stable' | 'accelerating' | 'decelerating';
  recent_listings: number;
  days_on_market: number;
}

interface CalculationContext {
  offer_amount: number;
  avm: AVMData | null;
  market_pressure: MarketPressureData | null;
  market_dynamics: MarketDynamicsData | null;
  profile_applied?: ProfileApplied;
}

/**
 * Calculate price position based on offer amount and AVM range
 * Rule: inside_range if offer ∈ [low_estimate, high_estimate], else outside_range
 */
function calculatePricePosition(
  offerAmount: number,
  avm: AVMData | null
): PricePosition {
  if (!avm) {
    // Without AVM, we can't determine position accurately
    // Default to outside_range as conservative estimate
    return 'outside_range';
  }

  const isInsideRange =
    offerAmount >= avm.low_estimate && offerAmount <= avm.high_estimate;

  return isInsideRange ? 'inside_range' : 'outside_range';
}

/**
 * Calculate uncertainty level
 * Rule:
 * - low: Many recent comparables (>=10), stable model
 * - medium: Limited comparables (5-9) OR mixed signals
 * - high: Sparse data (<5) OR fast-changing zone
 */
function calculateUncertaintyLevel(avm: AVMData | null): UncertaintyLevel {
  if (!avm) {
    return 'high'; // No data = high uncertainty
  }

  // Use comparable_count from AVM
  if (avm.comparable_count >= 10) {
    return 'low';
  } else if (avm.comparable_count >= 5) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Calculate market velocity
 * Rule:
 * - stable: No recent regime change (recent_listings in normal range)
 * - accelerating: Activity increasing (visits/offers increasing)
 * - decelerating: Activity slowing
 */
function calculateMarketVelocity(
  dynamics: MarketDynamicsData | null
): MarketVelocity {
  if (!dynamics) {
    return 'stable'; // Default assumption
  }

  return dynamics.velocity;
}

/**
 * Calculate wait risk level
 * Rule:
 * - low: Low pressure + stable velocity
 * - medium: Mixed pressure or uncertainty
 * - high: High pressure OR accelerating velocity
 */
function calculateWaitRiskLevel(
  pressure: MarketPressureData | null,
  velocity: MarketVelocity,
  _uncertainty: UncertaintyLevel
): WaitRiskLevel {
  if (!pressure) {
    return 'medium'; // Default to medium if no pressure data
  }

  const isLowPressure = pressure.pressure_level === 'low';
  const isStableVelocity = velocity === 'stable';
  const isHighPressure = pressure.pressure_level === 'high';
  const isAccelerating = velocity === 'accelerating';

  if (isLowPressure && isStableVelocity) {
    return 'low';
  } else if (isHighPressure || isAccelerating) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * Calculate market pressure
 * Rule:
 * - low: Few visits, no competition
 * - medium: Visits OR offers present
 * - high: Multiple offers + confirmed signals
 */
function calculateMarketPressure(
  pressure: MarketPressureData | null
): MarketPressure {
  if (!pressure) {
    return 'low'; // Default assumption
  }

  return pressure.pressure_level;
}

/**
 * Generate explanation summary (1-2 sentences)
 * Max 2 lines, no numbers, no predictions
 */
function generateExplanationSummary(
  pricePosition: PricePosition,
  uncertainty: UncertaintyLevel,
  waitRisk: WaitRiskLevel,
  velocity: MarketVelocity,
  pressure: MarketPressure
): string {
  const isInsideRange = pricePosition === 'inside_range';
  const isHighRisk = waitRisk === 'high';
  const isAccelerating = velocity === 'accelerating';
  const isHighPressure = pressure === 'high';

  // High-risk scenarios
  if (isHighRisk && isAccelerating && isHighPressure) {
    return 'The negotiation window may close quickly under current conditions.';
  }

  if (isInsideRange && isHighRisk) {
    return 'The price is within a fair range, but increasing competition and recent market acceleration raise the risk of waiting.';
  }

  if (isInsideRange && isAccelerating) {
    return 'The price is within a fair range, but recent acceleration increases the risk of waiting.';
  }

  // Medium-risk scenarios
  if (isInsideRange && waitRisk === 'medium') {
    return 'The price is within a fair range, but market conditions suggest acting soon.';
  }

  // Low-risk scenarios
  if (waitRisk === 'low' && pressure === 'low') {
    return 'There is no immediate pressure. Waiting is a reasonable option.';
  }

  // Outside range scenarios
  if (!isInsideRange && isHighRisk) {
    return 'The price is outside the fair range, and market conditions increase the urgency of decision-making.';
  }

  // Default
  return 'The price position and market conditions suggest careful consideration of timing.';
}

/**
 * Generate pros and cons for "Act Now" option
 */
function generateActOption(
  pricePosition: PricePosition,
  waitRisk: WaitRiskLevel,
  pressure: MarketPressure
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  // Pros based on context
  if (waitRisk === 'high' || pressure === 'high') {
    pros.push('Reduces the risk of being outbid');
  }

  if (pricePosition === 'inside_range') {
    pros.push('Uses the current negotiation window');
  }

  if (waitRisk === 'high') {
    pros.push('Secures priority in competitive situations');
  }

  // Cons based on context
  if (pricePosition === 'inside_range') {
    cons.push('Limits further price concessions');
  }

  if (pricePosition === 'outside_range') {
    cons.push('May require price adjustment to align with market');
  }

  // Default pros/cons if empty
  if (pros.length === 0) {
    pros.push('Moves the negotiation forward');
  }

  if (cons.length === 0) {
    cons.push('Reduces flexibility to wait for better conditions');
  }

  return { pros, cons };
}

/**
 * Generate pros and cons for "Wait" option
 */
function generateWaitOption(
  pricePosition: PricePosition,
  waitRisk: WaitRiskLevel,
  pressure: MarketPressure
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  // Pros based on context
  if (waitRisk === 'low' && pressure === 'low') {
    pros.push('Preserves pricing discipline');
    pros.push('Allows time for market conditions to improve');
  } else if (waitRisk === 'low') {
    pros.push('Preserves pricing discipline');
  }

  if (pricePosition === 'outside_range') {
    pros.push('May allow price to adjust to market conditions');
  }

  // Cons based on context
  if (waitRisk === 'high' || pressure === 'high') {
    cons.push('Higher probability of losing priority to other buyers');
  }

  if (waitRisk === 'high') {
    cons.push('Negotiation window may close quickly');
  }

  if (pressure === 'high') {
    cons.push('Competition may increase further');
  }

  // Default pros/cons if empty
  if (pros.length === 0) {
    pros.push('Maintains negotiation flexibility');
  }

  if (cons.length === 0) {
    cons.push('May delay decision-making');
  }

  return { pros, cons };
}

/**
 * Main calculation function
 * Implements all logic rules to generate a DecisionPanelCalculation
 */
export function calculateDecisionPanel(
  context: CalculationContext
): DecisionPanelCalculation {
  const {
    offer_amount,
    avm,
    market_pressure,
    market_dynamics,
    profile_applied: _profile_applied,
  } = context;

  // Calculate all states
  const price_position = calculatePricePosition(offer_amount, avm);
  const uncertainty_level = calculateUncertaintyLevel(avm);
  const market_velocity = calculateMarketVelocity(market_dynamics);
  const market_pressure_level = calculateMarketPressure(market_pressure);
  const wait_risk_level = calculateWaitRiskLevel(
    market_pressure,
    market_velocity,
    uncertainty_level
  );

  // Generate content
  const explanation_summary = generateExplanationSummary(
    price_position,
    uncertainty_level,
    wait_risk_level,
    market_velocity,
    market_pressure_level
  );

  const option_act = generateActOption(
    price_position,
    wait_risk_level,
    market_pressure_level
  );

  const option_wait = generateWaitOption(
    price_position,
    wait_risk_level,
    market_pressure_level
  );

  return {
    price_position,
    uncertainty_level,
    wait_risk_level,
    market_velocity,
    market_pressure: market_pressure_level,
    explanation_summary,
    option_act,
    option_wait,
  };
}


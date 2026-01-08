/**
 * Decision Intelligence Engine (DIE) Types
 * 
 * DIE v1: Uncertainty + Market Dynamics (no personalization)
 * 
 * Purpose: Reduce decision errors by providing risk, timing, and trade-offs
 * instead of a single "magic number"
 */

// ============================================================================
// CORE DIE OUTPUT
// ============================================================================

export interface DIEAnalysis {
  propertyId: string;
  requestedAt: string;
  version: string; // "DIE-1", "DIE-2", etc.

  // Price Assessment (with uncertainty)
  priceAssessment: PriceAssessment;

  // Market Dynamics
  marketDynamics: MarketDynamics;

  // Current Pressure (signals + competition)
  currentPressure: CurrentPressure;

  // Wait Risk (DIE-2, placeholder for now)
  waitRisk?: WaitRisk;

  // Explanations (from Copilot)
  explanations: DIEExplanations;
}

// ============================================================================
// PRICE ASSESSMENT (Uncertainty Engine Output)
// ============================================================================

export interface PriceAssessment {
  // Range-based pricing (not a single number)
  priceRange: {
    min: number; // Lower bound (90% coverage)
    max: number; // Upper bound (90% coverage)
    median: number; // Point estimate
  };

  // Current asking price position
  askingPriceStatus: 'within_range' | 'below_range' | 'above_range';

  // Uncertainty level
  uncertainty: 'low' | 'medium' | 'high';

  // Uncertainty metrics
  uncertaintyMetrics: {
    coverage: number; // 0-1, statistical coverage (e.g., 0.90 for 90% confidence)
    rangeWidth: number; // Absolute width of range
    rangeWidthPercent: number; // Relative width as % of median
  };

  // Zone context (for comparison)
  zoneContext: {
    zoneName: string;
    zoneMedianPrice: number;
    zonePriceRange: { min: number; max: number };
  };
}

// ============================================================================
// MARKET DYNAMICS (Market Dynamics Engine Output)
// ============================================================================

export interface MarketDynamics {
  // Market velocity
  velocity: 'stable' | 'accelerating' | 'decelerating';

  // Velocity metrics
  velocityMetrics: {
    trendScore: number; // -1 to 1, negative = decelerating, positive = accelerating
    changePoints: ChangePoint[]; // Detected regime changes
    daysSinceLastChange: number | null;
  };

  // Market regime
  currentRegime: 'hot' | 'warm' | 'cool' | 'cold';

  // Time series context
  timeSeries: {
    priceTrend: 'rising' | 'stable' | 'falling';
    inventoryTrend: 'rising' | 'stable' | 'falling';
    daysOnMarketTrend: 'rising' | 'stable' | 'falling';
  };
}

export interface ChangePoint {
  detectedAt: string; // ISO timestamp
  type: 'acceleration' | 'deceleration' | 'regime_shift';
  confidence: number; // 0-1
  description: string;
}

// ============================================================================
// CURRENT PRESSURE (Signals + Competition)
// ============================================================================

export interface CurrentPressure {
  level: 'low' | 'medium' | 'high';

  // Signal-based pressure
  signals: {
    highActivity: boolean;
    manyVisits: boolean;
    competingOffers: boolean;
    userReports: number; // Count of user-reported signals (noise, humidity, etc.)
  };

  // Competition metrics
  competition: {
    activeOffers: number;
    recentVisits: number; // Last 48h
    views: number; // Last 7 days (if available)
  };

  // Pressure score (0-100)
  pressureScore: number;
}

// ============================================================================
// WAIT RISK (Wait-Risk Engine Output - DIE-2)
// ============================================================================

export interface WaitRisk {
  // Risk of waiting X days
  riskByDays: {
    days: number; // 7, 14, 30, 60
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number; // 0-100
    probabilityOfLoss: number; // 0-1, probability of losing opportunity
    expectedPriceChange: number; // Expected % change if waiting
  }[];

  // Overall recommendation
  recommendation: 'act_now' | 'wait_short' | 'wait_medium' | 'wait_long';

  // Trade-offs
  tradeoffs: {
    discipline: string; // What you gain by waiting
    probability: string; // What you risk by waiting
  };
}

// ============================================================================
// EXPLANATIONS (Copilot Output)
// ============================================================================

export interface DIEExplanations {
  // Why uncertainty is high/medium/low
  uncertaintyExplanation: string;

  // What velocity indicates
  velocityExplanation: string;

  // What waiting vs acting implies
  timingExplanation: string;

  // Overall decision context
  decisionContext: string;
}

// ============================================================================
// USER PROFILE (for Personalization Layer - DIE-3)
// ============================================================================

export interface UserDecisionProfile {
  userId: string;

  // Urgency
  urgency: 'high' | 'medium' | 'low';

  // Risk tolerance
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';

  // Objective
  objective: 'primary_residence' | 'investment' | 'vacation' | 'flip';

  // Budget constraints
  budgetFlexibility: 'strict' | 'moderate' | 'flexible';
}

// ============================================================================
// DIE INPUTS
// ============================================================================

export interface DIEInputs {
  property: {
    id: string;
    price: number;
    area_m2?: number;
    property_type: string;
    zone_id: string;
    created_at: string;
    status: string;
  };

  zone: {
    id: string;
    name: string;
    properties: Array<{
      price: number;
      area_m2?: number;
      status: string;
      created_at: string;
    }>;
  };

  signals?: {
    highActivity: boolean;
    manyVisits: boolean;
    competingOffers: boolean;
    userReports: number;
  };

  competition?: {
    activeOffers: number;
    recentVisits: number;
  };

  // Optional user profile (DIE-3)
  userProfile?: UserDecisionProfile;
}


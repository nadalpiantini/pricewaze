// ============================================================================
// DECISION PANEL V2 TYPES
// ============================================================================
// Types for the Fairness Panel v2 (Decision Intelligence)
// ============================================================================

export type PricePosition = 'inside_range' | 'outside_range';
export type UncertaintyLevel = 'low' | 'medium' | 'high';
export type WaitRiskLevel = 'low' | 'medium' | 'high';
export type MarketVelocity = 'stable' | 'accelerating' | 'decelerating';
export type MarketPressure = 'low' | 'medium' | 'high';
export type ProfileApplied = 'buyer' | 'investor' | 'urgent' | null;

export interface DecisionOption {
  pros: string[];
  cons: string[];
}

export interface DecisionPanel {
  offer_id: string;
  
  // Estados
  price_position: PricePosition;
  uncertainty_level: UncertaintyLevel;
  wait_risk_level: WaitRiskLevel;
  market_velocity: MarketVelocity;
  market_pressure: MarketPressure;
  
  // Contenido
  explanation_summary: string;
  option_act: DecisionOption;
  option_wait: DecisionOption;
  
  // Personalización
  profile_applied: ProfileApplied;
  model_version: string;
  
  created_at: string;
}

export interface DecisionPanelInput {
  offer_id: string;
  property_id: string;
  offer_amount: number;
  user_id?: string;
  profile_applied?: ProfileApplied;
}

export interface DecisionPanelCalculation {
  price_position: PricePosition;
  uncertainty_level: UncertaintyLevel;
  wait_risk_level: WaitRiskLevel;
  market_velocity: MarketVelocity;
  market_pressure: MarketPressure;
  explanation_summary: string;
  option_act: DecisionOption;
  option_wait: DecisionOption;
}


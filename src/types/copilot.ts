/**
 * PriceWaze Copilot Types
 * 
 * Types for the AI Copilot system (alerts, insights, user twin)
 */

// ============================================================================
// USER TWIN (perfil de decisión)
// ============================================================================

export interface UserTwin {
  id: string;
  user_id: string;
  risk_tolerance: number; // 0-100
  price_sensitivity: number; // 0-100
  decision_speed: number; // 0-100
  updated_at: string;
}

export interface UserTwinInput {
  risk_tolerance?: number;
  price_sensitivity?: number;
  decision_speed?: number;
}

// ============================================================================
// PROPERTY INSIGHTS
// ============================================================================

export interface PropertyInsight {
  id: string;
  property_id: string;
  fairness_score: number | null; // 0-100
  overprice_pct: number | null; // % sobre precio justo
  underprice_pct: number | null; // % bajo precio justo
  narrative: CopilotNarrative;
  updated_at: string;
}

export interface CopilotNarrative {
  summary?: string;
  bullets?: string[];
  suggested_action?: string;
  reasoning?: string;
}

// ============================================================================
// ALERTS (7 tipos)
// ============================================================================

export type AlertType =
  | 'overprice_emotional' // Sobreprecio emocional
  | 'bad_timing' // Timing incorrecto
  | 'zone_inflection' // Zona en inflexión
  | 'suboptimal_offer' // Oferta subóptima
  | 'hidden_risk' // Riesgo oculto
  | 'silent_opportunity' // Oportunidad silenciosa
  | 'bad_negotiation'; // Negociación mal planteada

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface CopilotAlert {
  id: string;
  user_id: string;
  property_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AlertMetadata {
  offer_id?: string;
  offer_amount?: number;
  property_price?: number;
  fairness_score?: number;
  underprice_pct?: number;
  overprice_pct?: number;
  parent_offer_id?: string;
  counteroffer_amount?: number;
  original_amount?: number;
  [key: string]: unknown;
}

// ============================================================================
// AI LOGS
// ============================================================================

export interface AILog {
  id: string;
  user_id: string | null;
  context: string;
  input_text: string | null;
  output_text: string | null;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AIContext =
  | 'copilot_alert'
  | 'property_insight'
  | 'negotiation_advice'
  | 'exploration'
  | 'other';

// ============================================================================
// COPILOT ANALYSIS (para negociación - ya existe, pero lo incluimos aquí)
// ============================================================================

export interface CopilotContext {
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    area_m2?: number;
    property_type: string;
    created_at: string;
  };
  current_offer: {
    id: string;
    amount: number;
    status: string;
    message?: string;
    created_at: string;
  };
  offer_timeline: Array<{
    event_type: string;
    amount?: number;
    created_at: string;
    signal_snapshot: Record<string, { strength: number; confirmed: boolean }>;
  }>;
  signal_snapshot_current: Record<string, { strength: number; confirmed: boolean }>;
  market_context: {
    days_on_market: number;
    avg_price_m2?: number;
  };
}

export interface CopilotAnalysis {
  summary: string;
  key_factors: string[];
  risks: string[];
  scenarios: Array<{
    option: string;
    rationale: string;
    pros: string[];
    cons: string[];
  }>;
  confidence_level: 'low' | 'medium' | 'high';
}

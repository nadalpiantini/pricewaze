/**
 * Copilot Analysis Types
 * Structured types for negotiation copilot responses
 */

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface CopilotScenario {
  option: string;
  rationale: string;
  pros: string[];
  cons: string[];
}

export interface CopilotAnalysis {
  summary: string;
  key_factors: string[];
  risks: string[];
  scenarios: CopilotScenario[];
  confidence_level: ConfidenceLevel;
}

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
    signal_snapshot?: Record<string, { strength: number; confirmed: boolean }>;
  }>;
  signal_snapshot_current: Record<string, { strength: number; confirmed: boolean }>;
  market_context?: {
    avg_price_m2?: number;
    days_on_market?: number;
    similar_properties?: number;
  };
}


/**
 * Negotiation Coherence Engine (NCE) Types
 * Sistema de asistencia táctica en tiempo real para negociaciones
 */

export type NegotiationEventType =
  | 'offer_sent'
  | 'counter_received'
  | 'counter_sent'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type AlignmentState = 'improving' | 'stable' | 'deteriorating';
export type RhythmState = 'fast' | 'normal' | 'slowing';
export type FrictionLevel = 'low' | 'medium' | 'high';
export type MarketPressure = 'low' | 'medium' | 'increasing';

export type FrictionType = 'none' | 'low' | 'medium' | 'high';
export type DominantFriction = 'price' | 'timeline' | 'terms' | 'mixed';
export type FocusArea = 'price' | 'timeline' | 'terms';

export type ResponseTrend = 'faster' | 'stable' | 'slower';
export type ConcessionPattern = 'consistent' | 'erratic' | 'stalled';

export type VisitActivity = 'low' | 'medium' | 'high';
export type CompetingOffers = 'none' | 'some' | 'many';
export type SignalPressure = 'low' | 'medium' | 'high';
export type VelocityState = 'stable' | 'accelerating' | 'decelerating';

export type AlertType = 'rhythm_slowing' | 'alignment_deteriorating' | 'pressure_increasing';

export interface NegotiationEvent {
  id: string;
  offer_id: string;
  event_type: NegotiationEventType;
  price: number | null;
  closing_date: string | null;
  contingencies: string[] | null;
  created_by: 'buyer' | 'seller' | 'agent' | 'system';
  created_at: string;
}

export interface NegotiationStateSnapshot {
  id: string;
  offer_id: string;
  event_id: string;
  alignment_state: AlignmentState;
  rhythm_state: RhythmState;
  friction_level: FrictionLevel;
  market_pressure: MarketPressure;
  coherence_score: number | null;
  generated_at: string;
}

export interface NegotiationFriction {
  snapshot_id: string;
  price_friction: FrictionType;
  timeline_friction: FrictionType;
  terms_friction: FrictionType;
  dominant_friction: DominantFriction | null;
  notes: string | null;
}

export interface NegotiationRhythm {
  snapshot_id: string;
  avg_response_time_hours: number | null;
  response_trend: ResponseTrend | null;
  concession_pattern: ConcessionPattern | null;
  notes: string | null;
}

export interface NegotiationMarketContext {
  snapshot_id: string;
  visit_activity: VisitActivity;
  competing_offers: CompetingOffers;
  signal_pressure: SignalPressure;
  velocity_state: VelocityState;
}

export interface NegotiationOption {
  label: string;
  pros: string[];
  cons: string[];
}

export interface NegotiationInsight {
  snapshot_id: string;
  summary: string;
  focus_area: FocusArea;
  options: NegotiationOption[];
  generated_at: string;
}

export interface NegotiationAlert {
  id: string;
  snapshot_id: string;
  offer_id: string;
  alert_type: AlertType;
  message: string;
  delivered: boolean;
  created_at: string;
}

export interface NegotiationCoherenceState {
  snapshot: NegotiationStateSnapshot;
  friction: NegotiationFriction | null;
  rhythm: NegotiationRhythm | null;
  market_context: NegotiationMarketContext | null;
  insight: NegotiationInsight | null;
  alerts: NegotiationAlert[];
}

export interface NegotiationCoherenceResponse {
  state: NegotiationCoherenceState | null;
  enabled: boolean;
}


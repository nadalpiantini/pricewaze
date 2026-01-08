/**
 * Decision Intelligence Engine Types
 * 
 * Sistema de inteligencia de decisión que va más allá del pricing simple.
 * Modela incertidumbre, velocidad de mercado, riesgo de espera y fairness multi-dimensional.
 */

// ============================================================================
// AVM RESULTS (Automated Valuation Model)
// ============================================================================

export interface AVMResult {
  id: string;
  propertyId: string;
  modelVersion: string;
  
  // Estimaciones
  estimate: number;
  lowEstimate: number;
  highEstimate: number;
  
  // Métricas de confianza
  confidence: number; // 0-1
  uncertaintyLevel: 'low' | 'medium' | 'high';
  
  // Factores explicables (SHAP-like)
  topFactors: Record<string, number>;
  // Ejemplo: { "location": 0.12, "size": 0.08, "age": -0.05, "noise": -0.03 }
  
  // Metadatos
  comparableCount: number;
  generatedAt: string;
  expiresAt?: string;
}

// ============================================================================
// MARKET PRESSURE
// ============================================================================

export interface MarketPressure {
  id: string;
  propertyId: string;
  
  // Nivel de presión
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
  direction: 'upward' | 'downward' | 'neutral';
  velocity: 'slow' | 'moderate' | 'fast';
  
  // Señales agregadas
  signals: {
    activeOffers?: number;
    recentVisits48h?: number;
    viewsLastWeek?: number;
    priceDrops?: number;
    daysOnMarket?: number;
    [key: string]: unknown;
  };
  
  // Score numérico
  pressureScore: number; // 0-100
  
  createdAt: string;
}

// ============================================================================
// MARKET DYNAMICS (Velocidad y Cambio de Régimen)
// ============================================================================

export interface MarketDynamics {
  id: string;
  propertyId?: string;
  zoneId?: string;
  
  // Velocidad de mercado
  marketVelocity: 'accelerating' | 'stable' | 'decelerating';
  velocityScore: number; // 0-100
  
  // Cambio de régimen detectado
  regimeChangeDetected: boolean;
  regimeChangeDate?: string;
  regimeChangeType?: 'acceleration' | 'deceleration' | 'stabilization';
  
  // Métricas históricas
  priceTrend30d?: 'rising' | 'stable' | 'falling';
  inventoryTrend30d?: 'increasing' | 'stable' | 'decreasing';
  activityTrend30d?: 'increasing' | 'stable' | 'decreasing';
  
  // Datos de análisis
  analysisData: {
    priceChangePoints?: string[];
    velocityIndicators?: Record<string, number>;
    [key: string]: unknown;
  };
  
  calculatedAt: string;
  validUntil?: string;
}

// ============================================================================
// DECISION RISK (Riesgo de Espera vs Actuar)
// ============================================================================

export interface DecisionRisk {
  id: string;
  propertyId: string;
  userId?: string;
  
  // Riesgo de espera
  waitRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  waitRiskScore: number; // 0-100
  
  // Riesgo de actuar ahora
  actNowRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  actNowRiskScore: number; // 0-100
  
  // Recomendación
  recommendation: 'wait' | 'act_now' | 'negotiate' | 'monitor';
  recommendationConfidence: number; // 0-100
  
  // Escenarios simulados
  scenarios: DecisionScenario[];
  
  // Factores de riesgo
  riskFactors: {
    highCompetition?: boolean;
    acceleratingMarket?: boolean;
    priceAboveEstimate?: boolean;
    sellerMotivated?: boolean;
    [key: string]: unknown;
  };
  
  calculatedAt: string;
  expiresAt?: string;
}

export interface DecisionScenario {
  action: string; // "wait_7_days", "act_now", etc.
  probabilityLose?: number; // 0-1
  probabilitySuccess?: number; // 0-1
  expectedPriceChange?: number; // porcentaje
  expectedPrice?: number;
  riskFactors: string[];
}

// ============================================================================
// FAIRNESS SCORE v3 (Multi-dimensional)
// ============================================================================

export interface FairnessScoreV3 {
  id: string;
  offerId?: string;
  propertyId: string;
  
  // Fairness multi-dimensional
  priceFairness: 'green' | 'yellow' | 'red';
  uncertaintyFairness: 'green' | 'yellow' | 'red';
  riskFairness: 'green' | 'yellow' | 'red';
  velocityFairness: 'green' | 'yellow' | 'red';
  
  // Scores numéricos
  priceScore: number; // 0-100
  uncertaintyScore: number; // 0-100
  riskScore: number; // 0-100
  velocityScore: number; // 0-100
  
  // Score compuesto
  overallFairnessScore: number; // 0-100
  
  // Referencias
  avmResultId?: string;
  marketPressureId?: string;
  marketDynamicsId?: string;
  decisionRiskId?: string;
  
  modelVersion: string;
  
  // Snapshots
  pressureSnapshot: Record<string, unknown>;
  dynamicsSnapshot: Record<string, unknown>;
  
  createdAt: string;
}

// ============================================================================
// DECISION INTELLIGENCE (Panel Completo)
// ============================================================================

export interface DecisionIntelligence {
  propertyId: string;
  offerAmount?: number;
  
  // Componentes
  avm?: AVMResult;
  marketPressure?: MarketPressure;
  marketDynamics?: MarketDynamics;
  decisionRisk?: DecisionRisk;
  fairness?: FairnessScoreV3;
  
  // Resumen ejecutivo
  summary: {
    priceRange: {
      low: number;
      high: number;
      estimate: number;
    };
    uncertaintyLevel: 'low' | 'medium' | 'high';
    marketVelocity: 'accelerating' | 'stable' | 'decelerating';
    waitRisk: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'wait' | 'act_now' | 'negotiate' | 'monitor';
  };
  
  // Panel de fairness
  fairnessPanel: {
    price: {
      status: 'green' | 'yellow' | 'red';
      score: number;
      explanation: string;
    };
    uncertainty: {
      status: 'green' | 'yellow' | 'red';
      score: number;
      explanation: string;
    };
    risk: {
      status: 'green' | 'yellow' | 'red';
      score: number;
      explanation: string;
    };
    velocity: {
      status: 'green' | 'yellow' | 'red';
      score: number;
      explanation: string;
    };
  };
  
  // Insights para el copiloto
  insights: {
    keyFactors: string[];
    risks: string[];
    opportunities: string[];
    timing: string;
  };
  
  generatedAt: string;
}

// ============================================================================
// UNCERTAINTY METRICS (Métricas de Incertidumbre)
// ============================================================================

export interface UncertaintyMetrics {
  level: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  rangeWidth: number; // diferencia porcentual entre high y low
  historicalAccuracy?: number; // MAE histórico del modelo
  comparableCount: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface DecisionIntelligenceRequest {
  propertyId: string;
  offerAmount?: number;
  userId?: string; // Para personalización
  includeScenarios?: boolean;
}

export interface DecisionIntelligenceResponse {
  success: boolean;
  data?: DecisionIntelligence;
  error?: string;
}


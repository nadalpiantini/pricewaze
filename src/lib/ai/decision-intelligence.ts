/**
 * Decision Intelligence Engine
 * 
 * Sistema de inteligencia de decisión que va más allá del pricing simple.
 * Modela incertidumbre, velocidad de mercado, riesgo de espera y fairness multi-dimensional.
 */

import type {
  AVMResult,
  MarketPressure,
  MarketDynamics,
  DecisionRisk,
  FairnessScoreV3,
  DecisionIntelligence,
  DecisionScenario,
  UncertaintyMetrics,
} from '@/types/decision-intelligence';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// AVM CALCULATION (Automated Valuation Model)
// ============================================================================

interface PropertyData {
  id: string;
  price: number;
  area_m2?: number;
  zone_id?: string;
  created_at: string;
  property_type?: string;
}

interface ZoneData {
  id: string;
  name: string;
  avg_price_m2?: number;
}

/**
 * Calcula AVM result básico usando datos de zona y propiedad
 * En producción, esto se reemplazaría con LightGBM/OpenAVMKit
 */
export async function calculateAVMResult(
  supabase: SupabaseClient,
  property: PropertyData,
  zone?: ZoneData
): Promise<AVMResult | null> {
  try {
    // Intentar obtener AVM result existente y válido
    const { data: existing } = await supabase
      .from('pricewaze_avm_results')
      .select('*')
      .eq('property_id', property.id)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return mapAVMResultFromDB(existing);
    }

    // Calcular AVM básico si no existe
    const estimate = property.area_m2 && zone?.avg_price_m2
      ? zone.avg_price_m2 * property.area_m2
      : property.price;

    // Calcular rango de confianza (simplificado)
    // En producción, esto vendría de un modelo con intervalos conformales
    const confidence = calculateConfidence(property, zone);
    const rangeWidth = confidence < 0.7 ? 0.25 : confidence < 0.85 ? 0.15 : 0.10;
    
    const lowEstimate = estimate * (1 - rangeWidth);
    const highEstimate = estimate * (1 + rangeWidth);

    // Determinar nivel de incertidumbre
    const uncertaintyLevel: 'low' | 'medium' | 'high' =
      confidence >= 0.85 ? 'low' : confidence >= 0.7 ? 'medium' : 'high';

    // Factores básicos (en producción, vendrían de SHAP)
    const topFactors: Record<string, number> = {};
    if (zone?.avg_price_m2) {
      topFactors.location = 0.12;
    }
    if (property.area_m2) {
      topFactors.size = 0.08;
    }
    const daysOnMarket = Math.floor(
      (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOnMarket > 90) {
      topFactors.age = -0.05;
    }

    const avmResult: AVMResult = {
      id: '', // Se asignará al guardar
      propertyId: property.id,
      modelVersion: 'v1.0',
      estimate,
      lowEstimate,
      highEstimate,
      confidence,
      uncertaintyLevel,
      topFactors,
      comparableCount: 0, // Se calcularía con datos reales
      generatedAt: new Date().toISOString(),
    };

    // Guardar en DB (opcional, puede ser async)
    saveAVMResult(supabase, avmResult).catch(console.error);

    return avmResult;
  } catch (error) {
    console.error('Error calculating AVM result:', error);
    return null;
  }
}

function calculateConfidence(property: PropertyData, zone?: ZoneData): number {
  let confidence = 0.5; // Base

  // Más confianza si hay área y zona
  if (property.area_m2 && zone?.avg_price_m2) {
    confidence += 0.3;
  }

  // Menos confianza si no hay zona
  if (!zone) {
    confidence -= 0.2;
  }

  return Math.max(0.3, Math.min(0.95, confidence));
}

function mapAVMResultFromDB(row: any): AVMResult {
  return {
    id: row.id,
    propertyId: row.property_id,
    modelVersion: row.model_version,
    estimate: Number(row.estimate),
    lowEstimate: Number(row.low_estimate),
    highEstimate: Number(row.high_estimate),
    confidence: Number(row.confidence),
    uncertaintyLevel: row.uncertainty_level,
    topFactors: row.top_factors || {},
    comparableCount: row.comparable_count || 0,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
  };
}

async function saveAVMResult(supabase: SupabaseClient, avm: AVMResult): Promise<void> {
  const { error } = await supabase.from('pricewaze_avm_results').insert({
    property_id: avm.propertyId,
    model_version: avm.modelVersion,
    estimate: avm.estimate,
    low_estimate: avm.lowEstimate,
    high_estimate: avm.highEstimate,
    confidence: avm.confidence,
    uncertainty_level: avm.uncertaintyLevel,
    top_factors: avm.topFactors,
    comparable_count: avm.comparableCount,
    generated_at: avm.generatedAt,
    expires_at: avm.expiresAt || null,
  });

  if (error) {
    console.error('Error saving AVM result:', error);
  }
}

// ============================================================================
// MARKET PRESSURE CALCULATION
// ============================================================================

/**
 * Calcula presión de mercado basada en señales, ofertas, visitas
 */
export async function calculateMarketPressure(
  supabase: SupabaseClient,
  propertyId: string
): Promise<MarketPressure | null> {
  try {
    // Intentar obtener presión existente reciente
    const { data: existing } = await supabase
      .from('pricewaze_market_pressure')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Si existe y es reciente (< 1 hora), reutilizar
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime();
      if (age < 60 * 60 * 1000) {
        return mapMarketPressureFromDB(existing);
      }
    }

    // Calcular presión nueva
    const [offers, visits, signals, property] = await Promise.all([
      // Ofertas activas
      supabase
        .from('pricewaze_offers')
        .select('id')
        .eq('property_id', propertyId)
        .in('status', ['pending', 'countered'])
        .gt('expires_at', new Date().toISOString()),
      
      // Visitas recientes (48h)
      supabase
        .from('pricewaze_visits')
        .select('id, created_at')
        .eq('property_id', propertyId)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
      
      // Señales activas
      supabase
        .from('pricewaze_property_signal_state')
        .select('signal_type, strength, confirmed')
        .eq('property_id', propertyId)
        .gt('strength', 0),
      
      // Propiedad para días en mercado
      supabase
        .from('pricewaze_properties')
        .select('created_at, price')
        .eq('id', propertyId)
        .single(),
    ]);

    const activeOffers = offers.data?.length || 0;
    const recentVisits = visits.data?.length || 0;
    const signalCount = signals.data?.length || 0;
    const daysOnMarket = property.data
      ? Math.floor(
          (Date.now() - new Date(property.data.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    // Calcular presión
    let pressureScore = 50; // Base
    
    if (activeOffers >= 3) pressureScore += 30;
    else if (activeOffers >= 2) pressureScore += 20;
    else if (activeOffers >= 1) pressureScore += 10;

    if (recentVisits >= 5) pressureScore += 20;
    else if (recentVisits >= 3) pressureScore += 10;

    if (signalCount >= 3) pressureScore += 15;

    if (daysOnMarket < 7) pressureScore += 10;
    else if (daysOnMarket > 90) pressureScore -= 15;

    pressureScore = Math.max(0, Math.min(100, pressureScore));

    const pressureLevel: 'low' | 'medium' | 'high' | 'critical' =
      pressureScore >= 80 ? 'critical' :
      pressureScore >= 60 ? 'high' :
      pressureScore >= 40 ? 'medium' : 'low';

    const direction: 'upward' | 'downward' | 'neutral' =
      activeOffers >= 2 || recentVisits >= 5 ? 'upward' :
      daysOnMarket > 90 ? 'downward' : 'neutral';

    const velocity: 'slow' | 'moderate' | 'fast' =
      activeOffers >= 3 && recentVisits >= 5 ? 'fast' :
      activeOffers >= 1 || recentVisits >= 3 ? 'moderate' : 'slow';

    const marketPressure: MarketPressure = {
      id: '',
      propertyId,
      pressureLevel,
      direction,
      velocity,
      signals: {
        activeOffers,
        recentVisits48h: recentVisits,
        daysOnMarket,
        signalCount,
      },
      pressureScore,
      createdAt: new Date().toISOString(),
    };

    // Guardar en DB
    saveMarketPressure(supabase, marketPressure).catch(console.error);

    return marketPressure;
  } catch (error) {
    console.error('Error calculating market pressure:', error);
    return null;
  }
}

function mapMarketPressureFromDB(row: any): MarketPressure {
  return {
    id: row.id,
    propertyId: row.property_id,
    pressureLevel: row.pressure_level,
    direction: row.direction,
    velocity: row.velocity,
    signals: row.signals || {},
    pressureScore: Number(row.pressure_score),
    createdAt: row.created_at,
  };
}

async function saveMarketPressure(supabase: SupabaseClient, pressure: MarketPressure): Promise<void> {
  const { error } = await supabase.from('pricewaze_market_pressure').insert({
    property_id: pressure.propertyId,
    pressure_level: pressure.pressureLevel,
    direction: pressure.direction,
    velocity: pressure.velocity,
    signals: pressure.signals,
    pressure_score: pressure.pressureScore,
    created_at: pressure.createdAt,
  });

  if (error) {
    console.error('Error saving market pressure:', error);
  }
}

// ============================================================================
// MARKET DYNAMICS CALCULATION (Velocidad y Cambio de Régimen)
// ============================================================================

/**
 * Calcula dinámicas de mercado (velocidad, cambio de régimen)
 * En producción, usaría ruptures para change point detection
 */
export async function calculateMarketDynamics(
  supabase: SupabaseClient,
  propertyId: string,
  zoneId?: string
): Promise<MarketDynamics | null> {
  try {
    // Intentar obtener dinámicas existentes
    const { data: existing } = await supabase
      .from('pricewaze_market_dynamics')
      .select('*')
      .eq('property_id', propertyId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const age = Date.now() - new Date(existing.calculated_at).getTime();
      if (age < 24 * 60 * 60 * 1000) { // < 24 horas
        return mapMarketDynamicsFromDB(existing);
      }
    }

    // Obtener historial de precios y actividad
    const [priceHistory, recentActivity] = await Promise.all([
      supabase
        .from('pricewaze_property_price_history')
        .select('price, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(30),
      
      supabase
        .from('pricewaze_visits')
        .select('created_at')
        .eq('property_id', propertyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Calcular tendencias (simplificado)
    const prices = priceHistory.data || [];
    const priceTrend30d = calculatePriceTrend(prices);
    const activityTrend30d = calculateActivityTrend(recentActivity.data || []);

    // Detectar velocidad (simplificado)
    // En producción, usaría ruptures para detectar change points
    const velocityScore = calculateVelocityScore(prices, recentActivity.data || []);
    const marketVelocity: 'accelerating' | 'stable' | 'decelerating' =
      velocityScore >= 70 ? 'accelerating' :
      velocityScore <= 30 ? 'decelerating' : 'stable';

    // Detectar cambio de régimen (básico)
    const regimeChange = detectRegimeChange(prices);

    const marketDynamics: MarketDynamics = {
      id: '',
      propertyId,
      zoneId: zoneId || undefined,
      marketVelocity,
      velocityScore,
      regimeChangeDetected: regimeChange.detected,
      regimeChangeDate: regimeChange.date,
      regimeChangeType: regimeChange.type,
      priceTrend30d,
      activityTrend30d,
      analysisData: {
        priceChangePoints: regimeChange.changePoints,
        velocityIndicators: {
          visits: recentActivity.data?.length || 0,
          priceChanges: prices.length,
        },
      },
      calculatedAt: new Date().toISOString(),
    };

    // Guardar en DB
    saveMarketDynamics(supabase, marketDynamics).catch(console.error);

    return marketDynamics;
  } catch (error) {
    console.error('Error calculating market dynamics:', error);
    return null;
  }
}

function calculatePriceTrend(prices: Array<{ price: number; created_at: string }>): 'rising' | 'stable' | 'falling' {
  if (!Array.isArray(prices) || prices.length < 2) return 'stable';
  
  const recent = prices.slice(0, 5);
  const oldest = recent[recent.length - 1];
  const newest = recent[0];
  
  const change = ((newest.price - oldest.price) / oldest.price) * 100;
  
  if (change > 2) return 'rising';
  if (change < -2) return 'falling';
  return 'stable';
}

function calculateActivityTrend(activities: Array<{ created_at: string }>): 'increasing' | 'stable' | 'decreasing' {
  if (!Array.isArray(activities) || activities.length < 4) return 'stable';
  
  const mid = Math.floor(activities.length / 2);
  const firstHalf = activities.slice(mid);
  const secondHalf = activities.slice(0, mid);
  
  if (secondHalf.length > firstHalf.length * 1.2) return 'increasing';
  if (secondHalf.length < firstHalf.length * 0.8) return 'decreasing';
  return 'stable';
}

function calculateVelocityScore(
  prices: Array<{ price: number; created_at: string }>,
  activities: Array<{ created_at: string }>
): number {
  let score = 50;
  
  // Más actividad = más velocidad
  if (activities.length >= 10) score += 20;
  else if (activities.length >= 5) score += 10;
  
  // Cambios de precio recientes = más velocidad
  if (prices.length >= 3) score += 15;
  else if (prices.length >= 1) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function detectRegimeChange(
  prices: Array<{ price: number; created_at: string }>
): {
  detected: boolean;
  date?: string;
  type?: 'acceleration' | 'deceleration' | 'stabilization';
  changePoints: string[];
} {
  // Detección básica de cambio de régimen
  // En producción, usaría ruptures library
  if (prices.length < 3) {
    return { detected: false, changePoints: [] };
  }

  const changePoints: string[] = [];
  let lastPrice = prices[0].price;
  let trend: 'up' | 'down' | 'stable' = 'stable';

  for (let i = 1; i < prices.length; i++) {
    const change = ((prices[i].price - lastPrice) / lastPrice) * 100;
    
    if (Math.abs(change) > 5) {
      changePoints.push(prices[i].created_at);
      
      if (change > 5 && trend !== 'up') {
        trend = 'up';
      } else if (change < -5 && trend !== 'down') {
        trend = 'down';
      }
    }
    
    lastPrice = prices[i].price;
  }

  return {
    detected: changePoints.length > 0,
    date: changePoints[0],
    type: trend === 'up' ? 'acceleration' : trend === 'down' ? 'deceleration' : 'stabilization',
    changePoints,
  };
}

function mapMarketDynamicsFromDB(row: any): MarketDynamics {
  return {
    id: row.id,
    propertyId: row.property_id,
    zoneId: row.zone_id,
    marketVelocity: row.market_velocity,
    velocityScore: Number(row.velocity_score),
    regimeChangeDetected: row.regime_change_detected,
    regimeChangeDate: row.regime_change_date,
    regimeChangeType: row.regime_change_type,
    priceTrend30d: row.price_trend_30d,
    inventoryTrend30d: row.inventory_trend_30d,
    activityTrend30d: row.activity_trend_30d,
    analysisData: row.analysis_data || {},
    calculatedAt: row.calculated_at,
    validUntil: row.valid_until,
  };
}

async function saveMarketDynamics(supabase: SupabaseClient, dynamics: MarketDynamics): Promise<void> {
  const { error } = await supabase.from('pricewaze_market_dynamics').insert({
    property_id: dynamics.propertyId,
    zone_id: dynamics.zoneId || null,
    market_velocity: dynamics.marketVelocity,
    velocity_score: dynamics.velocityScore,
    regime_change_detected: dynamics.regimeChangeDetected,
    regime_change_date: dynamics.regimeChangeDate || null,
    regime_change_type: dynamics.regimeChangeType || null,
    price_trend_30d: dynamics.priceTrend30d || null,
    activity_trend_30d: dynamics.activityTrend30d || null,
    analysis_data: dynamics.analysisData,
    calculated_at: dynamics.calculatedAt,
    valid_until: dynamics.validUntil || null,
  });

  if (error) {
    console.error('Error saving market dynamics:', error);
  }
}

// ============================================================================
// DECISION RISK CALCULATION (Riesgo de Espera vs Actuar)
// ============================================================================

/**
 * Calcula riesgo de esperar vs actuar ahora
 */
export async function calculateDecisionRisk(
  supabase: SupabaseClient,
  propertyId: string,
  userId?: string,
  offerAmount?: number
): Promise<DecisionRisk | null> {
  try {
    // Obtener contexto
    const [property, avm, pressure, dynamics] = await Promise.all([
      supabase
        .from('pricewaze_properties')
        .select('price, created_at, zone_id')
        .eq('id', propertyId)
        .single(),
      
      supabase.rpc('pricewaze_get_latest_avm_result', { p_property_id: propertyId }),
      
      supabase.rpc('pricewaze_get_latest_market_pressure', { p_property_id: propertyId }),
      
      supabase
        .from('pricewaze_market_dynamics')
        .select('*')
        .eq('property_id', propertyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const propertyData = property.data;
    if (!propertyData) return null;

    const avmData = avm.data?.[0];
    const pressureData = pressure.data?.[0];
    const dynamicsData = dynamics.data;

    // Calcular riesgo de espera
    let waitRiskScore = 50;
    const riskFactors: Record<string, boolean> = {};

    // Alta competencia aumenta riesgo de espera
    if (pressureData?.pressure_level === 'high' || pressureData?.pressure_level === 'critical') {
      waitRiskScore += 30;
      riskFactors.highCompetition = true;
    } else if (pressureData?.pressure_level === 'medium') {
      waitRiskScore += 15;
    }

    // Mercado acelerando aumenta riesgo de espera
    if (dynamicsData?.market_velocity === 'accelerating') {
      waitRiskScore += 25;
      riskFactors.acceleratingMarket = true;
    }

    // Precio por encima de estimación reduce riesgo de espera
    if (offerAmount && avmData) {
      if (offerAmount > avmData.high_estimate) {
        waitRiskScore -= 20;
        riskFactors.priceAboveEstimate = true;
      } else if (offerAmount < avmData.low_estimate) {
        waitRiskScore += 15;
      }
    }

    waitRiskScore = Math.max(0, Math.min(100, waitRiskScore));

    const waitRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
      waitRiskScore >= 80 ? 'critical' :
      waitRiskScore >= 60 ? 'high' :
      waitRiskScore >= 40 ? 'medium' : 'low';

    // Calcular riesgo de actuar ahora
    let actNowRiskScore = 50;

    if (offerAmount && avmData) {
      const ratio = offerAmount / avmData.estimate;
      if (ratio > 1.1) {
        actNowRiskScore += 20; // Pagar mucho más que estimado
      } else if (ratio < 0.9) {
        actNowRiskScore -= 15; // Buena oportunidad
      }
    }

    actNowRiskScore = Math.max(0, Math.min(100, actNowRiskScore));

    const actNowRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
      actNowRiskScore >= 80 ? 'critical' :
      actNowRiskScore >= 60 ? 'high' :
      actNowRiskScore >= 40 ? 'medium' : 'low';

    // Generar recomendación
    const recommendation = determineRecommendation(waitRiskScore, actNowRiskScore, pressureData, dynamicsData);
    const recommendationConfidence = calculateRecommendationConfidence(avmData, pressureData, dynamicsData);

    // Generar escenarios
    const scenarios = generateScenarios(propertyData, avmData, pressureData, dynamicsData, offerAmount);

    const decisionRisk: DecisionRisk = {
      id: '',
      propertyId,
      userId: userId || undefined,
      waitRiskLevel,
      waitRiskScore,
      actNowRiskLevel,
      actNowRiskScore,
      recommendation,
      recommendationConfidence,
      scenarios,
      riskFactors,
      calculatedAt: new Date().toISOString(),
    };

    // Guardar en DB
    saveDecisionRisk(supabase, decisionRisk).catch(console.error);

    return decisionRisk;
  } catch (error) {
    console.error('Error calculating decision risk:', error);
    return null;
  }
}

function determineRecommendation(
  waitRisk: number,
  actNowRisk: number,
  pressure?: any,
  dynamics?: any
): 'wait' | 'act_now' | 'negotiate' | 'monitor' {
  // Si riesgo de espera es muy alto, actuar
  if (waitRisk >= 70) {
    return 'act_now';
  }

  // Si riesgo de actuar es muy alto, esperar
  if (actNowRisk >= 70) {
    return 'wait';
  }

  // Si hay presión pero precio es razonable, negociar
  if (pressure?.pressure_level === 'high' && actNowRisk < 60) {
    return 'negotiate';
  }

  // Si mercado es estable, monitorear
  if (dynamics?.market_velocity === 'stable' && waitRisk < 50) {
    return 'monitor';
  }

  // Default: negociar
  return 'negotiate';
}

function calculateRecommendationConfidence(avm?: any, pressure?: any, dynamics?: any): number {
  let confidence = 50;

  if (avm) confidence += 20;
  if (pressure) confidence += 15;
  if (dynamics) confidence += 15;

  return Math.min(100, confidence);
}

function generateScenarios(
  property: any,
  avm?: any,
  pressure?: any,
  dynamics?: any,
  offerAmount?: number
): DecisionScenario[] {
  const scenarios: DecisionScenario[] = [];

  // Escenario: Esperar 7 días
  scenarios.push({
    action: 'wait_7_days',
    probabilityLose: pressure?.pressure_level === 'high' ? 0.35 : pressure?.pressure_level === 'medium' ? 0.20 : 0.10,
    expectedPriceChange: dynamics?.market_velocity === 'accelerating' ? 0.02 : 0,
    riskFactors: [
      ...(pressure?.pressure_level === 'high' ? ['high_competition'] : []),
      ...(dynamics?.market_velocity === 'accelerating' ? ['accelerating_market'] : []),
    ],
  });

  // Escenario: Actuar ahora
  scenarios.push({
    action: 'act_now',
    probabilitySuccess: offerAmount && avm
      ? offerAmount >= avm.low_estimate && offerAmount <= avm.high_estimate ? 0.65 : 0.45
      : 0.50,
    expectedPrice: offerAmount || property.price,
    riskFactors: [
      ...(offerAmount && avm && offerAmount > avm.high_estimate ? ['price_above_estimate'] : []),
    ],
  });

  return scenarios;
}

function mapDecisionRiskFromDB(row: any): DecisionRisk {
  return {
    id: row.id,
    propertyId: row.property_id,
    userId: row.user_id,
    waitRiskLevel: row.wait_risk_level,
    waitRiskScore: Number(row.wait_risk_score),
    actNowRiskLevel: row.act_now_risk_level,
    actNowRiskScore: Number(row.act_now_risk_score),
    recommendation: row.recommendation,
    recommendationConfidence: Number(row.recommendation_confidence),
    scenarios: row.scenarios || [],
    riskFactors: row.risk_factors || {},
    calculatedAt: row.calculated_at,
    expiresAt: row.expires_at,
  };
}

async function saveDecisionRisk(supabase: SupabaseClient, risk: DecisionRisk): Promise<void> {
  const { error } = await supabase.from('pricewaze_decision_risk').insert({
    property_id: risk.propertyId,
    user_id: risk.userId || null,
    wait_risk_level: risk.waitRiskLevel,
    wait_risk_score: risk.waitRiskScore,
    act_now_risk_level: risk.actNowRiskLevel,
    act_now_risk_score: risk.actNowRiskScore,
    recommendation: risk.recommendation,
    recommendation_confidence: risk.recommendationConfidence,
    scenarios: risk.scenarios,
    risk_factors: risk.riskFactors,
    calculated_at: risk.calculatedAt,
    expires_at: risk.expiresAt || null,
  });

  if (error) {
    console.error('Error saving decision risk:', error);
  }
}

// ============================================================================
// FAIRNESS SCORE v3 (Multi-dimensional)
// ============================================================================

/**
 * Calcula fairness score v3 usando función SQL
 */
export async function calculateFairnessV3(
  supabase: SupabaseClient,
  offerAmount: number,
  propertyId: string
): Promise<FairnessScoreV3 | null> {
  try {
    const { data, error } = await supabase.rpc('pricewaze_calculate_fairness_v3', {
      p_offer_amount: offerAmount,
      p_property_id: propertyId,
    });

    if (error || !data || data.length === 0) {
      console.error('Error calculating fairness v3:', error);
      return null;
    }

    const result = data[0];

    // Obtener IDs de referencias
    const [avm, pressure, dynamics, risk] = await Promise.all([
      supabase.rpc('pricewaze_get_latest_avm_result', { p_property_id: propertyId }),
      supabase.rpc('pricewaze_get_latest_market_pressure', { p_property_id: propertyId }),
      supabase
        .from('pricewaze_market_dynamics')
        .select('id, analysis_data')
        .eq('property_id', propertyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('pricewaze_decision_risk')
        .select('id')
        .eq('property_id', propertyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const fairness: FairnessScoreV3 = {
      id: '',
      propertyId,
      priceFairness: result.price_fairness,
      uncertaintyFairness: result.uncertainty_fairness,
      riskFairness: result.risk_fairness,
      velocityFairness: result.velocity_fairness,
      priceScore: Number(result.price_score),
      uncertaintyScore: Number(result.uncertainty_score),
      riskScore: Number(result.risk_score),
      velocityScore: Number(result.velocity_score),
      overallFairnessScore: Number(result.overall_score),
      avmResultId: avm.data?.[0]?.id,
      marketPressureId: pressure.data?.[0]?.id,
      marketDynamicsId: dynamics.data?.id,
      decisionRiskId: risk.data?.id,
      modelVersion: 'v3.0',
      pressureSnapshot: pressure.data?.[0]?.signals || {},
      dynamicsSnapshot: dynamics.data?.analysis_data || {},
      createdAt: new Date().toISOString(),
    };

    return fairness;
  } catch (error) {
    console.error('Error calculating fairness v3:', error);
    return null;
  }
}

// ============================================================================
// MAIN DECISION INTELLIGENCE FUNCTION
// ============================================================================

/**
 * Genera análisis completo de Decision Intelligence
 */
export async function generateDecisionIntelligence(
  supabase: SupabaseClient,
  propertyId: string,
  offerAmount?: number,
  userId?: string
): Promise<DecisionIntelligence | null> {
  try {
    // Obtener datos de propiedad
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id, price, area_m2, zone_id, created_at, property_type')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('Property not found:', propertyError);
      return null;
    }

    // Obtener zona
    const zone = property.zone_id
      ? await supabase
          .from('pricewaze_zones')
          .select('id, name, avg_price_m2')
          .eq('id', property.zone_id)
          .single()
      : null;

    // Calcular todos los componentes en paralelo
    const [avm, pressure, dynamics, risk, fairness] = await Promise.all([
      calculateAVMResult(supabase, property, zone?.data || undefined),
      calculateMarketPressure(supabase, propertyId),
      calculateMarketDynamics(supabase, propertyId, property.zone_id || undefined),
      calculateDecisionRisk(supabase, propertyId, userId, offerAmount),
      offerAmount ? calculateFairnessV3(supabase, offerAmount, propertyId) : Promise.resolve(null),
    ]);

    // Generar resumen ejecutivo
    const summary = {
      priceRange: {
        low: avm?.lowEstimate || property.price * 0.85,
        high: avm?.highEstimate || property.price * 1.15,
        estimate: avm?.estimate || property.price,
      },
      uncertaintyLevel: avm?.uncertaintyLevel || 'medium',
      marketVelocity: dynamics?.marketVelocity || 'stable',
      waitRisk: risk?.waitRiskLevel || 'medium',
      recommendation: risk?.recommendation || 'monitor',
    };

    // Generar panel de fairness
    const fairnessPanel = {
      price: {
        status: fairness?.priceFairness || 'yellow',
        score: fairness?.priceScore || 50,
        explanation: generatePriceExplanation(fairness, avm, offerAmount),
      },
      uncertainty: {
        status: fairness?.uncertaintyFairness || 'yellow',
        score: fairness?.uncertaintyScore || 50,
        explanation: generateUncertaintyExplanation(avm),
      },
      risk: {
        status: fairness?.riskFairness || 'yellow',
        score: fairness?.riskScore || 50,
        explanation: generateRiskExplanation(risk),
      },
      velocity: {
        status: fairness?.velocityFairness || 'yellow',
        score: fairness?.velocityScore || 50,
        explanation: generateVelocityExplanation(dynamics),
      },
    };

    // Generar insights
    const insights = {
      keyFactors: generateKeyFactors(avm, pressure, dynamics),
      risks: generateRisks(risk, dynamics, pressure),
      opportunities: generateOpportunities(avm, risk, pressure),
      timing: generateTimingAdvice(risk, dynamics),
    };

    const decisionIntelligence: DecisionIntelligence = {
      propertyId,
      offerAmount,
      avm: avm || undefined,
      marketPressure: pressure || undefined,
      marketDynamics: dynamics || undefined,
      decisionRisk: risk || undefined,
      fairness: fairness || undefined,
      summary,
      fairnessPanel,
      insights,
      generatedAt: new Date().toISOString(),
    };

    return decisionIntelligence;
  } catch (error) {
    console.error('Error generating decision intelligence:', error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR EXPLANATIONS
// ============================================================================

function generatePriceExplanation(
  fairness: FairnessScoreV3 | null,
  avm: AVMResult | null,
  offerAmount?: number
): string {
  if (!fairness || !avm || !offerAmount) {
    return 'Análisis de precio no disponible';
  }

  if (offerAmount >= avm.lowEstimate && offerAmount <= avm.highEstimate) {
    return `Oferta dentro del rango justo estimado (${avm.lowEstimate.toLocaleString()} - ${avm.highEstimate.toLocaleString()})`;
  } else if (offerAmount < avm.lowEstimate) {
    return `Oferta por debajo del rango justo. Podría ser agresiva o reflejar condiciones del mercado.`;
  } else {
    return `Oferta por encima del rango justo. Considera negociar o esperar.`;
  }
}

function generateUncertaintyExplanation(avm: AVMResult | null): string {
  if (!avm) {
    return 'Nivel de incertidumbre no disponible';
  }

  if (avm.uncertaintyLevel === 'low') {
    return `Incertidumbre baja (${(avm.confidence * 100).toFixed(0)}% confianza). Estimación basada en ${avm.comparableCount} comparables.`;
  } else if (avm.uncertaintyLevel === 'medium') {
    return `Incertidumbre media (${(avm.confidence * 100).toFixed(0)}% confianza). Considera validar con inspección.`;
  } else {
    return `Incertidumbre alta (${(avm.confidence * 100).toFixed(0)}% confianza). Datos limitados. Se recomienda análisis adicional.`;
  }
}

function generateRiskExplanation(risk: DecisionRisk | null): string {
  if (!risk) {
    return 'Análisis de riesgo no disponible';
  }

  if (risk.waitRiskLevel === 'critical' || risk.waitRiskLevel === 'high') {
    return `Riesgo de espera ${risk.waitRiskLevel}. Mercado activo puede reducir oportunidades.`;
  } else if (risk.waitRiskLevel === 'low') {
    return `Riesgo de espera bajo. Tienes margen para evaluar opciones.`;
  } else {
    return `Riesgo de espera moderado. Monitorea cambios en el mercado.`;
  }
}

function generateVelocityExplanation(dynamics: MarketDynamics | null): string {
  if (!dynamics) {
    return 'Velocidad de mercado no disponible';
  }

  if (dynamics.marketVelocity === 'accelerating') {
    return `Mercado acelerando. Cambios rápidos pueden afectar disponibilidad y precios.`;
  } else if (dynamics.marketVelocity === 'decelerating') {
    return `Mercado desacelerando. Más tiempo para evaluar opciones.`;
  } else {
    return `Mercado estable. Condiciones predecibles.`;
  }
}

function generateKeyFactors(avm: AVMResult | null, pressure: MarketPressure | null, dynamics: MarketDynamics | null): string[] {
  const factors: string[] = [];

  if (avm) {
    const topFactor = Object.entries(avm.topFactors)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0];
    if (topFactor) {
      factors.push(`${topFactor[0]}: ${(topFactor[1] * 100).toFixed(1)}% impacto`);
    }
  }

  if (pressure?.pressureLevel === 'high' || pressure?.pressureLevel === 'critical') {
    factors.push(`Alta presión competitiva (${pressure.signals.activeOffers || 0} ofertas activas)`);
  }

  if (dynamics?.marketVelocity === 'accelerating') {
    factors.push('Mercado acelerando - cambios rápidos');
  }

  return factors.length > 0 ? factors : ['Análisis en progreso'];
}

function generateRisks(risk: DecisionRisk | null, dynamics: MarketDynamics | null, pressure: MarketPressure | null): string[] {
  const risks: string[] = [];

  if (risk?.waitRiskLevel === 'high' || risk?.waitRiskLevel === 'critical') {
    risks.push('Alto riesgo de perder oportunidad si esperas');
  }

  if (dynamics?.marketVelocity === 'accelerating') {
    risks.push('Mercado acelerando puede cambiar condiciones rápidamente');
  }

  if (pressure?.pressureLevel === 'high') {
    risks.push('Alta competencia puede reducir margen de negociación');
  }

  return risks.length > 0 ? risks : ['Riesgos moderados'];
}

function generateOpportunities(avm: AVMResult | null, risk: DecisionRisk | null, pressure: MarketPressure | null): string[] {
  const opportunities: string[] = [];

  if (risk?.waitRiskLevel === 'low') {
    opportunities.push('Bajo riesgo de espera - tiempo para evaluar');
  }

  if (pressure?.pressureLevel === 'low' || pressure?.pressureLevel === 'medium') {
    opportunities.push('Competencia moderada permite negociación');
  }

  if (avm && avm.uncertaintyLevel === 'low') {
    opportunities.push('Estimación confiable facilita decisión informada');
  }

  return opportunities.length > 0 ? opportunities : ['Oportunidades a evaluar'];
}

function generateTimingAdvice(risk: DecisionRisk | null, dynamics: MarketDynamics | null): string {
  if (!risk && !dynamics) {
    return 'Análisis de timing no disponible';
  }

  if (risk?.recommendation === 'act_now') {
    return 'Momento oportuno para actuar. Esperar puede reducir oportunidades.';
  } else if (risk?.recommendation === 'wait') {
    return 'Considera esperar. Condiciones pueden mejorar.';
  } else if (risk?.recommendation === 'negotiate') {
    return 'Momento adecuado para negociar. Presión de mercado permite diálogo.';
  } else {
    return 'Monitorea cambios. Mercado estable permite evaluación cuidadosa.';
  }
}


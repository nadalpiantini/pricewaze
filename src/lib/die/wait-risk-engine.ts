/**
 * Wait-Risk Engine (DIE-2)
 * 
 * Estimates the risk of waiting X days before making an offer.
 * 
 * Key principle: Clear trade-offs (discipline vs probability of losing)
 * 
 * Uses:
 * - Historical scenarios (similar properties that sold quickly)
 * - Current pressure (competition, signals, velocity)
 * - Market dynamics (accelerating/decelerating)
 */

import type { WaitRisk, DIEInputs, MarketDynamics, CurrentPressure, PriceAssessment } from '@/types/die';
import { createClient } from '@/lib/supabase/server';

interface HistoricalScenario {
  daysOnMarket: number;
  soldPrice: number;
  originalPrice: number;
  hadCompetition: boolean;
}

/**
 * Calculate wait risk for a property
 */
export async function calculateWaitRisk(
  inputs: DIEInputs,
  marketDynamics: MarketDynamics,
  currentPressure: CurrentPressure,
  priceAssessment: PriceAssessment
): Promise<WaitRisk> {
  const { property } = inputs;
  const supabase = await createClient();

  // Get historical scenarios from similar properties
  const historicalScenarios = await getHistoricalScenarios(property.id, property.zone_id || '');

  // Calculate risk for different time horizons
  const riskByDays = [7, 14, 30, 60].map(days => 
    calculateRiskForDays(
      days,
      property,
      marketDynamics,
      currentPressure,
      priceAssessment,
      historicalScenarios
    )
  );

  // Determine overall recommendation
  const recommendation = determineRecommendation(riskByDays, currentPressure, marketDynamics);

  // Generate trade-offs
  const tradeoffs = generateTradeoffs(riskByDays, currentPressure, marketDynamics);

  return {
    riskByDays,
    recommendation,
    tradeoffs,
  };
}

/**
 * Get historical scenarios from similar properties in the zone
 */
async function getHistoricalScenarios(
  propertyId: string,
  zoneId: string
): Promise<HistoricalScenario[]> {
  if (!zoneId) return [];

  const supabase = await createClient();

  // Get properties in same zone that were sold
  const { data: soldProperties } = await supabase
    .from('pricewaze_properties')
    .select('id, price, created_at, updated_at')
    .eq('zone_id', zoneId)
    .eq('status', 'sold')
    .neq('id', propertyId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (!soldProperties || soldProperties.length === 0) {
    return [];
  }

  // Get price history for these properties
  const propertyIds = soldProperties.map(p => p.id);
  const { data: priceHistory } = await supabase
    .from('pricewaze_property_price_history')
    .select('property_id, price, changed_at')
    .in('property_id', propertyIds)
    .order('changed_at', { ascending: true });

  // Get offers for these properties to check competition
  const { data: offers } = await supabase
    .from('pricewaze_offers')
    .select('property_id, status')
    .in('property_id', propertyIds)
    .in('status', ['pending', 'countered', 'accepted']);

  // Build scenarios
  const scenarios: HistoricalScenario[] = [];

  for (const prop of soldProperties) {
    const initialPrice = priceHistory
      ?.filter(ph => ph.property_id === prop.id)
      .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())[0]?.price
      || prop.price;

    const finalPrice = prop.price; // Sold price
    const daysOnMarket = Math.floor(
      (new Date(prop.updated_at).getTime() - new Date(prop.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const hadCompetition = offers?.some(o => o.property_id === prop.id) || false;

    scenarios.push({
      daysOnMarket,
      soldPrice: Number(finalPrice),
      originalPrice: Number(initialPrice),
      hadCompetition,
    });
  }

  return scenarios;
}

/**
 * Calculate risk for waiting X days
 */
function calculateRiskForDays(
  days: number,
  property: DIEInputs['property'],
  marketDynamics: MarketDynamics,
  currentPressure: CurrentPressure,
  priceAssessment: PriceAssessment,
  historicalScenarios: HistoricalScenario[]
): WaitRisk['riskByDays'][0] {
  // Base risk factors
  let riskScore = 0;
  let probabilityOfLoss = 0;
  let expectedPriceChange = 0;

  // Factor 1: Current pressure (high pressure = high risk)
  if (currentPressure.level === 'high') {
    riskScore += 40;
    probabilityOfLoss += 0.3;
  } else if (currentPressure.level === 'medium') {
    riskScore += 20;
    probabilityOfLoss += 0.15;
  }

  // Factor 2: Market velocity (accelerating = high risk)
  if (marketDynamics.velocity === 'accelerating') {
    riskScore += 30;
    probabilityOfLoss += 0.25;
    expectedPriceChange += 0.03 * (days / 30); // 3% per month if accelerating
  } else if (marketDynamics.velocity === 'decelerating') {
    riskScore -= 10;
    expectedPriceChange -= 0.01 * (days / 30); // -1% per month if decelerating
  }

  // Factor 3: Competing offers (high risk)
  if (currentPressure.signals.competingOffers) {
    riskScore += 25;
    probabilityOfLoss += 0.35;
  }

  // Factor 4: Historical scenarios
  if (historicalScenarios.length > 0) {
    const similarScenarios = historicalScenarios.filter(s => 
      s.daysOnMarket <= days + 7 && s.hadCompetition === currentPressure.signals.competingOffers
    );

    if (similarScenarios.length > 0) {
      const avgPriceChange = similarScenarios.reduce((sum, s) => {
        const change = (s.soldPrice - s.originalPrice) / s.originalPrice;
        return sum + change;
      }, 0) / similarScenarios.length;

      expectedPriceChange += avgPriceChange * 0.5; // Weight historical data
      
      // If properties sold quickly with competition, high risk
      const quickSales = similarScenarios.filter(s => s.daysOnMarket <= days);
      if (quickSales.length > 0) {
        riskScore += 20;
        probabilityOfLoss += 0.2;
      }
    }
  }

  // Factor 5: Price position (if below range, less risk)
  if (priceAssessment.askingPriceStatus === 'below_range') {
    riskScore -= 15;
    probabilityOfLoss -= 0.1;
  } else if (priceAssessment.askingPriceStatus === 'above_range') {
    riskScore += 10;
    // More time to negotiate if overpriced
  }

  // Factor 6: Time horizon (longer = more risk)
  const timeMultiplier = Math.min(1.5, 1 + (days / 60));
  riskScore *= timeMultiplier;
  probabilityOfLoss = Math.min(0.9, probabilityOfLoss * timeMultiplier);

  // Clamp values
  riskScore = Math.max(0, Math.min(100, riskScore));
  probabilityOfLoss = Math.max(0, Math.min(0.9, probabilityOfLoss));
  expectedPriceChange = Math.max(-0.1, Math.min(0.15, expectedPriceChange)); // -10% to +15%

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore < 30) {
    riskLevel = 'low';
  } else if (riskScore < 60) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    days,
    riskLevel,
    riskScore: Math.round(riskScore),
    probabilityOfLoss: Math.round(probabilityOfLoss * 100) / 100,
    expectedPriceChange: Math.round(expectedPriceChange * 1000) / 1000, // 3 decimals
  };
}

/**
 * Determine overall recommendation
 */
function determineRecommendation(
  riskByDays: WaitRisk['riskByDays'],
  currentPressure: CurrentPressure,
  marketDynamics: MarketDynamics
): WaitRisk['recommendation'] {
  // If high pressure + accelerating, act now
  if (currentPressure.level === 'high' && marketDynamics.velocity === 'accelerating') {
    return 'act_now';
  }

  // If competing offers, act now
  if (currentPressure.signals.competingOffers) {
    return 'act_now';
  }

  // Check 7-day risk
  const risk7Days = riskByDays.find(r => r.days === 7);
  if (risk7Days && risk7Days.riskLevel === 'high') {
    return 'act_now';
  }

  // Check 14-day risk
  const risk14Days = riskByDays.find(r => r.days === 14);
  if (risk14Days && risk14Days.riskLevel === 'high') {
    return 'wait_short';
  }

  // Check 30-day risk
  const risk30Days = riskByDays.find(r => r.days === 30);
  if (risk30Days && risk30Days.riskLevel === 'medium') {
    return 'wait_medium';
  }

  // Default: can wait longer
  return 'wait_long';
}

/**
 * Generate trade-offs explanation
 */
function generateTradeoffs(
  riskByDays: WaitRisk['riskByDays'],
  currentPressure: CurrentPressure,
  marketDynamics: MarketDynamics
): WaitRisk['tradeoffs'] {
  const risk7Days = riskByDays.find(r => r.days === 7);
  const risk14Days = riskByDays.find(r => r.days === 14);
  const risk30Days = riskByDays.find(r => r.days === 30);

  let discipline = '';
  let probability = '';

  if (currentPressure.level === 'low' && marketDynamics.velocity === 'stable') {
    discipline = 'Esperar te permite evaluar mejor, negociar con más información y evitar decisiones apresuradas.';
    probability = risk30Days 
      ? `Riesgo bajo (${Math.round(risk30Days.probabilityOfLoss * 100)}%) de perder la oportunidad en 30 días.`
      : 'Riesgo bajo de perder la oportunidad.';
  } else if (currentPressure.level === 'high' || marketDynamics.velocity === 'accelerating') {
    discipline = 'Esperar puede darte más tiempo para evaluar, pero el mercado se mueve rápido.';
    probability = risk7Days
      ? `Riesgo alto (${Math.round(risk7Days.probabilityOfLoss * 100)}%) de perder la oportunidad en 7 días debido a la competencia y velocidad del mercado.`
      : 'Riesgo alto de perder la oportunidad por competencia activa.';
  } else {
    discipline = 'Esperar te da flexibilidad para negociar, pero hay competencia moderada.';
    probability = risk14Days
      ? `Riesgo moderado (${Math.round(risk14Days.probabilityOfLoss * 100)}%) de perder la oportunidad en 14 días.`
      : 'Riesgo moderado de perder la oportunidad.';
  }

  return {
    discipline,
    probability,
  };
}


/**
 * DIE_Explanations.v2.ts
 * 
 * Prompt v2 for Decision Intelligence Engine explanations
 * Level: 9.5/10 (explanation without calculation)
 * 
 * Improvements over v1:
 * - More human explanations
 * - Clear signal hierarchy
 * - Less technical noise
 * - 100% aligned with Decision Intelligence
 */

import { getMarketConfig } from '@/config/market';
import type { PriceAssessment, MarketDynamics, CurrentPressure, WaitRisk } from '@/types/die';

interface DIEExplanationsV2Input {
  property: {
    price: number;
    property_type: string;
  };
  priceAssessment: PriceAssessment;
  marketDynamics: MarketDynamics;
  currentPressure: CurrentPressure;
  waitRisk?: WaitRisk;
}

export function buildDIEExplanationsV2Prompt(input: DIEExplanationsV2Input): string {
  const market = getMarketConfig();

  const waitRiskSection = input.waitRisk
    ? `
WAIT RISK (if available):
- Recommendation: ${input.waitRisk.recommendation}
- 7-day Risk: ${Math.round((input.waitRisk.riskByDays.find(r => r.days === 7)?.probabilityOfLoss || 0) * 100)}%
- 30-day Risk: ${Math.round((input.waitRisk.riskByDays.find(r => r.days === 30)?.probabilityOfLoss || 0) * 100)}%
`
    : 'WAIT RISK: Not available';

  return `ROLE:
You are a real estate decision intelligence advisor for the ${market.ai.marketContext}.

MISSION:
Your role is to EXPLAIN the outputs of a Decision Intelligence Engine (DIE),
not to calculate prices or make recommendations.

CONTEXT:
These explanations are shown to users to help them understand uncertainty,
market speed, and timing trade-offs.

INPUT DATA:
(All values below are precomputed by the system and must not be recalculated.)

PRICE ASSESSMENT:
- Asking Price: ${market.currency.symbol}${input.property.price.toLocaleString()}
- Price Range: ${market.currency.symbol}${input.priceAssessment.priceRange.min.toLocaleString()} – ${market.currency.symbol}${input.priceAssessment.priceRange.max.toLocaleString()}
- Asking Price Status: ${input.priceAssessment.askingPriceStatus}
- Uncertainty Level: ${input.priceAssessment.uncertainty}
- Range Width: ${input.priceAssessment.uncertaintyMetrics.rangeWidthPercent.toFixed(1)}%

MARKET DYNAMICS:
- Market Velocity: ${input.marketDynamics.velocity}
- Market Regime: ${input.marketDynamics.currentRegime}
- Price Trend: ${input.marketDynamics.timeSeries.priceTrend}
- Inventory Trend: ${input.marketDynamics.timeSeries.inventoryTrend}

CURRENT PRESSURE:
- Pressure Level: ${input.currentPressure.level}
- Active Competing Offers: ${input.currentPressure.competition.activeOffers}
- Recent Visits: ${input.currentPressure.competition.recentVisits}

${waitRiskSection}

TASK:
Explain the following concepts in clear, user-friendly language:

1. Why uncertainty is at the current level
2. What the current market velocity implies
3. What timing trade-offs exist between acting now and waiting
4. How these factors combine into an overall decision context

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema exactly:

{
  "uncertaintyExplanation": string,
  "velocityExplanation": string,
  "timingExplanation": string,
  "decisionContext": string
}

GUARDRAILS:
- Do NOT calculate prices or probabilities.
- Do NOT recommend specific actions.
- Do NOT contradict system outputs.
- Explain meaning, not mechanics.

FALLBACK / LIMITATIONS:
- If wait risk is not available, explain timing based on pressure and velocity only.
- If uncertainty is high, emphasize limits of precision.
- Keep explanations practical and concise.

Respond ONLY with valid JSON. No markdown. No explanations.`;
}


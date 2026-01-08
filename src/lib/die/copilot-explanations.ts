/**
 * Copilot Explanations for DIE
 * 
 * The LLM does NOT calculate prices. It EXPLAINS:
 * - Why uncertainty is high/medium/low
 * - What velocity indicates
 * - What waiting vs acting implies
 * 
 * Prohibited: Recommending specific prices
 */

import OpenAI from 'openai';
import type { PriceAssessment, MarketDynamics, CurrentPressure, DIEExplanations } from '@/types/die';
import { getMarketConfig } from '@/config/market';

let deepseek: OpenAI | null = null;

function getClient(): OpenAI {
  if (!deepseek) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return deepseek;
}

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

interface ExplanationContext {
  priceAssessment: PriceAssessment;
  marketDynamics: MarketDynamics;
  currentPressure: CurrentPressure;
  property: {
    id: string;
    price: number;
    property_type: string;
  };
}

/**
 * Generate explanations for DIE outputs
 */
export async function generateExplanations(
  context: ExplanationContext
): Promise<DIEExplanations> {
  const market = getMarketConfig();

  const prompt = `You are a real estate decision advisor for the ${market.ai.marketContext}. 
Your role is to EXPLAIN the outputs of a Decision Intelligence Engine (DIE), NOT to calculate prices.

CONTEXT:
- Property Type: ${context.property.property_type}
- Asking Price: ${market.currency.symbol}${context.property.price.toLocaleString()}

PRICE ASSESSMENT:
- Price Range: ${market.currency.symbol}${context.priceAssessment.priceRange.min.toLocaleString()} - ${market.currency.symbol}${context.priceAssessment.priceRange.max.toLocaleString()}
- Asking Price Status: ${context.priceAssessment.askingPriceStatus}
- Uncertainty Level: ${context.priceAssessment.uncertainty}
- Range Width: ${context.priceAssessment.uncertaintyMetrics.rangeWidthPercent.toFixed(1)}%

MARKET DYNAMICS:
- Velocity: ${context.marketDynamics.velocity}
- Current Regime: ${context.marketDynamics.currentRegime}
- Price Trend: ${context.marketDynamics.timeSeries.priceTrend}
- Inventory Trend: ${context.marketDynamics.timeSeries.inventoryTrend}
${context.marketDynamics.velocityMetrics.changePoints.length > 0
    ? `- Change Points: ${context.marketDynamics.velocityMetrics.changePoints.map(cp => cp.description).join('; ')}`
    : ''}

CURRENT PRESSURE:
- Level: ${context.currentPressure.level}
- Active Offers: ${context.currentPressure.competition.activeOffers}
- Recent Visits: ${context.currentPressure.competition.recentVisits}
- Signals: ${context.currentPressure.signals.competingOffers ? 'Competing offers detected' : ''} ${context.currentPressure.signals.manyVisits ? 'High visit activity' : ''}

Provide a JSON response with:
1. uncertaintyExplanation: Explain why uncertainty is ${context.priceAssessment.uncertainty} (mention range width, sample size, zone variability)
2. velocityExplanation: Explain what ${context.marketDynamics.velocity} velocity means and what it indicates for timing
3. timingExplanation: Explain what waiting vs acting now implies given the current pressure and velocity
4. decisionContext: Overall decision context (2-3 sentences summarizing key factors)

CRITICAL RULES:
- DO NOT recommend specific prices or amounts
- DO NOT calculate valuations
- DO explain what the data means
- DO explain trade-offs and implications
- Use clear, actionable language

Respond ONLY with valid JSON, no markdown or explanation.`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const explanations = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    return {
      uncertaintyExplanation: explanations.uncertaintyExplanation || 'Uncertainty analysis unavailable',
      velocityExplanation: explanations.velocityExplanation || 'Velocity analysis unavailable',
      timingExplanation: explanations.timingExplanation || 'Timing analysis unavailable',
      decisionContext: explanations.decisionContext || 'Decision context unavailable',
    };
  } catch (error) {
    console.error('DeepSeek explanation error:', error);

    // Fallback explanations
    return {
      uncertaintyExplanation: `Uncertainty is ${context.priceAssessment.uncertainty} because the price range spans ${context.priceAssessment.uncertaintyMetrics.rangeWidthPercent.toFixed(1)}% of the median estimate. This reflects market variability in the zone.`,
      velocityExplanation: `Market velocity is ${context.marketDynamics.velocity}, indicating ${context.marketDynamics.velocity === 'accelerating' ? 'increasing activity and potential price pressure' : context.marketDynamics.velocity === 'decelerating' ? 'slowing activity and potential opportunities' : 'stable conditions'}.`,
      timingExplanation: `Current pressure is ${context.currentPressure.level} with ${context.currentPressure.competition.activeOffers} active offers. ${context.currentPressure.level === 'high' ? 'Acting quickly may be advisable.' : 'You have more time to evaluate.'}`,
      decisionContext: `The property is ${context.priceAssessment.askingPriceStatus === 'within_range' ? 'priced within the estimated range' : context.priceAssessment.askingPriceStatus === 'below_range' ? 'priced below the estimated range' : 'priced above the estimated range'}. Market is ${context.marketDynamics.currentRegime} with ${context.marketDynamics.velocity} velocity.`,
    };
  }
}


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
import type { PriceAssessment, MarketDynamics, CurrentPressure, WaitRisk, DIEExplanations } from '@/types/die';
// Market config for future locale support
import '@/config/market';
import { buildDIEExplanationsV2Prompt } from '@/prompts/die/DIE_Explanations.v2';

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
  waitRisk?: WaitRisk; // DIE-2
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
  // Use v2 prompt
  const prompt = buildDIEExplanationsV2Prompt({
    property: context.property,
    priceAssessment: context.priceAssessment,
    marketDynamics: context.marketDynamics,
    currentPressure: context.currentPressure,
    waitRisk: context.waitRisk,
  });

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


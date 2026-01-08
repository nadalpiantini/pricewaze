/**
 * Few-Shot Dynamic System
 * 
 * Injects few-shot examples only when they add value
 */

export type FewShotContext = 
  | 'lowData'           // Zone has < 3 properties
  | 'highVariance'      // Price variance > 40%
  | 'luxuryProperty'    // Property significantly above market
  | 'longDOM'           // Days on market > 90
  | 'multipleCounters'  // 3+ negotiation rounds
  | null;

export interface FewShotExample {
  context: string;
  input: string;
  output: string;
  notes?: string;
}

/**
 * Few-shot library for each prompt
 */
export const FEW_SHOT_LIBRARY: Record<string, Record<string, FewShotExample[]>> = {
  analyzePricing: {
    lowData: [
      {
        context: 'Zone has only 2 active listings, limited data',
        input: 'Property: $200k, Zone median: $180k/m², Only 2 listings',
        output: JSON.stringify({
          fairnessScore: 55,
          fairnessLabel: 'fair',
          estimatedFairValue: null,
          confidenceLevel: 'low',
          // ... rest of output
        }),
        notes: 'When data is limited, set confidenceLevel to low and estimatedFairValue to null',
      },
    ],
    highVariance: [
      {
        context: 'Zone has high price variance (45%)',
        input: 'Property: $250k, Zone range: $150k-$300k, High variance',
        output: JSON.stringify({
          fairnessScore: 60,
          fairnessLabel: 'fair',
          estimatedFairValue: 240000,
          confidenceLevel: 'medium',
          // ... rest of output
        }),
        notes: 'High variance requires medium confidence, not high',
      },
    ],
  },
  getOfferAdvice: {
    multipleCounters: [
      {
        context: 'Seller has rejected 3 previous counters',
        input: 'Offer: $180k (90% of asking), 3 previous counters rejected, 60 days on market',
        output: JSON.stringify({
          recommendation: 'accept',
          confidence: 85,
          suggestedCounterAmount: null,
          reasoning: [
            'Multiple rejected counters indicate seller is firm',
            'Offer is at 90% threshold, likely best achievable',
          ],
          confidenceLevel: 'high',
        }),
        notes: 'After multiple counters, prefer accept over another counter',
      },
    ],
    longDOM: [
      {
        context: 'Property has been on market for 120 days',
        input: 'Offer: $170k (85% of asking), 120 days on market, no previous offers',
        output: JSON.stringify({
          recommendation: 'counter',
          confidence: 70,
          suggestedCounterAmount: 185000,
          reasoning: [
            'Extended time on market suggests seller motivation',
            'Counter closer to asking maintains negotiation position',
          ],
          confidenceLevel: 'high',
        }),
        notes: 'Long DOM increases seller leverage for counter',
      },
    ],
  },
  CopilotNegotiate: {
    multipleCounters: [
      {
        context: 'Buyer has made 3 counters, all rejected',
        input: 'Current offer: $180k, 3 counters rejected, seller firm at $200k',
        output: JSON.stringify({
          summary: 'After 3 rejected counters, seller appears firm. Current offer is 10% below asking.',
          key_factors: [
            'Multiple rejected counters indicate seller resolve',
            'Gap is significant (10%)',
            'Market conditions are stable',
          ],
          scenarios: [
            {
              option: 'increase_offer',
              rationale: 'Seller has shown firmness, significant increase may be needed',
              pros: ['May close deal', 'Shows serious intent'],
              cons: ['Reduces negotiation room', 'May still not be enough'],
            },
            // ... other scenarios
          ],
          confidence_level: 'high',
        }),
        notes: 'Multiple counters require different strategy',
      },
    ],
  },
};

/**
 * Determine if few-shot should be injected
 */
export function shouldInjectFewShot(
  promptName: string,
  context: {
    zonePropertyCount?: number;
    priceVariance?: number;
    daysOnMarket?: number;
    negotiationRounds?: number;
    propertyPrice?: number;
    zoneMedian?: number;
  }
): FewShotContext {
  // analyzePricing
  if (promptName === 'analyzePricing') {
    if (context.zonePropertyCount !== undefined && context.zonePropertyCount < 3) {
      return 'lowData';
    }
    if (context.priceVariance !== undefined && context.priceVariance > 40) {
      return 'highVariance';
    }
    if (
      context.propertyPrice !== undefined &&
      context.zoneMedian !== undefined &&
      context.propertyPrice > context.zoneMedian * 1.5
    ) {
      return 'luxuryProperty';
    }
  }

  // getOfferAdvice
  if (promptName === 'getOfferAdvice') {
    if (context.negotiationRounds !== undefined && context.negotiationRounds >= 3) {
      return 'multipleCounters';
    }
    if (context.daysOnMarket !== undefined && context.daysOnMarket > 90) {
      return 'longDOM';
    }
  }

  // CopilotNegotiate
  if (promptName === 'CopilotNegotiate') {
    if (context.negotiationRounds !== undefined && context.negotiationRounds >= 3) {
      return 'multipleCounters';
    }
  }

  return null;
}

/**
 * Get few-shot examples for a prompt and context
 */
export function getFewShotExamples(
  promptName: string,
  context: FewShotContext
): FewShotExample[] {
  if (!context) {
    return [];
  }

  const promptLibrary = FEW_SHOT_LIBRARY[promptName];
  if (!promptLibrary) {
    return [];
  }

  return promptLibrary[context] || [];
}

/**
 * Inject few-shot examples into prompt
 */
export function injectFewShot(
  prompt: string,
  examples: FewShotExample[]
): string {
  if (examples.length === 0) {
    return prompt;
  }

  const examplesSection = examples
    .map((ex, idx) => {
      return `EXAMPLE ${idx + 1} (for reference only, not current data):
Context: ${ex.context}
Input: ${ex.input}
Output: ${ex.output}
${ex.notes ? `Note: ${ex.notes}` : ''}`;
    })
    .join('\n\n');

  // Inject before OUTPUT FORMAT section
  if (prompt.includes('OUTPUT FORMAT:')) {
    return prompt.replace(
      'OUTPUT FORMAT:',
      `FEW-SHOT EXAMPLES:\n${examplesSection}\n\nOUTPUT FORMAT:`
    );
  }

  // Fallback: append at end
  return `${prompt}\n\nFEW-SHOT EXAMPLES:\n${examplesSection}`;
}


/**
 * Prompt Output Validator
 * 
 * Strict validation for LLM outputs to ensure quality
 * Level: 10/10
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate PricingAnalysis output
 */
export function validatePricingAnalysis(output: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Output must be an object'], warnings: [] };
  }

  const obj = output as Record<string, unknown>;

  // Required fields
  if (typeof obj.fairnessScore !== 'number' || obj.fairnessScore < 0 || obj.fairnessScore > 100) {
    errors.push('fairnessScore must be a number between 0-100');
  }

  const validLabels = ['underpriced', 'fair', 'overpriced', 'significantly_overpriced'];
  if (!validLabels.includes(obj.fairnessLabel as string)) {
    errors.push(`fairnessLabel must be one of: ${validLabels.join(', ')}`);
  }

  if (obj.estimatedFairValue !== null && typeof obj.estimatedFairValue !== 'number') {
    errors.push('estimatedFairValue must be a number or null');
  }

  if (typeof obj.negotiationPowerScore !== 'number' || obj.negotiationPowerScore < 0 || obj.negotiationPowerScore > 100) {
    errors.push('negotiationPowerScore must be a number between 0-100');
  }

  if (!Array.isArray(obj.negotiationFactors) || obj.negotiationFactors.length < 2) {
    errors.push('negotiationFactors must be an array with at least 2 items');
  }

  if (!obj.suggestedOffers || typeof obj.suggestedOffers !== 'object') {
    errors.push('suggestedOffers must be an object');
  } else {
    const offers = obj.suggestedOffers as Record<string, unknown>;
    ['aggressive', 'balanced', 'conservative'].forEach(key => {
      if (offers[key] !== null && typeof offers[key] !== 'number') {
        errors.push(`suggestedOffers.${key} must be a number or null`);
      }
    });
  }

  const validConfidence = ['low', 'medium', 'high'];
  if (!validConfidence.includes(obj.confidenceLevel as string)) {
    errors.push(`confidenceLevel must be one of: ${validConfidence.join(', ')}`);
  }

  // Warnings
  if (obj.confidenceLevel === 'low' && obj.estimatedFairValue !== null) {
    warnings.push('Low confidence but estimatedFairValue is not null');
  }

  if ((obj.fairnessScore as number) > 80 && obj.fairnessLabel !== 'significantly_overpriced') {
    warnings.push('High fairnessScore but label does not match');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate OfferAdvice output
 */
export function validateOfferAdvice(output: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Output must be an object'], warnings: [] };
  }

  const obj = output as Record<string, unknown>;

  const validRecommendations = ['accept', 'counter', 'reject', 'wait'];
  if (!validRecommendations.includes(obj.recommendation as string)) {
    errors.push(`recommendation must be one of: ${validRecommendations.join(', ')}`);
  }

  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 100) {
    errors.push('confidence must be a number between 0-100');
  }

  if (obj.recommendation === 'counter' && obj.suggestedCounterAmount === null) {
    errors.push('suggestedCounterAmount cannot be null when recommendation is "counter"');
  }

  if (obj.recommendation !== 'counter' && obj.suggestedCounterAmount !== null) {
    warnings.push('suggestedCounterAmount should be null when recommendation is not "counter"');
  }

  const validConfidence = ['low', 'medium', 'high'];
  if (!validConfidence.includes(obj.confidenceLevel as string)) {
    errors.push(`confidenceLevel must be one of: ${validConfidence.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate CopilotNegotiate output
 */
export function validateCopilotNegotiate(output: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Output must be an object'], warnings: [] };
  }

  const obj = output as Record<string, unknown>;

  if (!Array.isArray(obj.scenarios) || obj.scenarios.length !== 3) {
    errors.push('scenarios must be an array with exactly 3 items');
  } else {
    const validOptions = ['increase_offer', 'keep_offer', 'wait'];
    const seenOptions = new Set<string>();

    obj.scenarios.forEach((scenario: unknown, index: number) => {
      if (!scenario || typeof scenario !== 'object') {
        errors.push(`scenarios[${index}] must be an object`);
        return;
      }

      const s = scenario as Record<string, unknown>;
      if (!validOptions.includes(s.option as string)) {
        errors.push(`scenarios[${index}].option must be one of: ${validOptions.join(', ')}`);
      } else {
        seenOptions.add(s.option as string);
      }

      if (!Array.isArray(s.pros) || s.pros.length < 2) {
        errors.push(`scenarios[${index}].pros must be an array with at least 2 items`);
      }

      if (!Array.isArray(s.cons) || s.cons.length < 2) {
        errors.push(`scenarios[${index}].cons must be an array with at least 2 items`);
      }
    });

    if (seenOptions.size !== 3) {
      errors.push('All three scenario options (increase_offer, keep_offer, wait) must be present');
    }
  }

  const validConfidence = ['low', 'medium', 'high'];
  if (!validConfidence.includes(obj.confidence_level as string)) {
    errors.push(`confidence_level must be one of: ${validConfidence.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}


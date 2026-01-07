/**
 * JSON Logic Rule Evaluator
 * Evaluates user-defined alert rules against market signal data
 */

import jsonLogic from 'json-logic-js';

export interface RuleEvaluationResult {
  matches: boolean;
  error?: string;
}

/**
 * Evaluate a JSON Logic rule against data
 * @param rule - JSON Logic rule object
 * @param data - Data to evaluate against (market signal payload)
 * @returns Whether the rule matches
 */
export function evaluateRule(rule: unknown, data: Record<string, unknown>): RuleEvaluationResult {
  try {
    if (!rule || typeof rule !== 'object') {
      return { matches: false, error: 'Invalid rule: must be an object' };
    }

    const result = jsonLogic.apply(rule, data);
    return { matches: result === true };
  } catch (error) {
    return {
      matches: false,
      error: error instanceof Error ? error.message : 'Unknown error evaluating rule',
    };
  }
}

/**
 * Validate a JSON Logic rule structure
 * @param rule - Rule to validate
 * @returns Whether the rule is valid
 */
export function validateRule(rule: unknown): { valid: boolean; error?: string } {
  try {
    if (!rule || typeof rule !== 'object') {
      return { valid: false, error: 'Rule must be an object' };
    }

    // Try to apply with empty data to check syntax
    jsonLogic.apply(rule, {});
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid rule syntax',
    };
  }
}

/**
 * Example rule templates for common alert types
 */
export const ruleTemplates = {
  priceDrop: {
    and: [
      { '>': [{ var: 'price_drop_pct' }, 5] },
      { '<': [{ var: 'days' }, 90] },
    ],
  },
  inventorySpike: {
    '>': [{ var: 'inventory_change' }, 10],
  },
  trendChange: {
    '<': [{ var: 'trend_score' }, -0.4],
  },
  zonePriceIncrease: {
    and: [
      { '>': [{ var: 'zone_price_change_pct' }, 5] },
      { '<': [{ var: 'days' }, 90] },
    ],
  },
} as const;


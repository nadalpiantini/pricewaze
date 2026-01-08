/**
 * Unit Tests: Rule Evaluation Functions
 *
 * Tests the JSON Logic rule evaluation used for alert triggering.
 * Critical business logic for the alerts system.
 */

import {
  evaluateRule,
  validateRule,
  ruleTemplates,
} from '@/lib/alerts/evaluateRule';

describe('evaluateRule', () => {
  describe('basic operations', () => {
    it('evaluates simple comparison rules', () => {
      const rule = { '>': [{ var: 'value' }, 10] };

      expect(evaluateRule(rule, { value: 15 })).toEqual({ matches: true });
      expect(evaluateRule(rule, { value: 5 })).toEqual({ matches: false });
      expect(evaluateRule(rule, { value: 10 })).toEqual({ matches: false });
    });

    it('evaluates equality rules', () => {
      const rule = { '==': [{ var: 'status' }, 'active'] };

      expect(evaluateRule(rule, { status: 'active' })).toEqual({ matches: true });
      expect(evaluateRule(rule, { status: 'inactive' })).toEqual({ matches: false });
    });

    it('evaluates AND logic', () => {
      const rule = {
        and: [
          { '>': [{ var: 'price' }, 100000] },
          { '<': [{ var: 'days' }, 30] },
        ],
      };

      expect(evaluateRule(rule, { price: 150000, days: 15 })).toEqual({ matches: true });
      expect(evaluateRule(rule, { price: 150000, days: 45 })).toEqual({ matches: false });
      expect(evaluateRule(rule, { price: 50000, days: 15 })).toEqual({ matches: false });
    });

    it('evaluates OR logic', () => {
      const rule = {
        or: [
          { '>': [{ var: 'discount' }, 10] },
          { '==': [{ var: 'is_featured' }, true] },
        ],
      };

      expect(evaluateRule(rule, { discount: 15, is_featured: false })).toEqual({ matches: true });
      expect(evaluateRule(rule, { discount: 5, is_featured: true })).toEqual({ matches: true });
      expect(evaluateRule(rule, { discount: 5, is_featured: false })).toEqual({ matches: false });
    });
  });

  describe('error handling', () => {
    it('returns error for null rule', () => {
      const result = evaluateRule(null, { value: 10 });
      expect(result.matches).toBe(false);
      expect(result.error).toContain('Invalid rule');
    });

    it('returns error for non-object rule', () => {
      const result = evaluateRule('invalid', { value: 10 });
      expect(result.matches).toBe(false);
      expect(result.error).toContain('Invalid rule');
    });

    it('handles missing data gracefully', () => {
      const rule = { '>': [{ var: 'missing_field' }, 10] };
      // JSON Logic treats missing vars as null/undefined
      const result = evaluateRule(rule, { other_field: 5 });
      expect(result.matches).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('complex real-world scenarios', () => {
    it('evaluates price drop alert rule', () => {
      const rule = ruleTemplates.priceDrop;

      // Should match: >5% drop within 90 days
      expect(evaluateRule(rule, { price_drop_pct: 10, days: 30 })).toEqual({ matches: true });

      // Should not match: small drop
      expect(evaluateRule(rule, { price_drop_pct: 3, days: 30 })).toEqual({ matches: false });

      // Should not match: too old
      expect(evaluateRule(rule, { price_drop_pct: 10, days: 120 })).toEqual({ matches: false });
    });

    it('evaluates inventory spike alert rule', () => {
      const rule = ruleTemplates.inventorySpike;

      expect(evaluateRule(rule, { inventory_change: 15 })).toEqual({ matches: true });
      expect(evaluateRule(rule, { inventory_change: 5 })).toEqual({ matches: false });
    });

    it('evaluates trend change alert rule', () => {
      const rule = ruleTemplates.trendChange;

      // Negative trend (below -0.4) should match
      expect(evaluateRule(rule, { trend_score: -0.5 })).toEqual({ matches: true });
      expect(evaluateRule(rule, { trend_score: -0.3 })).toEqual({ matches: false });
      expect(evaluateRule(rule, { trend_score: 0.5 })).toEqual({ matches: false });
    });
  });
});

describe('validateRule', () => {
  it('validates correct rule structures', () => {
    expect(validateRule({ '>': [{ var: 'x' }, 10] })).toEqual({ valid: true });
    expect(validateRule({ and: [{ '==': [1, 1] }] })).toEqual({ valid: true });
    expect(validateRule(ruleTemplates.priceDrop)).toEqual({ valid: true });
  });

  it('rejects invalid rule structures', () => {
    expect(validateRule(null).valid).toBe(false);
    expect(validateRule(undefined).valid).toBe(false);
    expect(validateRule('string').valid).toBe(false);
    expect(validateRule(123).valid).toBe(false);
  });

  it('validates empty object as valid (no-op rule)', () => {
    // Empty object is technically valid JSON Logic
    expect(validateRule({}).valid).toBe(true);
  });
});

describe('ruleTemplates', () => {
  it('contains expected template rules', () => {
    expect(ruleTemplates).toHaveProperty('priceDrop');
    expect(ruleTemplates).toHaveProperty('inventorySpike');
    expect(ruleTemplates).toHaveProperty('trendChange');
    expect(ruleTemplates).toHaveProperty('zonePriceIncrease');
  });

  it('all templates are valid rules', () => {
    Object.values(ruleTemplates).forEach((template) => {
      expect(validateRule(template)).toEqual({ valid: true });
    });
  });
});

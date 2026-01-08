/**
 * A/B Testing System for Prompts
 * 
 * Production-ready A/B testing with sticky assignment
 */

import crypto from 'crypto';

export type PromptVariant = 'v1' | 'v2' | 'v2.1' | string;

export interface ABTestConfig {
  promptName: string;
  variants: PromptVariant[];
  trafficSplit?: Record<PromptVariant, number>; // Percentage per variant
  stickyAssignment?: boolean; // Same user → same variant
}

/**
 * Hash a string to a number (for consistent assignment)
 */
function hashString(str: string): number {
  return parseInt(
    crypto.createHash('md5').update(str).digest('hex').substring(0, 8),
    16
  );
}

/**
 * Select a variant for a user (sticky assignment)
 * 
 * Same user_id → same variant (unless config changes)
 */
export function selectVariant(
  userId: string,
  config: ABTestConfig
): PromptVariant {
  const { variants, trafficSplit, stickyAssignment = true } = config;

  if (variants.length === 0) {
    throw new Error('At least one variant is required');
  }

  if (variants.length === 1) {
    return variants[0];
  }

  // Sticky assignment: hash user_id for consistent assignment
  if (stickyAssignment) {
    const hash = hashString(`${userId}:${config.promptName}`);
    const index = hash % variants.length;
    return variants[index];
  }

  // Random assignment (for testing)
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Get variant with traffic split
 * 
 * Example: { v1: 50, v2: 50 } → 50% v1, 50% v2
 */
export function selectVariantWithSplit(
  userId: string,
  config: ABTestConfig
): PromptVariant {
  const { variants, trafficSplit } = config;

  if (!trafficSplit || Object.keys(trafficSplit).length === 0) {
    return selectVariant(userId, config);
  }

  // Validate traffic split sums to 100
  const total = Object.values(trafficSplit).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Traffic split must sum to 100%, got ${total}%`);
  }

  // Hash user_id for consistent assignment
  const hash = hashString(`${userId}:${config.promptName}`);
  const bucket = hash % 100;

  let cumulative = 0;
  for (const [variant, percentage] of Object.entries(trafficSplit)) {
    cumulative += percentage;
    if (bucket < cumulative) {
      return variant as PromptVariant;
    }
  }

  // Fallback to last variant
  return variants[variants.length - 1];
}

/**
 * Check if A/B testing is enabled for a prompt
 */
export function isABTestingEnabled(
  promptName: string,
  configs: ABTestConfig[]
): boolean {
  return configs.some(config => config.promptName === promptName && config.variants.length > 1);
}

/**
 * Get A/B test config for a prompt
 */
export function getABTestConfig(
  promptName: string,
  configs: ABTestConfig[]
): ABTestConfig | null {
  return configs.find(config => config.promptName === promptName) || null;
}


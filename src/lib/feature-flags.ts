/**
 * Feature Flags System
 * Centralized feature flag management for soft launch
 * All flags can be controlled via environment variables
 */

/**
 * Feature flag configuration
 * Set to 'false' to disable, 'true' or unset to enable
 */
export const featureFlags = {
  /**
   * Copilot feature (AI negotiation assistant)
   * Controls: /api/copilot/* endpoints
   */
  copilot: process.env.NEXT_PUBLIC_FEATURE_COPILOT !== 'false',

  /**
   * Push notifications feature
   * Controls: Web push notifications for signals and offers
   */
  push: process.env.NEXT_PUBLIC_FEATURE_PUSH !== 'false',

  /**
   * Paywall feature (Pro subscription)
   * Controls: Paywall display and Pro features
   */
  paywall: process.env.NEXT_PUBLIC_FEATURE_PAYWALL !== 'false',

  /**
   * Advanced timeline feature
   * Controls: Deep timeline view (Pro only)
   */
  advancedTimeline: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_TIMELINE !== 'false',

  /**
   * Advanced alerts feature
   * Controls: Advanced alert rules (Pro only)
   */
  advancedAlerts: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS !== 'false',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Get all feature flags (for debugging/admin)
 */
export function getAllFeatureFlags(): typeof featureFlags {
  return { ...featureFlags };
}


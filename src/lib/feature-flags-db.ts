/**
 * Feature Flags DB-based System
 * Feature flags con rollout porcentual desde base de datos
 * 
 * NOTE: Server functions are in feature-flags-server.ts to avoid
 * importing next/headers in client components
 */

import { createClient as createClientBrowser } from '@/lib/supabase/client';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_percent: number;
}

/**
 * Simple hash for deterministic rollout (client-side fallback)
 * Uses a simple string hash algorithm
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Client-side feature flag check (for UI, uses hash-based rollout)
 * Falls back to env-based flags if DB check fails
 */
export async function checkFeatureFlagClient(
  flagKey: string,
  seedId: string
): Promise<boolean> {
  try {
    const supabase = createClientBrowser();
    
    const { data: flag, error } = await supabase
      .from('pricewaze_feature_flags')
      .select('key, enabled, rollout_percent')
      .eq('key', flagKey)
      .single();

    if (error || !flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    if (flag.rollout_percent === 0) {
      return false;
    }

    if (flag.rollout_percent === 100) {
      return true;
    }

    // Deterministic hash-based rollout
    const hash = simpleHash(seedId) % 100;
    return hash < flag.rollout_percent;
  } catch (error) {
    // Fallback to false if DB fails
    console.warn(`Feature flag check failed for ${flagKey}`, error);
    return false;
  }
}


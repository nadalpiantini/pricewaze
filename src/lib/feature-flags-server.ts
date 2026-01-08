/**
 * Feature Flags Server-side Functions
 * Only use in Server Components or API Routes
 */

import { createClient } from '@/lib/supabase/server';
import type { FeatureFlag } from './feature-flags-db';

/**
 * Get feature flag from database (server-side only)
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pricewaze_feature_flags')
    .select('key, enabled, rollout_percent')
    .eq('key', key)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    key: data.key,
    enabled: data.enabled,
    rollout_percent: data.rollout_percent,
  };
}

/**
 * Check if feature is enabled for a specific seed (deterministic, server-side only)
 * Uses database function is_feature_enabled(flag_key, seed_id)
 */
export async function isFeatureEnabled(
  flagKey: string,
  seedId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_flag_key: flagKey,
    p_seed_id: seedId,
  });

  if (error || data === null) {
    return false;
  }

  return data === true;
}

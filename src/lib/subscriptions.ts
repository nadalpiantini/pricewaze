/**
 * Subscriptions Helper
 * Check Pro access and subscription status
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Check if user has Pro access (trial or paid)
 */
export async function hasProAccess(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase.rpc('pricewaze_has_pro_access', {
    user_id_param: user.id,
  });

  if (error) {
    console.error('Error checking Pro access:', error);
    return false;
  }

  return data === true;
}

/**
 * Get user subscription status
 */
export async function getSubscriptionStatus() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('pricewaze_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No subscription found (free plan)
      return {
        plan: 'free',
        status: 'active',
        hasPro: false,
      };
    }
    console.error('Error fetching subscription:', error);
    return null;
  }

  const hasPro = await hasProAccess();

  return {
    ...data,
    hasPro,
  };
}


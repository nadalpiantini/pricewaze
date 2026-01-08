/**
 * Subscription Helper
 * Check if user has Pro access
 */

import { createClient } from '@/lib/supabase/client';

export type SubscriptionPlan = 'free' | 'pro' | 'pro_trial';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if user has Pro access
 */
export async function isPro(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('pricewaze_has_pro_access', {
      user_id_param: userId,
    });

    if (error) {
      console.error('Error checking Pro access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking Pro access:', error);
    return false;
  }
}

/**
 * Get user subscription
 */
export async function getUserSubscription(userId: string | null): Promise<Subscription | null> {
  if (!userId) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pricewaze_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}


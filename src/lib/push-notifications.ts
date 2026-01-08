/**
 * Push Notifications Helper
 * Handles push notification registration and sending
 */

import { createClient } from '@/lib/supabase/client';

export type PushPlatform = 'web' | 'ios' | 'android';

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: PushPlatform;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get VAPID public key (should be in env)
 */
function getVAPIDPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

/**
 * Register push subscription
 */
export async function registerPushSubscription(userId: string): Promise<string | null> {
  try {
    // Request permission
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Register service worker
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVAPIDPublicKey()) as BufferSource,
    });

    // Get subscription details
    const subscriptionJson = subscription.toJSON();
    const token = subscriptionJson.keys?.p256dh || '';

    // Save to database
    const supabase = createClient();
    const { error } = await supabase
      .from('pricewaze_push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: 'web' as PushPlatform,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });

    if (error) {
      console.error('Error saving push token:', error);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error registering push subscription:', error);
    return null;
  }
}

/**
 * Unregister push subscription
 */
export async function unregisterPushSubscription(userId: string, token: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('pricewaze_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('Error deleting push token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error unregistering push subscription:', error);
    return false;
  }
}

/**
 * Convert VAPID key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


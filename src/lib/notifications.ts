import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

export interface CreateNotificationParams {
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: Record<string, unknown> | null;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pricewaze_notifications')
      .insert({
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type,
        data: params.data || null,
        read: false,
      });

    if (error) {
      logger.error('Failed to create notification', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error creating notification', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  supabase: SupabaseClient,
  notifications: CreateNotificationParams[]
): Promise<void> {
  const promises = notifications.map((params) => createNotification(supabase, params));
  await Promise.allSettled(promises);
}


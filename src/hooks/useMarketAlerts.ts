'use client';

/**
 * Hook for real-time market alerts (Waze-style)
 * Subscribes to Supabase Realtime for live alert updates
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface MarketAlertEvent {
  id: string;
  user_id: string;
  rule_id: string;
  signal_id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useMarketAlerts(userId: string | undefined) {
  const [alerts, setAlerts] = useState<MarketAlertEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch initial alerts
  const { data: initialAlerts, isLoading } = useQuery({
    queryKey: ['market-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('pricewaze_alert_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MarketAlertEvent[];
    },
    enabled: !!userId,
  });

  // Sync initial data to state (used for real-time updates)
  const safeInitialAlerts = Array.isArray(initialAlerts) ? initialAlerts : [];
  if (alerts.length === 0 && safeInitialAlerts.length > 0) {
    // Only sync on first load, real-time updates handle the rest
    setAlerts(safeInitialAlerts);
    setUnreadCount(safeInitialAlerts.filter((a) => !a.read).length);
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`market-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pricewaze_alert_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newAlert = payload.new as MarketAlertEvent;
          setAlerts((prev) => [newAlert, ...prev]);
          if (!newAlert.read) {
            setUnreadCount((prev) => prev + 1);
          }
          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey: ['market-alerts', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pricewaze_alert_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedAlert = payload.new as MarketAlertEvent;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
          );
          if (updatedAlert.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient]);

  const markAsRead = async (alertId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('pricewaze_alert_events')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to mark alert as read', error);
    } else {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, read: true, read_at: new Date().toISOString() } : a
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('pricewaze_alert_events')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to mark all alerts as read', error);
    } else {
      setAlerts((prev) =>
        prev.map((a) => ({ ...a, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  return {
    alerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}


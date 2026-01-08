'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignalIcon, getSignalLabel, isPositiveSignal } from '@/lib/signals';
import type { PropertySignalTypeState } from '@/types/database';
import { useAuthStore } from '@/stores/auth-store';
import { analytics } from '@/lib/analytics';

/**
 * Hook to listen for signal confirmation alerts (Waze-style)
 * Shows a toast notification when a signal transitions from unconfirmed to confirmed
 * 
 * Only alerts when:
 * 1. confirmed changes from false → true (once)
 * 2. The property is in the user's "followed" list
 * 
 * No spam, no alerts for each report, only when state changes
 */
export function useSignalAlerts() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const followedProperties = useRef<Set<string>>(new Set());

  // Load followed properties on mount
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data } = await supabase
        .from('pricewaze_property_follows')
        .select('property_id')
        .eq('user_id', user.id);

      followedProperties.current = new Set((data ?? []).map((x: { property_id: string }) => x.property_id));
    })();
  }, [user?.id, supabase]);

  // Keep follows in sync (realtime updates)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('follows-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricewaze_property_follows',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch follows when they change
          const { data } = await supabase
            .from('pricewaze_property_follows')
            .select('property_id')
            .eq('user_id', user.id);

          followedProperties.current = new Set((data ?? []).map((x: { property_id: string }) => x.property_id));
        }
      )
      .subscribe((status) => {
        // Silently handle connection errors
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Realtime] Connection unavailable for follows-live');
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!user?.id) return; // Don't listen if not authenticated

    // Helper function to show signal toast
    const showSignalToast = (
      propertyId: string,
      signalType: string
    ) => {
      const signalIcon = getSignalIcon(signalType);
      const signalLabel = getSignalLabel(signalType);
      const isPositive = isPositiveSignal(signalType);

      toast(
        `${signalIcon} Signal confirmed: ${signalLabel}`,
        {
          description: isPositive
            ? 'Community confirmed this is a positive signal'
            : 'Community confirmed this signal (≥3 users in 30 days)',
          duration: 5000,
          action: {
            label: 'View property',
            onClick: () => {
              window.location.href = `/properties/${propertyId}`;
            },
          },
        }
      );
    };

    // Listen for signal confirmation via postgres_changes (Supabase Realtime)
    const channel = supabase
      .channel('signal-confirmed-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pricewaze_property_signal_state',
        },
        (payload) => {
          const oldState = payload.old as PropertySignalTypeState | null;
          const newState = payload.new as PropertySignalTypeState;

          // Only alert when confirmed changes from false → true
          const becameConfirmed =
            newState.confirmed === true &&
            (oldState?.confirmed === false || oldState?.confirmed === null || !oldState);

          if (!becameConfirmed) return;

          const propertyId = newState.property_id;
          if (!propertyId) return;

          // Only alert if the property is followed
          if (!followedProperties.current.has(propertyId)) return;

          // Track signal_alert_received event (L1.2)
          analytics.track('signal_alert_received', {
            property_id: propertyId,
            signal_type: newState.signal_type,
          });

          showSignalToast(propertyId, newState.signal_type);
        }
      )
      .subscribe((status) => {
        // Silently handle connection errors
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Realtime] Connection unavailable for signal-confirmed-alerts');
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);
}

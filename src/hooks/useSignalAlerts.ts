'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignalIcon, getSignalLabel, isPositiveSignal } from '@/lib/signals';
import type { PropertySignalTypeState } from '@/types/database';

/**
 * Hook to listen for signal confirmation alerts (Waze-style)
 * Shows a toast notification when a signal transitions from unconfirmed to confirmed
 */
export function useSignalAlerts() {
  const supabase = createClient();

  useEffect(() => {
    // Listen for signal confirmation notifications via pg_notify
    const channel = supabase
      .channel('signal-confirmed-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pricewaze_property_signal_type_state',
        },
        (payload) => {
          const oldState = payload.old as PropertySignalTypeState | null;
          const newState = payload.new as PropertySignalTypeState;

          // Only show alert when signal transitions from unconfirmed to confirmed
          if (
            newState.confirmed &&
            (!oldState || !oldState.confirmed)
          ) {
            const signalIcon = getSignalIcon(newState.signal_type);
            const signalLabel = getSignalLabel(newState.signal_type);
            const isPositive = isPositiveSignal(newState.signal_type);

            toast(
              `🚦 Señal confirmada: ${signalIcon} ${signalLabel}`,
              {
                description: isPositive
                  ? 'La comunidad confirmó que esta es una señal positiva'
                  : 'La comunidad confirmó esta señal (≥3 usuarios en 30 días)',
                duration: 5000,
                action: {
                  label: 'Ver propiedad',
                  onClick: () => {
                    // Navigate to property detail page
                    window.location.href = `/properties/${newState.property_id}`;
                  },
                },
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);
}


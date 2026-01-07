'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignalIcon, getSignalLabel, isPositiveSignal } from '@/lib/signals';
import type { PropertySignalTypeState } from '@/types/database';

/**
 * FASE 3 - Hook to listen for signal confirmation alerts (Waze-style)
 * Shows a toast notification when a signal transitions from unconfirmed to confirmed
 * 
 * Solo alerta cuando confirmed cambia de false → true (una sola vez)
 * No spam, no alertas por cada reporte, solo cuando cambia el estado
 * 
 * El trigger SQL usa pg_notify como respaldo, pero Supabase Realtime
 * escucha directamente los cambios en la tabla via postgres_changes
 */
export function useSignalAlerts() {
  const supabase = createClient();

  useEffect(() => {
    // Helper function to show signal toast (UX limpio)
    const showSignalToast = (
      propertyId: string,
      signalType: string
    ) => {
      const signalIcon = getSignalIcon(signalType);
      const signalLabel = getSignalLabel(signalType);
      const isPositive = isPositiveSignal(signalType);

      toast(
        `${signalIcon} Señal confirmada: ${signalLabel}`,
        {
          description: isPositive
            ? 'La comunidad confirmó que esta es una señal positiva'
            : 'La comunidad confirmó esta señal (≥3 usuarios en 30 días)',
          duration: 5000,
          action: {
            label: 'Ver propiedad',
            onClick: () => {
              window.location.href = `/properties/${propertyId}`;
            },
          },
        }
      );
    };

    // Listen for signal confirmation via postgres_changes (Supabase Realtime)
    // El trigger SQL también usa pg_notify como respaldo para otros sistemas
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

          // FASE 3: Solo alertar cuando confirmed cambia de false → true
          // Esto garantiza que solo se notifica una vez por transición
          if (
            newState.confirmed === true &&
            (oldState?.confirmed === false || oldState?.confirmed === null || !oldState)
          ) {
            showSignalToast(
              newState.property_id,
              newState.signal_type
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CopilotAlert } from '@/types/copilot';
import { getActiveAlerts, resolveAlert, trackPropertyView } from '@/lib/copilot';

interface UseCopilotAlertsOptions {
  propertyId?: string;
  offerId?: string;
  autoFetch?: boolean;
  refetchInterval?: number;
}

/**
 * Hook para gestionar alertas del Copilot
 */
export function useCopilotAlerts(options: UseCopilotAlertsOptions = {}) {
  const { propertyId, offerId, autoFetch = true, refetchInterval } = options;
  const queryClient = useQueryClient();

  const queryKey = ['copilot-alerts', propertyId, offerId];

  const {
    data: alerts = [],
    isLoading,
    error,
    refetch,
  } = useQuery<CopilotAlert[]>({
    queryKey,
    queryFn: async () => {
      const alerts = await getActiveAlerts(propertyId);
      return alerts;
    },
    enabled: autoFetch,
    refetchInterval,
    staleTime: 30000, // 30 segundos
  });

  const markAsResolved = useCallback(
    async (alertId: string) => {
      const success = await resolveAlert(alertId);
      if (success) {
        // Invalidar cache y refetch
        queryClient.invalidateQueries({ queryKey });
        await refetch();
      }
      return success;
    },
    [queryClient, queryKey, refetch]
  );

  const trackView = useCallback(
    async (propId: string) => {
      if (!propId) return;
      const newAlerts = await trackPropertyView(propId);
      if (newAlerts.length > 0) {
        // Invalidar cache para obtener nuevas alertas
        queryClient.invalidateQueries({ queryKey });
        await refetch();
      }
      return newAlerts;
    },
    [queryClient, queryKey, refetch]
  );

  return {
    alerts,
    isLoading,
    error,
    markAsResolved,
    trackView,
    refetch,
  };
}

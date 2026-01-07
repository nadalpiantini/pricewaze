'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  getSignalIcon,
  getSignalLabel,
  getSignalDescription,
  isPositiveSignal,
} from '@/lib/signals';
import type { PropertySignalTypeState, PropertySignalType } from '@/types/database';

interface PropertySignalsProps {
  propertyId: string;
  className?: string;
}

/**
 * PropertySignals Component (Waze-style)
 * Displays aggregated signals for a property with realtime updates
 * Shows colors: gray (unconfirmed), red (confirmed negative), green (confirmed positive)
 */
export function PropertySignals({ propertyId, className }: PropertySignalsProps) {
  const [signalStates, setSignalStates] = useState<PropertySignalTypeState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch initial signal state (using new signal_type_state table)
  useEffect(() => {
    async function fetchSignals() {
      try {
        const { data, error } = await supabase
          .from('pricewaze_property_signal_state')
          .select('*')
          .eq('property_id', propertyId)
          .gt('strength', 0) // Only show signals with strength > 0
          .order('strength', { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching signals:', error);
        } else if (data) {
          setSignalStates(data as PropertySignalTypeState[]);
        }
      } catch (error) {
        console.error('Error fetching signals:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSignals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`property-signals:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricewaze_property_signal_state',
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          // Refetch signals when state changes
          fetchSignals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, supabase]);

  if (isLoading) {
    return (
      <div className={`flex gap-2 flex-wrap ${className || ''}`}>
        <Badge variant="secondary" className="animate-pulse">Cargando señales...</Badge>
      </div>
    );
  }

  if (signalStates.length === 0) {
    return null; // Don't show anything if there are no signals
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className || ''}`}>
      {signalStates.map((signalState) => {
        const { signal_type, strength, confirmed } = signalState;
        const roundedStrength = Math.round(strength);
        
        // Determine badge variant and color based on confirmation and signal type
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let badgeClassName = 'text-sm px-3 py-1 cursor-help';
        
        if (confirmed) {
          if (isPositiveSignal(signal_type)) {
            // Green for confirmed positive signals
            badgeVariant = 'default';
            badgeClassName += ' bg-green-100 text-green-800 hover:bg-green-200 border-green-300';
          } else {
            // Red for confirmed negative signals
            badgeVariant = 'destructive';
            badgeClassName += ' bg-red-100 text-red-800 hover:bg-red-200';
          }
        } else {
          // Gray for unconfirmed signals
          badgeVariant = 'secondary';
          badgeClassName += ' bg-gray-100 text-gray-700 hover:bg-gray-200';
        }

        const tooltipText = confirmed 
          ? `${getSignalDescription(signal_type)} (confirmado por comunidad)`
          : getSignalDescription(signal_type);

        return (
          <Badge
            key={signal_type}
            data-testid={confirmed ? "signal-badge confirmed" : "signal-badge"}
            variant={badgeVariant}
            className={badgeClassName}
            title={tooltipText}
          >
            <span className="mr-1">{getSignalIcon(signal_type)}</span>
            <span>{getSignalLabel(signal_type)}</span>
            {roundedStrength > 1 && (
              <span className="ml-1 font-semibold">×{roundedStrength}</span>
            )}
            {confirmed && (
              <span className="ml-1 text-xs" title="Confirmado por comunidad">✓</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

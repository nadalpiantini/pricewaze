'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { 
  getSignalIcon, 
  getSignalLabel, 
  getSignalDescription,
  type PropertySignalType 
} from '@/lib/signals';
import type { PropertySignalState } from '@/types/database';

interface PropertySignalsProps {
  propertyId: string;
  className?: string;
}

/**
 * PropertySignals Component (Waze-style)
 * Displays aggregated signals for a property with realtime updates
 */
export function PropertySignals({ propertyId, className }: PropertySignalsProps) {
  const [signals, setSignals] = useState<Record<PropertySignalType, number>>({} as Record<PropertySignalType, number>);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch initial signal state
  useEffect(() => {
    async function fetchSignals() {
      try {
        const { data, error } = await supabase
          .from('pricewaze_property_signal_state')
          .select('signals')
          .eq('property_id', propertyId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching signals:', error);
        } else if (data) {
          setSignals((data.signals as Record<PropertySignalType, number>) || {});
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
        (payload) => {
          const newState = payload.new as PropertySignalState;
          if (newState.signals) {
            setSignals(newState.signals as Record<PropertySignalType, number>);
          }
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

  // Filter out signals with count 0 or undefined
  const activeSignals = Object.entries(signals).filter(
    ([, count]) => count !== undefined && count > 0
  ) as [PropertySignalType, number][];

  if (activeSignals.length === 0) {
    return null; // Don't show anything if there are no signals
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className || ''}`}>
      {activeSignals.map(([signalType, count]) => (
        <Badge
          key={signalType}
          variant="secondary"
          className="text-sm px-3 py-1 cursor-help"
          title={getSignalDescription(signalType)}
        >
          <span className="mr-1">{getSignalIcon(signalType)}</span>
          <span>{getSignalLabel(signalType)}</span>
          {count > 1 && (
            <span className="ml-1 font-semibold">×{count}</span>
          )}
        </Badge>
      ))}
    </div>
  );
}


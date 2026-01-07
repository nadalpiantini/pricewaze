'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  getSignalIcon,
  getSignalLabel,
  USER_REPORTABLE_SIGNALS_NEGATIVE,
  USER_REPORTABLE_SIGNALS_POSITIVE,
} from '@/lib/signals';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { PropertySignalType } from '@/types/database';

interface ReportSignalButtonsProps {
  propertyId: string;
  visitId: string;
  onSignalReported?: () => void;
  className?: string;
}

/**
 * ReportSignalButtons Component
 * Quick buttons to report signals after a verified visit (Waze-style)
 */
export function ReportSignalButtons({ 
  propertyId, 
  visitId, 
  onSignalReported,
  className 
}: ReportSignalButtonsProps) {
  const [reportedSignals, setReportedSignals] = useState<Set<PropertySignalType>>(new Set());
  const queryClient = useQueryClient();

  const reportSignalMutation = useMutation({
    mutationFn: async (signalType: PropertySignalType) => {
      const response = await fetch('/api/signals/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          visit_id: visitId,
          signal_type: signalType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to report signal');
      }

      return response.json();
    },
    onSuccess: (_, signalType) => {
      setReportedSignals((prev) => new Set(prev).add(signalType));
      toast.success(`Señal reportada: ${getSignalLabel(signalType)}`);
      queryClient.invalidateQueries({ queryKey: ['property-signals', propertyId] });
      onSignalReported?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reportar señal');
    },
  });

  const handleReportSignal = (signalType: PropertySignalType) => {
    if (reportedSignals.has(signalType)) {
      toast.info('Ya reportaste esta señal para esta visita');
      return;
    }

    reportSignalMutation.mutate(signalType);
  };

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground mb-3">
        ¿Qué observaste en tu visita?
      </p>
      
      {/* Negative signals */}
      {USER_REPORTABLE_SIGNALS_NEGATIVE.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Señales negativas:</p>
          <div className="flex flex-wrap gap-2">
            {USER_REPORTABLE_SIGNALS_NEGATIVE.map((signalType) => {
              const isReported = reportedSignals.has(signalType);
              const isPending = reportSignalMutation.isPending && 
                reportSignalMutation.variables === signalType;

              return (
                <Button
                  key={signalType}
                  data-testid={`signal-button-${signalType}`}
                  variant={isReported ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleReportSignal(signalType)}
                  disabled={isReported || isPending}
                  className="text-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Reportando...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">{getSignalIcon(signalType)}</span>
                      {getSignalLabel(signalType)}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Positive signals */}
      {USER_REPORTABLE_SIGNALS_POSITIVE.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Señales positivas:</p>
          <div className="flex flex-wrap gap-2">
            {USER_REPORTABLE_SIGNALS_POSITIVE.map((signalType) => {
              const isReported = reportedSignals.has(signalType);
              const isPending = reportSignalMutation.isPending && 
                reportSignalMutation.variables === signalType;

              return (
                <Button
                  key={signalType}
                  variant={isReported ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleReportSignal(signalType)}
                  disabled={isReported || isPending}
                  className="text-sm bg-green-50 hover:bg-green-100 border-green-300 text-green-800"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Reportando...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">{getSignalIcon(signalType)}</span>
                      {getSignalLabel(signalType)}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      
      {reportedSignals.size > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {reportedSignals.size} señal{reportedSignals.size > 1 ? 'es' : ''} reportada{reportedSignals.size > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}


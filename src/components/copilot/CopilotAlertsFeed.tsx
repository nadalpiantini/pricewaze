'use client';

import { useState } from 'react';
import { Bot, Sparkles, X, Loader2 } from 'lucide-react';
import { AlertBadge } from './AlertBadge';
import { AlertModal } from './AlertModal';
import { useCopilotAlerts } from '@/hooks/useCopilotAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CopilotAlert, AlertType, AlertSeverity } from '@/types/copilot';

interface CopilotAlertsFeedProps {
  propertyId?: string;
  offerId?: string;
  maxAlerts?: number;
  showHeader?: boolean;
  className?: string;
  onAlertClick?: (alert: CopilotAlert) => void;
}

/**
 * Componente principal del Copilot - Pantalla 1
 * Muestra las alertas automáticas del Copilot
 */
export function CopilotAlertsFeed({
  propertyId,
  offerId,
  maxAlerts = 5,
  showHeader = true,
  className,
  onAlertClick,
}: CopilotAlertsFeedProps) {
  const { alerts, isLoading, markAsResolved } = useCopilotAlerts({
    propertyId,
    offerId,
    autoFetch: !!propertyId || !!offerId,
    refetchInterval: 60000, // Refetch cada minuto
  });

  const [selectedAlert, setSelectedAlert] = useState<CopilotAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleAlertClick = (alert: CopilotAlert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    } else {
      setSelectedAlert(alert);
    }
  };

  const handleDismiss = async (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    await markAsResolved(alertId);
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedAlert(null);
  };

  const displayAlerts = alerts
    .filter((alert) => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando alertas del Copilot...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayAlerts.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Tu copiloto está activo
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay alertas en este momento</p>
            <p className="text-xs mt-1">Tu copiloto te avisará cuando detecte oportunidades o riesgos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Tu copiloto está activo
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn(showHeader ? 'pt-0' : 'pt-6', 'space-y-3')}>
          {displayAlerts.map((alert) => (
            <div key={alert.id} className="relative">
              <AlertBadge
                alertType={alert.alert_type as AlertType}
                severity={alert.severity as AlertSeverity}
                message={alert.message}
                onClick={() => handleAlertClick(alert)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(alert.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedAlert && (
        <AlertModal
          alert={{
            id: selectedAlert.id,
            type: selectedAlert.alert_type as AlertType,
            severity: selectedAlert.severity as AlertSeverity,
            message: selectedAlert.message,
            metadata: selectedAlert.metadata || {},
            propertyId: selectedAlert.property_id || undefined,
            offerId: offerId || undefined,
          }}
          onClose={handleCloseModal}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}


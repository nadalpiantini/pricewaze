'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, MapPin, DollarSign, AlertTriangle, Sparkles, Handshake, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertType, AlertSeverity } from './AlertBadge';
import type { AlertMetadata } from '@/types/copilot';
import {
  ALERT_HIERARCHY,
  severityToPriority,
  getAlertTitle,
  type AlertPriority,
} from '@/lib/alerts/hierarchy';
import { ActionSurface, type ActionResult } from './ActionSurface';

interface AlertModalProps {
  alert: {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: AlertMetadata;
    propertyId?: string | null;
    offerId?: string | null;
  } | null;
  onClose: () => void;
  onAction?: (alert: NonNullable<AlertModalProps['alert']>) => void;
  /** Called when user executes an action from the action surface */
  onActionExecute?: (alert: NonNullable<AlertModalProps['alert']>, action: ActionResult) => Promise<void>;
  onDismiss?: (alertId: string) => void;
  /** Suggested amounts for counteroffer actions */
  suggestedAmounts?: {
    aggressive: number | null;
    balanced: number | null;
    conservative: number | null;
  };
}

const alertIcons: Record<AlertType, typeof AlertCircle> = {
  overprice_emotional: DollarSign,
  bad_timing: Clock,
  zone_inflection: MapPin,
  suboptimal_offer: DollarSign,
  hidden_risk: AlertTriangle,
  silent_opportunity: Sparkles,
  bad_negotiation: Handshake,
};

const ALERT_RECOMMENDATIONS: Record<AlertType, string> = {
  silent_opportunity: 'Esta es una oportunidad que no durará. Considera actuar pronto.',
  suboptimal_offer: 'Tu oferta puede ser optimizada para maximizar tu poder de negociación.',
  overprice_emotional: 'El vendedor está probando el mercado. Negociación recomendada.',
  bad_timing: 'El timing actual no es ideal. Considera esperar o actuar rápido según el contexto.',
  zone_inflection: 'Esta zona está cambiando. Puede ser una oportunidad o un riesgo según la dirección.',
  hidden_risk: 'Investiga estos riesgos antes de proceder con la oferta.',
  bad_negotiation: 'Tu estrategia de negociación puede ser mejorada. Revisa el ritmo y las concesiones.',
};

function getActionButtonText(alertType: AlertType, priority: AlertPriority): string {
  // Critical alerts require action
  if (priority === 'critical') {
    return alertType === 'hidden_risk' ? 'Investigar Riesgo' : 'Tomar Acción';
  }

  switch (alertType) {
    case 'suboptimal_offer':
      return 'Ajustar Oferta';
    case 'silent_opportunity':
      return 'Generar Oferta';
    case 'overprice_emotional':
    case 'bad_negotiation':
      return 'Ver Estrategia';
    default:
      return 'Ver Detalles';
  }
}

// Friendly metadata labels
const METADATA_LABELS: Record<string, string> = {
  offer_id: 'ID de Oferta',
  offer_amount: 'Monto de Oferta',
  property_price: 'Precio de Propiedad',
  fairness_score: 'Índice de Fairness',
  underprice_pct: 'Subvaloración',
  overprice_pct: 'Sobrevaloración',
  parent_offer_id: 'Oferta Anterior',
  counteroffer_amount: 'Contraoferta',
  original_amount: 'Monto Original',
};

function formatMetadataValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-';

  // Format percentages
  if (key.includes('pct') && typeof value === 'number') {
    return `${value.toFixed(1)}%`;
  }

  // Format currency
  if ((key.includes('amount') || key.includes('price')) && typeof value === 'number') {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
  }

  // Format scores
  if (key.includes('score') && typeof value === 'number') {
    return `${(value * 100).toFixed(0)}/100`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function AlertModal({
  alert,
  onClose,
  onAction,
  onActionExecute,
  onDismiss,
  suggestedAmounts,
}: AlertModalProps) {
  const [showActionSurface, setShowActionSurface] = useState(false);

  if (!alert) return null;

  const Icon = alertIcons[alert.type];
  const priority = severityToPriority(alert.severity);
  const hierarchyConfig = ALERT_HIERARCHY[priority];
  const title = getAlertTitle(alert.type);
  const actionText = getActionButtonText(alert.type, priority);
  const recommendation = ALERT_RECOMMENDATIONS[alert.type];

  // Extract amounts from metadata for action surface
  const currentAmount = alert.metadata?.offer_amount as number | undefined;
  const propertyPrice = alert.metadata?.property_price as number | undefined;

  const handleDismiss = async () => {
    if (onDismiss) {
      await onDismiss(alert.id);
    }
    onClose();
  };

  const handleActionClick = () => {
    // If we have onActionExecute, show action surface inline
    if (onActionExecute) {
      setShowActionSurface(true);
    } else if (onAction) {
      // Legacy behavior - just call onAction
      onAction(alert);
    }
  };

  const handleActionExecute = async (action: ActionResult) => {
    if (onActionExecute) {
      await onActionExecute(alert, action);
      onClose();
    }
  };

  const handleBackToAlert = () => {
    setShowActionSurface(false);
  };

  // Filter out internal/irrelevant metadata keys
  const displayMetadata = alert.metadata
    ? Object.entries(alert.metadata).filter(
        ([key]) => !key.startsWith('_') && key !== 'id'
      )
    : [];

  return (
    <Dialog open={!!alert} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="alert-modal-description"
      >
        {/* Action Surface View */}
        {showActionSurface ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToAlert}
                aria-label="Volver a detalles de alerta"
              >
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                Volver
              </Button>
              <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <ActionSurface
              alertType={alert.type}
              currentAmount={currentAmount}
              propertyPrice={propertyPrice}
              suggestedAmounts={suggestedAmounts}
              onAction={handleActionExecute}
              onDismiss={handleBackToAlert}
            />
          </div>
        ) : (
          /* Default Alert View */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className={cn(
                    'p-1.5 rounded-lg',
                    hierarchyConfig.color.bg,
                    hierarchyConfig.color.border,
                    'border'
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', hierarchyConfig.color.icon)}
                    aria-hidden="true"
                  />
                </span>
                <span className="flex-1">{title}</span>
                {priority === 'critical' && (
                  <span
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-600 text-white"
                    role="status"
                    aria-label="Alerta crítica que requiere acción"
                  >
                    Crítica
                  </span>
                )}
              </DialogTitle>
              <DialogDescription id="alert-modal-description" className="text-base">
                {alert.message}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Evidence section */}
              {displayMetadata.length > 0 && (
                <div
                  className="bg-muted/50 rounded-lg p-4 space-y-2"
                  aria-labelledby="evidence-heading"
                >
                  <h4 id="evidence-heading" className="font-semibold text-sm flex items-center gap-2">
                    <span aria-hidden="true">📊</span>
                    Evidencia
                  </h4>
                  <dl className="text-sm space-y-1.5">
                    {displayMetadata.map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <dt className="text-muted-foreground">
                          {METADATA_LABELS[key] || key}:
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {formatMetadataValue(key, value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Recommendation */}
              <div
                className={cn(
                  'rounded-lg p-4 border-l-4',
                  priority === 'critical' && 'bg-red-50 dark:bg-red-950/20 border-red-500',
                  priority === 'timely' && 'bg-amber-50 dark:bg-amber-950/20 border-amber-500',
                  priority === 'informative' && 'bg-slate-50 dark:bg-slate-900/50 border-slate-400'
                )}
                role="note"
                aria-label="Recomendación del sistema"
              >
                <p className="text-sm font-medium flex items-start gap-2">
                  <span aria-hidden="true">💡</span>
                  <span>{recommendation}</span>
                </p>
              </div>

              {/* Why this alert - explainability */}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  ¿Por qué recibo esta alerta?
                </summary>
                <p className="mt-2 text-muted-foreground pl-4 border-l-2 border-muted">
                  Esta alerta fue generada automáticamente basándose en el análisis de datos del mercado,
                  tu historial de interacciones, y las características de la propiedad.
                  {priority === 'critical' && ' Esta alerta es crítica porque requiere tu atención inmediata.'}
                </p>
              </details>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {/* Only show dismiss for non-critical alerts */}
              {!hierarchyConfig.behavior.requiresAction && (
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  aria-label="Descartar esta alerta"
                >
                  Descartar
                </Button>
              )}
              {(onAction || onActionExecute) && (
                <Button
                  onClick={handleActionClick}
                  className={cn(
                    priority === 'critical' && 'bg-red-600 hover:bg-red-700 text-white'
                  )}
                  aria-label={`${actionText} para esta alerta`}
                >
                  {actionText}
                </Button>
              )}
              {hierarchyConfig.behavior.requiresAction && !onAction && !onActionExecute && (
                <Button onClick={onClose}>
                  Entendido
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

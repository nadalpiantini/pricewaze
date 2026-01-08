'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, MapPin, DollarSign, AlertTriangle, Sparkles, Handshake } from 'lucide-react';
import type { AlertType, AlertSeverity } from './AlertBadge';

interface AlertModalProps {
  alert: {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: Record<string, any>;
    propertyId?: string | null;
    offerId?: string | null;
  } | null;
  onClose: () => void;
  onAction?: (alert: NonNullable<AlertModalProps['alert']>) => void;
  onDismiss?: (alertId: string) => void;
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

const alertTitles: Record<AlertType, string> = {
  overprice_emotional: 'Sobreprecio Emocional Detectado',
  bad_timing: 'Timing Incorrecto',
  zone_inflection: 'Zona en Inflexión',
  suboptimal_offer: 'Oferta Subóptima',
  hidden_risk: 'Riesgo Oculto',
  silent_opportunity: 'Oportunidad Silenciosa',
  bad_negotiation: 'Negociación Mal Planteada',
};

function getActionButtonText(alertType: AlertType): string {
  switch (alertType) {
    case 'suboptimal_offer':
      return 'Ajustar Oferta';
    case 'silent_opportunity':
      return 'Generar Oferta';
    case 'overprice_emotional':
      return 'Ver Estrategia';
    case 'bad_negotiation':
      return 'Ver Estrategia';
    default:
      return 'Ver Detalles';
  }
}

export function AlertModal({ alert, onClose, onAction, onDismiss }: AlertModalProps) {
  if (!alert) return null;

  const Icon = alertIcons[alert.type];
  const title = alertTitles[alert.type];
  const actionText = getActionButtonText(alert.type);

  const handleDismiss = async () => {
    if (onDismiss) {
      await onDismiss(alert.id);
    }
    onClose();
  };

  return (
    <Dialog open={!!alert} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription>{alert.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Evidencia si existe */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Evidencia:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {Object.entries(alert.metadata).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-medium">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendación basada en el tipo de alerta */}
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-muted-foreground">
              {alert.type === 'silent_opportunity' &&
                'Esta es una oportunidad que no durará. Considera actuar pronto.'}
              {alert.type === 'suboptimal_offer' &&
                'Tu oferta puede ser optimizada para maximizar tu poder de negociación.'}
              {alert.type === 'overprice_emotional' &&
                'El vendedor está probando el mercado. Negociación recomendada.'}
              {alert.type === 'bad_timing' &&
                'El timing actual no es ideal. Considera esperar o actuar rápido según el contexto.'}
              {alert.type === 'zone_inflection' &&
                'Esta zona está cambiando. Puede ser una oportunidad o un riesgo según la dirección.'}
              {alert.type === 'hidden_risk' &&
                'Investiga estos riesgos antes de proceder con la oferta.'}
              {alert.type === 'bad_negotiation' &&
                'Tu estrategia de negociación puede ser mejorada. Revisa el ritmo y las concesiones.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            Descartar
          </Button>
          {onAction && (
            <Button onClick={() => onAction(alert)}>{actionText}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


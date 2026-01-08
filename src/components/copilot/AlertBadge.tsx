'use client';

import { AlertCircle, Clock, MapPin, DollarSign, AlertTriangle, Sparkles, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType =
  | 'overprice_emotional'
  | 'bad_timing'
  | 'zone_inflection'
  | 'suboptimal_offer'
  | 'hidden_risk'
  | 'silent_opportunity'
  | 'bad_negotiation';

export type AlertSeverity = 'low' | 'medium' | 'high';

interface AlertBadgeProps {
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  onClick?: () => void;
  className?: string;
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

const alertColors: Record<AlertSeverity, { bg: string; border: string; text: string }> = {
  high: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  low: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
  },
};

export function AlertBadge({
  alertType,
  severity,
  message,
  onClick,
  className,
}: AlertBadgeProps) {
  const Icon = alertIcons[alertType];
  const colors = alertColors[severity];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        colors.bg,
        colors.border,
        colors.text,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-2">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{message}</p>
          {onClick && (
            <p className="text-xs mt-1 opacity-75">Click para ver detalles</p>
          )}
        </div>
      </div>
    </div>
  );
}


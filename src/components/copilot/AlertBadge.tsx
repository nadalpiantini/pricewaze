'use client';

import { AlertCircle, Clock, MapPin, DollarSign, AlertTriangle, Sparkles, Handshake, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALERT_HIERARCHY,
  severityToPriority,
  getAlertTitle,
  type AlertPriority,
} from '@/lib/alerts/hierarchy';

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
  onDismiss?: () => void;
  className?: string;
  /** Use hierarchy-based styling (recommended) */
  useHierarchy?: boolean;
  /** Show grouped count */
  groupedCount?: number;
  /** Custom aria-label override */
  ariaLabel?: string;
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

// Legacy colors for backward compatibility
const legacyColors: Record<AlertSeverity, { bg: string; border: string; text: string }> = {
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
  onDismiss,
  className,
  useHierarchy = true,
  groupedCount,
  ariaLabel,
}: AlertBadgeProps) {
  const Icon = alertIcons[alertType];
  const priority: AlertPriority = severityToPriority(severity);
  const hierarchyConfig = ALERT_HIERARCHY[priority];

  // Use hierarchy colors or legacy colors
  const colors = useHierarchy ? hierarchyConfig.color : legacyColors[severity];
  const ariaConfig = hierarchyConfig.aria;

  // Generate accessible label
  const accessibleLabel =
    ariaLabel ||
    `${getAlertTitle(alertType)}: ${message}${groupedCount ? `. ${groupedCount} alertas similares` : ''}`;

  const isInteractive = !!onClick;
  const showDismiss = !!onDismiss && !hierarchyConfig.behavior.requiresAction;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all relative',
        colors.bg,
        colors.border,
        colors.text,
        isInteractive && 'cursor-pointer hover:shadow-md hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
        priority === 'critical' && 'ring-1 ring-red-300 dark:ring-red-700',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : ariaConfig.role}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={accessibleLabel}
      aria-live={ariaConfig.live}
      aria-atomic="true"
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Dismiss button for non-critical alerts */}
      {showDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className={cn(
            'absolute top-2 right-2 p-1 rounded-full transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500'
          )}
          aria-label="Descartar alerta"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}

      <div className="flex items-start gap-2">
        <Icon
          className={cn('h-5 w-5 shrink-0 mt-0.5', useHierarchy && hierarchyConfig.color.icon)}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 pr-4">
          {/* Priority indicator for critical alerts */}
          {priority === 'critical' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white mb-1">
              Acción requerida
            </span>
          )}

          <p className="font-semibold text-sm leading-tight">{message}</p>

          {/* Grouped count indicator */}
          {groupedCount && groupedCount > 1 && (
            <p className="text-xs mt-1 opacity-75">
              +{groupedCount - 1} alertas similares
            </p>
          )}

          {/* Action hint */}
          {isInteractive && !groupedCount && (
            <p className="text-xs mt-1 opacity-75">
              {priority === 'critical' ? 'Click para tomar acción' : 'Click para ver detalles'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact variant for notification lists
 */
export function AlertBadgeCompact({
  alertType,
  severity,
  message,
  onClick,
  className,
}: Omit<AlertBadgeProps, 'useHierarchy' | 'onDismiss' | 'groupedCount'>) {
  const Icon = alertIcons[alertType];
  const priority = severityToPriority(severity);
  const colors = ALERT_HIERARCHY[priority].color;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all',
        colors.bg,
        colors.border,
        colors.text,
        'hover:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        className
      )}
      aria-label={`${getAlertTitle(alertType)}: ${message}`}
    >
      <Icon className={cn('h-3.5 w-3.5', colors.icon)} aria-hidden="true" />
      <span className="truncate max-w-[200px]">{message}</span>
    </button>
  );
}

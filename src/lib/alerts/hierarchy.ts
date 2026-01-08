/**
 * Alert Hierarchy System
 *
 * Professional alert system following Carbon Design System patterns.
 * Implements anti-fatigue rules and smart grouping.
 *
 * Hierarchy:
 * - Critical: Red, 1 at a time, action required, always push
 * - Timely: Amber, max 2/day, time-sensitive opportunity
 * - Informative: Gray, inbox only, no push
 */

import type { AlertSeverity, AlertType } from '@/types/copilot';

// ============================================================================
// ALERT HIERARCHY CONFIGURATION
// ============================================================================

export type AlertPriority = 'critical' | 'timely' | 'informative';

export interface AlertHierarchyConfig {
  priority: AlertPriority;
  color: {
    bg: string;
    border: string;
    text: string;
    icon: string;
  };
  behavior: {
    maxConcurrent: number; // Max alerts shown at once
    maxPerDay: number; // Max alerts per day (0 = unlimited)
    pushEnabled: boolean; // Whether to send push notification
    requiresAction: boolean; // User must take action
    respectQuietHours: boolean; // Respect user's quiet hours
    autoGroupAfter: number; // Group after N similar alerts (0 = no grouping)
  };
  aria: {
    role: 'alert' | 'status' | 'log';
    live: 'assertive' | 'polite' | 'off';
  };
}

// Map severity to priority
export function severityToPriority(severity: AlertSeverity): AlertPriority {
  switch (severity) {
    case 'high':
      return 'critical';
    case 'medium':
      return 'timely';
    case 'low':
      return 'informative';
    default:
      return 'informative';
  }
}

// Map alert type to default priority
export function alertTypeToPriority(alertType: AlertType): AlertPriority {
  switch (alertType) {
    case 'hidden_risk':
      return 'critical';
    case 'silent_opportunity':
    case 'suboptimal_offer':
    case 'bad_negotiation':
      return 'timely';
    case 'overprice_emotional':
    case 'bad_timing':
    case 'zone_inflection':
      return 'informative';
    default:
      return 'informative';
  }
}

export const ALERT_HIERARCHY: Record<AlertPriority, AlertHierarchyConfig> = {
  critical: {
    priority: 'critical',
    color: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-300 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400',
    },
    behavior: {
      maxConcurrent: 1,
      maxPerDay: 0, // Unlimited - critical always shows
      pushEnabled: true,
      requiresAction: true,
      respectQuietHours: false, // Critical ignores quiet hours
      autoGroupAfter: 0, // Never group critical alerts
    },
    aria: {
      role: 'alert',
      live: 'assertive',
    },
  },
  timely: {
    priority: 'timely',
    color: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-300 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-100',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    behavior: {
      maxConcurrent: 2,
      maxPerDay: 5,
      pushEnabled: true,
      requiresAction: false,
      respectQuietHours: true,
      autoGroupAfter: 3, // Group after 3 similar alerts
    },
    aria: {
      role: 'status',
      live: 'polite',
    },
  },
  informative: {
    priority: 'informative',
    color: {
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      icon: 'text-slate-500 dark:text-slate-400',
    },
    behavior: {
      maxConcurrent: 5,
      maxPerDay: 10,
      pushEnabled: false, // Inbox only
      requiresAction: false,
      respectQuietHours: true,
      autoGroupAfter: 2,
    },
    aria: {
      role: 'log',
      live: 'off',
    },
  },
};

// ============================================================================
// ANTI-FATIGUE UTILITIES
// ============================================================================

export interface AlertUserState {
  ignoredCount: number; // Times user ignored this alert type
  lastSeenAt: string | null;
  lastActionAt: string | null;
}

/**
 * Calculate effective priority based on user behavior
 * If user ignores 2+ times, demote priority
 */
export function getEffectivePriority(
  basePriority: AlertPriority,
  userState: AlertUserState
): AlertPriority {
  if (basePriority === 'critical') {
    return 'critical'; // Never demote critical
  }

  if (userState.ignoredCount >= 2) {
    // Demote by one level
    return basePriority === 'timely' ? 'informative' : 'informative';
  }

  return basePriority;
}

/**
 * Check if alert should be shown based on quiet hours
 */
export function isInQuietHours(
  config: AlertHierarchyConfig,
  userQuietHours?: { start: number; end: number }
): boolean {
  if (!config.behavior.respectQuietHours || !userQuietHours) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (userQuietHours.start > userQuietHours.end) {
    return currentHour >= userQuietHours.start || currentHour < userQuietHours.end;
  }

  return currentHour >= userQuietHours.start && currentHour < userQuietHours.end;
}

// ============================================================================
// ALERT GROUPING
// ============================================================================

export interface GroupedAlert {
  representativeAlert: {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
  };
  count: number;
  alertIds: string[];
  groupedMessage: string;
}

/**
 * Group similar alerts to reduce fatigue
 */
export function groupAlerts<T extends { id: string; alert_type: AlertType; severity: AlertSeverity; message: string }>(
  alerts: T[],
  config: AlertHierarchyConfig
): (T | GroupedAlert)[] {
  if (config.behavior.autoGroupAfter === 0) {
    return alerts; // No grouping
  }

  const groups = new Map<string, T[]>();

  // Group by alert type
  for (const alert of alerts) {
    const key = alert.alert_type;
    const existing = groups.get(key) || [];
    existing.push(alert);
    groups.set(key, existing);
  }

  const result: (T | GroupedAlert)[] = [];

  for (const [, groupedAlerts] of groups) {
    if (groupedAlerts.length >= config.behavior.autoGroupAfter) {
      // Create grouped alert
      const first = groupedAlerts[0];
      result.push({
        representativeAlert: {
          id: first.id,
          type: first.alert_type,
          severity: first.severity,
          message: first.message,
        },
        count: groupedAlerts.length,
        alertIds: groupedAlerts.map((a) => a.id),
        groupedMessage: `${groupedAlerts.length} alertas similares`,
      });
    } else {
      // Keep individual alerts
      result.push(...groupedAlerts);
    }
  }

  return result;
}

// ============================================================================
// ALERT TITLES (i18n ready)
// ============================================================================

export const ALERT_TITLES: Record<AlertType, { es: string; en: string }> = {
  overprice_emotional: {
    es: 'Sobreprecio Emocional Detectado',
    en: 'Emotional Overpricing Detected',
  },
  bad_timing: {
    es: 'Timing Incorrecto',
    en: 'Bad Timing',
  },
  zone_inflection: {
    es: 'Zona en Punto de Inflexión',
    en: 'Zone at Inflection Point',
  },
  suboptimal_offer: {
    es: 'Oferta Subóptima',
    en: 'Suboptimal Offer',
  },
  hidden_risk: {
    es: 'Riesgo Oculto Detectado',
    en: 'Hidden Risk Detected',
  },
  silent_opportunity: {
    es: 'Oportunidad Silenciosa',
    en: 'Silent Opportunity',
  },
  bad_negotiation: {
    es: 'Estrategia de Negociación Mejorable',
    en: 'Negotiation Strategy Can Be Improved',
  },
};

export function getAlertTitle(alertType: AlertType, locale: 'es' | 'en' = 'es'): string {
  return ALERT_TITLES[alertType]?.[locale] || alertType;
}

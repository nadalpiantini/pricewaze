'use client';

import { useState, useEffect } from 'react';
import { X, Bell, TrendingDown, TrendingUp, Home, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export type AlertType = 'price_drop' | 'price_increase' | 'new_listing' | 'offer' | 'visit' | 'market' | 'warning';

export interface AlertBannerData {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
  dismissible?: boolean;
}

interface AlertBannerProps {
  alerts: AlertBannerData[];
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  maxVisible?: number;
  className?: string;
}

const alertStyles: Record<AlertType, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  price_drop: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: <TrendingDown className="h-4 w-4" />,
    iconColor: 'text-green-600 dark:text-green-400',
  },
  price_increase: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <TrendingUp className="h-4 w-4" />,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  new_listing: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <Home className="h-4 w-4" />,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  offer: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    icon: <DollarSign className="h-4 w-4" />,
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  visit: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: <Calendar className="h-4 w-4" />,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  market: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: <Bell className="h-4 w-4" />,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  warning: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-4 w-4" />,
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const priorityStyles: Record<string, string> = {
  high: 'ring-2 ring-red-500/20',
  medium: 'ring-1 ring-amber-500/20',
  low: '',
};

export function AlertBanner({
  alerts,
  onDismiss,
  onDismissAll,
  maxVisible = 3,
  className,
}: AlertBannerProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<AlertBannerData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Sort by priority and timestamp
    const sorted = [...alerts].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'];
      const bPriority = priorityOrder[b.priority || 'low'];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    setVisibleAlerts(sorted);
  }, [alerts]);

  const displayedAlerts = isExpanded ? visibleAlerts : visibleAlerts.slice(0, maxVisible);
  const hiddenCount = visibleAlerts.length - maxVisible;

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (id: string) => {
    if (onDismiss) {
      onDismiss(id);
    }
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDismissAll = () => {
    if (onDismissAll) {
      onDismissAll();
    }
    setVisibleAlerts([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with dismiss all */}
      {visibleAlerts.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {visibleAlerts.length} active alert{visibleAlerts.length > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleDismissAll}
          >
            Dismiss all
          </Button>
        </div>
      )}

      {/* Alert items */}
      <div className="space-y-2">
        {displayedAlerts.map((alert) => {
          const style = alertStyles[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'relative flex items-start gap-3 rounded-lg border p-3 transition-all',
                style.bg,
                style.border,
                priorityStyles[alert.priority || 'low'],
                'animate-in slide-in-from-top-2 fade-in duration-300'
              )}
            >
              {/* Icon */}
              <div className={cn('mt-0.5 flex-shrink-0', style.iconColor)}>
                {style.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.message}
                    </p>
                  </div>

                  {/* Dismiss button */}
                  {alert.dismissible !== false && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 -mr-1 -mt-1"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Action link and timestamp */}
                <div className="flex items-center gap-3 mt-2">
                  {alert.link && (
                    <Link
                      href={alert.link}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {alert.linkLabel || 'View details'}
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.timestamp)}
                  </span>
                </div>
              </div>

              {/* Priority indicator */}
              {alert.priority === 'high' && (
                <div className="absolute top-0 right-0 -mt-1 -mr-1">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more/less button */}
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : `Show ${hiddenCount} more alert${hiddenCount > 1 ? 's' : ''}`}
        </Button>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

// Hook for managing alert state
export function useAlertBanner() {
  const [alerts, setAlerts] = useState<AlertBannerData[]>([]);

  const addAlert = (alert: Omit<AlertBannerData, 'id' | 'timestamp'>) => {
    const newAlert: AlertBannerData = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    return newAlert.id;
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const dismissAll = () => {
    setAlerts([]);
  };

  const clearOldAlerts = (maxAgeMs: number = 24 * 60 * 60 * 1000) => {
    const cutoff = new Date(Date.now() - maxAgeMs);
    setAlerts((prev) => prev.filter((a) => new Date(a.timestamp) > cutoff));
  };

  return {
    alerts,
    addAlert,
    dismissAlert,
    dismissAll,
    clearOldAlerts,
  };
}

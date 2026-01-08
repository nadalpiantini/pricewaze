'use client';

import { useMarketAlerts } from '@/hooks/useMarketAlerts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, CheckCheck, TrendingDown, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MarketAlertsFeedProps {
  userId: string;
  maxItems?: number;
  showMarkAllRead?: boolean;
}

const severityIcons = {
  info: AlertCircle,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const severityColors = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  critical: 'bg-red-50 border-red-200 text-red-900',
};

export function MarketAlertsFeed({ userId, maxItems = 20, showMarkAllRead = true }: MarketAlertsFeedProps) {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead } = useMarketAlerts(userId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const displayAlerts = safeAlerts.slice(0, maxItems);
  const unreadAlerts = displayAlerts.filter((a) => !a.read);

  return (
    <div className="space-y-4">
      {/* Header */}
      {showMarkAllRead && unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Market Alerts</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      )}

      {/* Alerts List */}
      {displayAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Market alerts will appear here when your rules are triggered. Create alert rules to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayAlerts.map((alert) => {
            const Icon = severityIcons[alert.severity];
            const isUnread = !alert.read;

            return (
              <Card
                key={alert.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  isUnread && severityColors[alert.severity],
                  !isUnread && 'opacity-75'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        isUnread
                          ? alert.severity === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : alert.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-blue-100 text-blue-600'
                          : 'bg-muted'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isUnread
                            ? alert.severity === 'critical'
                              ? 'text-red-600'
                              : alert.severity === 'warning'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                            : 'text-muted-foreground'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={cn(
                              'text-sm',
                              isUnread ? 'font-semibold' : 'font-normal'
                            )}
                          >
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => markAsRead(alert.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Show more indicator */}
      {alerts.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {maxItems} of {alerts.length} alerts
        </p>
      )}
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, TrendingDown, TrendingUp, Home, ArrowRight, X } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/config/market';
import { formatDistanceToNow } from 'date-fns';

interface PriceAlert {
  id: string;
  type: 'price_drop' | 'new_listing' | 'price_increase';
  propertyTitle: string;
  propertyId: string;
  previousPrice?: number;
  currentPrice: number;
  changePercent?: number;
  createdAt: string;
  read: boolean;
}

const alertConfig = {
  price_drop: {
    icon: TrendingDown,
    label: 'Price Drop',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  new_listing: {
    icon: Home,
    label: 'New Listing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  price_increase: {
    icon: TrendingUp,
    label: 'Price Up',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
};

export function PriceAlertsWidget() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts?limit=5');
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      // Show mock data for demo
      setAlerts([
        {
          id: '1',
          type: 'price_drop',
          propertyTitle: 'Modern Apartment in Piantini',
          propertyId: 'p1',
          previousPrice: 250000,
          currentPrice: 235000,
          changePercent: -6,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: '2',
          type: 'new_listing',
          propertyTitle: 'Luxury Penthouse in Naco',
          propertyId: 'p2',
          currentPrice: 450000,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: '3',
          type: 'price_drop',
          propertyTitle: 'Cozy Studio Downtown',
          propertyId: 'p3',
          previousPrice: 95000,
          currentPrice: 89000,
          changePercent: -6.3,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const dismissAlert = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <WidgetWrapper
      id="price-alerts"
      title="Price Alerts"
      isLoading={loading}
      error={error}
      onRefresh={fetchAlerts}
      headerAction={
        <>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {unreadCount} new
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href="/alerts">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <Link
              key={alert.id}
              href={`/properties/${alert.propertyId}`}
              className={`group flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors ${
                !alert.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {alert.propertyTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs h-5">
                        {config.label}
                      </Badge>
                      {alert.changePercent && (
                        <span className={`text-xs ${config.color}`}>
                          {alert.changePercent > 0 ? '+' : ''}{alert.changePercent}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => dismissAlert(alert.id, e)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-medium">
                    {formatPrice(alert.currentPrice)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {alerts.length === 0 && !loading && !error && (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No price alerts</p>
            <Button variant="link" size="sm" asChild className="mt-1">
              <Link href="/alerts/new">Set up alerts</Link>
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

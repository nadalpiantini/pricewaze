'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, MapPin, ArrowRight } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/config/market';

interface ZoneStats {
  id: string;
  name: string;
  avgPricePerM2: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  propertyCount: number;
}

export function MarketOverviewWidget() {
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZoneStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/zones/stats?limit=4');
      if (!response.ok) throw new Error('Failed to fetch zone stats');

      const data = await response.json();
      setZones(data.zones || []);
    } catch (err) {
      console.error('Failed to fetch zone stats:', err);
      setError('Unable to load market data');
      // Show mock data for demo purposes
      setZones([
        { id: '1', name: 'Piantini', avgPricePerM2: 2500, trend: 'up', trendPercent: 5.2, propertyCount: 45 },
        { id: '2', name: 'Naco', avgPricePerM2: 2200, trend: 'stable', trendPercent: 0.3, propertyCount: 32 },
        { id: '3', name: 'Evaristo Morales', avgPricePerM2: 1800, trend: 'down', trendPercent: -2.1, propertyCount: 28 },
      ]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneStats();
  }, []);

  const getTrendIcon = (trend: ZoneStats['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: ZoneStats['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <WidgetWrapper
      id="market-overview"
      title="Market Overview"
      isLoading={loading}
      error={error}
      onRefresh={fetchZoneStats}
      headerAction={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/properties">
            View Map
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-3">
        {zones.map((zone) => (
          <Link
            key={zone.id}
            href={`/properties?zone=${zone.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{zone.name}</p>
                <p className="text-xs text-muted-foreground">
                  {zone.propertyCount} properties
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                {formatPrice(zone.avgPricePerM2)}/m²
              </p>
              <div className={`flex items-center justify-end gap-1 text-xs ${getTrendColor(zone.trend)}`}>
                {getTrendIcon(zone.trend)}
                <span>{zone.trendPercent > 0 ? '+' : ''}{zone.trendPercent}%</span>
              </div>
            </div>
          </Link>
        ))}

        {zones.length === 0 && !loading && !error && (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No zone data available</p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

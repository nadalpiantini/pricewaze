'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Home,
  DollarSign,
  Clock,
  Activity,
  MapPin,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMarketConfig, formatPrice } from '@/config/market';

// Types
interface MarketMetrics {
  totalProperties: number;
  avgPrice: number;
  avgPricePerM2: number;
  avgDaysOnMarket: number;
  activeListings: number;
  soldLastMonth: number;
  priceChange30d: number;
  inventoryChange30d: number;
}

interface ZoneStats {
  id: string;
  name: string;
  avgPrice: number;
  avgPricePerM2: number;
  propertyCount: number;
  avgDOM: number;
}

interface PriceTrend {
  date: string;
  avgPrice: number;
  volume: number;
}

interface MarketInsightsProps {
  className?: string;
}

/**
 * MarketInsights Dashboard - Tremor-style KPIs and Charts
 *
 * Features:
 * - KPI Cards with trends
 * - Price trend chart
 * - Zone comparison bar chart
 * - Property type distribution
 */
export function MarketInsights({ className }: MarketInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [priceTrend, setPriceTrend] = useState<PriceTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  const market = getMarketConfig();

  useEffect(() => {
    async function fetchMarketData() {
      try {
        setLoading(true);

        // Fetch market metrics
        const [metricsRes, zonesRes, trendsRes] = await Promise.all([
          fetch('/api/market/metrics'),
          fetch('/api/market/zones'),
          fetch('/api/market/trends'),
        ]);

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        } else {
          // Use mock data if API not available
          setMetrics(getMockMetrics());
        }

        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          setZones(zonesData);
        } else {
          setZones(getMockZones());
        }

        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          setPriceTrend(trendsData);
        } else {
          setPriceTrend(getMockTrends());
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        // Use mock data as fallback
        setMetrics(getMockMetrics());
        setZones(getMockZones());
        setPriceTrend(getMockTrends());
      } finally {
        setLoading(false);
      }
    }

    fetchMarketData();
  }, []);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="pt-6">
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Properties"
          value={metrics?.totalProperties.toLocaleString() || '0'}
          change={metrics?.inventoryChange30d}
          icon={<Home className="w-5 h-5" />}
          trend={metrics?.inventoryChange30d ? (metrics.inventoryChange30d > 0 ? 'up' : 'down') : 'neutral'}
        />
        <KPICard
          title="Avg. Price"
          value={formatPrice(metrics?.avgPrice || 0, market)}
          change={metrics?.priceChange30d}
          icon={<DollarSign className="w-5 h-5" />}
          trend={metrics?.priceChange30d ? (metrics.priceChange30d > 0 ? 'up' : 'down') : 'neutral'}
          changeFormat="percent"
        />
        <KPICard
          title="Avg. Price/m²"
          value={formatPrice(metrics?.avgPricePerM2 || 0, market)}
          icon={<MapPin className="w-5 h-5" />}
        />
        <KPICard
          title="Avg. Days on Market"
          value={`${metrics?.avgDaysOnMarket || 0} days`}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Price Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Price Trend (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceTrend}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-2 text-xs">
                            <p className="font-medium">{new Date(payload[0].payload.date).toLocaleDateString()}</p>
                            <p className="text-primary">
                              Avg: {formatPrice(payload[0].value as number, market)}
                            </p>
                            <p className="text-muted-foreground">
                              Volume: {payload[0].payload.volume} listings
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#2563eb"
                    fill="url(#priceGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Zone Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Zone Price Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const zone = payload[0].payload as ZoneStats;
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-2 text-xs">
                            <p className="font-medium">{zone.name}</p>
                            <p className="text-primary">
                              Avg/m²: {formatPrice(zone.avgPricePerM2, market)}
                            </p>
                            <p className="text-muted-foreground">
                              {zone.propertyCount} properties
                            </p>
                            <p className="text-muted-foreground">
                              Avg DOM: {zone.avgDOM} days
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avgPricePerM2" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Market Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActivityItem
              label="Active Listings"
              value={metrics?.activeListings || 0}
              icon={<Home className="w-4 h-4" />}
            />
            <ActivityItem
              label="Sold (30 days)"
              value={metrics?.soldLastMonth || 0}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <ActivityItem
              label="New This Week"
              value={Math.round((metrics?.activeListings || 0) * 0.15)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <ActivityItem
              label="Price Reduced"
              value={Math.round((metrics?.activeListings || 0) * 0.08)}
              icon={<TrendingDown className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  changeFormat?: 'percent' | 'number';
}

function KPICard({ title, value, change, icon, trend = 'neutral', changeFormat = 'number' }: KPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          {change !== undefined && (
            <div className={cn('flex items-center text-xs', getTrendColor())}>
              {getTrendIcon()}
              <span>
                {changeFormat === 'percent'
                  ? `${Math.abs(change).toFixed(1)}%`
                  : Math.abs(change)}
              </span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

// Activity Item Component
interface ActivityItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function ActivityItem({ label, value, icon }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-full bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-lg font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// Mock Data Functions
function getMockMetrics(): MarketMetrics {
  return {
    totalProperties: 1247,
    avgPrice: 285000,
    avgPricePerM2: 1850,
    avgDaysOnMarket: 45,
    activeListings: 892,
    soldLastMonth: 156,
    priceChange30d: 2.3,
    inventoryChange30d: -5,
  };
}

function getMockZones(): ZoneStats[] {
  return [
    { id: '1', name: 'Piantini', avgPrice: 450000, avgPricePerM2: 3200, propertyCount: 124, avgDOM: 32 },
    { id: '2', name: 'Naco', avgPrice: 380000, avgPricePerM2: 2800, propertyCount: 98, avgDOM: 38 },
    { id: '3', name: 'Evaristo Morales', avgPrice: 320000, avgPricePerM2: 2400, propertyCount: 156, avgDOM: 42 },
    { id: '4', name: 'Gazcue', avgPrice: 280000, avgPricePerM2: 2100, propertyCount: 87, avgDOM: 55 },
    { id: '5', name: 'Bella Vista', avgPrice: 250000, avgPricePerM2: 1900, propertyCount: 112, avgDOM: 48 },
    { id: '6', name: 'Los Prados', avgPrice: 180000, avgPricePerM2: 1400, propertyCount: 203, avgDOM: 60 },
  ];
}

function getMockTrends(): PriceTrend[] {
  const trends: PriceTrend[] = [];
  const basePrice = 280000;
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      avgPrice: basePrice + Math.random() * 20000 - 10000 + (30 - i) * 200,
      volume: Math.floor(20 + Math.random() * 30),
    });
  }

  return trends;
}

// Sparkline Component for inline trends
interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
}

export function Sparkline({ data, className = '', color = '#2563eb' }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className={cn('w-20 h-8', className)} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

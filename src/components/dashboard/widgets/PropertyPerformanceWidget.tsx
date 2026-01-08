'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Eye, Heart, MessageSquare, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Generate realistic-looking chart data
const generateChartData = (days: number) => {
  const data = [];
  const now = new Date();
  let baseViews = 45;
  let baseFavorites = 8;
  let baseInquiries = 3;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add some realistic variance
    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;

    baseViews += Math.floor((Math.random() - 0.4) * 10);
    baseFavorites += Math.floor((Math.random() - 0.45) * 3);
    baseInquiries += Math.floor((Math.random() - 0.48) * 2);

    // Keep values positive and reasonable
    baseViews = Math.max(20, Math.min(80, baseViews));
    baseFavorites = Math.max(2, Math.min(20, baseFavorites));
    baseInquiries = Math.max(1, Math.min(10, baseInquiries));

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.floor(baseViews * weekendMultiplier),
      favorites: Math.floor(baseFavorites * weekendMultiplier),
      inquiries: Math.floor(baseInquiries * weekendMultiplier),
    });
  }

  return data;
};

const statsConfig = [
  {
    key: 'views' as const,
    label: 'Total Views',
    icon: Eye,
    color: '#00D4FF',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    key: 'favorites' as const,
    label: 'Favorites',
    icon: Heart,
    color: '#F43F5E',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    key: 'inquiries' as const,
    label: 'Inquiries',
    icon: MessageSquare,
    color: '#AADC00',
    gradient: 'from-lime-500 to-green-500',
  },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="widget-glass p-3 border border-[var(--dashboard-border)] rounded-xl shadow-2xl">
        <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}
              />
              <span className="text-xs capitalize text-muted-foreground">{entry.dataKey}:</span>
              <span className="text-xs font-semibold" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function PerformanceStat({
  stat,
  value,
  change,
  delay,
}: {
  stat: (typeof statsConfig)[0];
  value: number;
  change: number;
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-rose-400' : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'stat-card-premium group',
        'transition-all duration-500 ease-out',
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        '--stat-accent-color': stat.color,
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="p-1.5 rounded-lg"
          style={{
            background: `${stat.color}20`,
            boxShadow: `0 0 15px ${stat.color}30`,
          }}
        >
          <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-bold stat-number"
          style={{
            background: `linear-gradient(135deg, ${stat.color} 0%, white 150%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {value.toLocaleString()}
        </span>
        <div className={cn('flex items-center text-xs font-medium', changeColor)}>
          <ChangeIcon className="h-3 w-3" />
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
    </div>
  );
}

export function PropertyPerformanceWidget() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartData, setChartData] = useState(() => generateChartData(30));
  const [isChartVisible, setIsChartVisible] = useState(false);

  useEffect(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    setChartData(generateChartData(days));
  }, [timeRange]);

  useEffect(() => {
    const timer = setTimeout(() => setIsChartVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate totals and changes
  const totals = chartData.reduce(
    (acc, day) => ({
      views: acc.views + day.views,
      favorites: acc.favorites + day.favorites,
      inquiries: acc.inquiries + day.inquiries,
    }),
    { views: 0, favorites: 0, inquiries: 0 }
  );

  // Calculate mock changes (would come from real data comparison)
  const changes = {
    views: 12,
    favorites: 8,
    inquiries: 15,
  };

  return (
    <WidgetWrapper
      id="property-performance"
      title="Property Performance"
      icon={<TrendingUp className="h-4 w-4 text-[var(--signal-lime)]" />}
      accentColor="lime"
      headerAction={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs hover:bg-white/5 gap-1.5">
          <Link href="/properties">
            Analytics
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statsConfig.map((stat, index) => (
            <PerformanceStat
              key={stat.key}
              stat={stat}
              value={totals[stat.key]}
              change={changes[stat.key]}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Time Range Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--dashboard-bg-elevated)] w-fit">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                timeRange === range
                  ? 'bg-[var(--signal-cyan)] text-black shadow-lg shadow-[var(--signal-cyan)]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div
          className={cn(
            'h-[200px] w-full transition-all duration-700',
            isChartVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="favoritesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inquiriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#AADC00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#AADC00" stopOpacity={0} />
                </linearGradient>
                {/* Glow filters */}
                <filter id="glow-cyan">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--dashboard-border)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--dashboard-border)' }}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="views"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#viewsGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#00D4FF',
                  stroke: '#000',
                  strokeWidth: 2,
                }}
                style={{ filter: 'url(#glow-cyan)' }}
              />

              <Area
                type="monotone"
                dataKey="favorites"
                stroke="#F43F5E"
                strokeWidth={2}
                fill="url(#favoritesGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#F43F5E',
                  stroke: '#000',
                  strokeWidth: 2,
                }}
              />

              <Area
                type="monotone"
                dataKey="inquiries"
                stroke="#AADC00"
                strokeWidth={2}
                fill="url(#inquiriesGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#AADC00',
                  stroke: '#000',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6">
          {statsConfig.map((stat) => (
            <div key={stat.key} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: stat.color,
                  boxShadow: `0 0 8px ${stat.color}`,
                }}
              />
              <span className="text-xs text-muted-foreground capitalize">{stat.key}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
}

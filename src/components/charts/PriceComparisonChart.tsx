'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPrice, getMarketConfig } from '@/config/market';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceComparisonData {
  label: string;
  value: number;
  isHighlight?: boolean;
}

interface PriceComparisonChartProps {
  propertyPrice: number;
  zoneAverage: number;
  marketAverage: number;
  suggestedPrice?: number;
  title?: string;
  className?: string;
}

export function PriceComparisonChart({
  propertyPrice,
  zoneAverage,
  marketAverage,
  suggestedPrice,
  title = 'Price Comparison',
  className,
}: PriceComparisonChartProps) {
  const market = getMarketConfig();

  const data: PriceComparisonData[] = [
    { label: 'Your Price', value: propertyPrice, isHighlight: true },
    { label: 'Zone Avg', value: zoneAverage },
    { label: 'Market Avg', value: marketAverage },
  ];

  if (suggestedPrice) {
    data.push({ label: 'AI Suggested', value: suggestedPrice });
  }

  const percentDiffZone = ((propertyPrice - zoneAverage) / zoneAverage) * 100;
  const percentDiffMarket = ((propertyPrice - marketAverage) / marketAverage) * 100;

  const getPricingStatus = () => {
    if (percentDiffZone > 10) return { label: 'Above Market', color: 'destructive', icon: TrendingUp };
    if (percentDiffZone < -10) return { label: 'Below Market', color: 'default', icon: TrendingDown };
    return { label: 'Fair Price', color: 'secondary', icon: Minus };
  };

  const status = getPricingStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={status.color as 'destructive' | 'default' | 'secondary'} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as PriceComparisonData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-primary text-sm font-semibold">
                          {formatPrice(item.value, market)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={zoneAverage}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isHighlight ? '#2563eb' : '#cbd5e1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">vs Zone</span>
            <span className={cn(
              'font-medium',
              percentDiffZone > 0 ? 'text-red-500' : percentDiffZone < 0 ? 'text-green-500' : ''
            )}>
              {percentDiffZone > 0 ? '+' : ''}{percentDiffZone.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-muted-foreground">vs Market</span>
            <span className={cn(
              'font-medium',
              percentDiffMarket > 0 ? 'text-red-500' : percentDiffMarket < 0 ? 'text-green-500' : ''
            )}>
              {percentDiffMarket > 0 ? '+' : ''}{percentDiffMarket.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

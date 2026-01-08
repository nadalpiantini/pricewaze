'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  data: number[];
  className?: string;
  height?: number;
  width?: number;
  showTrendIcon?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  positiveColor?: string;
  negativeColor?: string;
  neutralColor?: string;
}

export function TrendIndicator({
  data,
  className,
  height = 24,
  width = 60,
  showTrendIcon = true,
  showValue = false,
  valueFormatter = (v) => v.toFixed(0),
  positiveColor = '#22c55e',
  negativeColor = '#ef4444',
  neutralColor = '#94a3b8',
}: TrendIndicatorProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0];
    const last = data[data.length - 1];
    const percentChange = ((last - first) / first) * 100;
    if (percentChange > 1) return 'up';
    if (percentChange < -1) return 'down';
    return 'neutral';
  }, [data]);

  const trendColor = useMemo(() => {
    switch (trend) {
      case 'up':
        return positiveColor;
      case 'down':
        return negativeColor;
      default:
        return neutralColor;
    }
  }, [trend, positiveColor, negativeColor, neutralColor]);

  const TrendIcon = useMemo(() => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  }, [trend]);

  const svgPoints = useMemo(() => {
    if (data.length === 0) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, height, width]);

  const lastValue = data[data.length - 1] || 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <polyline
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={svgPoints}
        />
        {/* End dot */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={
              height -
              ((lastValue - Math.min(...data)) /
                (Math.max(...data) - Math.min(...data) || 1)) *
                (height - 4) -
              2
            }
            r="3"
            fill={trendColor}
          />
        )}
      </svg>

      {showTrendIcon && (
        <TrendIcon
          className="h-4 w-4"
          style={{ color: trendColor }}
        />
      )}

      {showValue && (
        <span
          className="text-sm font-medium"
          style={{ color: trendColor }}
        >
          {valueFormatter(lastValue)}
        </span>
      )}
    </div>
  );
}

// Enhanced version with label and change percentage
interface TrendMetricProps {
  label: string;
  value: string | number;
  data: number[];
  className?: string;
}

export function TrendMetric({ label, value, data, className }: TrendMetricProps) {
  const percentChange = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    return ((last - first) / first) * 100;
  }, [data]);

  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;

  return (
    <div className={cn('', className)}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{value}</span>
        <TrendIndicator data={data} showTrendIcon={false} />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span
          className={cn(
            'text-xs font-medium',
            isPositive && 'text-green-500',
            isNegative && 'text-red-500',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}
        >
          {isPositive ? '+' : ''}
          {percentChange.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">vs last period</span>
      </div>
    </div>
  );
}

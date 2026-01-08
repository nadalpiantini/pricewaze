'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PropertyTypeData {
  name: string;
  value: number;
  color?: string;
}

interface PropertyTypeDistributionProps {
  data?: PropertyTypeData[];
  title?: string;
  className?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

const defaultData: PropertyTypeData[] = [
  { name: 'Apartments', value: 45 },
  { name: 'Houses', value: 25 },
  { name: 'Condos', value: 15 },
  { name: 'Land', value: 10 },
  { name: 'Commercial', value: 5 },
];

export function PropertyTypeDistribution({
  data = defaultData,
  title = 'Property Types',
  className,
  showLegend = true,
  innerRadius = 50,
  outerRadius = 80,
}: PropertyTypeDistributionProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const dataWithColors = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        percentage: ((item.value / total) * 100).toFixed(1),
      })),
    [data, total]
  );

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-primary">
                          {item.value} properties ({item.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showLegend && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value, entry) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats below chart */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {dataWithColors.slice(0, 4).map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 text-xs"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="font-medium ml-auto">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

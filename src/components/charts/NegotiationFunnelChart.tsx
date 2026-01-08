'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface NegotiationFunnelChartProps {
  data?: FunnelData[];
  title?: string;
  className?: string;
  showPercentage?: boolean;
}

const defaultData: FunnelData[] = [
  { stage: 'Offers Sent', count: 100, percentage: 100 },
  { stage: 'Viewed', count: 85, percentage: 85 },
  { stage: 'Countered', count: 45, percentage: 45 },
  { stage: 'Negotiating', count: 28, percentage: 28 },
  { stage: 'Accepted', count: 15, percentage: 15 },
];

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#22c55e'];

export function NegotiationFunnelChart({
  data = defaultData,
  title = 'Negotiation Funnel',
  className,
  showPercentage = true,
}: NegotiationFunnelChartProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 11 }}
                width={90}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as FunnelData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium">{item.stage}</p>
                        <p className="text-primary">{item.count} offers</p>
                        {showPercentage && (
                          <p className="text-muted-foreground">
                            {item.percentage}% of total
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {showPercentage && (
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Conversion: {data[data.length - 1]?.percentage || 0}%</span>
            <span>
              Drop-off: {100 - (data[data.length - 1]?.percentage || 0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

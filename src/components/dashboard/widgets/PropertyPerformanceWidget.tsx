'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Eye, Heart, MessageSquare } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data for demonstration - would come from API
const generateChartData = (days: number) => {
  const data = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.floor(Math.random() * 50) + 20,
      favorites: Math.floor(Math.random() * 10) + 2,
      inquiries: Math.floor(Math.random() * 5) + 1,
    });
  }

  return data;
};

const stats = [
  {
    label: 'Total Views',
    value: '1,234',
    change: '+12%',
    icon: Eye,
    color: 'text-blue-500',
  },
  {
    label: 'Favorites',
    value: '56',
    change: '+8%',
    icon: Heart,
    color: 'text-pink-500',
  },
  {
    label: 'Inquiries',
    value: '23',
    change: '+15%',
    icon: MessageSquare,
    color: 'text-green-500',
  },
];

export function PropertyPerformanceWidget() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartData] = useState(() => generateChartData(30));

  return (
    <WidgetWrapper
      id="property-performance"
      title="Property Performance"
      headerAction={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/properties">
            Analytics
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">{stat.value}</span>
                <span className="text-xs text-green-500">{stat.change}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <TabsList className="h-8">
            <TabsTrigger value="7d" className="text-xs h-6 px-2">7 days</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs h-6 px-2">30 days</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs h-6 px-2">90 days</TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="mt-3">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Views"
                  />
                  <Line
                    type="monotone"
                    dataKey="favorites"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                    name="Favorites"
                  />
                  <Line
                    type="monotone"
                    dataKey="inquiries"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Inquiries"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </WidgetWrapper>
  );
}

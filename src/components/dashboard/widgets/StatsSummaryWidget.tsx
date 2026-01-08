'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, MessageSquare, Calendar, Bell } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { usePropertyStore } from '@/stores/property-store';
import { useOffers } from '@/hooks/use-offers';
import { useVisits } from '@/hooks/use-visits';

interface Stats {
  totalProperties: number;
  activeOffers: number;
  scheduledVisits: number;
  unreadNotifications: number;
}

const statsConfig = [
  {
    key: 'totalProperties' as const,
    title: 'Properties',
    icon: Building2,
    href: '/properties',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'activeOffers' as const,
    title: 'Active Offers',
    icon: MessageSquare,
    href: '/offers',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'scheduledVisits' as const,
    title: 'Visits',
    icon: Calendar,
    href: '/visits',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    key: 'unreadNotifications' as const,
    title: 'Alerts',
    icon: Bell,
    href: '/alerts',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export function StatsSummaryWidget() {
  const { userProperties, fetchUserProperties } = usePropertyStore();
  const { offers, fetchOffers } = useOffers({ role: 'all' });
  const { visits, fetchVisits } = useVisits({ role: 'all' });

  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    activeOffers: 0,
    scheduledVisits: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserProperties(),
          fetchOffers(),
          fetchVisits(),
        ]);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchUserProperties, fetchOffers, fetchVisits]);

  useEffect(() => {
    const safeOffers = Array.isArray(offers) ? offers : [];
    const safeVisits = Array.isArray(visits) ? visits : [];
    const safeProperties = Array.isArray(userProperties) ? userProperties : [];

    setStats({
      totalProperties: safeProperties.length,
      activeOffers: safeOffers.filter(
        (o) => o.status === 'pending' || o.status === 'countered'
      ).length,
      scheduledVisits: safeVisits.filter(
        (v) => v.status === 'scheduled'
      ).length,
      unreadNotifications: 0,
    });
  }, [offers, visits, userProperties]);

  return (
    <WidgetWrapper id="stats-summary" title="Overview" isLoading={loading}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsConfig.map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`p-2.5 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[stat.key]}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </WidgetWrapper>
  );
}

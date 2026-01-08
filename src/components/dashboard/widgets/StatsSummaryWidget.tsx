'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Building2, MessageSquare, Calendar, Bell, Activity } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { usePropertyStore } from '@/stores/property-store';
import { useOffers } from '@/hooks/use-offers';
import { useVisits } from '@/hooks/use-visits';
import { cn } from '@/lib/utils';

interface Stats {
  totalProperties: number;
  activeOffers: number;
  scheduledVisits: number;
  unreadNotifications: number;
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return count;
}

function AnimatedStatCard({
  stat,
  value,
  delay,
}: {
  stat: (typeof statsConfig)[0];
  value: number;
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const animatedValue = useAnimatedCounter(isVisible ? value : 0, 1200);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Link
      href={stat.href}
      className={cn(
        'stat-card-premium group relative',
        'transition-all duration-300 ease-out',
        !isVisible && 'opacity-0 translate-y-4'
      )}
      style={{
        '--stat-accent-color': stat.glowColor,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
      } as React.CSSProperties}
    >
      {/* Pulse indicator for active items */}
      {value > 0 && stat.key === 'activeOffers' && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: stat.glowColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: stat.glowColor }}
            />
          </span>
        </div>
      )}

      {/* Icon with glow */}
      <div
        className="p-3 rounded-xl mb-3 w-fit transition-all duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${stat.bgColor} 0%, transparent 100%)`,
          boxShadow: `0 0 30px ${stat.glowColor}40`,
        }}
      >
        <stat.icon
          className="h-6 w-6 transition-all duration-300"
          style={{ color: stat.color }}
        />
      </div>

      {/* Stats */}
      <div className="space-y-1">
        <p
          className="text-3xl font-bold stat-number tracking-tight"
          style={{
            background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.glowColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {animatedValue}
        </p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {stat.title}
        </p>
      </div>

      {/* Hover indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${stat.glowColor}, transparent)`,
        }}
      />
    </Link>
  );
}

const statsConfig = [
  {
    key: 'totalProperties' as const,
    title: 'Properties',
    icon: Building2,
    href: '/properties',
    color: '#3b82f6',
    glowColor: '#60a5fa',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    key: 'activeOffers' as const,
    title: 'Active Offers',
    icon: MessageSquare,
    href: '/offers',
    color: '#22c55e',
    glowColor: '#4ade80',
    bgColor: 'rgba(34, 197, 94, 0.15)',
  },
  {
    key: 'scheduledVisits' as const,
    title: 'Visits',
    icon: Calendar,
    href: '/visits',
    color: '#a855f7',
    glowColor: '#c084fc',
    bgColor: 'rgba(168, 85, 247, 0.15)',
  },
  {
    key: 'unreadNotifications' as const,
    title: 'Alerts',
    icon: Bell,
    href: '/alerts',
    color: '#f59e0b',
    glowColor: '#fbbf24',
    bgColor: 'rgba(245, 158, 11, 0.15)',
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
    <WidgetWrapper
      id="stats-summary"
      title="Overview"
      isLoading={loading}
      icon={<Activity className="h-4 w-4 text-[var(--signal-cyan)]" />}
      accentColor="cyan"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => (
          <AnimatedStatCard
            key={stat.key}
            stat={stat}
            value={stats[stat.key]}
            delay={index * 100}
          />
        ))}
      </div>
    </WidgetWrapper>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  MessageSquare,
  Calendar,
  Building2,
  Heart,
  TrendingUp,
  ArrowRight,
  Activity,
  Sparkles,
} from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { useOffers } from '@/hooks/use-offers';
import { useVisits } from '@/hooks/use-visits';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'offer' | 'visit' | 'property' | 'favorite' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  href: string;
}

const activityConfig = {
  offer: {
    icon: MessageSquare,
    color: '#22c55e',
    gradient: 'from-green-500/20 to-green-600/5',
  },
  visit: {
    icon: Calendar,
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-purple-600/5',
  },
  property: {
    icon: Building2,
    color: '#3b82f6',
    gradient: 'from-blue-500/20 to-blue-600/5',
  },
  favorite: {
    icon: Heart,
    color: '#f43f5e',
    gradient: 'from-rose-500/20 to-rose-600/5',
  },
  alert: {
    icon: TrendingUp,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-amber-600/5',
  },
};

function ActivityCard({
  activity,
  index,
}: {
  activity: ActivityItem;
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Link
      href={activity.href}
      className={cn(
        'activity-item group flex items-start gap-3 p-3 rounded-xl',
        'transition-all duration-300 border border-transparent',
        'hover:bg-white/5 hover:border-[var(--dashboard-border-hover)]'
      )}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Icon with glow */}
      <div
        className="p-2 rounded-lg shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${config.color}25 0%, ${config.color}10 100%)`,
          boxShadow: `0 0 15px ${config.color}20`,
        }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium group-hover:text-[var(--signal-cyan)] transition-colors">
          {activity.title}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {activity.description}
        </p>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
      </span>
    </Link>
  );
}

export function RecentActivityWidget() {
  const { offers, fetchOffers } = useOffers({ role: 'all' });
  const { visits, fetchVisits } = useVisits({ role: 'all' });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchOffers(), fetchVisits()]);
      } catch (error) {
        console.error('Failed to load activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchOffers, fetchVisits]);

  useEffect(() => {
    const safeOffers = Array.isArray(offers) ? offers : [];
    const safeVisits = Array.isArray(visits) ? visits : [];

    const activityItems: ActivityItem[] = [];

    // Add recent offers
    safeOffers.slice(0, 5).forEach((offer) => {
      activityItems.push({
        id: `offer-${offer.id}`,
        type: 'offer',
        title: `Offer ${offer.status}`,
        description: `$${offer.amount.toLocaleString()} on ${offer.property?.title || 'Property'}`,
        timestamp: offer.created_at,
        href: `/offers/${offer.id}`,
      });
    });

    // Add recent visits
    safeVisits.slice(0, 5).forEach((visit) => {
      activityItems.push({
        id: `visit-${visit.id}`,
        type: 'visit',
        title: `Visit ${visit.status}`,
        description: visit.property?.title || 'Property visit',
        timestamp: visit.scheduled_at,
        href: `/visits/${visit.id}`,
      });
    });

    // Sort by timestamp and take most recent
    activityItems.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setActivities(activityItems.slice(0, 6));
  }, [offers, visits]);

  return (
    <WidgetWrapper
      id="recent-activity"
      title="Recent Activity"
      isLoading={loading}
      icon={<Activity className="h-4 w-4 text-purple-400" />}
      accentColor="purple"
      headerAction={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs hover:bg-white/5 gap-1.5">
          <Link href="/notifications">
            View All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <ActivityCard key={activity.id} activity={activity} index={index} />
        ))}

        {activities.length === 0 && !loading && (
          <div className="empty-state-premium py-8">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.05) 100%)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.2)',
              }}
            >
              <Sparkles className="h-7 w-7 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
            <p className="text-xs text-muted-foreground">
              Your activity will appear here
            </p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

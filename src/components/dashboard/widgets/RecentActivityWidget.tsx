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
} from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { useOffers } from '@/hooks/use-offers';
import { useVisits } from '@/hooks/use-visits';
import { formatDistanceToNow } from 'date-fns';

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
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  visit: {
    icon: Calendar,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  property: {
    icon: Building2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  favorite: {
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  alert: {
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
};

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
      headerAction={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/notifications">
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-2">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;

          return (
            <Link
              key={activity.id}
              href={activity.href}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </span>
            </Link>
          );
        })}

        {activities.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

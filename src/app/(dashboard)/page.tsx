'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MessageSquare,
  Calendar,
  Bell,
  Plus,
  CalendarPlus,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { usePropertyStore } from '@/stores/property-store';
import { useOffers } from '@/hooks/use-offers';
import { useVisits } from '@/hooks/use-visits';

interface DashboardStats {
  totalProperties: number;
  activeOffers: number;
  scheduledVisits: number;
  unreadNotifications: number;
}

interface ActivityItem {
  id: string;
  type: 'offer' | 'visit' | 'property' | 'notification';
  title: string;
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const { userProperties, fetchUserProperties } = usePropertyStore();
  const { offers, fetchOffers } = useOffers({ role: 'all' });
  const { visits, fetchVisits } = useVisits({ role: 'all' });

  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeOffers: 0,
    scheduledVisits: 0,
    unreadNotifications: 0,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserProperties(),
          fetchOffers(),
          fetchVisits(),
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchUserProperties, fetchOffers, fetchVisits]);

  // Calculate stats
  useEffect(() => {
    const activeOffers = offers.filter(
      (o) => o.status === 'pending' || o.status === 'countered'
    ).length;

    const scheduledVisits = visits.filter(
      (v) => v.status === 'scheduled'
    ).length;

    setStats({
      totalProperties: userProperties.length,
      activeOffers,
      scheduledVisits,
      unreadNotifications: 0, // Will be fetched from notifications API
    });

    // Build recent activity
    const activity: ActivityItem[] = [];

    // Add recent offers
    offers.slice(0, 3).forEach((offer) => {
      activity.push({
        id: offer.id,
        type: 'offer',
        title: `Offer ${offer.status}`,
        description: `$${offer.amount.toLocaleString()} on ${offer.property?.title || 'Property'}`,
        timestamp: offer.created_at,
      });
    });

    // Add recent visits
    visits.slice(0, 3).forEach((visit) => {
      activity.push({
        id: visit.id,
        type: 'visit',
        title: `Visit ${visit.status}`,
        description: visit.property?.title || 'Property visit',
        timestamp: visit.scheduled_at,
      });
    });

    // Sort by timestamp
    activity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setRecentActivity(activity.slice(0, 5));
  }, [offers, visits, userProperties]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'offer':
        return <MessageSquare className="h-4 w-4" />;
      case 'visit':
        return <Calendar className="h-4 w-4" />;
      case 'property':
        return <Building2 className="h-4 w-4" />;
      case 'notification':
        return <Bell className="h-4 w-4" />;
    }
  };

  const statsCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      href: '/dashboard/properties',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Offers',
      value: stats.activeOffers,
      icon: MessageSquare,
      href: '/dashboard/offers',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Scheduled Visits',
      value: stats.scheduledVisits,
      icon: Calendar,
      href: '/dashboard/visits',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Unread Notifications',
      value: stats.unreadNotifications,
      icon: Bell,
      href: '/dashboard/notifications',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your properties today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions and activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can do right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-3" variant="outline" asChild>
              <Link href="/properties/new">
                <Plus className="h-4 w-4" />
                List a New Property
              </Link>
            </Button>
            <Button className="w-full justify-start gap-3" variant="outline" asChild>
              <Link href="/properties">
                <CalendarPlus className="h-4 w-4" />
                Schedule a Property Visit
              </Link>
            </Button>
            <Button className="w-full justify-start gap-3" variant="outline" asChild>
              <Link href="/dashboard/offers">
                <TrendingUp className="h-4 w-4" />
                Review Pending Offers
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest updates and actions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/notifications">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Properties chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
          <CardDescription>
            Views and engagement over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chart coming soon</p>
              <p className="text-sm">Property analytics will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

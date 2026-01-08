'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Notification } from '@/types/database';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, typeof Bell> = {
  offer: MessageSquare,
  visit: Calendar,
  property: Building2,
  price: DollarSign,
  alert: AlertCircle,
  default: Bell,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const result = await response.json();
        // API returns { data: [...], pagination: {...} }
        setNotifications(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on your property activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderNotificationsList(filteredNotifications)}
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          {renderNotificationsList(filteredNotifications)}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderNotificationsList(items: Notification[]) {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications about your properties and offers will appear here.'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((notification) => {
          const Icon = notificationIcons[notification.type] || notificationIcons.default;

          return (
            <Card
              key={notification.id}
              className={cn(
                'transition-colors',
                !notification.read && 'bg-primary/5 border-primary/20'
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      notification.read ? 'bg-muted' : 'bg-primary/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        notification.read
                          ? 'text-muted-foreground'
                          : 'text-primary'
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          className={cn(
                            'text-sm',
                            !notification.read && 'font-semibold'
                          )}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
}

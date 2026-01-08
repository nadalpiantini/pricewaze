'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

// Fetch notifications
async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

// Fetch unread count
async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count');
  if (!res.ok) throw new Error('Failed to fetch unread count');
  const data = await res.json();
  return data.count || 0;
}

// Mark notification as read
async function markAsRead(notificationId: string): Promise<void> {
  const res = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Subscribe to realtime updates (with error handling)
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricewaze_notifications',
        },
        () => {
          // Refetch notifications when changes occur
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        }
      )
      .subscribe((status) => {
        // Silently handle connection errors - fallback to polling
        if (status === 'CHANNEL_ERROR') {
          console.debug('[Realtime] Connection unavailable, using polling fallback');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }
    setOpen(false);
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadNotifications = safeNotifications.filter((n) => !n.read_at);
  const readNotifications = safeNotifications.filter((n) => n.read_at);

  const getNotificationLink = (notification: Notification): string => {
    if (notification.data?.property_id) {
      return `/properties/${notification.data.property_id}`;
    }
    if (notification.data?.route_id) {
      return `/routes`;
    }
    return '/notifications';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell"
          aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="notification-badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Unread notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  {unreadNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={getNotificationLink(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'block p-4 hover:bg-muted transition-colors',
                        !notification.read_at && 'bg-blue-50/50'
                      )}
                      data-testid="notification-item"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read_at && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {readNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={getNotificationLink(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className="block p-4 hover:bg-muted transition-colors opacity-75"
                      data-testid="notification-item"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link href="/notifications">
              <Button variant="ghost" className="w-full" size="sm">
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


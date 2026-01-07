'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Calendar,
  Heart,
  Bell,
  Settings,
  ChevronLeft,
  LogOut,
  X,
  GitCompare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My Properties',
    href: '/dashboard/properties',
    icon: Building2,
  },
  {
    label: 'Offers',
    href: '/dashboard/offers',
    icon: MessageSquare,
  },
  {
    label: 'Visits',
    href: '/dashboard/visits',
    icon: Calendar,
  },
  {
    label: 'Favorites',
    href: '/dashboard/favorites',
    icon: Heart,
  },
  {
    label: 'Comparison',
    href: '/dashboard/comparison',
    icon: GitCompare,
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed, isMobile } = useUIStore();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Mobile overlay
  if (isMobile && !sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
          isMobile ? 'w-64' : sidebarCollapsed ? 'w-16' : 'w-64',
          isMobile && !sidebarOpen && '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {(!sidebarCollapsed || isMobile) && (
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="relative h-8 w-auto">
                <Image
                  src="/logo.png"
                  alt="PriceWaze"
                  width={496}
                  height={438}
                  className="h-8 w-auto brightness-100 contrast-100"
                  style={{ mixBlendMode: 'normal' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 -z-10"></div>
              </div>
              <span className="font-semibold text-lg bg-gradient-to-r from-cyan-600 to-emerald-600 bg-clip-text text-transparent">PriceWaze</span>
            </Link>
          )}

          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(sidebarCollapsed && 'mx-auto')}
            >
              <ChevronLeft
                className={cn(
                  'h-5 w-5 transition-transform',
                  sidebarCollapsed && 'rotate-180'
                )}
              />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  sidebarCollapsed && !isMobile && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t p-3">
          <div
            className={cn(
              'flex items-center gap-3',
              sidebarCollapsed && !isMobile && 'flex-col'
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>

            {(!sidebarCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email}
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className={cn(
                'shrink-0',
                sidebarCollapsed && !isMobile && 'mt-2'
              )}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

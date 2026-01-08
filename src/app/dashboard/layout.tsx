'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, isMobile, setIsMobile } = useUIStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-emerald-50/20">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <DashboardHeader title="Dashboard" />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

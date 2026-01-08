'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  CalendarPlus,
  TrendingUp,
  Search,
  Bell,
  FileText,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { cn } from '@/lib/utils';

const actions = [
  {
    title: 'List Property',
    description: 'Add a new listing',
    icon: Plus,
    href: '/properties/new',
    color: '#3b82f6',
    gradient: 'from-blue-500/20 to-blue-600/10',
  },
  {
    title: 'Schedule Visit',
    description: 'Book a viewing',
    icon: CalendarPlus,
    href: '/properties',
    color: '#22c55e',
    gradient: 'from-green-500/20 to-green-600/10',
  },
  {
    title: 'Review Offers',
    description: 'Check pending',
    icon: TrendingUp,
    href: '/offers',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-purple-600/10',
  },
  {
    title: 'Search',
    description: 'Find properties',
    icon: Search,
    href: '/properties',
    color: '#00D4FF',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  {
    title: 'Set Alerts',
    description: 'Price notifications',
    icon: Bell,
    href: '/alerts/new',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-amber-600/10',
  },
  {
    title: 'Contracts',
    description: 'Manage agreements',
    icon: FileText,
    href: '/negotiations',
    color: '#f43f5e',
    gradient: 'from-rose-500/20 to-rose-600/10',
  },
];

function ActionCard({ action, index }: { action: (typeof actions)[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Link
      href={action.href}
      className={cn(
        'quick-action-btn group flex items-center gap-3',
        'relative overflow-hidden'
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-12px)',
        transition: `opacity 0.4s ease-out ${index * 60}ms, transform 0.4s ease-out ${index * 60}ms`,
      }}
    >
      {/* Icon with glow */}
      <div
        className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${action.color}25 0%, ${action.color}10 100%)`,
          boxShadow: `0 0 20px ${action.color}20`,
        }}
      >
        <action.icon
          className="h-4 w-4 transition-all duration-300"
          style={{ color: action.color }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-[var(--signal-cyan)] transition-colors">
          {action.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {action.description}
        </p>
      </div>

      {/* Arrow indicator */}
      <ArrowRight
        className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
        style={{ color: action.color }}
      />
    </Link>
  );
}

export function QuickActionsWidget() {
  return (
    <WidgetWrapper
      id="quick-actions"
      title="Quick Actions"
      icon={<Zap className="h-4 w-4 text-amber-400" />}
      accentColor="amber"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <ActionCard key={action.title} action={action} index={index} />
        ))}
      </div>
    </WidgetWrapper>
  );
}

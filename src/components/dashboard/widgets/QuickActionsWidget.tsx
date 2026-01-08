'use client';

import Link from 'next/link';
import {
  Plus,
  CalendarPlus,
  TrendingUp,
  Search,
  Bell,
  FileText,
} from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';

const actions = [
  {
    title: 'List a Property',
    description: 'Add a new property listing',
    icon: Plus,
    href: '/properties/new',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Schedule Visit',
    description: 'Book a property viewing',
    icon: CalendarPlus,
    href: '/properties',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Review Offers',
    description: 'Check pending offers',
    icon: TrendingUp,
    href: '/offers',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Search Properties',
    description: 'Find your dream home',
    icon: Search,
    href: '/properties',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    title: 'Set Alerts',
    description: 'Get notified on price changes',
    icon: Bell,
    href: '/alerts/new',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    title: 'View Contracts',
    description: 'Manage your agreements',
    icon: FileText,
    href: '/negotiations',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

export function QuickActionsWidget() {
  return (
    <WidgetWrapper id="quick-actions" title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant="outline"
            className="h-auto p-3 flex flex-col items-start gap-2 hover:bg-muted/50"
            asChild
          >
            <Link href={action.href}>
              <div className={`p-2 rounded-full ${action.bgColor}`}>
                <action.icon className={`h-4 w-4 ${action.color}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {action.description}
                </p>
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </WidgetWrapper>
  );
}

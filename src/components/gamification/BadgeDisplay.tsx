'use client';

import { Badge as UIBadge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as LucideIcons from 'lucide-react';
import type { Badge, UserBadge } from '@/types/gamification';

interface BadgeDisplayProps {
  badge: Badge | (UserBadge & { badge?: Badge });
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  earned?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  green: 'bg-green-500/10 text-green-500 border-green-500/30',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  red: 'bg-red-500/10 text-red-500 border-red-500/30',
};

export function BadgeDisplay({ badge, size = 'md', showTooltip = true, earned = true }: BadgeDisplayProps) {
  // Extract the actual Badge object from UserBadge if needed
  const actualBadge: Badge = 'badge' in badge && badge.badge 
    ? badge.badge 
    : badge as Badge;
  const IconComponent = (LucideIcons as any)[actualBadge.icon] || LucideIcons.Award;

  const badgeElement = (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full border-2 flex items-center justify-center
        ${earned ? colorClasses[actualBadge.color as keyof typeof colorClasses] || colorClasses.blue : 'bg-muted text-muted-foreground border-muted-foreground/30 opacity-50'}
        transition-all duration-200
        ${earned ? 'hover:scale-110' : ''}
      `}
    >
      <IconComponent className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'}`} />
    </div>
  );

  if (showTooltip && earned) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeElement}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{actualBadge.name}</p>
              <p className="text-xs text-muted-foreground">{actualBadge.description}</p>
              {actualBadge.points_reward > 0 && (
                <p className="text-xs text-primary">+{actualBadge.points_reward} points</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeElement;
}


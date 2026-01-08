'use client';

import { useMemo } from 'react';
import { Flame, Calendar, Zap, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date | string;
  streakType?: 'daily' | 'weekly';
  className?: string;
  compact?: boolean;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

const getStreakLevel = (streak: number): { level: string; color: string; emoji: string } => {
  if (streak >= 365) return { level: 'Legendary', color: 'text-yellow-500', emoji: '🏆' };
  if (streak >= 180) return { level: 'Master', color: 'text-purple-500', emoji: '🔥' };
  if (streak >= 90) return { level: 'Expert', color: 'text-blue-500', emoji: '💪' };
  if (streak >= 30) return { level: 'Committed', color: 'text-green-500', emoji: '⭐' };
  if (streak >= 14) return { level: 'Rising', color: 'text-teal-500', emoji: '📈' };
  if (streak >= 7) return { level: 'Active', color: 'text-cyan-500', emoji: '✨' };
  if (streak >= 3) return { level: 'Starting', color: 'text-gray-500', emoji: '🌱' };
  return { level: 'New', color: 'text-gray-400', emoji: '👋' };
};

const getNextMilestone = (streak: number): number | null => {
  return STREAK_MILESTONES.find(m => m > streak) || null;
};

export function StreakCounter({
  currentStreak,
  longestStreak,
  lastActivityDate,
  streakType = 'daily',
  className,
  compact = false,
}: StreakCounterProps) {
  const streakInfo = useMemo(() => getStreakLevel(currentStreak), [currentStreak]);
  const nextMilestone = useMemo(() => getNextMilestone(currentStreak), [currentStreak]);

  const isStreakAtRisk = useMemo(() => {
    if (!lastActivityDate) return false;
    const last = new Date(lastActivityDate);
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return streakType === 'daily' ? diffHours > 20 : diffHours > 144; // 20h or 6 days
  }, [lastActivityDate, streakType]);

  const daysToNext = nextMilestone ? nextMilestone - currentStreak : 0;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative">
          <Flame
            className={cn(
              'h-5 w-5 transition-all',
              currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground',
              currentStreak >= 7 && 'animate-pulse'
            )}
          />
          {isStreakAtRisk && currentStreak > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
        </div>
        <div>
          <span className="text-sm font-bold">{currentStreak}</span>
          <span className="text-xs text-muted-foreground ml-1">
            {streakType === 'daily' ? 'days' : 'weeks'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        {/* Main streak display */}
        <div className="flex items-center gap-4">
          {/* Flame icon with animation */}
          <div className="relative">
            <div
              className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full',
                currentStreak > 0
                  ? 'bg-gradient-to-br from-orange-400 to-red-500'
                  : 'bg-muted',
                currentStreak >= 7 && 'animate-pulse'
              )}
            >
              <Flame
                className={cn(
                  'h-8 w-8',
                  currentStreak > 0 ? 'text-white' : 'text-muted-foreground'
                )}
              />
            </div>
            {isStreakAtRisk && currentStreak > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                !
              </div>
            )}
          </div>

          {/* Streak info */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{currentStreak}</span>
              <span className="text-muted-foreground">
                {streakType === 'daily' ? 'day' : 'week'} streak
              </span>
            </div>
            <div className={cn('flex items-center gap-1 text-sm', streakInfo.color)}>
              <span>{streakInfo.emoji}</span>
              <span className="font-medium">{streakInfo.level}</span>
            </div>

            {/* Risk warning */}
            {isStreakAtRisk && currentStreak > 0 && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Activity needed to maintain streak!
              </p>
            )}
          </div>
        </div>

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to {nextMilestone}-day milestone</span>
              <span>{daysToNext} days left</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                style={{
                  width: `${((currentStreak - (STREAK_MILESTONES[STREAK_MILESTONES.indexOf(nextMilestone) - 1] || 0)) / (nextMilestone - (STREAK_MILESTONES[STREAK_MILESTONES.indexOf(nextMilestone) - 1] || 0))) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>Best: <span className="font-medium text-foreground">{longestStreak} days</span></span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {lastActivityDate
                ? `Last: ${new Date(lastActivityDate).toLocaleDateString()}`
                : 'No activity yet'}
            </span>
          </div>
        </div>

        {/* Milestone badges */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          {STREAK_MILESTONES.slice(0, 5).map((milestone) => (
            <div
              key={milestone}
              className={cn(
                'flex-1 flex flex-col items-center p-1 rounded transition-colors',
                currentStreak >= milestone
                  ? 'bg-orange-100 dark:bg-orange-950/30'
                  : 'bg-muted/50'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  currentStreak >= milestone ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                )}
              >
                {milestone}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

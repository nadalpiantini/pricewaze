'use client';

import { useMemo } from 'react';
import { Trophy, Zap, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  currentLevel: number;
  totalPoints: number;
  className?: string;
  showDetails?: boolean;
}

// Points required per level (exponential scaling)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  7500,   // Level 8
  12500,  // Level 9
  20000,  // Level 10 (max)
];

const LEVEL_TITLES = [
  'Newcomer',
  'Explorer',
  'Analyst',
  'Strategist',
  'Expert',
  'Veteran',
  'Master',
  'Elite',
  'Champion',
  'Legend',
];

const LEVEL_COLORS = [
  'from-gray-400 to-gray-500',
  'from-green-400 to-green-500',
  'from-blue-400 to-blue-500',
  'from-purple-400 to-purple-500',
  'from-amber-400 to-amber-500',
  'from-orange-400 to-orange-500',
  'from-red-400 to-red-500',
  'from-pink-400 to-pink-500',
  'from-indigo-400 to-indigo-500',
  'from-yellow-400 to-yellow-500',
];

export function LevelProgressBar({
  currentLevel,
  totalPoints,
  className,
  showDetails = true,
}: LevelProgressBarProps) {
  const levelData = useMemo(() => {
    const safeLevel = Math.min(Math.max(currentLevel, 1), 10);
    const currentThreshold = LEVEL_THRESHOLDS[safeLevel - 1];
    const nextThreshold = LEVEL_THRESHOLDS[safeLevel] || LEVEL_THRESHOLDS[9];
    const isMaxLevel = safeLevel >= 10;

    const pointsInLevel = totalPoints - currentThreshold;
    const pointsNeeded = nextThreshold - currentThreshold;
    const progress = isMaxLevel ? 100 : Math.min((pointsInLevel / pointsNeeded) * 100, 100);
    const pointsToNext = isMaxLevel ? 0 : nextThreshold - totalPoints;

    return {
      level: safeLevel,
      title: LEVEL_TITLES[safeLevel - 1],
      colorClass: LEVEL_COLORS[safeLevel - 1],
      progress,
      pointsToNext,
      isMaxLevel,
      currentThreshold,
      nextThreshold,
    };
  }, [currentLevel, totalPoints]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        {/* Level header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br text-white font-bold text-lg',
                levelData.colorClass
              )}
            >
              {levelData.level}
            </div>
            <div>
              <p className="text-sm font-medium">{levelData.title}</p>
              <p className="text-xs text-muted-foreground">Level {levelData.level}</p>
            </div>
          </div>

          {levelData.isMaxLevel ? (
            <div className="flex items-center gap-1 text-yellow-500">
              <Trophy className="h-5 w-5" />
              <span className="text-sm font-medium">MAX</span>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">
                Next: <span className="text-foreground">{LEVEL_TITLES[levelData.level]}</span>
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="relative">
            <Progress
              value={levelData.progress}
              className="h-3 overflow-hidden"
            />
            {/* Animated shine effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse opacity-50 rounded-full"
              style={{ animationDuration: '2s' }}
            />
          </div>

          {showDetails && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalPoints.toLocaleString()} points</span>
              {!levelData.isMaxLevel && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {levelData.pointsToNext.toLocaleString()} to next level
                </span>
              )}
            </div>
          )}
        </div>

        {/* Level milestones (mini indicators) */}
        {showDetails && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            {LEVEL_THRESHOLDS.slice(0, 5).map((threshold, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex flex-col items-center gap-1',
                  totalPoints >= threshold ? 'text-primary' : 'text-muted-foreground/50'
                )}
              >
                <Star
                  className={cn(
                    'h-3 w-3',
                    totalPoints >= threshold && 'fill-current'
                  )}
                />
                <span className="text-[10px]">{idx + 1}</span>
              </div>
            ))}
            <span className="text-[10px] text-muted-foreground">...</span>
            <div
              className={cn(
                'flex flex-col items-center gap-1',
                currentLevel >= 10 ? 'text-yellow-500' : 'text-muted-foreground/50'
              )}
            >
              <Trophy className="h-3 w-3" />
              <span className="text-[10px]">10</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export utilities for other components
export { LEVEL_THRESHOLDS, LEVEL_TITLES, LEVEL_COLORS };

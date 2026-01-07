'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Achievement, UserAchievement } from '@/types/gamification';

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  className?: string;
}

export function AchievementCard({ achievement, userAchievement, className }: AchievementCardProps) {
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Target;
  const progress = userAchievement?.progress || 0;
  const isCompleted = !!userAchievement?.completed_at;
  const progressPercent = Math.min(100, (progress / achievement.requirement_value) * 100);

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    green: 'bg-green-500/10 text-green-500 border-green-500/30',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  };

  return (
    <Card
      className={cn(
        'p-4 space-y-3 transition-all duration-200',
        isCompleted ? 'border-primary bg-primary/5' : 'border-muted',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-3 rounded-lg border-2',
            isCompleted
              ? colorClasses[achievement.color as keyof typeof colorClasses] || colorClasses.blue
              : 'bg-muted text-muted-foreground border-muted-foreground/30'
          )}
        >
          <IconComponent className="h-6 w-6" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{achievement.name}</h3>
              <p className="text-sm text-muted-foreground">{achievement.description}</p>
            </div>
            {isCompleted && (
              <Badge variant="default" className="bg-primary">
                Completed
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress} / {achievement.requirement_value}
              </span>
              {achievement.points_reward > 0 && (
                <span className="text-primary">+{achievement.points_reward} points</span>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </div>
    </Card>
  );
}


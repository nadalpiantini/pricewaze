'use client';

import { Card } from '@/components/ui/card';
import { BadgeDisplay } from './BadgeDisplay';
import { TrustScoreDisplay } from './TrustScoreDisplay';
import { Award, Target, TrendingUp, Star } from 'lucide-react';
import { useGamificationStats } from '@/hooks/use-gamification';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

export function GamificationStats() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useGamificationStats(user?.id);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TrustScoreDisplay trustScore={stats.trust_score} level={stats.level} />
        
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Total Points</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{stats.total_points}</span>
            <span className="text-muted-foreground">points</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              {stats.badges_count} badges
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {stats.completed_achievements_count} achievements
            </div>
          </div>
        </Card>
      </div>

      {stats.recent_badges.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Recent Badges</span>
          </div>
          <div className="flex gap-3">
            {stats.recent_badges.slice(0, 5).map((userBadge) => (
              <BadgeDisplay
                key={userBadge.id}
                badge={userBadge}
                size="md"
                earned={true}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


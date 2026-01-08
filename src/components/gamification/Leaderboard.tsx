'use client';

import { useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank?: number;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  trustScore: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  className?: string;
  onViewProfile?: (userId: string) => void;
}

type TimeFilter = 'weekly' | 'monthly' | 'alltime';

// Demo data for visualization
const DEMO_ENTRIES: LeaderboardEntry[] = [
  { id: '1', rank: 1, previousRank: 1, name: 'Carlos M.', points: 15420, level: 8, trustScore: 92 },
  { id: '2', rank: 2, previousRank: 3, name: 'Ana R.', points: 12850, level: 7, trustScore: 88 },
  { id: '3', rank: 3, previousRank: 2, name: 'Luis P.', points: 11200, level: 7, trustScore: 85 },
  { id: '4', rank: 4, previousRank: 5, name: 'Maria S.', points: 9800, level: 6, trustScore: 82 },
  { id: '5', rank: 5, previousRank: 4, name: 'Pedro G.', points: 8950, level: 6, trustScore: 80, isCurrentUser: true },
];

const rankIcons = {
  1: <Crown className="h-5 w-5 text-yellow-500" />,
  2: <Medal className="h-5 w-5 text-gray-400" />,
  3: <Award className="h-5 w-5 text-amber-600" />,
};

const rankBgColors = {
  1: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  2: 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700',
  3: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
};

export function Leaderboard({
  entries = DEMO_ENTRIES,
  currentUserRank,
  className,
  onViewProfile,
}: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank) return null;
    const change = entry.previousRank - entry.rank;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'same', value: 0 };
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <TabsList className="h-8">
              <TabsTrigger value="weekly" className="text-xs px-2">Week</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-2">Month</TabsTrigger>
              <TabsTrigger value="alltime" className="text-xs px-2">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {entries.slice(0, 3).map((entry, idx) => {
            const positions = [1, 0, 2]; // Silver, Gold, Bronze order for visual
            const displayEntry = entries[positions[idx]];
            if (!displayEntry) return null;

            return (
              <div
                key={displayEntry.id}
                className={cn(
                  'flex flex-col items-center p-2 rounded-lg border transition-all hover:scale-105',
                  idx === 1 ? 'order-first md:order-none -mt-2' : '',
                  rankBgColors[displayEntry.rank as 1 | 2 | 3] || ''
                )}
              >
                <div className="relative mb-1">
                  <Avatar className={cn('border-2', idx === 1 ? 'h-12 w-12' : 'h-10 w-10')}>
                    <AvatarImage src={displayEntry.avatar} />
                    <AvatarFallback className="text-xs">
                      {displayEntry.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1">
                    {rankIcons[displayEntry.rank as 1 | 2 | 3]}
                  </div>
                </div>
                <p className="text-xs font-medium truncate max-w-full">{displayEntry.name}</p>
                <p className="text-xs text-muted-foreground">{displayEntry.points.toLocaleString()} pts</p>
              </div>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        <div className="space-y-2">
          {entries.slice(3).map((entry) => {
            const rankChange = getRankChange(entry);

            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  entry.isCurrentUser
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => onViewProfile?.(entry.id)}
              >
                {/* Rank */}
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-bold text-muted-foreground">
                    #{entry.rank}
                  </span>
                  {rankChange && (
                    <span className="flex items-center">
                      {rankChange.direction === 'up' && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                      {rankChange.direction === 'down' && (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      {rankChange.direction === 'same' && (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  )}
                </div>

                {/* Avatar and name */}
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.avatar} />
                  <AvatarFallback className="text-xs">
                    {entry.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.name}
                    {entry.isCurrentUser && (
                      <span className="ml-1 text-xs text-primary">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Level {entry.level} | Trust {entry.trustScore}%
                  </p>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-sm font-bold">{entry.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current user position if not in top entries */}
        {currentUserRank && currentUserRank > entries.length && (
          <div className="pt-2 mt-2 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Your rank: <span className="font-bold">#{currentUserRank}</span>
            </p>
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full mt-2">
          View Full Leaderboard
        </Button>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustScoreDisplayProps {
  trustScore: number;
  level?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'New';
};

export function TrustScoreDisplay({
  trustScore,
  level = 1,
  showLabel = true,
  size = 'md',
  className,
}: TrustScoreDisplayProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  return (
    <Card className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Trust Score</span>
        </div>
        {level > 1 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Level {level}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-bold', sizeClasses[size], getScoreColor(trustScore))}>
            {trustScore}
          </span>
          <span className="text-muted-foreground">/ 100</span>
        </div>

        {showLabel && (
          <p className={cn('text-sm font-medium', getScoreColor(trustScore))}>
            {getScoreLabel(trustScore)}
          </p>
        )}

        <Progress value={trustScore} className="h-2" />
      </div>
    </Card>
  );
}


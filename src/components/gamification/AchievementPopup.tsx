'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Award, X, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AchievementData {
  id: string;
  title: string;
  description: string;
  icon?: string;
  points: number;
  type: 'badge' | 'achievement' | 'level_up' | 'milestone';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AchievementPopupProps {
  achievement: AchievementData | null;
  onClose: () => void;
  autoCloseDelay?: number;
  onViewDetails?: (id: string) => void;
}

const rarityStyles = {
  common: {
    bg: 'from-gray-500 to-gray-600',
    border: 'border-gray-400',
    glow: 'shadow-gray-500/30',
    text: 'text-gray-500',
  },
  rare: {
    bg: 'from-blue-500 to-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-500',
  },
  epic: {
    bg: 'from-purple-500 to-purple-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/30',
    text: 'text-purple-500',
  },
  legendary: {
    bg: 'from-yellow-500 to-amber-500',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-500/30',
    text: 'text-yellow-500',
  },
};

const typeIcons = {
  badge: '🏅',
  achievement: '🏆',
  level_up: '⬆️',
  milestone: '🎯',
};

export function AchievementPopup({
  achievement,
  onClose,
  autoCloseDelay = 8000,
  onViewDetails,
}: AchievementPopupProps) {
  const [isClosing, setIsClosing] = useState(false);
  const achievementIdRef = useRef<string | null>(null);

  // Generate particles deterministically based on achievement id
  const particles = useMemo(() => {
    if (!achievement) return [];
    // Use achievement id as seed for consistent particles
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: ((i * 17 + 31) % 100),
      y: ((i * 23 + 47) % 100),
      delay: (i % 5) * 0.1,
    }));
  }, [achievement]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Wait for animation
  }, [onClose]);

  // Reset closing state when achievement changes
  useEffect(() => {
    if (achievement && achievement.id !== achievementIdRef.current) {
      achievementIdRef.current = achievement.id;
      setIsClosing(false);
    }
  }, [achievement]);

  // Auto-close timer
  useEffect(() => {
    if (achievement && !isClosing) {
      const timer = setTimeout(handleClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [achievement, autoCloseDelay, handleClose, isClosing]);

  const isVisible = achievement !== null && !isClosing;

  if (!achievement) return null;

  const rarity = achievement.rarity || 'common';
  const style = rarityStyles[rarity];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleClose}
    >
      {/* Celebration particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={cn(
              'absolute w-2 h-2 rounded-full animate-bounce',
              style.bg.includes('yellow') ? 'bg-yellow-400' : 'bg-white/80'
            )}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: '1.5s',
            }}
          />
        ))}
      </div>

      {/* Popup card */}
      <div
        className={cn(
          'relative w-full max-w-sm bg-background rounded-2xl border-2 p-6 shadow-2xl',
          'transform transition-all duration-500',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4',
          style.border,
          `shadow-lg ${style.glow}`
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Icon with glow */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div
              className={cn(
                'w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center',
                'animate-pulse',
                style.bg
              )}
            >
              <Award className="h-10 w-10 text-white" />
            </div>
            {/* Sparkle effects */}
            <Sparkles className={cn('absolute -top-2 -right-2 h-6 w-6 animate-spin', style.text)} style={{ animationDuration: '3s' }} />
            <Star className={cn('absolute -bottom-1 -left-2 h-5 w-5 animate-pulse', style.text)} />
          </div>
        </div>

        {/* Type badge */}
        <div className="flex justify-center mb-2">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide',
              'bg-muted'
            )}
          >
            {typeIcons[achievement.type]} {achievement.type.replace('_', ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-center mb-2">
          {achievement.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center mb-4">
          {achievement.description}
        </p>

        {/* Points earned */}
        <div
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-lg mb-4',
            'bg-gradient-to-r',
            style.bg.includes('yellow') ? 'from-yellow-100 to-amber-100 dark:from-yellow-950/30 dark:to-amber-950/30' : 'bg-muted'
          )}
        >
          <Star className={cn('h-5 w-5', style.text)} />
          <span className={cn('text-lg font-bold', style.text)}>
            +{achievement.points} points
          </span>
        </div>

        {/* Rarity indicator */}
        <div className="flex justify-center mb-4">
          <span className={cn('text-xs font-medium uppercase', style.text)}>
            {rarity === 'legendary' && '★★★★ '}
            {rarity === 'epic' && '★★★ '}
            {rarity === 'rare' && '★★ '}
            {rarity === 'common' && '★ '}
            {rarity}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Close
          </Button>
          {onViewDetails && (
            <Button
              className={cn('flex-1', style.bg.includes('yellow') ? 'bg-yellow-500 hover:bg-yellow-600' : '')}
              onClick={() => {
                onViewDetails(achievement.id);
                handleClose();
              }}
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing achievement popups
export function useAchievementPopup() {
  const [currentAchievement, setCurrentAchievement] = useState<AchievementData | null>(null);
  const [queue, setQueue] = useState<AchievementData[]>([]);

  const showAchievement = useCallback((achievement: AchievementData) => {
    if (currentAchievement) {
      setQueue((prev) => [...prev, achievement]);
    } else {
      setCurrentAchievement(achievement);
    }
  }, [currentAchievement]);

  const closeAchievement = useCallback(() => {
    setCurrentAchievement(null);
    // Show next in queue after a small delay
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          setCurrentAchievement(next);
          return rest;
        }
        return prev;
      });
    }, 500);
  }, []);

  return {
    currentAchievement,
    showAchievement,
    closeAchievement,
    queueLength: queue.length,
  };
}

'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Calificación' : `Calificación: ${rating.toFixed(1)} de ${maxRating} estrellas`}
    >
      {Array.from({ length: maxRating }).map((_, index) => {
        const value = index + 1;
        const filled = value <= Math.round(rating);
        const halfFilled = value - 0.5 <= rating && rating < value;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default'
            )}
            aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
            aria-checked={interactive ? filled : undefined}
            role={interactive ? 'radio' : undefined}
            tabIndex={interactive ? 0 : -1}
          >
            <Star
              className={cn(
                sizeClasses[size],
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : halfFilled
                    ? 'fill-yellow-200 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm text-muted-foreground" aria-hidden="true">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}


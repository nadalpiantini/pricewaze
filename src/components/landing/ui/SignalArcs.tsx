'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SignalArcsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'lime' | 'gradient';
  animated?: boolean;
  className?: string;
}

export function SignalArcs({
  size = 'md',
  color = 'gradient',
  animated = true,
  className,
}: SignalArcsProps) {
  const sizes = {
    sm: { width: 40, height: 40, strokeWidth: 2 },
    md: { width: 60, height: 60, strokeWidth: 2.5 },
    lg: { width: 80, height: 80, strokeWidth: 3 },
  };

  const { width, height, strokeWidth } = sizes[size];

  const gradientId = useMemo(() => {
    return `signal-gradient-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getStroke = () => {
    switch (color) {
      case 'cyan':
        return 'var(--signal-cyan)';
      case 'lime':
        return 'var(--signal-lime)';
      case 'gradient':
        return `url(#${gradientId})`;
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 60"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--signal-cyan)" />
          <stop offset="100%" stopColor="var(--signal-lime)" />
        </linearGradient>
      </defs>

      {/* Arc 1 - innermost */}
      <path
        d="M30 45 A15 15 0 0 1 15 30"
        stroke={getStroke()}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        className={cn(animated && 'animate-signal-pulse-subtle')}
        style={{ animationDelay: '0ms' }}
        opacity={0.9}
      />

      {/* Arc 2 - middle */}
      <path
        d="M30 50 A20 20 0 0 1 10 30"
        stroke={getStroke()}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        className={cn(animated && 'animate-signal-pulse-subtle')}
        style={{ animationDelay: '200ms' }}
        opacity={0.7}
      />

      {/* Arc 3 - outermost */}
      <path
        d="M30 55 A25 25 0 0 1 5 30"
        stroke={getStroke()}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        className={cn(animated && 'animate-signal-pulse-subtle')}
        style={{ animationDelay: '400ms' }}
        opacity={0.5}
      />
    </svg>
  );
}

interface PulsingDotProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'lime' | 'green' | 'amber' | 'red';
  animated?: boolean;
  className?: string;
}

export function PulsingDot({
  size = 'md',
  color = 'cyan',
  animated = true,
  className,
}: PulsingDotProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colors = {
    cyan: 'bg-[var(--signal-cyan)]',
    lime: 'bg-[var(--signal-lime)]',
    green: 'bg-[var(--signal-strong)]',
    amber: 'bg-[var(--signal-neutral)]',
    red: 'bg-[var(--signal-weak)]',
  };

  const glowColors = {
    cyan: 'shadow-[var(--signal-cyan)]',
    lime: 'shadow-[var(--signal-lime)]',
    green: 'shadow-[var(--signal-strong)]',
    amber: 'shadow-[var(--signal-neutral)]',
    red: 'shadow-[var(--signal-weak)]',
  };

  return (
    <span className={cn('relative inline-flex', className)}>
      {animated && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            colors[color],
            'animate-ping'
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          sizes[size],
          colors[color],
          'shadow-lg',
          glowColors[color]
        )}
      />
    </span>
  );
}

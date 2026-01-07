'use client';

import { cn } from '@/lib/utils';

interface GridBackgroundProps {
  variant?: 'dots' | 'lines' | 'mesh';
  className?: string;
  animated?: boolean;
}

export function GridBackground({
  variant = 'dots',
  className,
  animated = false,
}: GridBackgroundProps) {
  if (variant === 'dots') {
    return (
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'bg-grid-pattern',
          animated && 'animate-pulse',
          className
        )}
        style={{
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />
    );
  }

  if (variant === 'lines') {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none', className)}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 212, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 212, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />
    );
  }

  if (variant === 'mesh') {
    return (
      <div className={cn('absolute inset-0 pointer-events-none', className)}>
        {/* Radial gradient mesh */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 212, 255, 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 100% 50%, rgba(170, 220, 0, 0.1), transparent),
              radial-gradient(ellipse 60% 40% at 0% 50%, rgba(0, 180, 215, 0.1), transparent)
            `,
          }}
        />
      </div>
    );
  }

  return null;
}

interface GradientOrbProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  color?: 'cyan' | 'lime' | 'teal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  blur?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function GradientOrb({
  position = 'center',
  color = 'cyan',
  size = 'md',
  blur = 'md',
  animated = false,
  className,
}: GradientOrbProps) {
  const positions = {
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const sizes = {
    sm: 'w-64 h-64',
    md: 'w-96 h-96',
    lg: 'w-[32rem] h-[32rem]',
    xl: 'w-[48rem] h-[48rem]',
  };

  const blurs = {
    sm: 'blur-2xl',
    md: 'blur-3xl',
    lg: 'blur-[100px]',
  };

  const colors = {
    cyan: 'bg-[var(--signal-cyan)]',
    lime: 'bg-[var(--signal-lime)]',
    teal: 'bg-[var(--signal-teal)]',
  };

  return (
    <div
      className={cn(
        'absolute rounded-full opacity-20 pointer-events-none',
        positions[position],
        sizes[size],
        blurs[blur],
        colors[color],
        animated && 'animate-pulse',
        className
      )}
    />
  );
}

interface NoiseOverlayProps {
  opacity?: number;
  className?: string;
}

export function NoiseOverlay({ opacity = 0.03, className }: NoiseOverlayProps) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

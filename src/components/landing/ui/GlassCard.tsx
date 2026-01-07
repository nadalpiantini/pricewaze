'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
  glow?: 'none' | 'cyan' | 'lime' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      glow = 'none',
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base glass morphism
          'relative rounded-2xl backdrop-blur-xl',
          'border border-white/10',
          'transition-all duration-300 ease-out',

          // Variant styles
          variant === 'default' && 'bg-[var(--landing-bg-card)]/60',
          variant === 'elevated' && 'bg-[var(--landing-bg-elevated)]/80',
          variant === 'interactive' && [
            'bg-[var(--landing-bg-card)]/60',
            'hover:bg-[var(--landing-bg-card)]/80',
            'hover:border-[var(--signal-cyan)]/30',
            'hover:-translate-y-1',
            'hover:shadow-2xl hover:shadow-black/30',
            'cursor-pointer',
          ],

          // Glow effects
          glow === 'cyan' && 'shadow-lg shadow-[var(--signal-cyan)]/20',
          glow === 'lime' && 'shadow-lg shadow-[var(--signal-lime)]/20',
          glow === 'gradient' && 'shadow-lg shadow-[var(--signal-cyan)]/10',

          // Padding
          padding === 'none' && 'p-0',
          padding === 'sm' && 'p-4',
          padding === 'md' && 'p-6',
          padding === 'lg' && 'p-8',

          className
        )}
        {...props}
      >
        {/* Gradient border overlay for glow === 'gradient' */}
        {glow === 'gradient' && (
          <div
            className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, var(--signal-cyan) 0%, transparent 50%, var(--signal-lime) 100%)',
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
            }}
          />
        )}
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };
export type { GlassCardProps };

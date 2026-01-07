'use client';

import Link from 'next/link';
import { ArrowRight, Check, CreditCard, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientOrb } from './ui/GridBackground';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

export function CTASection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative py-24 sm:py-32 bg-[var(--landing-bg-deep)] overflow-hidden">
      {/* Background Effects */}
      <GradientOrb position="center" color="cyan" size="xl" blur="lg" />
      <GradientOrb position="top-right" color="lime" size="lg" blur="lg" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'text-center',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
        >
          {/* Badge */}
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-[var(--signal-lime)] bg-[var(--signal-lime)]/10 rounded-full">
            Únete al Movimiento
          </span>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--landing-text-primary)] mb-6 font-[family-name:var(--font-display)]">
            Únete a la revolución de{' '}
            <span className="gradient-text-animated">
              transparencia inmobiliaria
            </span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto mb-8">
            Cada usuario cuenta. Cada dato importa. Juntos cambiamos el juego y
            democratizamos el acceso a información real del mercado.
          </p>

          {/* Trust Points */}
          <div
            className={cn(
              'flex flex-wrap justify-center gap-6 mb-10',
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '200ms' }}
          >
            {[
              { icon: CreditCard, text: 'Sin tarjeta de crédito' },
              { icon: Zap, text: 'Gratis para compradores' },
              { icon: Shield, text: 'Tus datos, tu control' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 text-sm text-[var(--landing-text-muted)]"
              >
                <item.icon className="w-4 h-4 text-[var(--signal-strong)]" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-4 mb-12',
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '300ms' }}
          >
            <Button
              asChild
              size="lg"
              className={cn(
                'h-14 px-10 text-lg font-semibold',
                'bg-gradient-to-r from-[var(--signal-cyan)] to-[var(--signal-lime)]',
                'hover:from-[var(--signal-lime)] hover:to-[var(--signal-cyan)]',
                'text-[var(--landing-bg-deep)] border-0',
                'shadow-lg shadow-[var(--signal-cyan)]/25',
                'transition-all duration-300 hover:scale-105',
                'animate-glow-pulse'
              )}
            >
              <Link href="/register">
                Comenzar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                'h-14 px-10 text-lg font-semibold',
                'bg-transparent border-white/20',
                'text-[var(--landing-text-primary)]',
                'hover:bg-white/5 hover:border-white/40',
                'transition-all duration-300'
              )}
            >
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>

          {/* Benefits Quick List */}
          <div
            className={cn(
              'inline-flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--landing-text-muted)]',
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '400ms' }}
          >
            {[
              'Precios reales de mercado',
              'Power Score de negociación',
              'Alertas de oportunidades',
              'Comunidad activa',
            ].map((benefit) => (
              <span key={benefit} className="flex items-center gap-1">
                <Check className="w-4 h-4 text-[var(--signal-strong)]" />
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

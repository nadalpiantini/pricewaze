'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NetworkGraph } from './ui/NetworkGraph';
import { GridBackground, GradientOrb, NoiseOverlay } from './ui/GridBackground';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { PulsingDot } from './ui/SignalArcs';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  stats?: {
    offers: number;
    visits: number;
    users: number;
  };
}

export function HeroSection({
  stats = { offers: 12453, visits: 28721, users: 3892 },
}: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[var(--landing-bg-deep)]">
      {/* Background Layers */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <GridBackground variant="dots" />

        {/* Gradient Orbs */}
        <GradientOrb position="top-left" color="cyan" size="xl" blur="lg" />
        <GradientOrb position="bottom-right" color="lime" size="lg" blur="lg" />
        <GradientOrb position="center" color="teal" size="md" blur="md" animated />

        {/* Network Visualization */}
        <NetworkGraph nodeCount={25} interactive={false} className="opacity-60" />

        {/* Noise Texture */}
        <NoiseOverlay opacity={0.02} />

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, var(--landing-bg-deep) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Live Badge */}
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 mb-8',
              'rounded-full bg-white/5 border border-white/10',
              'backdrop-blur-sm',
              mounted ? 'animate-fade-in' : 'opacity-0'
            )}
          >
            <PulsingDot size="sm" color="green" />
            <span className="text-sm text-[var(--landing-text-secondary)]">
              <AnimatedCounter value={stats.offers} duration={2500} /> ofertas
              registradas esta semana
            </span>
          </div>

          {/* Logo */}
          <div
            className={cn(
              'flex justify-center mb-8',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '200ms' }}
          >
            <Image
              src="/logo.png"
              alt="PriceMap"
              width={100}
              height={100}
              className="drop-shadow-2xl"
              priority
            />
          </div>

          {/* Headline */}
          <h1
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
              'font-bold tracking-tight mb-6',
              'font-[family-name:var(--font-display)]',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '400ms' }}
          >
            <span className="text-[var(--landing-text-primary)]">
              El precio real lo descubrimos{' '}
            </span>
            <span className="gradient-text-animated">JUNTOS</span>
          </h1>

          {/* Subheadline */}
          <p
            className={cn(
              'text-lg sm:text-xl md:text-2xl',
              'text-[var(--landing-text-secondary)] max-w-3xl mx-auto mb-8',
              'leading-relaxed',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '600ms' }}
          >
            Inteligencia inmobiliaria crowdsourced. Tú compartes datos de visitas
            y ofertas, todos accedemos a precios reales de mercado.
          </p>

          {/* Value Proposition Cards */}
          <div
            className={cn(
              'flex flex-wrap justify-center gap-4 mb-10',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '800ms' }}
          >
            {[
              { icon: '📤', label: 'Tú contribuyes', desc: 'visitas y ofertas' },
              { icon: '🧠', label: 'La red aprende', desc: 'patrones de precio' },
              { icon: '📊', label: 'Todos ganan', desc: 'inteligencia real' },
            ].map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  'rounded-xl bg-white/5 border border-white/10',
                  'backdrop-blur-sm transition-all duration-300',
                  'hover:bg-white/10 hover:border-[var(--signal-cyan)]/30'
                )}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[var(--landing-text-primary)]">
                    {item.label}
                  </div>
                  <div className="text-xs text-[var(--landing-text-muted)]">
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-4 mb-12',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '1000ms' }}
          >
            <Button
              asChild
              size="lg"
              className={cn(
                'h-14 px-8 text-lg font-semibold',
                'bg-gradient-to-r from-[var(--signal-cyan)] to-[var(--signal-teal)]',
                'hover:from-[var(--signal-teal)] hover:to-[var(--signal-cyan)]',
                'text-[var(--landing-bg-deep)] border-0',
                'shadow-lg shadow-[var(--signal-cyan)]/25',
                'transition-all duration-300 hover:scale-105'
              )}
            >
              <Link href="/register">
                Únete a la red
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                'h-14 px-8 text-lg font-semibold',
                'bg-transparent border-white/20',
                'text-[var(--landing-text-primary)]',
                'hover:bg-white/5 hover:border-white/40',
                'transition-all duration-300'
              )}
            >
              <Link href="/demo/map">
                <Play className="mr-2 h-5 w-5" />
                Ver demo interactivo
              </Link>
            </Button>
          </div>

          {/* Trust Stats */}
          <div
            className={cn(
              'flex flex-wrap justify-center gap-8 sm:gap-12',
              mounted ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '1200ms' }}
          >
            {[
              { value: stats.visits, label: 'Visitas verificadas' },
              { value: stats.offers, label: 'Ofertas registradas' },
              { value: stats.users, label: 'Usuarios activos' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">
                  <AnimatedCounter
                    value={stat.value}
                    duration={2500}
                    formatOptions={{ notation: 'compact' }}
                  />
                </div>
                <div className="text-sm text-[var(--landing-text-muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className={cn(
            'absolute bottom-8 left-1/2 -translate-x-1/2',
            'flex flex-col items-center gap-2',
            mounted ? 'animate-fade-in' : 'opacity-0'
          )}
          style={{ animationDelay: '1500ms' }}
        >
          <span className="text-xs text-[var(--landing-text-muted)]">Scroll</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal-cyan)] animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}

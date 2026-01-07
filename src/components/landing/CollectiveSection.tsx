'use client';

import { MapPin, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: MapPin,
    title: 'Precio Real por Zona',
    description:
      'No el precio de lista, sino el precio al que realmente se cierran las propiedades. Calculado con datos de miles de transacciones reales.',
    stat: { value: 15, suffix: '%', label: 'promedio bajo lista' },
  },
  {
    icon: Zap,
    title: 'Velocidad de Ofertas',
    description:
      'Descubre cuántas ofertas reciben las propiedades en cada zona. Sabe si tienes tiempo para negociar o si debes actuar rápido.',
    stat: { value: 4.2, suffix: '', label: 'ofertas promedio' },
  },
  {
    icon: TrendingUp,
    title: 'Leverage de Negociación',
    description:
      'Conoce cuándo tienes poder para negociar y cuándo el mercado favorece al vendedor. Datos actualizados en tiempo real.',
    stat: { value: 73, suffix: '%', label: 'mejoran su oferta' },
  },
  {
    icon: BarChart3,
    title: 'Tendencias Vivas',
    description:
      'El mercado cambia constantemente. Nuestros datos reflejan lo que está pasando ahora, no hace 6 meses.',
    stat: { value: 24, suffix: 'h', label: 'actualización' },
  },
];

export function CollectiveSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section className="relative py-24 sm:py-32 bg-[var(--landing-bg-primary)]">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 50%, rgba(170, 220, 0, 0.05) 0%, transparent 40%)
          `,
        }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            'text-center mb-16',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[var(--signal-lime)] bg-[var(--signal-lime)]/10 rounded-full">
            Inteligencia Colectiva
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--landing-text-primary)] mb-4 font-[family-name:var(--font-display)]">
            Datos que{' '}
            <span className="gradient-text-cyan-lime">ningún agente te dará</span>
          </h2>
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto">
            Información real del mercado, generada por la comunidad. Sin filtros,
            sin intereses ocultos.
          </p>
        </div>

        {/* Stats Bar */}
        <div
          className={cn(
            'grid grid-cols-2 md:grid-cols-4 gap-4 mb-16',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '200ms' }}
        >
          {[
            { value: 12453, label: 'Visitas verificadas' },
            { value: 8721, label: 'Ofertas registradas' },
            { value: 3892, label: 'Negociaciones cerradas' },
            { value: 47, label: 'Zonas con datos' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'text-center p-4 rounded-xl',
                'bg-white/5 border border-white/10'
              )}
            >
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                <AnimatedCounter
                  value={stat.value}
                  duration={2000}
                  formatOptions={stat.value > 1000 ? { notation: 'standard' } : {}}
                />
              </div>
              <div className="text-xs sm:text-sm text-[var(--landing-text-muted)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  isVisible ? 'animate-fade-up' : 'opacity-0'
                )}
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <GlassCard
                  variant="interactive"
                  padding="lg"
                  className="h-full"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'shrink-0 w-12 h-12 rounded-xl',
                        'bg-gradient-to-br from-[var(--signal-cyan)]/20 to-[var(--signal-lime)]/20',
                        'flex items-center justify-center'
                      )}
                    >
                      <Icon className="w-6 h-6 text-[var(--signal-cyan)]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[var(--landing-text-primary)] mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-[var(--landing-text-secondary)] text-sm leading-relaxed mb-4">
                        {feature.description}
                      </p>

                      {/* Stat */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold gradient-text-cyan-lime">
                          {feature.stat.value}
                          {feature.stat.suffix}
                        </span>
                        <span className="text-sm text-[var(--landing-text-muted)]">
                          {feature.stat.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>

        {/* Bottom Message */}
        <div
          className={cn(
            'text-center mt-12',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '800ms' }}
        >
          <p className="text-[var(--landing-text-muted)] text-sm">
            Todos los datos son agregados y anonimizados. Tu privacidad es
            nuestra prioridad.
          </p>
        </div>
      </div>
    </section>
  );
}

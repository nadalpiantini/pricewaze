'use client';

import { Upload, Brain, TrendingUp, ArrowRight } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Contribuyes',
    subtitle: 'Tus datos enriquecen la red',
    description:
      'Registra tus visitas verificadas por GPS, las ofertas que haces, y los resultados de tus negociaciones. Todo se agrega de forma anónima.',
    examples: [
      'Visitas verificadas con GPS',
      'Ofertas enviadas a propiedades',
      'Negociaciones y cierres',
    ],
    color: 'cyan' as const,
    gradient: 'from-[var(--signal-cyan)] to-[var(--signal-teal)]',
  },
  {
    number: '02',
    icon: Brain,
    title: 'La Red Aprende',
    subtitle: 'Inteligencia colectiva en acción',
    description:
      'Los datos de miles de usuarios se combinan para revelar patrones reales: precios de cierre por zona, velocidad de ofertas, poder de negociación.',
    examples: [
      'Análisis de patrones por zona',
      'Comparación de listado vs cierre',
      'Tendencias de mercado en tiempo real',
    ],
    color: 'teal' as const,
    gradient: 'from-[var(--signal-teal)] to-[var(--signal-lime)]',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Todos se Benefician',
    subtitle: 'Inteligencia para todos',
    description:
      'Accede a precios reales de mercado, no precios de lista. Conoce tu poder de negociación y toma decisiones informadas con datos de la comunidad.',
    examples: [
      'Precios reales por m² y zona',
      'Score de poder negociador',
      'Recomendaciones de oferta',
    ],
    color: 'lime' as const,
    gradient: 'from-[var(--signal-lime)] to-[var(--signal-cyan)]',
  },
];

export function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-32 bg-[var(--landing-bg-primary)]"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at top center, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            'text-center mb-16 sm:mb-20',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[var(--signal-cyan)] bg-[var(--signal-cyan)]/10 rounded-full">
            Cómo Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--landing-text-primary)] mb-4 font-[family-name:var(--font-display)]">
            El poder del{' '}
            <span className="gradient-text-cyan-lime">crowdsourcing</span>
          </h2>
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto">
            Como Waze, pero para precios inmobiliarios. Todos contribuimos, todos
            nos beneficiamos.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={cn(
                  isVisible ? 'animate-fade-up' : 'opacity-0'
                )}
                style={{ animationDelay: `${200 + index * 150}ms` }}
              >
                <GlassCard
                  variant="interactive"
                  glow="none"
                  padding="lg"
                  className="h-full group"
                >
                  {/* Step Number */}
                  <div
                    className={cn(
                      'inline-flex items-center justify-center',
                      'w-12 h-12 rounded-xl mb-6',
                      'bg-gradient-to-br',
                      step.gradient,
                      'text-[var(--landing-bg-deep)] font-bold text-lg'
                    )}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="mb-4">
                    <Icon
                      className={cn(
                        'w-10 h-10',
                        step.color === 'cyan' && 'text-[var(--signal-cyan)]',
                        step.color === 'teal' && 'text-[var(--signal-teal)]',
                        step.color === 'lime' && 'text-[var(--signal-lime)]',
                        'transition-transform duration-300 group-hover:scale-110'
                      )}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-[var(--landing-text-primary)] mb-2">
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      'text-sm font-medium mb-4',
                      step.color === 'cyan' && 'text-[var(--signal-cyan)]',
                      step.color === 'teal' && 'text-[var(--signal-teal)]',
                      step.color === 'lime' && 'text-[var(--signal-lime)]'
                    )}
                  >
                    {step.subtitle}
                  </p>
                  <p className="text-[var(--landing-text-secondary)] mb-6 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Examples */}
                  <ul className="space-y-2">
                    {step.examples.map((example) => (
                      <li
                        key={example}
                        className="flex items-center gap-2 text-sm text-[var(--landing-text-muted)]"
                      >
                        <ArrowRight className="w-4 h-4 text-[var(--signal-cyan)]" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                {/* Connector Arrow (only on desktop, between cards) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center absolute top-1/2 -right-4 transform translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-[var(--signal-cyan)]/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Flow Arrow (mobile) */}
        <div className="flex lg:hidden justify-center mt-8">
          <div className="flex items-center gap-2 text-[var(--landing-text-muted)]">
            <span className="text-sm">Contribuir</span>
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">Aprender</span>
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">Beneficiarse</span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className={cn(
            'text-center mt-16',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '800ms' }}
        >
          <p className="text-[var(--landing-text-secondary)] mb-4">
            Mientras más usuarios contribuyen, más inteligente se vuelve la red
          </p>
          <div className="inline-flex items-center gap-2 text-[var(--signal-cyan)] font-medium">
            <span>Efecto de red en acción</span>
            <span className="animate-pulse">→</span>
          </div>
        </div>
      </div>
    </section>
  );
}

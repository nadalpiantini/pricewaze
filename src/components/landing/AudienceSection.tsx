'use client';

import { useState } from 'react';
import { Home, Building2, Users2, Check } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const audiences = [
  {
    id: 'buyers',
    icon: Home,
    title: 'Compradores',
    subtitle: 'Negocia con inteligencia',
    benefits: [
      'Precios reales de cierre por zona y tipo',
      'Power Score antes de cada oferta',
      'Recomendaciones de precio optimizadas',
      'Historial de negociaciones similares',
      'Alertas de oportunidades de mercado',
    ],
    cta: 'Gratis para siempre',
    highlight: true,
  },
  {
    id: 'sellers',
    icon: Building2,
    title: 'Vendedores',
    subtitle: 'Precio justo, venta rápida',
    benefits: [
      'Valuación basada en datos reales',
      'Comparables de tu zona actualizados',
      'Expectativas realistas de mercado',
      'Tiempo estimado de venta',
      'Análisis de ofertas serias',
    ],
    cta: 'Comenzar gratis',
    highlight: false,
  },
  {
    id: 'agents',
    icon: Users2,
    title: 'Agentes',
    subtitle: 'Datos para cerrar más',
    benefits: [
      'Información para educar a clientes',
      'Comparables instantáneos',
      'Análisis de mercado por zona',
      'Herramientas de presentación',
      'API para integración',
    ],
    cta: 'Plan profesional',
    highlight: false,
  },
];

export function AudienceSection() {
  const [activeTab, setActiveTab] = useState('buyers');
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  const activeAudience = audiences.find((a) => a.id === activeTab);

  return (
    <section className="relative py-24 sm:py-32 bg-[var(--landing-bg-primary)]">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(0, 212, 255, 0.05) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 20%, rgba(170, 220, 0, 0.05) 0%, transparent 40%)
          `,
        }}
      />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            'text-center mb-12',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[var(--signal-cyan)] bg-[var(--signal-cyan)]/10 rounded-full">
            Para Todos
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--landing-text-primary)] mb-4 font-[family-name:var(--font-display)]">
            Todos se benefician{' '}
            <span className="gradient-text-cyan-lime">de manera diferente</span>
          </h2>
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto">
            Ya seas comprador, vendedor o agente, la inteligencia colectiva
            trabaja para ti.
          </p>
        </div>

        {/* Tabs */}
        <div
          className={cn(
            'flex justify-center mb-8',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '200ms' }}
        >
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <button
                  key={audience.id}
                  onClick={() => setActiveTab(audience.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg',
                    'text-sm font-medium transition-all duration-300',
                    activeTab === audience.id
                      ? 'bg-gradient-to-r from-[var(--signal-cyan)] to-[var(--signal-teal)] text-[var(--landing-bg-deep)]'
                      : 'text-[var(--landing-text-secondary)] hover:text-[var(--landing-text-primary)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{audience.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeAudience && (
          <div
            className={cn(
              'max-w-3xl mx-auto',
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '300ms' }}
          >
            <GlassCard
              variant={activeAudience.highlight ? 'elevated' : 'default'}
              glow={activeAudience.highlight ? 'gradient' : 'none'}
              padding="lg"
            >
              <div className="text-center mb-8">
                <div
                  className={cn(
                    'inline-flex items-center justify-center',
                    'w-16 h-16 rounded-2xl mb-4',
                    'bg-gradient-to-br from-[var(--signal-cyan)]/20 to-[var(--signal-lime)]/20'
                  )}
                >
                  <activeAudience.icon className="w-8 h-8 text-[var(--signal-cyan)]" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--landing-text-primary)] mb-2">
                  {activeAudience.title}
                </h3>
                <p className="text-[var(--landing-text-secondary)]">
                  {activeAudience.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {activeAudience.benefits.map((benefit, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-[var(--landing-text-secondary)]"
                  >
                    <Check className="w-5 h-5 shrink-0 text-[var(--signal-strong)] mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <span
                  className={cn(
                    'inline-block px-6 py-2 rounded-full text-sm font-medium',
                    activeAudience.highlight
                      ? 'bg-[var(--signal-strong)]/10 text-[var(--signal-strong)]'
                      : 'bg-white/5 text-[var(--landing-text-secondary)]'
                  )}
                >
                  {activeAudience.cta}
                </span>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Cards Grid (Alternative View for larger screens) */}
        <div
          className={cn(
            'hidden lg:grid grid-cols-3 gap-6 mt-12',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '400ms' }}
        >
          {audiences.map((audience, i) => {
            const Icon = audience.icon;
            return (
              <GlassCard
                key={audience.id}
                variant={audience.highlight ? 'elevated' : 'interactive'}
                glow={audience.highlight ? 'cyan' : 'none'}
                padding="md"
                className={audience.highlight ? 'ring-1 ring-[var(--signal-cyan)]/30' : ''}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-[var(--signal-cyan)]" />
                  <div>
                    <h4 className="font-semibold text-[var(--landing-text-primary)]">
                      {audience.title}
                    </h4>
                    <p className="text-xs text-[var(--landing-text-muted)]">
                      {audience.subtitle}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {audience.benefits.slice(0, 3).map((benefit, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-xs text-[var(--landing-text-secondary)]"
                    >
                      <Check className="w-3 h-3 shrink-0 text-[var(--signal-strong)] mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-[var(--landing-text-muted)]">
                  {audience.cta}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

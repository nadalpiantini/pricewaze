'use client';

import { Shield, Lock, Eye, UserCheck } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const trustPoints = [
  {
    icon: Lock,
    title: 'Datos Anonimizados',
    description:
      'Nadie puede ver TU oferta específica. Todos los datos se agregan de forma anónima antes de ser procesados.',
  },
  {
    icon: Eye,
    title: 'Agregados Estadísticos',
    description:
      'Solo compartimos patrones y tendencias, nunca casos individuales. Tu privacidad está protegida por diseño.',
  },
  {
    icon: UserCheck,
    title: 'Tú Controlas',
    description:
      'Decides qué información compartes y cuándo. Puedes ajustar tu nivel de contribución en cualquier momento.',
  },
  {
    icon: Shield,
    title: 'Seguridad Enterprise',
    description:
      'Encriptación de extremo a extremo, cumplimiento con estándares de la industria, y auditorías regulares.',
  },
];

export function TrustSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section className="relative py-24 sm:py-32 bg-[var(--landing-bg-deep)]">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at bottom center, rgba(0, 212, 255, 0.05) 0%, transparent 50%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            'text-center mb-16',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[var(--signal-strong)] bg-[var(--signal-strong)]/10 rounded-full">
            Confianza & Privacidad
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--landing-text-primary)] mb-4 font-[family-name:var(--font-display)]">
            Tus datos,{' '}
            <span className="gradient-text-cyan-lime">tu control</span>
          </h2>
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto">
            Entendemos que compartir datos requiere confianza. Por eso hemos
            diseñado cada aspecto pensando en tu privacidad.
          </p>
        </div>

        {/* Trust Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {trustPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className={cn(
                  isVisible ? 'animate-fade-up' : 'opacity-0'
                )}
                style={{ animationDelay: `${200 + index * 100}ms` }}
              >
                <GlassCard variant="default" padding="lg" className="h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'shrink-0 w-12 h-12 rounded-xl',
                        'bg-[var(--signal-strong)]/10',
                        'flex items-center justify-center'
                      )}
                    >
                      <Icon className="w-6 h-6 text-[var(--signal-strong)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--landing-text-primary)] mb-2">
                        {point.title}
                      </h3>
                      <p className="text-[var(--landing-text-secondary)] text-sm leading-relaxed">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>

        {/* Value Exchange */}
        <div
          className={cn(
            'text-center',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '600ms' }}
        >
          <GlassCard
            variant="elevated"
            glow="gradient"
            padding="lg"
            className="max-w-2xl mx-auto"
          >
            <h3 className="text-xl font-semibold text-[var(--landing-text-primary)] mb-4">
              El intercambio de valor es claro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-left">
                <div className="text-sm font-medium text-[var(--signal-cyan)] mb-2">
                  Tú compartes
                </div>
                <ul className="text-sm text-[var(--landing-text-secondary)] space-y-1">
                  <li>• Visitas verificadas (anónimas)</li>
                  <li>• Rangos de ofertas (agregados)</li>
                  <li>• Resultados de negociación</li>
                </ul>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-[var(--signal-lime)] mb-2">
                  Tú recibes
                </div>
                <ul className="text-sm text-[var(--landing-text-secondary)] space-y-1">
                  <li>• Precios reales de mercado</li>
                  <li>• Power Score de negociación</li>
                  <li>• Tendencias y predicciones</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-[var(--landing-text-muted)]">
                El beneficio que recibes siempre supera lo que aportas. Ese es el
                poder de la inteligencia colectiva.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

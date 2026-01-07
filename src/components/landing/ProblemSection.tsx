'use client';

import { Eye, EyeOff, HelpCircle, Scale } from 'lucide-react';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

export function ProblemSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative py-20 sm:py-28 bg-[var(--landing-bg-deep)] overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at bottom center, rgba(239, 68, 68, 0.05) 0%, transparent 50%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: The Problem */}
          <div
            className={cn(
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-[var(--signal-weak)] bg-[var(--signal-weak)]/10 rounded-full">
              El Problema
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--landing-text-primary)] mb-6 font-[family-name:var(--font-display)]">
              Los compradores negocian{' '}
              <span className="text-[var(--signal-weak)]">a ciegas</span>
            </h2>
            <p className="text-lg text-[var(--landing-text-secondary)] mb-8 leading-relaxed">
              En el mercado inmobiliario, los vendedores y agentes tienen{' '}
              <strong className="text-[var(--landing-text-primary)]">
                toda la información
              </strong>
              : precios de cierre reales, velocidad de venta, historial de ofertas.
              Los compradores solo ven precios de lista inflados.
            </p>

            {/* Problem Cards */}
            <div className="space-y-4">
              {[
                {
                  icon: Eye,
                  title: 'Vendedores & Agentes',
                  desc: 'Acceso a comps, historial de ventas, múltiples ofertas',
                  status: 'advantage',
                },
                {
                  icon: EyeOff,
                  title: 'Compradores',
                  desc: 'Solo precio de lista, sin datos de negociación real',
                  status: 'disadvantage',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl',
                    'border backdrop-blur-sm',
                    item.status === 'advantage'
                      ? 'bg-[var(--signal-strong)]/5 border-[var(--signal-strong)]/20'
                      : 'bg-[var(--signal-weak)]/5 border-[var(--signal-weak)]/20'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-6 h-6 mt-0.5 shrink-0',
                      item.status === 'advantage'
                        ? 'text-[var(--signal-strong)]'
                        : 'text-[var(--signal-weak)]'
                    )}
                  />
                  <div>
                    <h4 className="font-semibold text-[var(--landing-text-primary)]">
                      {item.title}
                    </h4>
                    <p className="text-sm text-[var(--landing-text-muted)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: The Solution */}
          <div
            className={cn(
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '200ms' }}
          >
            <div
              className={cn(
                'relative p-8 rounded-2xl',
                'bg-gradient-to-br from-[var(--landing-bg-card)] to-[var(--landing-bg-elevated)]',
                'border border-[var(--signal-cyan)]/20'
              )}
            >
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--signal-cyan)]/20 to-[var(--signal-lime)]/20 rounded-2xl blur-xl opacity-50" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Scale className="w-8 h-8 text-[var(--signal-cyan)]" />
                  <span className="text-sm font-medium text-[var(--signal-cyan)]">
                    La Solución
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-[var(--landing-text-primary)] mb-4">
                  ¿Y si pudiéramos{' '}
                  <span className="gradient-text-cyan-lime">
                    nivelar el campo de juego
                  </span>
                  ... juntos?
                </h3>

                <p className="text-[var(--landing-text-secondary)] mb-6 leading-relaxed">
                  Cuando miles de compradores comparten sus experiencias de forma
                  anónima, emerge una inteligencia colectiva que ningún vendedor
                  puede ocultar.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Precios de cierre reales', icon: '💰' },
                    { label: 'Velocidad de ofertas', icon: '⚡' },
                    { label: 'Poder de negociación', icon: '💪' },
                    { label: 'Tendencias por zona', icon: '📈' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-sm text-[var(--landing-text-muted)]"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

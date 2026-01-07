'use client';

import { Users, TrendingUp, Sparkles } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    quote:
      'Gracias a los datos de otros usuarios, descubrí que el precio estaba 15% inflado. Negocié y ahorré $45,000.',
    author: 'María G.',
    role: 'Compradora en Piantini',
    savings: 45000,
  },
  {
    quote:
      'El Power Score me dio confianza para hacer una oferta agresiva. El vendedor aceptó al tercer día.',
    author: 'Carlos R.',
    role: 'Comprador en Naco',
    savings: 28000,
  },
  {
    quote:
      'Ver las ofertas reales de la zona me ayudó a entender que mi precio era justo. Vendí en 3 semanas.',
    author: 'Ana L.',
    role: 'Vendedora en Gazcue',
    savings: 0,
  },
];

export function NetworkEffectSection() {
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
            radial-gradient(ellipse at 30% 20%, rgba(0, 212, 255, 0.08) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 80%, rgba(170, 220, 0, 0.08) 0%, transparent 40%)
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
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[var(--signal-cyan)] bg-[var(--signal-cyan)]/10 rounded-full">
            Efecto de Red
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--landing-text-primary)] mb-4 font-[family-name:var(--font-display)]">
            Mientras más somos,{' '}
            <span className="gradient-text-cyan-lime">mejor para todos</span>
          </h2>
          <p className="text-lg sm:text-xl text-[var(--landing-text-secondary)] max-w-2xl mx-auto">
            Cada usuario que se une hace la red más inteligente. Tu contribución
            ayuda a otros, y la de otros te ayuda a ti.
          </p>
        </div>

        {/* Network Growth Stats */}
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-3 gap-6 mb-16',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '200ms' }}
        >
          {[
            {
              icon: Users,
              value: 3892,
              label: 'Usuarios activos',
              growth: '+23%',
              period: 'este mes',
            },
            {
              icon: TrendingUp,
              value: 847,
              label: 'Nuevos usuarios',
              growth: '+45%',
              period: 'vs mes anterior',
            },
            {
              icon: Sparkles,
              value: 94,
              label: 'Precisión de datos',
              growth: '%',
              period: 'con +1000 usuarios',
            },
          ].map((stat, i) => (
            <GlassCard key={stat.label} variant="default" padding="lg">
              <div className="flex items-start justify-between mb-4">
                <stat.icon className="w-8 h-8 text-[var(--signal-cyan)]" />
                <span className="text-sm font-medium text-[var(--signal-strong)]">
                  {stat.growth}
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">
                <AnimatedCounter value={stat.value} duration={2000} />
                {stat.label === 'Precisión de datos' && '%'}
              </div>
              <div className="text-sm text-[var(--landing-text-muted)]">
                {stat.label}
              </div>
              <div className="text-xs text-[var(--landing-text-muted)] mt-1">
                {stat.period}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Testimonials */}
        <div
          className={cn(
            'mb-12',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '400ms' }}
        >
          <h3 className="text-xl font-semibold text-[var(--landing-text-primary)] text-center mb-8">
            Lo que dice nuestra comunidad
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <GlassCard
                key={testimonial.author}
                variant="interactive"
                padding="lg"
                className={cn(
                  isVisible ? 'animate-fade-up' : 'opacity-0'
                )}
                style={{ animationDelay: `${500 + i * 100}ms` }}
              >
                <blockquote className="text-[var(--landing-text-secondary)] mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--landing-text-primary)]">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-[var(--landing-text-muted)]">
                      {testimonial.role}
                    </div>
                  </div>

                  {testimonial.savings > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-[var(--landing-text-muted)]">
                        Ahorró
                      </div>
                      <div className="font-bold text-[var(--signal-strong)]">
                        ${testimonial.savings.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Bottom Message */}
        <div
          className={cn(
            'text-center',
            isVisible ? 'animate-fade-up' : 'opacity-0'
          )}
          style={{ animationDelay: '800ms' }}
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-left">
              <div className="text-sm text-[var(--landing-text-muted)]">
                Ahorro colectivo de la comunidad
              </div>
              <div className="text-2xl font-bold gradient-text-cyan-lime">
                $<AnimatedCounter value={2847000} duration={3000} />
              </div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-left">
              <div className="text-sm text-[var(--landing-text-muted)]">
                Gracias a la inteligencia compartida
              </div>
              <div className="text-sm text-[var(--landing-text-secondary)]">
                Promedio de $8,500 por usuario
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface PowerGaugeProps {
  score: number;
  animated?: boolean;
}

function PowerGauge({ score, animated = true }: PowerGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.5,
  });

  useEffect(() => {
    if (!isVisible || !animated) {
      setDisplayScore(score);
      return;
    }

    let start = 0;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, isVisible, animated]);

  // Calculate rotation for gauge needle (-135 to 135 degrees)
  const rotation = -135 + (displayScore / 100) * 270;

  // Determine color based on score
  const getColor = () => {
    if (displayScore >= 70) return 'var(--signal-strong)';
    if (displayScore >= 40) return 'var(--signal-neutral)';
    return 'var(--signal-weak)';
  };

  const getLabel = () => {
    if (displayScore >= 70) return 'FUERTE';
    if (displayScore >= 40) return 'MODERADO';
    return 'DÉBIL';
  };

  return (
    <div ref={ref} className="relative w-64 h-32 mx-auto">
      {/* SVG Gauge */}
      <svg viewBox="0 0 200 100" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 90 A 70 70 0 0 1 180 90"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Colored segments */}
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--signal-weak)" />
            <stop offset="50%" stopColor="var(--signal-neutral)" />
            <stop offset="100%" stopColor="var(--signal-strong)" />
          </linearGradient>
        </defs>

        <path
          d="M 20 90 A 70 70 0 0 1 180 90"
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(displayScore / 100) * 220} 220`}
          className="transition-all duration-300"
        />

        {/* Needle */}
        <g
          transform={`rotate(${rotation}, 100, 90)`}
          className="transition-transform duration-300"
        >
          <line
            x1="100"
            y1="90"
            x2="100"
            y2="35"
            stroke={getColor()}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="90" r="6" fill={getColor()} />
        </g>

        {/* Center score */}
        <text
          x="100"
          y="75"
          textAnchor="middle"
          className="text-3xl font-bold"
          fill={getColor()}
        >
          {displayScore}
        </text>
      </svg>

      {/* Label */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center"
        style={{ color: getColor() }}
      >
        <span className="text-sm font-bold tracking-wider">{getLabel()}</span>
      </div>
    </div>
  );
}

export function PowerScoreSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  const factors = [
    {
      icon: TrendingUp,
      label: 'Días en mercado',
      value: '45+',
      impact: 'positive',
      desc: 'Más tiempo = más poder',
    },
    {
      icon: TrendingDown,
      label: 'Ofertas activas',
      value: '1',
      impact: 'positive',
      desc: 'Poca competencia',
    },
    {
      icon: Minus,
      label: 'Precio vs zona',
      value: '+8%',
      impact: 'neutral',
      desc: 'Ligeramente sobre mercado',
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-[var(--landing-bg-deep)]">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.08) 0%, transparent 60%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Info */}
          <div
            className={cn(
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-[var(--signal-cyan)] bg-[var(--signal-cyan)]/10 rounded-full">
              Negotiation Power Score™
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--landing-text-primary)] mb-6 font-[family-name:var(--font-display)]">
              Tu poder de negociación,{' '}
              <span className="gradient-text-cyan-lime">cuantificado</span>
            </h2>

            <p className="text-lg text-[var(--landing-text-secondary)] mb-8 leading-relaxed">
              Calculado con datos de{' '}
              <strong className="text-[var(--landing-text-primary)]">
                miles de negociaciones reales
              </strong>
              . Sabe exactamente cuánto poder tienes antes de hacer una oferta.
            </p>

            {/* Data Sources */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--landing-text-muted)]">
                <Info className="w-4 h-4" />
                <span>Basado en 847 propiedades similares en tu zona</span>
              </div>

              <div className="space-y-3">
                {factors.map((factor) => (
                  <div
                    key={factor.label}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      'bg-white/5 border border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <factor.icon
                        className={cn(
                          'w-5 h-5',
                          factor.impact === 'positive' && 'text-[var(--signal-strong)]',
                          factor.impact === 'negative' && 'text-[var(--signal-weak)]',
                          factor.impact === 'neutral' && 'text-[var(--signal-neutral)]'
                        )}
                      />
                      <div>
                        <div className="text-sm font-medium text-[var(--landing-text-primary)]">
                          {factor.label}
                        </div>
                        <div className="text-xs text-[var(--landing-text-muted)]">
                          {factor.desc}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'font-mono font-bold',
                        factor.impact === 'positive' && 'text-[var(--signal-strong)]',
                        factor.impact === 'negative' && 'text-[var(--signal-weak)]',
                        factor.impact === 'neutral' && 'text-[var(--signal-neutral)]'
                      )}
                    >
                      {factor.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Gauge */}
          <div
            className={cn(
              isVisible ? 'animate-fade-up' : 'opacity-0'
            )}
            style={{ animationDelay: '200ms' }}
          >
            <GlassCard
              variant="elevated"
              glow="gradient"
              padding="lg"
              className="text-center"
            >
              <h3 className="text-lg font-semibold text-[var(--landing-text-primary)] mb-2">
                Poder de Negociación
              </h3>
              <p className="text-sm text-[var(--landing-text-muted)] mb-6">
                Para esta propiedad específica
              </p>

              <PowerGauge score={73} />

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-sm text-[var(--landing-text-secondary)] mb-4">
                  <strong className="text-[var(--signal-strong)]">
                    Buen momento para negociar.
                  </strong>{' '}
                  La propiedad lleva tiempo en el mercado y hay poca competencia.
                </p>

                <div className="flex justify-center gap-4 text-xs text-[var(--landing-text-muted)]">
                  <span>📊 Basado en datos reales</span>
                  <span>🔄 Actualizado diariamente</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}

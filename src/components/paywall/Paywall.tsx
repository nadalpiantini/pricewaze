'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Zap, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analytics } from '@/lib/analytics';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface PaywallProps {
  feature: 'copilot' | 'advanced_timeline' | 'advanced_alerts';
  onActivate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const featureInfo = {
  copilot: {
    title: 'Copiloto de Negociación Pro',
    description: 'Análisis avanzado con IA para cada oferta',
    benefits: [
      'Análisis contextual profundo',
      'Escenarios comparativos',
      'Recomendaciones personalizadas',
      'Confidence scoring',
    ],
  },
  advanced_timeline: {
    title: 'Timeline Profundo',
    description: 'Historial completo de señales y eventos',
    benefits: [
      'Timeline completo de negociación',
      'Snapshots de señales históricas',
      'Análisis de tendencias',
      'Exportación de datos',
    ],
  },
  advanced_alerts: {
    title: 'Alertas Avanzadas',
    description: 'Reglas personalizadas y notificaciones inteligentes',
    benefits: [
      'Reglas de alerta personalizadas',
      'Filtros avanzados',
      'Notificaciones push',
      'Alertas por zona',
    ],
  },
};

export function Paywall({ feature, onActivate, onDismiss, className = '' }: PaywallProps) {
  const [isActivating, setIsActivating] = useState(false);
  const info = featureInfo[feature];

  // Track paywall shown event (L1.2)
  useEffect(() => {
    if (isFeatureEnabled('paywall')) {
      analytics.track('pro_paywall_shown', { feature });
    }
  }, [feature]);

  const handleActivate = async () => {
    setIsActivating(true);

    try {
      // Activate Pro (7 days free trial)
      const response = await fetch('/api/subscriptions/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Track pro_activated event (L1.2)
        analytics.track('pro_activated', { feature, trial: true });
        
        if (onActivate) {
          onActivate();
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate Pro');
      }
    } catch (error) {
      console.error('Failed to activate Pro:', error);
      // Show error toast
    } finally {
      setIsActivating(false);
    }
  };

  if (!isFeatureEnabled('paywall')) {
    // If paywall is disabled, show feature directly
    return null;
  }

  return (
    <Card className={`relative ${className}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{info.title}</CardTitle>
            <CardDescription>{info.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className="space-y-2">
          {info.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Trial offer */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Oferta de Soft Launch</span>
            <Badge variant="secondary">7 días gratis</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Prueba Pro sin tarjeta. Cancela cuando quieras.
          </p>
          <Button
            onClick={handleActivate}
            disabled={isActivating}
            className="w-full"
            size="sm"
          >
            {isActivating ? (
              'Activando...'
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Activar Pro (7 días gratis)
              </>
            )}
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Sin tarjeta</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Cancela cuando quieras</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


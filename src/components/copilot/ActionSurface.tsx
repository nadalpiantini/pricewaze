'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertType } from './AlertBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionSurfaceProps {
  /** Alert that triggered this action surface */
  alertType: AlertType;
  /** Current offer amount */
  currentAmount?: number;
  /** Property listing price */
  propertyPrice?: number;
  /** AI-suggested amounts */
  suggestedAmounts?: {
    aggressive: number | null;
    balanced: number | null;
    conservative: number | null;
  };
  /** Called when user submits an action */
  onAction: (action: ActionResult) => Promise<void>;
  /** Called when user dismisses */
  onDismiss?: () => void;
  className?: string;
}

export interface ActionResult {
  type: 'counteroffer' | 'accept' | 'reject' | 'investigate' | 'view_strategy';
  amount?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ACTION SURFACE CONFIGURATIONS
// ============================================================================

const ACTION_CONFIG: Record<AlertType, {
  title: string;
  description: string;
  primaryAction: ActionResult['type'];
  showAmountInput: boolean;
}> = {
  suboptimal_offer: {
    title: 'Ajustar Oferta',
    description: 'Tu oferta puede optimizarse para mejorar tu posición.',
    primaryAction: 'counteroffer',
    showAmountInput: true,
  },
  silent_opportunity: {
    title: 'Generar Oferta',
    description: 'Esta oportunidad no durará. Considera actuar ahora.',
    primaryAction: 'counteroffer',
    showAmountInput: true,
  },
  overprice_emotional: {
    title: 'Ver Estrategia de Negociación',
    description: 'El precio tiene margen de negociación.',
    primaryAction: 'view_strategy',
    showAmountInput: true,
  },
  bad_timing: {
    title: 'Revisar Timing',
    description: 'El momento puede no ser ideal. Revisa las opciones.',
    primaryAction: 'view_strategy',
    showAmountInput: false,
  },
  zone_inflection: {
    title: 'Analizar Zona',
    description: 'Esta zona está cambiando. Puede ser oportunidad o riesgo.',
    primaryAction: 'investigate',
    showAmountInput: false,
  },
  hidden_risk: {
    title: 'Investigar Riesgo',
    description: 'Se detectaron riesgos que requieren investigación.',
    primaryAction: 'investigate',
    showAmountInput: false,
  },
  bad_negotiation: {
    title: 'Mejorar Estrategia',
    description: 'Tu estrategia de negociación puede optimizarse.',
    primaryAction: 'view_strategy',
    showAmountInput: true,
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AmountButtonProps {
  label: string;
  amount: number;
  currentAmount?: number;
  onClick: () => void;
  variant?: 'aggressive' | 'balanced' | 'conservative';
  selected?: boolean;
}

function AmountButton({
  label,
  amount,
  currentAmount,
  onClick,
  variant = 'balanced',
  selected = false,
}: AmountButtonProps) {
  const delta = currentAmount ? ((amount - currentAmount) / currentAmount) * 100 : 0;
  const isPositive = delta > 0;

  const variantStyles = {
    aggressive: 'border-red-200 hover:border-red-400 hover:bg-red-50',
    balanced: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
    conservative: 'border-green-200 hover:border-green-400 hover:bg-green-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start p-3 rounded-lg border-2 transition-all',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
        variantStyles[variant],
        selected && 'ring-2 ring-blue-500 bg-blue-50'
      )}
      aria-pressed={selected}
      aria-label={`${label}: ${formatCurrency(amount)}`}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-bold">{formatCurrency(amount)}</span>
      {currentAmount && delta !== 0 && (
        <span className={cn(
          'text-xs font-medium flex items-center gap-1',
          isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? '+' : ''}{delta.toFixed(1)}%
        </span>
      )}
    </button>
  );
}

interface ComparisonDeltaProps {
  before: number;
  after: number;
  label: string;
}

function ComparisonDelta({ before, after, label }: ComparisonDeltaProps) {
  const delta = after - before;
  const deltaPercent = (delta / before) * 100;
  const isPositive = delta > 0;

  return (
    <div
      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
      role="group"
      aria-label={`${label}: de ${formatCurrency(before)} a ${formatCurrency(after)}`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm line-through text-muted-foreground">
          {formatCurrency(before)}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold">{formatCurrency(after)}</span>
        <Badge
          variant={isPositive ? 'default' : 'destructive'}
          className="text-xs"
        >
          {isPositive ? '+' : ''}{deltaPercent.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActionSurface({
  alertType,
  currentAmount,
  propertyPrice,
  suggestedAmounts,
  onAction,
  onDismiss,
  className,
}: ActionSurfaceProps) {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<'aggressive' | 'balanced' | 'conservative' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = ACTION_CONFIG[alertType];

  const handlePresetSelect = (preset: 'aggressive' | 'balanced' | 'conservative', amount: number) => {
    setSelectedPreset(preset);
    setCustomAmount(amount.toString());
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const amount = customAmount ? parseFloat(customAmount) : undefined;
      await onAction({
        type: config.primaryAction,
        amount,
        metadata: {
          selectedPreset,
          alertType,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecondaryAction = async (type: ActionResult['type']) => {
    setIsSubmitting(true);
    try {
      await onAction({ type });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      className={cn('border-2 border-primary/20', className)}
      role="region"
      aria-labelledby="action-surface-title"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle id="action-surface-title" className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
              {config.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {config.description}
            </CardDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              aria-label="Cerrar panel de acción"
            >
              Cerrar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comparison Delta if we have before/after values */}
        {currentAmount && propertyPrice && (
          <ComparisonDelta
            before={propertyPrice}
            after={currentAmount}
            label="Tu oferta vs. precio"
          />
        )}

        {/* Suggested Amounts */}
        {config.showAmountInput && suggestedAmounts && (
          <div className="space-y-2">
            <p className="text-sm font-medium" id="suggested-amounts-label">
              Montos Sugeridos por IA
            </p>
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-labelledby="suggested-amounts-label"
            >
              {suggestedAmounts.aggressive && (
                <AmountButton
                  label="Agresivo"
                  amount={suggestedAmounts.aggressive}
                  currentAmount={currentAmount}
                  variant="aggressive"
                  selected={selectedPreset === 'aggressive'}
                  onClick={() => handlePresetSelect('aggressive', suggestedAmounts.aggressive!)}
                />
              )}
              {suggestedAmounts.balanced && (
                <AmountButton
                  label="Balanceado"
                  amount={suggestedAmounts.balanced}
                  currentAmount={currentAmount}
                  variant="balanced"
                  selected={selectedPreset === 'balanced'}
                  onClick={() => handlePresetSelect('balanced', suggestedAmounts.balanced!)}
                />
              )}
              {suggestedAmounts.conservative && (
                <AmountButton
                  label="Conservador"
                  amount={suggestedAmounts.conservative}
                  currentAmount={currentAmount}
                  variant="conservative"
                  selected={selectedPreset === 'conservative'}
                  onClick={() => handlePresetSelect('conservative', suggestedAmounts.conservative!)}
                />
              )}
            </div>
          </div>
        )}

        {/* Custom Amount Input */}
        {config.showAmountInput && (
          <div className="space-y-2">
            <label htmlFor="custom-amount" className="text-sm font-medium">
              Monto Personalizado
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="custom-amount"
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="Ingresa monto..."
                className="pl-9"
                aria-describedby="amount-hint"
              />
            </div>
            {customAmount && currentAmount && (
              <p id="amount-hint" className="text-xs text-muted-foreground">
                {parseFloat(customAmount) > currentAmount ? (
                  <span className="text-green-600">
                    +{formatCurrency(parseFloat(customAmount) - currentAmount)} vs. oferta actual
                  </span>
                ) : parseFloat(customAmount) < currentAmount ? (
                  <span className="text-red-600">
                    {formatCurrency(parseFloat(customAmount) - currentAmount)} vs. oferta actual
                  </span>
                ) : (
                  'Mismo monto que oferta actual'
                )}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (config.showAmountInput && !customAmount)}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {config.primaryAction === 'counteroffer' && 'Enviar Contraoferta'}
                {config.primaryAction === 'investigate' && 'Investigar'}
                {config.primaryAction === 'view_strategy' && 'Ver Estrategia'}
              </>
            )}
          </Button>

          {alertType === 'hidden_risk' && (
            <Button
              variant="outline"
              onClick={() => handleSecondaryAction('reject')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Rechazar por Riesgo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick action panel for counteroffer - minimal UI for fast decisions
 */
export function QuickCounterofferPanel({
  currentAmount,
  suggestedAmount,
  onSubmit,
  onCancel,
  className,
}: {
  currentAmount: number;
  suggestedAmount: number;
  onSubmit: (amount: number) => Promise<void>;
  onCancel: () => void;
  className?: string;
}) {
  const [amount, setAmount] = useState(suggestedAmount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const delta = suggestedAmount - currentAmount;
  const deltaPercent = (delta / currentAmount) * 100;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(parseFloat(amount));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20',
        className
      )}
      role="form"
      aria-label="Panel rápido de contraoferta"
    >
      <div className="flex-1">
        <div className="relative">
          <DollarSign
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"
            aria-hidden="true"
          />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8 h-9"
            aria-label="Monto de contraoferta"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}% vs. actual
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={isSubmitting || !amount}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          'Enviar'
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        aria-label="Cancelar"
      >
        Cancelar
      </Button>
    </div>
  );
}

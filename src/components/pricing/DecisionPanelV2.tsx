'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Info,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Gauge,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { DecisionPanel } from '@/types/decision-panel';

interface DecisionPanelV2Props {
  offerId: string;
  className?: string;
}

export function DecisionPanelV2({ offerId, className = '' }: DecisionPanelV2Props) {
  const [panel, setPanel] = useState<DecisionPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPanel();
  }, [offerId]);

  const fetchPanel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/decision-panel`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch decision panel');
      }

      const result = await response.json();
      setPanel(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decision panel');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading decision context...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="pt-4">
          <p className="text-red-600 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPanel} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!panel) {
    return null;
  }

  // Check for special cases
  const isCalmMarket =
    panel.wait_risk_level === 'low' && panel.market_pressure === 'low';
  const isHighRisk =
    panel.wait_risk_level === 'high' && panel.market_pressure === 'high';

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Fairness Panel</CardTitle>
            {panel.profile_applied && (
              <Badge variant="outline" className="text-xs">
                Adjusted to your {panel.profile_applied} profile
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Decision context for this negotiation
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Special Cases */}
          {isCalmMarket && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                There is no immediate pressure. Waiting is a reasonable option.
              </p>
            </div>
          )}

          {isHighRisk && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-900">
                The negotiation window may close quickly under current conditions.
              </p>
            </div>
          )}

          {/* Status Lines (Fixed Order) */}
          <div className="space-y-3">
            {/* Price */}
            <StatusLine
              label="Price"
              value={
                panel.price_position === 'inside_range'
                  ? 'Inside fair range'
                  : 'Outside fair range'
              }
              icon={<Gauge className="w-4 h-4" />}
            />

            {/* Uncertainty */}
            <StatusLine
              label="Uncertainty"
              value={capitalizeFirst(panel.uncertainty_level)}
              icon={<AlertCircle className="w-4 h-4" />}
              tooltip={
                panel.uncertainty_level === 'low'
                  ? 'Based on recent comparable properties in this area.'
                  : panel.uncertainty_level === 'medium'
                  ? 'Limited recent data increases estimation uncertainty.'
                  : 'Sparse data increases estimation uncertainty.'
              }
            />

            {/* Wait Risk */}
            <StatusLine
              label="Wait Risk"
              value={`Risk of waiting: ${capitalizeFirst(panel.wait_risk_level)}`}
              icon={<Info className="w-4 h-4" />}
              tooltip="Waiting may reduce your negotiation leverage."
            />

            {/* Market Velocity */}
            <StatusLine
              label="Market Velocity"
              value={`Market speed: ${capitalizeFirst(panel.market_velocity)}`}
              icon={
                panel.market_velocity === 'accelerating' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : panel.market_velocity === 'decelerating' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Gauge className="w-4 h-4" />
                )
              }
              tooltip={
                panel.market_velocity === 'accelerating'
                  ? 'Buyer activity has increased in recent days.'
                  : panel.market_velocity === 'decelerating'
                  ? 'Buyer activity has decreased in recent days.'
                  : 'Market activity remains stable.'
              }
            />

            {/* Market Pressure */}
            <StatusLine
              label="Market Pressure"
              value={`Market pressure: ${capitalizeFirst(panel.market_pressure)}`}
              icon={<Gauge className="w-4 h-4" />}
              tooltip="Competition and visits are increasing."
            />
          </div>

          {/* Copilot Summary */}
          <div className="pt-4 border-t">
            <p className="text-sm leading-relaxed text-foreground">
              {panel.explanation_summary}
            </p>
          </div>

          {/* Action Options */}
          <div className="pt-4 border-t space-y-4">
            {/* Option A - Act Now */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Option A — Act Now</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Pros</span>
                  </div>
                  <ul className="space-y-1">
                    {panel.option_act.pros.map((pro, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <XCircle className="w-3 h-3 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Cons</span>
                  </div>
                  <ul className="space-y-1">
                    {panel.option_act.cons.map((con, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Option B - Wait */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Option B — Wait</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Pros</span>
                  </div>
                  <ul className="space-y-1">
                    {panel.option_wait.pros.map((pro, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <XCircle className="w-3 h-3 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Cons</span>
                  </div>
                  <ul className="space-y-1">
                    {panel.option_wait.cons.map((con, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Copy */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is a contextual estimate to support decision-making. It is not an
              official appraisal.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface StatusLineProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tooltip?: string;
}

function StatusLine({ label, value, icon, tooltip }: StatusLineProps) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


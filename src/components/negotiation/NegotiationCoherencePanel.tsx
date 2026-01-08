'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NegotiationCoherenceResponse } from '@/types/negotiation-coherence';
import { checkFeatureFlagClient } from '@/lib/feature-flags-db';

interface NegotiationCoherencePanelProps {
  offerId: string;
  userId: string;
  className?: string;
}

export function NegotiationCoherencePanel({
  offerId,
  userId,
  className = '',
}: NegotiationCoherencePanelProps) {
  const [state, setState] = useState<NegotiationCoherenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    async function fetchState() {
      // Check feature flag first
      const isEnabled = await checkFeatureFlagClient('nce_ui_panel', userId);
      setEnabled(isEnabled);

      if (!isEnabled) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/negotiation/coherence/${offerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data: NegotiationCoherenceResponse = await response.json();
        setState(data);
      } catch (error) {
        console.error('Error fetching negotiation coherence:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchState();
  }, [offerId, userId]);

  if (!enabled || loading) {
    return null;
  }

  if (!state || !state.state) {
    return null;
  }

  const { snapshot, friction, rhythm, market_context, insight, alerts } = state.state;

  // Determine overall state color
  const getStateColor = (state: string) => {
    switch (state) {
      case 'improving':
        return 'text-green-600';
      case 'deteriorating':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'improving':
        return <TrendingUp className="w-4 h-4" />;
      case 'deteriorating':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getImpactLevel = (focusArea: string) => {
    if (!friction) return 'Low';
    switch (focusArea) {
      case 'price':
        return friction.price_friction === 'high' ? 'High' : friction.price_friction === 'medium' ? 'Medium' : 'Low';
      case 'timeline':
        return friction.timeline_friction === 'high' ? 'High' : friction.timeline_friction === 'medium' ? 'Medium' : 'Low';
      case 'terms':
        return friction.terms_friction === 'high' ? 'High' : friction.terms_friction === 'medium' ? 'Medium' : 'Low';
      default:
        return 'Low';
    }
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Negotiation Status</CardTitle>
          <p className="text-sm text-muted-foreground">Alignment & timing</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Lines (Fixed Order) */}
          <div className="space-y-3">
            {/* Overall Alignment */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Overall alignment</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Alignment reflects how well both sides' positions are converging.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className={`flex items-center gap-2 ${getStateColor(snapshot.alignment_state)}`}>
                {getStateIcon(snapshot.alignment_state)}
                <span className="text-sm capitalize">{snapshot.alignment_state}</span>
              </div>
            </div>

            {/* Rhythm */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rhythm</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rhythm reflects response speed and concession patterns.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-sm capitalize">{snapshot.rhythm_state}</span>
            </div>

            {/* Friction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Friction detected</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Friction reflects repeated resistance on specific terms.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-sm capitalize">{snapshot.friction_level}</span>
            </div>

            {/* Market Pressure */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Market pressure</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Market pressure reflects competing offers and visit activity.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-sm capitalize">{snapshot.market_pressure}</span>
            </div>
          </div>

          {/* What's happening now */}
          {insight && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">What's happening now</h4>
              <p className="text-sm text-muted-foreground">{insight.summary}</p>
            </div>
          )}

          {/* Where moves matter most */}
          {insight && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Where moves matter most</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">Price</span>
                  <span className="text-muted-foreground">{getImpactLevel('price')} impact</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">Timeline</span>
                  <span className="text-muted-foreground">{getImpactLevel('timeline')} impact</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">Conditions</span>
                  <span className="text-muted-foreground">{getImpactLevel('terms')} impact</span>
                </div>
              </div>
            </div>
          )}

          {/* Options to consider */}
          {insight && insight.options.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Options to consider</h4>
              <div className="space-y-3">
                {insight.options.map((option, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium text-sm mb-2">{option.label}</div>
                    {option.pros.length > 0 && (
                      <div className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Pros:</span> {option.pros.join(', ')}
                      </div>
                    )}
                    {option.cons.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Cons:</span> {option.cons.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="pt-2 border-t">
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200"
                  >
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-orange-900">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal footer */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              This analysis supports negotiation awareness. It does not replace professional judgment.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}


'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePricing } from '@/hooks/use-pricing';
import type { PricingAnalysis } from '@/types/pricing';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { FairnessGauge } from './FairnessGauge';

interface PricingInsightsProps {
  propertyId: string;
  onOfferSuggestion?: (amount: number) => void;
}

export function PricingInsights({ propertyId, onOfferSuggestion }: PricingInsightsProps) {
  const [analysis, setAnalysis] = useState<PricingAnalysis | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { analyzePricing, loading, error } = usePricing();

  const handleAnalyze = async () => {
    const result = await analyzePricing(propertyId);
    if (result) {
      setAnalysis(result);
      setIsOpen(true);
    }
  };

  const formatCurrency: (value: number | null | undefined) => string = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFairnessColor = (label: string) => {
    switch (label) {
      case 'underpriced':
        return 'text-green-600 bg-green-50';
      case 'fair':
        return 'text-blue-600 bg-blue-50';
      case 'overpriced':
        return 'text-orange-600 bg-orange-50';
      case 'significantly_overpriced':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getNegotiationPowerLabel = (score: number) => {
    if (score >= 70) return { label: 'Strong Buyer Leverage', color: 'text-green-600' };
    if (score >= 50) return { label: 'Moderate Leverage', color: 'text-blue-600' };
    if (score >= 30) return { label: 'Seller Advantage', color: 'text-orange-600' };
    return { label: 'Limited Leverage', color: 'text-red-600' };
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleAnalyze}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Price Analysis
          </>
        )}
      </Button>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-red-600 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={handleAnalyze} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const negotiationPower = getNegotiationPowerLabel(analysis.negotiationPower.score);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Price Intelligence
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fairness Score - Waze-style Gauge */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-muted">
          <FairnessGauge
            score={analysis.fairnessScore}
            size="md"
            showLabel={true}
            animated={true}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Lower score = Better deal for buyer
          </p>
        </div>

        {/* Estimated Fair Value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Estimated Fair Value</span>
          </div>
          <span className="font-semibold">{formatCurrency(analysis.estimatedFairValue)}</span>
        </div>

        {/* Zone Stats */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{analysis.zoneStats.zoneName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Avg. Price/m²</p>
              <p className="font-medium">{formatCurrency(analysis.zoneStats.avgPricePerM2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Listings</p>
              <p className="font-medium">{analysis.zoneStats.propertyCount}</p>
            </div>
          </div>
        </div>

        {/* Negotiation Power */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Negotiation Power</span>
            </div>
            <span className={`font-semibold ${negotiationPower.color}`}>
              {analysis.negotiationPower.score}%
            </span>
          </div>
          <p className={`text-sm ${negotiationPower.color}`}>{negotiationPower.label}</p>

          {/* Negotiation Factors */}
          {analysis.negotiationPower.factors.length > 0 && (
            <div className="space-y-1 mt-2">
              {analysis.negotiationPower.factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs"
                >
                  {factor.impact === 'positive' ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : factor.impact === 'negative' ? (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                  <span className="text-muted-foreground">{factor.factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggested Offers */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggested Offers</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onOfferSuggestion?.(analysis.suggestedOffers.aggressive ?? 0)}
              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-center"
            >
              <p className="text-xs text-green-600">Aggressive</p>
              <p className="font-semibold text-green-700 text-sm">
                {formatCurrency(analysis.suggestedOffers.aggressive ?? 0)}
              </p>
            </button>
            <button
              onClick={() => onOfferSuggestion?.(analysis.suggestedOffers.balanced ?? 0)}
              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-center"
            >
              <p className="text-xs text-blue-600">Balanced</p>
              <p className="font-semibold text-blue-700 text-sm">
                {formatCurrency(analysis.suggestedOffers.balanced ?? 0)}
              </p>
            </button>
            <button
              onClick={() => onOfferSuggestion?.(analysis.suggestedOffers.conservative ?? 0)}
              className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors text-center"
            >
              <p className="text-xs text-orange-600">Conservative</p>
              <p className="font-semibold text-orange-700 text-sm">
                {formatCurrency(analysis.suggestedOffers.conservative ?? 0)}
              </p>
            </button>
          </div>
        </div>

        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">Key Insights</span>
            </div>
            <ul className="space-y-1">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks & Opportunities */}
        <div className="grid grid-cols-2 gap-3">
          {analysis.risks.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-xs font-medium text-red-600">Risks</span>
              </div>
              {analysis.risks.map((risk, i) => (
                <p key={i} className="text-xs text-muted-foreground">{risk}</p>
              ))}
            </div>
          )}
          {analysis.opportunities.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium text-green-600">Opportunities</span>
              </div>
              {analysis.opportunities.map((opp, i) => (
                <p key={i} className="text-xs text-muted-foreground">{opp}</p>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Refresh Analysis'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

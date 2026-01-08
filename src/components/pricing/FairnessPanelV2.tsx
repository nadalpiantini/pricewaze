'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DIEAnalysis } from '@/types/die';
import {
  Sparkles,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Gauge,
  Users,
  Loader2,
  Info,
} from 'lucide-react';
import { getMarketConfig, formatPrice } from '@/config/market';

interface FairnessPanelV2Props {
  propertyId: string;
  onAnalysisComplete?: (analysis: DIEAnalysis) => void;
}

export function FairnessPanelV2({ propertyId, onAnalysisComplete }: FairnessPanelV2Props) {
  const [analysis, setAnalysis] = useState<DIEAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const market = getMarketConfig();

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/die?property_id=${propertyId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze');
      }

      const data = await response.json();
      setAnalysis(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Decision Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyze} className="w-full" variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze Decision Context
          </Button>
        </CardContent>
      </Card>
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Analyzing decision context...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Decision Intelligence Panel
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {analysis.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Assessment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Price Assessment</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Price Range</span>
              <Badge
                variant={
                  analysis.priceAssessment.askingPriceStatus === 'within_range'
                    ? 'default'
                    : analysis.priceAssessment.askingPriceStatus === 'below_range'
                    ? 'secondary'
                    : 'destructive'
                }
                className="text-xs"
              >
                {analysis.priceAssessment.askingPriceStatus === 'within_range'
                  ? 'Within Range'
                  : analysis.priceAssessment.askingPriceStatus === 'below_range'
                  ? 'Below Range'
                  : 'Above Range'}
              </Badge>
            </div>
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-medium">
                  {formatPrice(analysis.priceAssessment.priceRange.min, market)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Median:</span>
                <span className="font-semibold">
                  {formatPrice(analysis.priceAssessment.priceRange.median, market)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-medium">
                  {formatPrice(analysis.priceAssessment.priceRange.max, market)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Uncertainty */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Uncertainty</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                analysis.priceAssessment.uncertainty === 'low'
                  ? 'default'
                  : analysis.priceAssessment.uncertainty === 'medium'
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {analysis.priceAssessment.uncertainty.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Range width: {analysis.priceAssessment.uncertaintyMetrics.rangeWidthPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Market Velocity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {analysis.marketDynamics.velocity === 'accelerating' ? (
              <TrendingUp className="w-4 h-4 text-orange-600" />
            ) : analysis.marketDynamics.velocity === 'decelerating' ? (
              <TrendingDown className="w-4 h-4 text-blue-600" />
            ) : (
              <Gauge className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Market Velocity</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                analysis.marketDynamics.velocity === 'accelerating'
                  ? 'destructive'
                  : analysis.marketDynamics.velocity === 'decelerating'
                  ? 'secondary'
                  : 'default'
              }
            >
              {analysis.marketDynamics.velocity === 'accelerating'
                ? 'Accelerating'
                : analysis.marketDynamics.velocity === 'decelerating'
                ? 'Decelerating'
                : 'Stable'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Regime: {analysis.marketDynamics.currentRegime}
            </span>
          </div>
        </div>

        {/* Current Pressure */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Current Pressure</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Pressure Level</span>
              <Badge
                variant={
                  analysis.currentPressure.level === 'high'
                    ? 'destructive'
                    : analysis.currentPressure.level === 'medium'
                    ? 'secondary'
                    : 'default'
                }
              >
                {analysis.currentPressure.level.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Active Offers:</span>
                <span className="font-medium ml-1">
                  {analysis.currentPressure.competition.activeOffers}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Recent Visits:</span>
                <span className="font-medium ml-1">
                  {analysis.currentPressure.competition.recentVisits}
                </span>
              </div>
              {analysis.currentPressure.signals.competingOffers && (
                <div className="col-span-2 text-orange-600 text-xs">
                  ⚠️ Competing offers detected
                </div>
              )}
              {analysis.currentPressure.signals.manyVisits && (
                <div className="col-span-2 text-orange-600 text-xs">
                  ⚠️ High visit activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Explanations */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Decision Context</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {analysis.explanations.decisionContext}
          </p>
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

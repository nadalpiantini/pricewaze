'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePricing } from '@/hooks/use-pricing';
import type { OfferAdvice } from '@/types/pricing';
import {
  Brain,
  Check,
  X,
  ArrowRightLeft,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
} from 'lucide-react';

interface OfferAdviceCardProps {
  offerId: string;
  onAccept?: () => void;
  onCounter?: (amount: number) => void;
  onReject?: () => void;
}

export function OfferAdviceCard({
  offerId,
  onAccept,
  onCounter,
  onReject,
}: OfferAdviceCardProps) {
  const [advice, setAdvice] = useState<OfferAdvice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { getOfferAdvice, loading, error } = usePricing();

  const handleGetAdvice = async () => {
    const result = await getOfferAdvice(offerId);
    if (result) {
      setAdvice(result);
      setIsOpen(true);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRecommendationConfig = (recommendation: string) => {
    switch (recommendation) {
      case 'accept':
        return {
          icon: Check,
          color: 'text-green-600 bg-green-50 border-green-200',
          label: 'Accept Offer',
        };
      case 'counter':
        return {
          icon: ArrowRightLeft,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          label: 'Counter Offer',
        };
      case 'reject':
        return {
          icon: X,
          color: 'text-red-600 bg-red-50 border-red-200',
          label: 'Reject Offer',
        };
      case 'wait':
        return {
          icon: Clock,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          label: 'Wait',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: 'Unknown',
        };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'falling':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleGetAdvice}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            Get AI Advice
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
          <Button variant="outline" size="sm" onClick={handleGetAdvice} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!advice) return null;

  const config = getRecommendationConfig(advice.recommendation);
  const RecommendationIcon = config.icon;
  const offerPercent = ((advice.currentAmount / advice.propertyPrice) * 100).toFixed(1);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Recommendation
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recommendation */}
        <div className={`p-3 rounded-lg border ${config.color}`}>
          <div className="flex items-center gap-2">
            <RecommendationIcon className="w-5 h-5" />
            <span className="font-semibold">{config.label}</span>
            <Badge variant="outline" className="ml-auto">
              {advice.confidence}% confident
            </Badge>
          </div>
        </div>

        {/* Offer Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Current Offer</p>
            <p className="font-medium">{formatCurrency(advice.currentAmount)}</p>
            <p className="text-xs text-muted-foreground">{offerPercent}% of asking</p>
          </div>
          <div>
            <p className="text-muted-foreground">Asking Price</p>
            <p className="font-medium">{formatCurrency(advice.propertyPrice)}</p>
          </div>
        </div>

        {/* Suggested Counter */}
        {advice.recommendation === 'counter' && advice.suggestedCounterAmount && (
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">Suggested Counter</span>
              </div>
              <span className="font-semibold text-blue-700">
                {formatCurrency(advice.suggestedCounterAmount)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => onCounter?.(advice.suggestedCounterAmount!)}
            >
              Use This Amount
            </Button>
          </div>
        )}

        {/* Reasoning */}
        {advice.reasoning.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Reasoning</p>
            <ul className="space-y-1">
              {advice.reasoning.map((reason, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-primary">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Market Context */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-muted-foreground">Days Listed</p>
            <p className="font-medium">{advice.marketContext.daysOnMarket}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-muted-foreground">Similar Sales</p>
            <p className="font-medium">{advice.marketContext.similarSales}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-muted-foreground">Trend</p>
            <div className="flex items-center justify-center gap-1">
              {getTrendIcon(advice.marketContext.pricetrend)}
              <span className="font-medium capitalize">{advice.marketContext.pricetrend}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {advice.recommendation === 'accept' && (
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onAccept}>
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
          )}
          {advice.recommendation === 'counter' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onCounter?.(advice.suggestedCounterAmount || advice.currentAmount)}
            >
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Counter
            </Button>
          )}
          {advice.recommendation === 'reject' && (
            <Button size="sm" variant="destructive" className="flex-1" onClick={onReject}>
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetAdvice}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

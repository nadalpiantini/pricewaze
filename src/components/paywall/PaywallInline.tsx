'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analytics } from '@/lib/analytics';
import { toast } from 'sonner';

interface PaywallInlineProps {
  feature: string;
  className?: string;
}

/**
 * PaywallInline Component
 * Shows Pro paywall when user tries to access Pro features
 */
export function PaywallInline({ feature, className = '' }: PaywallInlineProps) {
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);

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
        
        toast.success('Pro trial activated! Enjoy 7 days free.', {
          description: 'You now have access to all Pro features.',
        });

        // Reload page to refresh Pro status
        window.location.reload();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate Pro');
      }
    } catch (error) {
      console.error('Failed to activate Pro:', error);
      toast.error('Failed to activate Pro trial', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const featureLabels: Record<string, string> = {
    copilot: 'Negotiation Copilot',
    timeline: 'Full negotiation timeline',
    fairness: 'Fairness Score',
    alerts: 'Advanced alerts',
  };

  const featureLabel = featureLabels[feature] || feature;

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <CardTitle>Unlock {featureLabel} in Pro</CardTitle>
        </div>
        <CardDescription>
          Get clear analysis, advanced alerts, and full context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Understand what changed and why</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>React before other buyers</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Decide with data, not hunches</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Soft Launch Offer</span>
                <Badge variant="secondary">7 days free</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Try Pro without a card. Cancel anytime.
              </p>
              <Button
                onClick={handleActivate}
                disabled={isActivating}
                className="w-full"
                size="sm"
              >
                {isActivating ? (
                  'Activating...'
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Activate Pro (7 days free)
                  </>
                )}
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>No card required</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


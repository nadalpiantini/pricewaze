'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  MapPin,
  Check,
  Rocket,
  Loader2,
  Sparkles,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const benefits = [
  {
    icon: Bell,
    title: 'Price Drop Alerts',
    description: 'Get notified when properties drop below fair value',
  },
  {
    icon: TrendingUp,
    title: 'Market Trends',
    description: 'Weekly insights on your preferred zones',
  },
  {
    icon: Shield,
    title: 'Negotiation Support',
    description: 'AI-powered advice before every offer',
  },
];

export function InvestmentStep() {
  const router = useRouter();
  const {
    preferences,
    pricingInsight,
    savedAlertZone,
    enabledNotifications,
    setSavedAlertZone,
    setEnabledNotifications,
    completeOnboarding,
    prevStep,
  } = useOnboardingStore();

  const [zone, setZone] = useState(savedAlertZone || '');
  const [notifications, setNotifications] = useState(enabledNotifications);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    setEnabledNotifications(newValue);
  };

  const handleComplete = async () => {
    setIsCompleting(true);

    // Save zone if provided
    if (zone) {
      setSavedAlertZone(zone);
    }

    // Award welcome badge and complete onboarding
    try {
      const badgeRes = await fetch('/api/gamification/award-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_code: 'welcome' }),
      });
      if (badgeRes.ok) {
        // Badge awarded successfully
      }
    } catch (error) {
      console.error('Failed to award welcome badge:', error);
    }

    // Simulate API call to save preferences
    await new Promise((resolve) => setTimeout(resolve, 1000));

    completeOnboarding();

    toast.success('Welcome to PriceWaze!', {
      description: 'Your preferences have been saved. You earned your first badge! 🎉',
    });

    router.push('/');
  };

  const handleSkip = () => {
    completeOnboarding();
    router.push('/');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-sm font-medium"
        >
          <Sparkles className="h-4 w-4" />
          You saved {pricingInsight?.savingsPotential
            ? `$${pricingInsight.savingsPotential.toLocaleString()}`
            : '$15,000+'} in potential overpayment!
        </motion.div>

        <h2 className="text-2xl md:text-3xl font-bold">
          Stay ahead of the market
        </h2>
        <p className="text-muted-foreground">
          Set up alerts to never miss a good deal
        </p>
      </div>

      {/* Benefits */}
      <div className="grid gap-3">
        {benefits.map((benefit, idx) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Investment actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {/* Zone alert */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <Label className="font-medium">Set a zone alert</Label>
          </div>
          <Input
            placeholder="e.g., Downtown, Miami Beach, Zona Colonial..."
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Get notified when new properties appear in this area
          </p>
        </Card>

        {/* Notifications toggle */}
        <Card
          className={`p-4 cursor-pointer transition-all border-2 ${
            notifications ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={handleToggleNotifications}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  notifications ? 'bg-primary/20' : 'bg-muted'
                }`}
              >
                <Bell
                  className={`h-5 w-5 ${
                    notifications ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-medium">Enable smart notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Price drops, market changes, and negotiation tips
                </p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                notifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              {notifications && <Check className="h-4 w-4 text-white" />}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Save search prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-primary" />
            <p className="text-sm">
              <strong>Your search preferences are saved.</strong> We&apos;ll show you
              relevant {preferences.propertyType || 'properties'} first.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>

          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            size="lg"
            className="gap-2"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Start exploring
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

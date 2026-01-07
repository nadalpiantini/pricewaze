'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Home,
  TrendingUp,
  Search,
  DollarSign,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const intents = [
  {
    id: 'buy',
    icon: Home,
    title: "I'm looking to buy",
    subtitle: 'Find fair prices & avoid overpaying',
    hook: "Don't pay more than you should",
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'sell',
    icon: TrendingUp,
    title: "I'm selling a property",
    subtitle: 'Price competitively & attract buyers',
    hook: 'Maximize your sale price',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'explore',
    icon: Search,
    title: "Just exploring the market",
    subtitle: 'Understand prices in your area',
    hook: 'Knowledge is power',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
] as const;

export function TriggerStep() {
  const { setPreferences, nextStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [showHook, setShowHook] = useState(false);

  const handleSelect = (intentId: 'buy' | 'sell' | 'explore') => {
    setSelected(intentId);
    setShowHook(true);
    setPreferences({
      intent: intentId,
      role: intentId === 'sell' ? 'seller' : 'buyer',
    });
  };

  const handleContinue = () => {
    if (selected) {
      nextStep();
    }
  };

  return (
    <div className="space-y-8">
      {/* Emotional hook headline */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
        >
          <Sparkles className="h-4 w-4" />
          AI-powered pricing intelligence
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Are you paying{' '}
          <span className="text-primary">the right price?</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Every year, buyers overpay by <strong className="text-foreground">$23,000</strong> on average.
          <br />
          Sellers leave <strong className="text-foreground">$15,000+</strong> on the table.
        </p>
      </div>

      {/* Intent selection cards */}
      <div className="grid gap-4">
        {intents.map((intent, idx) => {
          const Icon = intent.icon;
          const isSelected = selected === intent.id;

          return (
            <motion.div
              key={intent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                onClick={() => handleSelect(intent.id)}
                className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                  isSelected
                    ? `${intent.bgColor} ${intent.borderColor}`
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${intent.bgColor}`}>
                    <Icon className={`h-6 w-6 ${intent.color}`} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">{intent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {intent.subtitle}
                    </p>
                  </div>

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`p-1 rounded-full ${intent.bgColor}`}
                    >
                      <DollarSign className={`h-5 w-5 ${intent.color}`} />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Hook reveal animation */}
      {showHook && selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-lg font-medium text-primary">
            {intents.find((i) => i.id === selected)?.hook}
          </p>

          <Button onClick={handleContinue} size="lg" className="gap-2">
            Let me show you how
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}

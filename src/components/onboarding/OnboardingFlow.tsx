'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { TriggerStep } from './TriggerStep';
import { ActionStep } from './ActionStep';
import { RewardStep } from './RewardStep';
import { InvestmentStep } from './InvestmentStep';
import { MapPin } from 'lucide-react';

const steps = [
  { id: 0, component: TriggerStep, label: 'What brings you here?' },
  { id: 1, component: ActionStep, label: 'Find a property' },
  { id: 2, component: RewardStep, label: 'Your insight' },
  { id: 3, component: InvestmentStep, label: 'Stay ahead' },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { currentStep, isCompleted } = useOnboardingStore();

  useEffect(() => {
    if (isCompleted) {
      router.push('/');
    }
  }, [isCompleted, router]);

  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PriceWaze</span>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 bg-primary'
                    : idx < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 pb-8 px-4 min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-2xl"
          >
            {CurrentStepComponent && <CurrentStepComponent />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Step label */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
        </span>
      </div>
    </div>
  );
}

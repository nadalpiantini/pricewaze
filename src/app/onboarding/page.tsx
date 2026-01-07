'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding';
import { useOnboardingStore } from '@/stores/onboarding-store';

export default function OnboardingPage() {
  const router = useRouter();
  const { isCompleted } = useOnboardingStore();

  useEffect(() => {
    // If onboarding is already completed, redirect to home
    if (isCompleted) {
      router.replace('/');
    }
  }, [isCompleted, router]);

  // Don't render if completed (will redirect)
  if (isCompleted) {
    return null;
  }

  return <OnboardingFlow />;
}

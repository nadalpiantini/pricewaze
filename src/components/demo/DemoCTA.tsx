'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Unlock } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface DemoCTAProps {
  className?: string;
}

/**
 * Demo CTA - Final conversion call-to-action
 * Appears after user sees copilot analysis
 */
export function DemoCTA({ className = '' }: DemoCTAProps) {
  const router = useRouter();

  const handleSignup = () => {
    analytics.track('signup_from_demo');
    router.push('/register?from=demo');
  };

  return (
    <div className={`mt-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Unlock className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold">🔓 Use this in your real negotiations</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Follow properties, receive alerts, and negotiate with real context.
      </p>
      <Button onClick={handleSignup} size="lg" className="w-full sm:w-auto">
        🚀 Create free account
      </Button>
    </div>
  );
}


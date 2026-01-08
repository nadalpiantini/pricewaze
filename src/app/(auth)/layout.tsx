'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// Feature pill component
function FeaturePill({
  icon: Icon,
  text,
  delay,
}: {
  icon: typeof TrendingUp;
  text: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s ease-out',
      }}
    >
      <Icon className="h-3.5 w-3.5 text-[var(--signal-cyan)]" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isInitialized, initialize } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration pattern
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && !isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, isInitialized, router]);

  // Show loading while checking auth
  if (!mounted || isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--signal-cyan)] border-t-transparent" />
      </div>
    );
  }

  // Don't render if authenticated
  if (user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary cyan orb - top right */}
        <div
          className="absolute -top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full opacity-[0.12] blur-[120px]"
          style={{
            background: 'radial-gradient(circle, var(--signal-cyan) 0%, transparent 70%)',
          }}
        />

        {/* Secondary lime orb - bottom left */}
        <div
          className="absolute -bottom-[20%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.08] blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--signal-lime) 0%, transparent 70%)',
          }}
        />

        {/* Subtle teal orb - center */}
        <div
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full opacity-[0.05] blur-[80px]"
          style={{
            background: 'radial-gradient(circle, var(--signal-teal) 0%, transparent 70%)',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--signal-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--signal-cyan) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Logo and tagline */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="group inline-flex flex-col items-center gap-3"
          >
            {/* Animated logo */}
            <div
              className="relative p-4 rounded-2xl transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-teal) 100%)',
                boxShadow: '0 0 60px rgba(0, 212, 255, 0.3), 0 0 30px rgba(0, 212, 255, 0.2)',
              }}
            >
              <MapPin className="h-8 w-8 text-black" />

              {/* Sparkle effects */}
              <Sparkles
                className="absolute -top-1 -right-1 h-4 w-4 text-[var(--signal-lime)] animate-pulse"
                style={{ animationDuration: '2s' }}
              />
            </div>

            {/* Logo text */}
            <h1 className="text-2xl font-bold tracking-tight">
              <span
                className="bg-clip-text text-transparent"
                style={{
                  background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-lime) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                }}
              >
                PriceWaze
              </span>
            </h1>
          </Link>

          <p className="mt-2 text-sm text-muted-foreground">
            Real Estate Intelligence Platform
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-md">
          <FeaturePill icon={TrendingUp} text="AI-Powered Pricing" delay={100} />
          <FeaturePill icon={Shield} text="Market Intelligence" delay={200} />
          <FeaturePill icon={Zap} text="Smart Negotiations" delay={300} />
        </div>

        {/* Auth form container */}
        <div
          className="w-full max-w-md"
          style={{
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
          }}
        >
          {children}
        </div>
      </div>

      {/* Keyframe animation */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

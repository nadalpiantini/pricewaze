'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Zap, TrendingUp, Activity } from 'lucide-react';
import { DashboardGrid } from '@/components/dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Market status indicator
function MarketPulse() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              pulse === i ? 'w-3 bg-[var(--signal-lime)]' : 'w-1.5 bg-[var(--signal-lime)]/30'
            )}
            style={{
              boxShadow: pulse === i ? '0 0 8px var(--signal-lime)' : 'none',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-[var(--signal-lime)]">Market Active</span>
    </div>
  );
}

// Animated insight card
function InsightCard({
  icon: Icon,
  label,
  value,
  trend,
  delay,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-rose-400' : 'text-muted-foreground';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s ease-out',
      }}
    >
      <div
        className="p-2 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-teal) 100%)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)',
        }}
      >
        <Icon className="h-3.5 w-3.5 text-black" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-semibold', trendColor)}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [headerVisible, setHeaderVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Stagger the animations
    setTimeout(() => setHeaderVisible(true), 100);
    setTimeout(() => setContentVisible(true), 400);
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const greeting = getGreeting();

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Primary cyan orb - top left */}
        <div
          className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-[0.08] blur-[120px]"
          style={{
            background: 'radial-gradient(circle, var(--signal-cyan) 0%, transparent 70%)',
          }}
        />

        {/* Secondary lime orb - bottom right */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--signal-lime) 0%, transparent 70%)',
          }}
        />

        {/* Subtle purple orb - center */}
        <div
          className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full opacity-[0.04] blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
          }}
        />

        {/* Animated floating particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[var(--signal-cyan)]/20 animate-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Welcome Header Section */}
      <div
        className="mb-8"
        style={{
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'all 0.6s ease-out',
        }}
      >
        {/* Top bar with market status */}
        <div className="flex items-center justify-between mb-4">
          <MarketPulse />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Real-time intelligence</span>
          </div>
        </div>

        {/* Main greeting */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-foreground">{greeting}, </span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-lime) 50%, var(--signal-teal) 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
              }}
            >
              {firstName}
            </span>
          </h1>

          <p className="text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--signal-cyan)]" />
            Your real estate intelligence command center
          </p>
        </div>

        {/* Quick insights bar */}
        <div className="flex flex-wrap gap-3 mt-6">
          <InsightCard
            icon={TrendingUp}
            label="Market Trend"
            value="+2.4% this week"
            trend="up"
            delay={200}
          />
          <InsightCard
            icon={Zap}
            label="Price Signals"
            value="3 opportunities"
            trend="neutral"
            delay={350}
          />
          <InsightCard
            icon={Activity}
            label="Your Activity"
            value="Above average"
            trend="up"
            delay={500}
          />
        </div>
      </div>

      {/* Dashboard Grid */}
      <div
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
        }}
      >
        <DashboardGrid />
      </div>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.5;
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

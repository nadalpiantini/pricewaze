'use client';

import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { MarketInsights } from '@/components/dashboard/MarketInsights';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-emerald-600 to-cyan-600 p-6 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Welcome to PriceWaze</h1>
          <p className="text-cyan-100 max-w-2xl">
            Your AI-powered real estate intelligence dashboard. Monitor your properties,
            track negotiations, and get smart insights for better decisions.
          </p>
        </div>
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-emerald-300/20 blur-2xl" />
      </div>

      {/* Market Insights */}
      <MarketInsights />

      {/* Customizable Dashboard Grid */}
      <DashboardGrid />
    </div>
  );
}

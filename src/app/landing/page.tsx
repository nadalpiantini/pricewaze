'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  TrendingUp,
  Eye,
  FileText,
  Zap,
  Target,
  BarChart3,
  Shield,
  Users,
  Building2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800" />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="PriceWaze"
              width={200}
              height={200}
              className="mx-auto"
              priority
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Real Estate Intelligence
            <br />& Negotiation Platform
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 mb-8 max-w-3xl mx-auto">
            <span className="text-emerald-400 font-semibold">Waze for Real Estate Pricing</span> — live signals, real leverage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
              Get Started Free
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-800 px-8 py-6 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 bg-neutral-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Real Estate Negotiation is <span className="text-red-400">Broken</span>
          </h2>
          <p className="text-xl text-neutral-400 text-center mb-16 max-w-3xl mx-auto">
            The current system is designed to keep buyers in the dark.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-700">
              <XCircle className="h-10 w-10 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Buyers Negotiate Blind</h3>
              <p className="text-neutral-400">No visibility into competing offers, market dynamics, or true property value.</p>
            </div>
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-700">
              <XCircle className="h-10 w-10 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Historical & Delayed Data</h3>
              <p className="text-neutral-400">Pricing data is outdated, distorted, and doesn't reflect real-time market conditions.</p>
            </div>
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-700">
              <XCircle className="h-10 w-10 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3">MLS Ignores Offer Dynamics</h3>
              <p className="text-neutral-400">The system was designed for agents, not buyers. Critical negotiation data is hidden by design.</p>
            </div>
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-700">
              <XCircle className="h-10 w-10 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Power Imbalance</h3>
              <p className="text-neutral-400">Sellers and agents hold all the cards. The result: overpaying is the default outcome.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Insight Section */}
      <section className="py-24 px-4 bg-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            The Key Insight
          </h2>
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl p-12">
            <p className="text-2xl md:text-3xl font-light mb-6 text-neutral-200">
              Price is decided <span className="text-emerald-400 font-semibold">before closing</span>.
            </p>
            <p className="text-lg text-neutral-400 mb-8">
              Not at signing. Not in the registry.
            </p>
            <p className="text-xl text-emerald-400 font-medium">
              During visits, offers, and counteroffers — that's where intelligence matters.
              <br />And where no platform plays.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-4 bg-neutral-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            The <span className="text-emerald-400">PriceWaze</span> Solution
          </h2>
          <p className="text-xl text-neutral-400 text-center mb-16 max-w-3xl mx-auto">
            A live intelligence layer that empowers buyers with data-backed leverage.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 text-center">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-2">Track Real Activity</h3>
              <p className="text-sm text-neutral-400">Monitor verified buyer visits and interest levels in real-time</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 text-center">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-2">Normalize Pricing</h3>
              <p className="text-sm text-neutral-400">Compare true price per m² across properties and areas</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 text-center">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-2">Reveal Pressure</h3>
              <p className="text-sm text-neutral-400">See negotiation dynamics and leverage points</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 text-center">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-2">Empower Buyers</h3>
              <p className="text-sm text-neutral-400">Data-backed leverage for confident negotiations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-24 px-4 bg-neutral-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            What's Live Today
          </h2>
          <p className="text-xl text-neutral-400 text-center mb-16">
            MVP Features — Ready to Transform Your Real Estate Experience
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Interactive Property Map', desc: 'Explore properties visually with rich data overlays' },
              { icon: BarChart3, title: 'Price per m² Normalization', desc: 'Compare apples to apples across any market' },
              { icon: Shield, title: 'Verified Visits (GPS + Code)', desc: 'Real visits, verified by location and seller codes' },
              { icon: TrendingUp, title: 'Offer & Counteroffer Module', desc: 'Track and manage your negotiation flow' },
              { icon: FileText, title: 'AI-Generated Agreements', desc: 'Professional purchase agreements in seconds' },
              { icon: Zap, title: 'Negotiation Power Score™', desc: 'Know your leverage before you negotiate' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <div className="bg-emerald-500/10 p-3 rounded-lg">
                  <feature.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-neutral-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Negotiation Power Score */}
      <section className="py-24 px-4 bg-gradient-to-b from-neutral-800 to-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Negotiation Power Score™
          </h2>
          <p className="text-xl text-neutral-400 mb-12">
            Converts chaos into a clear decision signal
          </p>

          <div className="bg-neutral-900 rounded-3xl p-8 md:p-12 border border-neutral-700">
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="text-left">
                <h3 className="text-lg font-semibold mb-4 text-emerald-400">Dynamic Index Based On:</h3>
                <ul className="space-y-3">
                  {['Verified visit volume', 'Time on market', 'Area price deviation', 'Offer velocity'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-neutral-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">78</div>
                      <div className="text-sm text-emerald-100">Strong Leverage</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                <div className="text-2xl mb-1">🔥</div>
                <div className="font-semibold text-emerald-400">Strong</div>
                <div className="text-xs text-neutral-400">Push hard</div>
              </div>
              <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30">
                <div className="text-2xl mb-1">⚠️</div>
                <div className="font-semibold text-yellow-400">Neutral</div>
                <div className="text-xs text-neutral-400">Proceed carefully</div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <div className="text-2xl mb-1">❌</div>
                <div className="font-semibold text-red-400">Weak</div>
                <div className="text-xs text-neutral-400">Wait or walk</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Landscape */}
      <section className="py-24 px-4 bg-neutral-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            We Don't Compete — We <span className="text-emerald-400">Reframe</span> the Game
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-4 px-4 text-neutral-400 font-medium">Platform</th>
                  <th className="text-left py-4 px-4 text-neutral-400 font-medium">Focus</th>
                  <th className="text-center py-4 px-4 text-neutral-400 font-medium">Buyer Power</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-700/50">
                  <td className="py-4 px-4">Zillow / Idealista</td>
                  <td className="py-4 px-4 text-neutral-400">Listings</td>
                  <td className="py-4 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-neutral-700/50">
                  <td className="py-4 px-4">MLS</td>
                  <td className="py-4 px-4 text-neutral-400">Agents</td>
                  <td className="py-4 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-neutral-700/50">
                  <td className="py-4 px-4">Data Aggregators</td>
                  <td className="py-4 px-4 text-neutral-400">History</td>
                  <td className="py-4 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                </tr>
                <tr className="bg-emerald-500/10">
                  <td className="py-4 px-4 font-semibold text-emerald-400">PriceWaze</td>
                  <td className="py-4 px-4 text-emerald-400">Live Negotiation</td>
                  <td className="py-4 px-4 text-center"><CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* For Buyers */}
      <section className="py-24 px-4 bg-neutral-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Why Buyers <span className="text-emerald-400">Love It</span>
          </h2>
          <p className="text-xl text-neutral-400 text-center mb-16">
            Stop guessing. Start deciding.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '💰', title: 'Pay Fair Prices', desc: 'Know what properties are really worth' },
              { icon: '🎯', title: 'Avoid Bidding Blind', desc: 'See the full picture before offering' },
              { icon: '😌', title: 'Reduce Stress', desc: 'Confidence comes from data' },
              { icon: '🏆', title: 'Negotiate Like a Pro', desc: 'Leverage insights that others don\'t have' },
            ].map((item, i) => (
              <div key={i} className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Agents */}
      <section className="py-24 px-4 bg-neutral-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            For Agents & Brokers
          </h2>
          <p className="text-xl text-neutral-400 mb-12">
            Stand out as transparent & modern
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Educate Clients', desc: 'Use data to set realistic expectations' },
              { title: 'Close Faster', desc: 'Reduce back-and-forth with clear insights' },
              { title: 'Reduce Friction', desc: 'Transparent data means smoother transactions' },
              { title: 'Differentiate', desc: 'Position yourself as a modern, data-driven agent' },
            ].map((item, i) => (
              <div key={i} className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 text-left">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-3" />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-neutral-900 to-neutral-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Buy Smarter.<br />Negotiate Stronger.
          </h2>
          <p className="text-xl text-neutral-400 mb-12">
            Real intelligence for real estate decisions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-6 text-lg">
              Start Free Trial
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-800 px-12 py-6 text-lg">
              Schedule Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-neutral-500">
            <span>No credit card required</span>
            <span>•</span>
            <span>Free for buyers</span>
            <span>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-neutral-950 border-t border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="PriceWaze"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="text-lg font-semibold">PriceWaze</span>
            </div>
            <div className="flex gap-8 text-sm text-neutral-400">
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Get Started</Link>
              <Link href="/" className="hover:text-white transition-colors">App</Link>
            </div>
            <div className="text-sm text-neutral-500">
              © {new Date().getFullYear()} PriceWaze. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

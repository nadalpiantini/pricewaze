import {
  HeroSection,
  HowItWorksSection,
  ProblemSection,
  CollectiveSection,
  PowerScoreSection,
  NetworkEffectSection,
  TrustSection,
  AudienceSection,
  CTASection,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  // These would come from your API in production
  const stats = {
    offers: 12453,
    visits: 28721,
    users: 3892,
    zones: 47,
  };

  return (
    <main className="min-h-screen bg-[var(--landing-bg-deep)]">
      {/* Hero - The Network */}
      <HeroSection
        stats={{
          offers: stats.offers,
          visits: stats.visits,
          users: stats.users,
        }}
      />

      {/* How It Works - Give & Get */}
      <HowItWorksSection />

      {/* The Problem - Information Asymmetry */}
      <ProblemSection />

      {/* Collective Intelligence - Features */}
      <CollectiveSection />

      {/* Power Score - Negotiation Leverage */}
      <PowerScoreSection />

      {/* Network Effect - Growth & Testimonials */}
      <NetworkEffectSection />

      {/* Trust & Privacy */}
      <TrustSection />

      {/* For Different Users */}
      <AudienceSection />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <Footer
        stats={{
          users: stats.users,
          offers: stats.offers,
          zones: stats.zones,
        }}
      />
    </main>
  );
}

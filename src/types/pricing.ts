export interface PricingAnalysis {
  propertyId: string;
  requestedAt: string;

  // Price Fairness
  fairnessScore: number; // 0-100
  fairnessLabel: 'underpriced' | 'fair' | 'overpriced' | 'significantly_overpriced';
  estimatedFairValue: number;
  pricePerM2: number;

  // Zone Comparison
  zoneStats: {
    zoneName: string;
    avgPricePerM2: number;
    medianPricePerM2: number;
    minPricePerM2: number;
    maxPricePerM2: number;
    propertyCount: number;
  };

  // Negotiation Intelligence
  negotiationPower: {
    score: number; // 0-100, higher = more buyer power
    factors: NegotiationFactor[];
  };

  // Suggested Offers
  suggestedOffers: {
    aggressive: number; // Low-ball offer
    balanced: number;   // Fair starting point
    conservative: number; // Close to asking
  };

  // AI Insights
  insights: string[];
  risks: string[];
  opportunities: string[];
}

export interface NegotiationFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  explanation: string;
}

export interface OfferAdvice {
  offerId: string;
  currentAmount: number;
  propertyPrice: number;

  recommendation: 'accept' | 'counter' | 'reject' | 'wait';
  confidence: number; // 0-100

  suggestedCounterAmount?: number;
  reasoning: string[];

  marketContext: {
    daysOnMarket: number;
    similarSales: number;
    pricetrend: 'rising' | 'stable' | 'falling';
  };
}

export interface ContractDraft {
  offerId: string;
  generatedAt: string;

  parties: {
    buyer: {
      name: string;
      identification?: string;
    };
    seller: {
      name: string;
      identification?: string;
    };
  };

  property: {
    address: string;
    description: string;
    area_m2?: number;
    registryNumber?: string;
  };

  terms: {
    agreedPrice: number;
    currency: string;
    paymentTerms: string;
    closingDate?: string;
    conditions: string[];
  };

  content: string; // Full contract text
  disclaimer: string;
}

export interface ZoneAnalysis {
  zoneId: string;
  zoneName: string;

  priceStats: {
    avgPrice: number;
    avgPricePerM2: number;
    medianPrice: number;
    priceRange: { min: number; max: number };
  };

  marketHealth: {
    score: number; // 0-100
    trend: 'hot' | 'warm' | 'cool' | 'cold';
    avgDaysOnMarket: number;
  };

  demographics: {
    propertyCount: number;
    recentSales: number;
    newListings: number;
  };

  insights: string[];
}

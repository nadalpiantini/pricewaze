import OpenAI from 'openai';
import type { PricingAnalysis, NegotiationFactor, OfferAdvice, ZoneAnalysis } from '@/types/pricing';
import { getMarketConfig, formatPrice } from '@/config/market';

// Lazy-load client to avoid build-time errors
let deepseek: OpenAI | null = null;

function getClient(): OpenAI {
  if (!deepseek) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return deepseek;
}

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

interface PropertyContext {
  id: string;
  title: string;
  price: number;
  area_m2?: number;
  property_type: string;
  address: string;
  description?: string;
  created_at: string;
}

interface ZoneContext {
  name: string;
  properties: Array<{
    price: number;
    area_m2?: number;
    property_type: string;
    status: string;
    created_at: string;
  }>;
}

export async function analyzePricing(
  property: PropertyContext,
  zoneContext: ZoneContext
): Promise<PricingAnalysis> {
  const pricePerM2 = property.area_m2 ? property.price / property.area_m2 : 0;

  // Calculate zone statistics
  const activeProperties = zoneContext.properties.filter(p => p.status === 'active' && p.area_m2);
  const zonePricesPerM2 = activeProperties.map(p => p.price / p.area_m2!);

  const zoneStats = {
    zoneName: zoneContext.name,
    avgPricePerM2: zonePricesPerM2.length > 0
      ? zonePricesPerM2.reduce((a, b) => a + b, 0) / zonePricesPerM2.length
      : 0,
    medianPricePerM2: zonePricesPerM2.length > 0
      ? zonePricesPerM2.sort((a, b) => a - b)[Math.floor(zonePricesPerM2.length / 2)]
      : 0,
    minPricePerM2: zonePricesPerM2.length > 0 ? Math.min(...zonePricesPerM2) : 0,
    maxPricePerM2: zonePricesPerM2.length > 0 ? Math.max(...zonePricesPerM2) : 0,
    propertyCount: activeProperties.length,
  };

  // Calculate days on market
  const daysOnMarket = Math.floor(
    (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const market = getMarketConfig();

  const prompt = `You are a real estate pricing analyst for the ${market.ai.marketContext}. Analyze this property and provide pricing intelligence.

PROPERTY DATA:
- Title: ${property.title}
- Address: ${property.address}
- Asking Price: ${formatPrice(property.price, market)}
- Area: ${property.area_m2 ? `${property.area_m2} m²` : 'Not specified'}
- Price per m²: ${pricePerM2 ? `${market.currency.symbol}${pricePerM2.toFixed(2)}/m²` : 'N/A'}
- Type: ${property.property_type}
- Days on Market: ${daysOnMarket}
- Description: ${property.description || 'Not provided'}

ZONE CONTEXT (${zoneContext.name}):
- Active Listings: ${zoneStats.propertyCount}
- Average Price/m²: ${market.currency.symbol}${zoneStats.avgPricePerM2.toFixed(2)}
- Median Price/m²: ${market.currency.symbol}${zoneStats.medianPricePerM2.toFixed(2)}
- Range: ${market.currency.symbol}${zoneStats.minPricePerM2.toFixed(2)} - ${market.currency.symbol}${zoneStats.maxPricePerM2.toFixed(2)}/m²

Provide a JSON response with:
1. fairnessScore (0-100, where 50 is perfectly fair priced)
2. fairnessLabel: "underpriced", "fair", "overpriced", or "significantly_overpriced"
3. estimatedFairValue (your estimate of fair market value in USD)
4. negotiationPowerScore (0-100, higher = more buyer leverage)
5. negotiationFactors (array of factors affecting negotiation position)
6. suggestedOffers: { aggressive, balanced, conservative } (in USD)
7. insights (array of 2-3 key insights about this property)
8. risks (array of 1-2 potential risks for buyers)
9. opportunities (array of 1-2 opportunities for buyers)

Respond ONLY with valid JSON, no markdown or explanation.`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const aiAnalysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    const negotiationFactors: NegotiationFactor[] = (aiAnalysis.negotiationFactors || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => ({
        factor: f.factor || f.name || 'Unknown factor',
        impact: f.impact || 'neutral',
        weight: f.weight || 0.5,
        explanation: f.explanation || f.description || '',
      })
    );

    return {
      propertyId: property.id,
      requestedAt: new Date().toISOString(),
      fairnessScore: aiAnalysis.fairnessScore || 50,
      fairnessLabel: aiAnalysis.fairnessLabel || 'fair',
      estimatedFairValue: aiAnalysis.estimatedFairValue || property.price,
      pricePerM2,
      zoneStats,
      negotiationPower: {
        score: aiAnalysis.negotiationPowerScore || 50,
        factors: negotiationFactors,
      },
      suggestedOffers: {
        aggressive: aiAnalysis.suggestedOffers?.aggressive || property.price * 0.85,
        balanced: aiAnalysis.suggestedOffers?.balanced || property.price * 0.93,
        conservative: aiAnalysis.suggestedOffers?.conservative || property.price * 0.97,
      },
      insights: aiAnalysis.insights || [],
      risks: aiAnalysis.risks || [],
      opportunities: aiAnalysis.opportunities || [],
    };
  } catch (error) {
    console.error('DeepSeek pricing analysis error:', error);

    // Return fallback analysis based on zone data
    const zoneAvg = zoneStats.avgPricePerM2;
    const priceDiff = zoneAvg > 0 ? (pricePerM2 - zoneAvg) / zoneAvg : 0;

    return {
      propertyId: property.id,
      requestedAt: new Date().toISOString(),
      fairnessScore: Math.max(0, Math.min(100, 50 - priceDiff * 50)),
      fairnessLabel:
        priceDiff < -0.1
          ? 'underpriced'
          : priceDiff > 0.2
          ? 'significantly_overpriced'
          : priceDiff > 0.1
          ? 'overpriced'
          : 'fair',
      estimatedFairValue: property.area_m2 ? zoneAvg * property.area_m2 : property.price,
      pricePerM2,
      zoneStats,
      negotiationPower: {
        score: daysOnMarket > 90 ? 70 : daysOnMarket > 30 ? 55 : 40,
        factors: [
          {
            factor: 'Days on Market',
            impact: daysOnMarket > 60 ? 'positive' : 'neutral',
            weight: 0.3,
            explanation: `Property has been listed for ${daysOnMarket} days`,
          },
        ],
      },
      suggestedOffers: {
        aggressive: property.price * 0.85,
        balanced: property.price * 0.93,
        conservative: property.price * 0.97,
      },
      insights: ['Analysis based on zone statistics (AI temporarily unavailable)'],
      risks: [],
      opportunities: [],
    };
  }
}

export async function getOfferAdvice(
  offer: {
    id: string;
    amount: number;
    message?: string;
    status: string;
  },
  property: PropertyContext,
  negotiationHistory: Array<{ amount: number; status: string; created_at: string }>
): Promise<OfferAdvice> {
  const daysOnMarket = Math.floor(
    (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const market = getMarketConfig();

  const prompt = `You are a real estate negotiation advisor for the ${market.ai.marketContext}. Analyze this offer and provide advice.

CURRENT OFFER:
- Amount: ${formatPrice(offer.amount, market)}
- Message: ${offer.message || 'No message'}
- Status: ${offer.status}

PROPERTY:
- Asking Price: ${formatPrice(property.price, market)}
- Type: ${property.property_type}
- Days on Market: ${daysOnMarket}

NEGOTIATION HISTORY:
${
  negotiationHistory.length > 0
    ? negotiationHistory.map((h, i) => `Round ${i + 1}: $${h.amount.toLocaleString()} (${h.status})`).join('\n')
    : 'No previous offers'
}

As the SELLER, provide a JSON response with:
1. recommendation: "accept", "counter", "reject", or "wait"
2. confidence (0-100)
3. suggestedCounterAmount (if recommending counter, in USD)
4. reasoning (array of 2-3 reasons for your recommendation)
5. marketContext: { daysOnMarket, similarSales (estimate), pricetrend: "rising"|"stable"|"falling" }

Respond ONLY with valid JSON, no markdown or explanation.`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const aiAdvice = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    return {
      offerId: offer.id,
      currentAmount: offer.amount,
      propertyPrice: property.price,
      recommendation: aiAdvice.recommendation || 'wait',
      confidence: aiAdvice.confidence || 50,
      suggestedCounterAmount: aiAdvice.suggestedCounterAmount,
      reasoning: aiAdvice.reasoning || [],
      marketContext: {
        daysOnMarket,
        similarSales: aiAdvice.marketContext?.similarSales || 0,
        pricetrend: aiAdvice.marketContext?.pricetrend || 'stable',
      },
    };
  } catch (error) {
    console.error('DeepSeek offer advice error:', error);

    const offerPercent = (offer.amount / property.price) * 100;

    return {
      offerId: offer.id,
      currentAmount: offer.amount,
      propertyPrice: property.price,
      recommendation:
        offerPercent >= 95
          ? 'accept'
          : offerPercent >= 90
          ? 'counter'
          : 'reject',
      confidence: 60,
      suggestedCounterAmount:
        offerPercent < 95 ? Math.round((offer.amount + property.price) / 2) : undefined,
      reasoning: ['Recommendation based on offer percentage (AI temporarily unavailable)'],
      marketContext: {
        daysOnMarket,
        similarSales: 0,
        pricetrend: 'stable',
      },
    };
  }
}

export async function analyzeZone(
  zoneId: string,
  zoneName: string,
  properties: Array<{
    price: number;
    area_m2?: number;
    property_type: string;
    status: string;
    created_at: string;
  }>
): Promise<ZoneAnalysis> {
  const activeProperties = properties.filter(p => p.status === 'active');
  const recentSales = properties.filter(
    p => p.status === 'sold' && new Date(p.created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );

  const prices = activeProperties.map(p => p.price);
  const pricesPerM2 = activeProperties
    .filter(p => p.area_m2)
    .map(p => p.price / p.area_m2!);

  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const avgPricePerM2 = pricesPerM2.length > 0
    ? pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length
    : 0;
  const medianPrice = prices.length > 0
    ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : 0;

  const market = getMarketConfig();

  const prompt = `Analyze this real estate zone in the ${market.ai.marketContext} and provide market insights.

ZONE: ${zoneName}
- Active Listings: ${activeProperties.length}
- Recent Sales (90 days): ${recentSales.length}
- Average Price: ${formatPrice(avgPrice, market)}
- Average Price/m²: ${market.currency.symbol}${avgPricePerM2.toFixed(2)}
- Price Range: ${formatPrice(prices.length > 0 ? Math.min(...prices) : 0, market)} - ${formatPrice(prices.length > 0 ? Math.max(...prices) : 0, market)}

Property Types:
${Object.entries(
  activeProperties.reduce((acc, p) => {
    acc[p.property_type] = (acc[p.property_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

Provide a JSON response with:
1. marketHealthScore (0-100)
2. marketTrend: "hot", "warm", "cool", or "cold"
3. avgDaysOnMarket (estimate based on market conditions)
4. insights (array of 2-3 key insights about this zone)

Respond ONLY with valid JSON, no markdown or explanation.`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const aiAnalysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    return {
      zoneId,
      zoneName,
      priceStats: {
        avgPrice,
        avgPricePerM2,
        medianPrice,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        },
      },
      marketHealth: {
        score: aiAnalysis.marketHealthScore || 50,
        trend: aiAnalysis.marketTrend || 'warm',
        avgDaysOnMarket: aiAnalysis.avgDaysOnMarket || 45,
      },
      demographics: {
        propertyCount: activeProperties.length,
        recentSales: recentSales.length,
        newListings: properties.filter(
          p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
      },
      insights: aiAnalysis.insights || [],
    };
  } catch (error) {
    console.error('DeepSeek zone analysis error:', error);

    return {
      zoneId,
      zoneName,
      priceStats: {
        avgPrice,
        avgPricePerM2,
        medianPrice,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        },
      },
      marketHealth: {
        score: 50,
        trend: 'warm',
        avgDaysOnMarket: 45,
      },
      demographics: {
        propertyCount: activeProperties.length,
        recentSales: recentSales.length,
        newListings: properties.filter(
          p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
      },
      insights: ['Analysis based on available data (AI temporarily unavailable)'],
    };
  }
}

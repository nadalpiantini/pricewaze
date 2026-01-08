import OpenAI from 'openai';
import type { PricingAnalysis, NegotiationFactor, OfferAdvice, ZoneAnalysis } from '@/types/pricing';
// Market config used in prompts
import '@/config/market';
import { buildAnalyzePricingV2Prompt } from '@/prompts/pricing/analyzePricing.v2';
import { buildGetOfferAdviceV2Prompt } from '@/prompts/pricing/getOfferAdvice.v2';
import { buildAnalyzeZoneV2Prompt } from '@/prompts/pricing/analyzeZone.v2';
import { validatePricingAnalysis, validateOfferAdvice } from '@/lib/prompts/validator';
import { trackPromptUsage } from '@/prompts/prompts-registry';
import { logger } from '@/lib/logger';

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

  // Use v2 prompt
  const prompt = buildAnalyzePricingV2Prompt({
    property: {
      title: property.title,
      address: property.address,
      price: property.price,
      area_m2: property.area_m2,
      property_type: property.property_type,
      daysOnMarket,
      description: property.description,
    },
    zoneContext: {
      name: zoneContext.name,
      avgPricePerM2: zoneStats.avgPricePerM2,
      medianPricePerM2: zoneStats.medianPricePerM2,
      minPricePerM2: zoneStats.minPricePerM2,
      maxPricePerM2: zoneStats.maxPricePerM2,
      propertyCount: zoneStats.propertyCount,
    },
  });

  const startTime = Date.now();
  
  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '{}';
    const aiAnalysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    // Validate output
    const validation = validatePricingAnalysis(aiAnalysis);
    if (!validation.valid) {
      console.error('[Prompt Validation] analyzePricing errors:', validation.errors);
      // Track validation failure
      await trackPromptUsage('analyzePricing', {
        latency,
        success: false,
      });
      throw new Error(`Invalid output: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('[Prompt Validation] analyzePricing warnings:', validation.warnings);
    }

    // Track successful usage
    await trackPromptUsage('analyzePricing', {
      latency,
      confidence: aiAnalysis.confidenceLevel,
      success: true,
    });

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
      estimatedFairValue: aiAnalysis.estimatedFairValue ?? null, // v2: can be null
      pricePerM2,
      zoneStats,
      negotiationPower: {
        score: aiAnalysis.negotiationPowerScore || 50,
        factors: negotiationFactors,
      },
      suggestedOffers: {
        aggressive: aiAnalysis.suggestedOffers?.aggressive ?? null, // v2: can be null
        balanced: aiAnalysis.suggestedOffers?.balanced ?? null,
        conservative: aiAnalysis.suggestedOffers?.conservative ?? null,
      },
      insights: aiAnalysis.insights || [],
      risks: aiAnalysis.risks || [],
      opportunities: aiAnalysis.opportunities || [],
      confidenceLevel: aiAnalysis.confidenceLevel || 'medium', // v2: new field
    };
  } catch (error) {
    logger.error('DeepSeek pricing analysis error', error);

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

  // Use v2 prompt
  const prompt = buildGetOfferAdviceV2Prompt({
    offer: {
      amount: offer.amount,
      message: offer.message,
      status: offer.status,
    },
    property: {
      price: property.price,
      property_type: property.property_type,
      daysOnMarket,
    },
    negotiationHistory,
  });

  const startTime = Date.now();
  
  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '{}';
    const aiAdvice = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    // Validate output
    const validation = validateOfferAdvice(aiAdvice);
    if (!validation.valid) {
      console.error('[Prompt Validation] getOfferAdvice errors:', validation.errors);
      await trackPromptUsage('getOfferAdvice', {
        latency,
        success: false,
      });
      throw new Error(`Invalid output: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('[Prompt Validation] getOfferAdvice warnings:', validation.warnings);
    }

    // Track successful usage
    await trackPromptUsage('getOfferAdvice', {
      latency,
      confidence: aiAdvice.confidenceLevel,
      success: true,
    });

    return {
      offerId: offer.id,
      currentAmount: offer.amount,
      propertyPrice: property.price,
      recommendation: aiAdvice.recommendation || 'wait',
      confidence: aiAdvice.confidence || 50,
      suggestedCounterAmount: aiAdvice.suggestedCounterAmount ?? null, // v2: can be null
      reasoning: aiAdvice.reasoning || [],
      marketContext: {
        daysOnMarket,
        similarSales: aiAdvice.marketContext?.similarSalesEstimate ?? null, // v2: renamed
        pricetrend: aiAdvice.marketContext?.priceTrend || 'stable', // v2: renamed
      },
      confidenceLevel: aiAdvice.confidenceLevel || 'medium', // v2: new field
    };
  } catch (error) {
    logger.error('DeepSeek offer advice error', error);

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

  // Use v2 prompt
  const prompt = buildAnalyzeZoneV2Prompt({
    zoneName,
    activeProperties: properties,
    recentSales: recentSales.map(s => ({
      price: s.price,
      created_at: s.created_at,
    })),
  });

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
        avgDaysOnMarket: aiAnalysis.avgDaysOnMarket ?? null, // v2: can be null
        liquidityLevel: aiAnalysis.liquidityLevel || 'medium', // v2: new field
      },
      confidenceLevel: aiAnalysis.confidenceLevel || 'medium', // v2: new field
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
    logger.error('DeepSeek zone analysis error', error);

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

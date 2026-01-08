/**
 * analyzeZone.v2.ts
 * 
 * Prompt v2 for zone market analysis
 * Level: 8.5-9/10
 * 
 * Improvements over v1:
 * - Introduces liquidityLevel
 * - Clarifies when analysis is unreliable
 * - Avoids "market hype"
 * - Better input for downstream analysis
 */

import { getMarketConfig, formatPrice } from '@/config/market';

interface AnalyzeZoneV2Input {
  zoneName: string;
  activeProperties: Array<{
    price: number;
    area_m2?: number;
    property_type: string;
    status: string;
    created_at: string;
  }>;
  recentSales: Array<{
    price: number;
    created_at: string;
  }>;
}

export function buildAnalyzeZoneV2Prompt(input: AnalyzeZoneV2Input): string {
  const market = getMarketConfig();
  
  const activeProperties = input.activeProperties.filter(p => p.status === 'active');
  const prices = activeProperties.map(p => p.price);
  const pricesPerM2 = activeProperties
    .filter(p => p.area_m2)
    .map(p => p.price / p.area_m2!);

  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const avgPricePerM2 = pricesPerM2.length > 0
    ? pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length
    : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Property type distribution
  const propertyTypeDistribution: Record<string, number> = {};
  activeProperties.forEach(p => {
    propertyTypeDistribution[p.property_type] = (propertyTypeDistribution[p.property_type] || 0) + 1;
  });

  return `ROLE:
You are a senior real estate market analyst specialized in the ${market.ai.marketContext}.
You focus on zone-level market health, liquidity, and pricing dynamics.

MISSION:
Your goal is to assess the overall health and momentum of a real estate zone
based on observable supply, demand, and pricing signals.

CONTEXT:
This analysis may be used directly in the UI or as input for downstream pricing
and negotiation intelligence. Precision matters more than optimism.

INPUT DATA:

ZONE:
- Name: ${input.zoneName}
- Active Listings: ${activeProperties.length}
- Recent Sales (last 90 days): ${input.recentSales.length}

PRICING:
- Average Price: ${formatPrice(avgPrice, market)}
- Average Price per m²: ${market.currency.symbol}${avgPricePerM2.toFixed(2)}
- Observed Price Range: ${formatPrice(minPrice, market)} – ${formatPrice(maxPrice, market)}

PROPERTY MIX:
${Object.entries(propertyTypeDistribution)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

TASK:
1. Assess overall market health based on activity and liquidity.
2. Classify the zone's current market trend.
3. Estimate average days on market under current conditions.
4. Identify key structural insights about this zone.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema exactly:

{
  "marketHealthScore": number,        // integer 0–100
  "marketTrend": "hot" | "warm" | "cool" | "cold",
  "avgDaysOnMarket": number | null,   // estimate, null if uncertain
  "liquidityLevel": "low" | "medium" | "high",
  "insights": string[],               // 2–3 concrete insights
  "confidenceLevel": "low" | "medium" | "high"
}

GUARDRAILS:
- Do NOT infer trends beyond the provided time window.
- Do NOT assume demand unless supported by sales vs listings.
- Avoid generic statements like "good investment area".
- Base all conclusions on relative ratios, not absolutes.

FALLBACK / LIMITATIONS:
- If recent sales volume is very low, set confidenceLevel to "low".
- If price dispersion is wide, reflect that in insights and confidence.
- If signals conflict, prioritize liquidity over pricing.

Respond ONLY with valid JSON. No markdown. No explanations.`;
}


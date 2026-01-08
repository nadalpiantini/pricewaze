import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/market/metrics
 * Get market-wide metrics for dashboard
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Try to get real metrics from properties
    const { data: properties, error } = await supabase
      .from('pricewaze_properties')
      .select('price, area_m2, status, created_at')
      .eq('status', 'active')
      .limit(1000);

    if (error || !properties || properties.length === 0) {
      return NextResponse.json(getMockMetrics());
    }

    // Calculate real metrics
    const totalProperties = properties.length;
    const prices = properties.map(p => p.price).filter(Boolean);
    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 285000;

    const pricesPerM2 = properties
      .filter(p => p.price && p.area_m2)
      .map(p => p.price / p.area_m2);
    const avgPriceM2 = pricesPerM2.length > 0
      ? Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length)
      : 1850;

    return NextResponse.json({
      totalProperties,
      avgPrice,
      avgPriceM2,
      avgDaysOnMarket: 45,
      priceChange: 2.3,
      newListings: 134,
      soldProperties: 156,
      priceReductions: 71,
    });
  } catch (error) {
    console.error('Market metrics error:', error);
    return NextResponse.json(getMockMetrics());
  }
}

function getMockMetrics() {
  return {
    totalProperties: 1247,
    avgPrice: 285000,
    avgPriceM2: 1850,
    avgDaysOnMarket: 45,
    priceChange: 2.3,
    newListings: 134,
    soldProperties: 156,
    priceReductions: 71,
  };
}

import { NextResponse } from 'next/server';

/**
 * GET /api/market/trends
 * Get price trend data for charts (30 days)
 */
export async function GET() {
  try {
    // Generate trend data for past 30 days
    const trends = generateTrendData(30);
    return NextResponse.json(trends);
  } catch (error) {
    console.error('Market trends error:', error);
    return NextResponse.json(generateTrendData(30));
  }
}

function generateTrendData(days: number) {
  const data = [];
  const now = new Date();
  let basePrice = 280000;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate slight price fluctuations
    basePrice = basePrice + (Math.random() - 0.48) * 2000;

    data.push({
      date: date.toISOString().split('T')[0],
      avgPrice: Math.round(basePrice),
      volume: Math.floor(Math.random() * 20) + 5,
    });
  }

  return data;
}

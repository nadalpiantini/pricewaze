/**
 * CrewAI Pricing Analysis API Route
 *
 * Proxies requests to the CrewAI backend for pricing analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { crewaiClient } from '@/lib/crewai-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      );
    }

    // Check if async mode requested
    if (body.async) {
      const result = await crewaiClient.analyzePricingAsync({
        property_id: body.property_id,
        zone_id: body.zone_id,
      });
      return NextResponse.json(result);
    }

    // Synchronous analysis
    const result = await crewaiClient.analyzePricing({
      property_id: body.property_id,
      zone_id: body.zone_id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI pricing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'property_id query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Quick pricing check
    const result = await crewaiClient.quickPricing(propertyId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI quick pricing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quick check failed' },
      { status: 500 }
    );
  }
}

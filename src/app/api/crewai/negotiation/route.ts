/**
 * CrewAI Negotiation Advisory API Route
 *
 * Proxies requests to the CrewAI backend for negotiation advice.
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

    // Determine advice type
    const adviceType = body.advice_type || 'buyer';

    if (adviceType === 'seller') {
      if (!body.offer_amount) {
        return NextResponse.json(
          { error: 'offer_amount is required for seller advice' },
          { status: 400 }
        );
      }

      const result = await crewaiClient.getSellerAdvice({
        property_id: body.property_id,
        offer_amount: body.offer_amount,
        offer_message: body.offer_message,
      });
      return NextResponse.json(result);
    }

    // Default to buyer advice
    const result = await crewaiClient.getBuyerAdvice({
      property_id: body.property_id,
      buyer_budget: body.buyer_budget,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI negotiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Advice failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');
  const budget = searchParams.get('budget');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'property_id query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Quick offer suggestions
    const result = await crewaiClient.getOfferSuggestions(
      propertyId,
      budget ? parseFloat(budget) : undefined
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI offer suggestions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Suggestions failed' },
      { status: 500 }
    );
  }
}

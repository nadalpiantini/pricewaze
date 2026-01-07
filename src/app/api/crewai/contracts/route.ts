/**
 * CrewAI Contract Generation API Route
 *
 * Proxies requests to the CrewAI backend for contract generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { crewaiClient } from '@/lib/crewai-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['property_id', 'buyer', 'seller', 'property_address', 'agreed_price'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Quick draft mode
    if (body.quick) {
      const result = await crewaiClient.generateQuickDraft({
        buyer_name: body.buyer.name || body.buyer,
        seller_name: body.seller.name || body.seller,
        property_address: body.property_address,
        property_description: body.property_description || body.property_address,
        agreed_price: body.agreed_price,
        deposit_percent: body.deposit_percent,
        closing_days: body.closing_days,
      });
      return NextResponse.json(result);
    }

    // Full contract generation
    const result = await crewaiClient.generateContract({
      property_id: body.property_id,
      buyer: typeof body.buyer === 'string' ? { name: body.buyer } : body.buyer,
      seller: typeof body.seller === 'string' ? { name: body.seller } : body.seller,
      property_address: body.property_address,
      agreed_price: body.agreed_price,
      deposit_percent: body.deposit_percent || 10,
      closing_days: body.closing_days || 30,
      special_conditions: body.special_conditions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI contract error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Contract generation failed' },
      { status: 500 }
    );
  }
}

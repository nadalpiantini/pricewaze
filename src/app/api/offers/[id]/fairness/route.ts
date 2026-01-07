import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/offers/[id]/fairness - Calculate fairness score for an offer
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the offer
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select('id, amount, property_id, buyer_id, seller_id')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Only buyer or seller can view fairness
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate fairness score using DB function
    const { data: fairnessData, error: fairnessError } = await supabase.rpc(
      'pricewaze_calculate_offer_fairness',
      {
        p_offer_amount: offer.amount,
        p_property_id: offer.property_id,
      }
    );

    if (fairnessError) {
      console.error('Error calculating fairness:', fairnessError);
      return NextResponse.json(
        { error: 'Failed to calculate fairness score' },
        { status: 500 }
      );
    }

    const result = fairnessData?.[0];
    if (!result) {
      return NextResponse.json(
        { error: 'No fairness data returned' },
        { status: 500 }
      );
    }

    // Determine badge based on fairness ratio
    let badge: 'justa' | 'agresiva' | 'riesgosa' | 'generosa' = 'justa';
    const ratio = Number(result.fairness_score);

    if (ratio >= 0.95 && ratio <= 1.05) {
      badge = 'justa';
    } else if (ratio >= 0.85 && ratio < 0.95) {
      badge = 'agresiva';
    } else if (ratio < 0.85) {
      badge = 'riesgosa';
    } else {
      badge = 'generosa';
    }

    return NextResponse.json({
      offer_id: id,
      fairness_score: ratio,
      fairness_label: result.fairness_label,
      badge,
      fair_price_estimate: Number(result.fair_price_estimate),
      offer_amount: offer.amount,
      difference: offer.amount - Number(result.fair_price_estimate),
      difference_percent: ((offer.amount - Number(result.fair_price_estimate)) / Number(result.fair_price_estimate)) * 100,
    });
  } catch (error) {
    console.error('Fairness GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


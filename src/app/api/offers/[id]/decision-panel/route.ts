import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDecisionPanel } from '@/lib/decision-panel/calculator';
import type { DecisionPanel, DecisionPanelInput } from '@/types/decision-panel';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/offers/[id]/decision-panel
 * Get or generate decision panel for an offer
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id: offerId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the offer
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select(`
        id,
        amount,
        property_id,
        buyer_id,
        seller_id,
        property:pricewaze_properties(id, price, created_at)
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Check permissions
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if panel already exists
    const { data: existingPanel } = await supabase
      .from('pricewaze_decision_panels')
      .select('*')
      .eq('offer_id', offerId)
      .single();

    if (existingPanel) {
      return NextResponse.json({
        success: true,
        data: existingPanel as DecisionPanel,
      });
    }

    // Generate new panel
    const panel = await generateDecisionPanel(supabase, {
      offer_id: offerId,
      property_id: offer.property_id,
      offer_amount: offer.amount,
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: panel,
    });
  } catch (error) {
    console.error('Decision panel API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/offers/[id]/decision-panel
 * Force regenerate decision panel for an offer
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id: offerId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the offer
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select(`
        id,
        amount,
        property_id,
        buyer_id,
        seller_id
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Check permissions
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get optional profile_applied from request body
    const body = await request.json().catch(() => ({}));
    const profile_applied = body.profile_applied || null;

    // Generate new panel
    const panel = await generateDecisionPanel(supabase, {
      offer_id: offerId,
      property_id: offer.property_id,
      offer_amount: offer.amount,
      user_id: user.id,
      profile_applied,
    });

    return NextResponse.json({
      success: true,
      data: panel,
    });
  } catch (error) {
    console.error('Decision panel API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate decision panel by fetching all required data and calculating
 */
async function generateDecisionPanel(
  supabase: any,
  input: DecisionPanelInput
): Promise<DecisionPanel> {
  const { offer_id, property_id, offer_amount, user_id, profile_applied } = input;

  // Fetch AVM result
  const { data: avmResult } = await supabase
    .from('pricewaze_avm_results')
    .select('estimate, low_estimate, high_estimate, uncertainty_level, comparable_count')
    .eq('property_id', property_id)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch market pressure
  const { data: pressureData } = await supabase
    .from('pricewaze_market_pressure')
    .select('pressure_level, active_offers_count, recent_visits_count, competing_offers')
    .eq('property_id', property_id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch market dynamics
  const { data: dynamicsData } = await supabase
    .from('pricewaze_market_dynamics')
    .select('market_velocity, recent_listings_count')
    .eq('property_id', property_id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  // Get property for days on market
  const { data: property } = await supabase
    .from('pricewaze_properties')
    .select('created_at')
    .eq('id', property_id)
    .single();

  const daysOnMarket = property
    ? Math.floor(
        (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  // Prepare calculation context
  const avm = avmResult
    ? {
        estimate: avmResult.estimate,
        low_estimate: avmResult.low_estimate,
        high_estimate: avmResult.high_estimate,
        uncertainty_level: avmResult.uncertainty_level,
        comparable_count: avmResult.comparable_count || 0,
      }
    : null;

  const market_pressure = pressureData
    ? {
        pressure_level: pressureData.pressure_level,
        active_offers: pressureData.active_offers_count || 0,
        recent_visits: pressureData.recent_visits_count || 0,
        competing_offers: pressureData.competing_offers || false,
      }
    : null;

  const market_dynamics = dynamicsData
    ? {
        velocity: dynamicsData.market_velocity,
        recent_listings: dynamicsData.recent_listings_count || 0,
        days_on_market: daysOnMarket,
      }
    : null;

  // Calculate panel
  const calculation = calculateDecisionPanel({
    offer_amount: offer_amount,
    avm,
    market_pressure,
    market_dynamics,
    profile_applied,
  });

  // Save to database
  const { data: savedPanel, error: saveError } = await supabase
    .from('pricewaze_decision_panels')
    .upsert({
      offer_id,
      price_position: calculation.price_position,
      uncertainty_level: calculation.uncertainty_level,
      wait_risk_level: calculation.wait_risk_level,
      market_velocity: calculation.market_velocity,
      market_pressure: calculation.market_pressure,
      explanation_summary: calculation.explanation_summary,
      option_act: calculation.option_act,
      option_wait: calculation.option_wait,
      profile_applied: profile_applied || null,
      model_version: 'die-1.0',
    })
    .select()
    .single();

  if (saveError) {
    console.error('Error saving decision panel:', saveError);
    // Return calculated panel even if save fails
    return {
      offer_id,
      ...calculation,
      profile_applied: profile_applied || null,
      model_version: 'die-1.0',
      created_at: new Date().toISOString(),
    };
  }

  return savedPanel as DecisionPanel;
}


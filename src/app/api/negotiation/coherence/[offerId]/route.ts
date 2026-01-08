import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags-server';
import type { NegotiationCoherenceResponse } from '@/types/negotiation-coherence';

/**
 * GET /api/negotiation/coherence/[offerId]
 * Get current negotiation coherence state for an offer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check feature flag
    const enabled = await isFeatureEnabled('nce_ui_panel', user.id);
    if (!enabled) {
      return NextResponse.json({ state: null, enabled: false });
    }

    // Verify user has access to this offer
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select('id, buyer_id, seller_id')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get latest snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('pricewaze_negotiation_state_snapshots')
      .select('*')
      .eq('offer_id', offerId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json({ state: null, enabled: true });
    }

    // Get related data
    const [frictionResult, rhythmResult, marketResult, insightResult, alertsResult] = await Promise.all([
      supabase
        .from('pricewaze_negotiation_friction')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .single(),
      supabase
        .from('pricewaze_negotiation_rhythm')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .single(),
      supabase
        .from('pricewaze_negotiation_market_context')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .single(),
      supabase
        .from('pricewaze_negotiation_insights')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .single(),
      supabase
        .from('pricewaze_negotiation_alerts')
        .select('*')
        .eq('offer_id', offerId)
        .eq('delivered', false)
        .order('created_at', { ascending: false }),
    ]);

    const response: NegotiationCoherenceResponse = {
      state: {
        snapshot,
        friction: frictionResult.data || null,
        rhythm: rhythmResult.data || null,
        market_context: marketResult.data || null,
        insight: insightResult.data || null,
        alerts: alertsResult.data || [],
      },
      enabled: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/negotiation/coherence/[offerId]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


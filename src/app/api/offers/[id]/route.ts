import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/offers/[id] - Get offer details with negotiation thread
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
    const { data: offer, error } = await supabase
      .from('pricewaze_offers')
      .select(`
        *,
        property:pricewaze_properties(id, title, address, price, area_m2, price_per_m2, images, latitude, longitude),
        buyer:pricewaze_profiles!buyer_id(id, full_name, email, phone, avatar_url),
        seller:pricewaze_profiles!seller_id(id, full_name, email, phone, avatar_url),
        parent_offer:pricewaze_offers!parent_offer_id(id, amount, status, created_at)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Only buyer or seller can view
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the full negotiation thread (all related offers)
    const { data: thread } = await supabase
      .from('pricewaze_offers')
      .select(`
        id, amount, message, status, created_at, buyer_id, seller_id
      `)
      .eq('property_id', offer.property_id)
      .or(`buyer_id.eq.${offer.buyer_id},seller_id.eq.${offer.seller_id}`)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      ...offer,
      negotiation_thread: thread || [],
    });
  } catch (error) {
    console.error('Offer GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/offers/[id] - Update offer (accept, reject, counter, withdraw)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current offer
    const { data: offer, error: fetchError } = await supabase
      .from('pricewaze_offers')
      .select('*, property:pricewaze_properties(id, title, price, owner_id)')
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Only buyer or seller can update
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, counter_amount, message } = body;

    // Validate action
    const validActions = ['accept', 'reject', 'counter', 'withdraw'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: accept, reject, counter, or withdraw' },
        { status: 400 }
      );
    }

    // Check if offer can be modified
    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot ${action} an offer that is ${offer.status}` },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(offer.expires_at) < new Date()) {
      await supabase
        .from('pricewaze_offers')
        .update({ status: 'expired' })
        .eq('id', id);

      return NextResponse.json(
        { error: 'This offer has expired' },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'accept': {
        // Only seller can accept buyer's offer
        // Or buyer can accept seller's counter-offer
        const isBuyerOffer = offer.buyer_id !== user.id;
        if (!isBuyerOffer && offer.seller_id !== user.id) {
          return NextResponse.json(
            { error: 'You cannot accept your own offer' },
            { status: 403 }
          );
        }

        // Update offer status
        const { data: acceptedOffer, error: updateError } = await supabase
          .from('pricewaze_offers')
          .update({ status: 'accepted' })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update property status to pending
        await supabase
          .from('pricewaze_properties')
          .update({ status: 'pending' })
          .eq('id', offer.property_id);

        // TODO: Create agreement record
        // TODO: Send notifications to both parties

        return NextResponse.json({
          message: 'Offer accepted!',
          offer: acceptedOffer,
        });
      }

      case 'reject': {
        // Either party can reject
        const { data: rejectedOffer, error: updateError } = await supabase
          .from('pricewaze_offers')
          .update({ status: 'rejected' })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({
          message: 'Offer rejected',
          offer: rejectedOffer,
        });
      }

      case 'counter': {
        // Only the recipient of the current offer can counter
        const isRecipient =
          (offer.buyer_id === user.id && offer.parent_offer_id) ||
          (offer.seller_id === user.id && !offer.parent_offer_id);

        if (!isRecipient && offer.seller_id !== user.id) {
          return NextResponse.json(
            { error: 'You cannot counter your own offer' },
            { status: 403 }
          );
        }

        if (!counter_amount || counter_amount <= 0) {
          return NextResponse.json(
            { error: 'Counter offer amount is required' },
            { status: 400 }
          );
        }

        // Mark current offer as countered
        await supabase
          .from('pricewaze_offers')
          .update({ status: 'countered' })
          .eq('id', id);

        // Create new counter offer
        const { data: counterOffer, error: createError } = await supabase
          .from('pricewaze_offers')
          .insert({
            property_id: offer.property_id,
            buyer_id: offer.buyer_id,
            seller_id: offer.seller_id,
            amount: counter_amount,
            message,
            status: 'pending',
            parent_offer_id: id,
          })
          .select(`
            *,
            property:pricewaze_properties(id, title, address, price),
            buyer:pricewaze_profiles!buyer_id(id, full_name, email),
            seller:pricewaze_profiles!seller_id(id, full_name, email)
          `)
          .single();

        if (createError) throw createError;

        return NextResponse.json({
          message: 'Counter offer submitted',
          offer: counterOffer,
        });
      }

      case 'withdraw': {
        // Only the person who made the offer can withdraw
        const canWithdraw =
          (offer.buyer_id === user.id && !offer.parent_offer_id) ||
          (offer.seller_id === user.id && offer.parent_offer_id);

        if (!canWithdraw) {
          return NextResponse.json(
            { error: 'You can only withdraw offers you made' },
            { status: 403 }
          );
        }

        const { data: withdrawnOffer, error: updateError } = await supabase
          .from('pricewaze_offers')
          .update({ status: 'withdrawn' })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({
          message: 'Offer withdrawn',
          offer: withdrawnOffer,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Offer PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

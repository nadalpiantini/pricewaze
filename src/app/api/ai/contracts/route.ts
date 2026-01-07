import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContractDraft } from '@/lib/ai/contracts';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { offer_id } = body;

    if (!offer_id) {
      return NextResponse.json({ error: 'offer_id is required' }, { status: 400 });
    }

    // Fetch the accepted offer with all related data
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select(`
        id,
        amount,
        message,
        status,
        buyer_id,
        seller_id,
        property_id
      `)
      .eq('id', offer_id)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Only generate contracts for accepted offers
    if (offer.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Contract can only be generated for accepted offers' },
        { status: 400 }
      );
    }

    // Verify user is part of this transaction
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch buyer info
    const { data: buyer } = await supabase
      .from('pricewaze_profiles')
      .select('id, full_name, email')
      .eq('id', offer.buyer_id)
      .single();

    // Fetch seller info
    const { data: seller } = await supabase
      .from('pricewaze_profiles')
      .select('id, full_name, email')
      .eq('id', offer.seller_id)
      .single();

    // Fetch property info
    const { data: property } = await supabase
      .from('pricewaze_properties')
      .select('id, title, address, description, area_m2, property_type')
      .eq('id', offer.property_id)
      .single();

    if (!buyer || !seller || !property) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction details' },
        { status: 500 }
      );
    }

    const contract = await generateContractDraft({
      offerId: offer.id,
      buyer: {
        id: buyer.id,
        full_name: buyer.full_name,
        email: buyer.email,
      },
      seller: {
        id: seller.id,
        full_name: seller.full_name,
        email: seller.email,
      },
      property: {
        id: property.id,
        title: property.title,
        address: property.address,
        description: property.description,
        area_m2: property.area_m2,
        property_type: property.property_type,
      },
      agreedPrice: offer.amount,
      offerMessage: offer.message,
    });

    // Store the contract in agreements table
    const { data: agreement, error: agreementError } = await supabase
      .from('pricewaze_agreements')
      .insert({
        offer_id: offer.id,
        property_id: property.id,
        buyer_id: buyer.id,
        seller_id: seller.id,
        agreed_price: offer.amount,
        contract_draft: contract.content,
        status: 'draft',
      })
      .select()
      .single();

    if (agreementError) {
      console.error('Failed to save agreement:', agreementError);
      // Still return the contract even if saving fails
    }

    return NextResponse.json({
      ...contract,
      agreementId: agreement?.id,
    });
  } catch (error) {
    console.error('Contract generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate contract' },
      { status: 500 }
    );
  }
}

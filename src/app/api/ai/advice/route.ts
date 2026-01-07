import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOfferAdvice } from '@/lib/ai/pricing';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const offerId = request.nextUrl.searchParams.get('offer_id');

  if (!offerId) {
    return NextResponse.json({ error: 'offer_id is required' }, { status: 400 });
  }

  // Fetch the offer
  const { data: offer, error: offerError } = await supabase
    .from('pricewaze_offers')
    .select(`
      id,
      amount,
      message,
      status,
      buyer_id,
      seller_id,
      property_id,
      parent_offer_id
    `)
    .eq('id', offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  // User must be the seller to get advice
  if (offer.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch property details
  const { data: property, error: propertyError } = await supabase
    .from('pricewaze_properties')
    .select(`
      id,
      title,
      description,
      price,
      area_m2,
      property_type,
      address,
      created_at
    `)
    .eq('id', offer.property_id)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  // Fetch negotiation history for this property between these parties
  const { data: history } = await supabase
    .from('pricewaze_offers')
    .select('amount, status, created_at')
    .eq('property_id', offer.property_id)
    .eq('buyer_id', offer.buyer_id)
    .order('created_at', { ascending: true });

  try {
    const advice = await getOfferAdvice(
      {
        id: offer.id,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
      },
      {
        id: property.id,
        title: property.title,
        price: property.price,
        area_m2: property.area_m2,
        property_type: property.property_type,
        address: property.address,
        description: property.description,
        created_at: property.created_at,
      },
      history || []
    );

    return NextResponse.json(advice);
  } catch (error) {
    console.error('Offer advice error:', error);
    return NextResponse.json(
      { error: 'Failed to get offer advice' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

// GET /api/offers - List user's offers (as buyer or seller)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'all'; // 'buyer', 'seller', or 'all'
    const status = searchParams.get('status');
    const propertyId = searchParams.get('property_id');

    let query = supabase
      .from('pricewaze_offers')
      .select(`
        *,
        property:pricewaze_properties(id, title, address, price, area_m2, price_per_m2, images),
        buyer:pricewaze_profiles!buyer_id(id, full_name, email, avatar_url),
        seller:pricewaze_profiles!seller_id(id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Filter by role
    if (role === 'buyer') {
      query = query.eq('buyer_id', user.id);
    } else if (role === 'seller') {
      query = query.eq('seller_id', user.id);
    } else {
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by property
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Offers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/offers - Create a new offer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { property_id, amount, message } = body;

    if (!property_id || !amount) {
      return NextResponse.json(
        { error: 'Property ID and offer amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Offer amount must be positive' },
        { status: 400 }
      );
    }

    // Get the property to find the owner and validate
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id, owner_id, title, price, status')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Cannot make offer on own property
    if (property.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot make an offer on your own property' },
        { status: 400 }
      );
    }

    // Property must be active
    if (property.status !== 'active') {
      return NextResponse.json(
        { error: 'Property is not available for offers' },
        { status: 400 }
      );
    }

    // Check for existing pending offer from this buyer
    const { data: existingOffer } = await supabase
      .from('pricewaze_offers')
      .select('id')
      .eq('property_id', property_id)
      .eq('buyer_id', user.id)
      .eq('status', 'pending')
      .is('parent_offer_id', null)
      .single();

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer on this property. Withdraw it first to make a new offer.' },
        { status: 400 }
      );
    }

    // Create the offer
    const { data: offer, error: createError } = await supabase
      .from('pricewaze_offers')
      .insert({
        property_id,
        buyer_id: user.id,
        seller_id: property.owner_id,
        amount,
        message,
        status: 'pending',
      })
      .select(`
        *,
        property:pricewaze_properties(id, title, address, price, area_m2, images),
        buyer:pricewaze_profiles!buyer_id(id, full_name, email),
        seller:pricewaze_profiles!seller_id(id, full_name, email)
      `)
      .single();

    if (createError) {
      console.error('Error creating offer:', createError);
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }

    // Award gamification rewards for first offer
    try {
      const { count: offerCount } = await supabase
        .from('pricewaze_offers')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id);

      if (offerCount === 1) {
        // First offer - award badge
        await supabase.rpc('pricewaze_award_badge', {
          p_user_id: user.id,
          p_badge_code: 'first_offer',
        });
      }

      // Award points for making an offer
      await supabase.rpc('pricewaze_award_points', {
        p_user_id: user.id,
        p_points: 5,
        p_source: 'action',
        p_source_id: offer.id,
        p_description: 'Made a property offer',
      });
    } catch (gamificationError) {
      console.error('Gamification error:', gamificationError);
    }

    // Send notification to property owner
    if (property.owner_id) {
      await createNotification(supabase, {
        user_id: property.owner_id,
        title: 'New Offer Received',
        message: `You received a new offer of $${amount.toLocaleString()} for ${property.title}`,
        type: 'offer_received',
        data: {
          offer_id: offer.id,
          property_id: property_id,
          amount,
        },
      });
    }

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Offers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

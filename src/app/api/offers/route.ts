import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';
import { Errors, ErrorCodes, apiError } from '@/lib/api/errors';

// Zod schema for creating offers - critical for financial data integrity
const createOfferSchema = z.object({
  property_id: z.string().uuid('Invalid property ID format'),
  amount: z.number()
    .positive('Offer amount must be positive')
    .max(1_000_000_000, 'Offer amount exceeds maximum allowed'),
  message: z.string().max(2000, 'Message must be less than 2000 characters').optional(),
});

// GET /api/offers - List user's offers (as buyer or seller)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Errors.unauthorized();
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
      return apiError('Failed to fetch offers', ErrorCodes.SYS_002, 500);
    }

    return NextResponse.json(offers || []);
  } catch (error) {
    console.error('Offers GET error:', error);
    return Errors.serverError();
  }
}

// POST /api/offers - Create a new offer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Errors.unauthorized();
    }

    const body = await request.json();

    // Validate input with Zod - critical for financial transactions
    const parseResult = createOfferSchema.safeParse(body);
    if (!parseResult.success) {
      return Errors.validationFailed(parseResult.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const { property_id, amount, message } = parseResult.data;

    // Get the property to find the owner and validate
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id, owner_id, title, price, status')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return Errors.notFound('Property');
    }

    // Cannot make offer on own property
    if (property.owner_id === user.id) {
      return apiError('Cannot make an offer on your own property', ErrorCodes.OFFER_005, 400);
    }

    // Property must be active
    if (property.status !== 'active') {
      return apiError('Property is not available for offers', ErrorCodes.OFFER_001, 400);
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
      return Errors.conflict('You already have a pending offer on this property. Withdraw it first to make a new offer.');
    }

    // H.1: Set expires_at to 72 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

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
        expires_at: expiresAt.toISOString(),
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
      return apiError('Failed to create offer', ErrorCodes.SYS_002, 500);
    }

    // Create automatic signal for competing offers
    try {
      await supabase.from('pricewaze_property_signals_raw').insert({
        property_id,
        signal_type: 'competing_offers',
        source: 'system',
        // user_id and visit_id are NULL for system signals
      });
    } catch (signalError) {
      // Don't fail the offer creation if signal creation fails
      console.error('Error creating offer signal:', signalError);
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
    return Errors.serverError();
  }
}

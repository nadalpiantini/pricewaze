import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

const MAX_VERIFICATION_DISTANCE_METERS = 100;

// POST /api/visits/[id]/verify - Verify visit with GPS and code
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { verification_code, latitude, longitude } = body;

    // Validate required fields
    if (!verification_code || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Verification code and GPS coordinates are required' },
        { status: 400 }
      );
    }

    // Get the visit with property location
    const { data: visit, error: fetchError } = await supabase
      .from('pricewaze_visits')
      .select(`
        *,
        property:pricewaze_properties(id, latitude, longitude, title, address)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Only the visitor can verify their visit
    if (visit.visitor_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the visitor can verify this visit' },
        { status: 403 }
      );
    }

    // Check if visit is in correct status
    if (visit.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Visit is ${visit.status}, cannot verify` },
        { status: 400 }
      );
    }

    // Check if already verified
    if (visit.verified_at) {
      return NextResponse.json(
        { error: 'Visit has already been verified' },
        { status: 400 }
      );
    }

    // Verify the code
    if (visit.verification_code !== verification_code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Calculate distance from property
    const property = visit.property;
    const distance = calculateDistance(
      latitude,
      longitude,
      property.latitude,
      property.longitude
    );

    if (distance > MAX_VERIFICATION_DISTANCE_METERS) {
      return NextResponse.json(
        {
          error: 'You are too far from the property',
          details: {
            distance: Math.round(distance),
            maxDistance: MAX_VERIFICATION_DISTANCE_METERS,
            message: `You must be within ${MAX_VERIFICATION_DISTANCE_METERS}m of the property. Current distance: ${Math.round(distance)}m`,
          },
        },
        { status: 400 }
      );
    }

    // Update visit as verified and completed
    const { data: updatedVisit, error: updateError } = await supabase
      .from('pricewaze_visits')
      .update({
        status: 'completed',
        verified_at: new Date().toISOString(),
        verification_latitude: latitude,
        verification_longitude: longitude,
      })
      .eq('id', id)
      .select(`
        *,
        property:pricewaze_properties(id, title, address, images),
        visitor:pricewaze_profiles!visitor_id(id, full_name, email),
        owner:pricewaze_profiles!owner_id(id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error verifying visit:', updateError);
      return NextResponse.json({ error: 'Failed to verify visit' }, { status: 500 });
    }

    // Award gamification rewards
    try {
      // Award points for verified visit
      await supabase.rpc('pricewaze_award_points', {
        p_user_id: user.id,
        p_points: 10,
        p_source: 'action',
        p_source_id: id,
        p_description: 'Verified property visit',
      });

      // Update achievement progress
      await supabase.rpc('pricewaze_update_achievement', {
        p_user_id: user.id,
        p_achievement_code: 'verified_explorer',
        p_progress_increment: 1,
      });

      // Award first visit badge if this is the first verified visit
      const { count: visitCount } = await supabase
        .from('pricewaze_visits')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_id', user.id)
        .not('verified_at', 'is', null);

      if (visitCount === 1) {
        await supabase.rpc('pricewaze_award_badge', {
          p_user_id: user.id,
          p_badge_code: 'first_visit',
        });
      }

      // Recalculate trust score
      await supabase.rpc('pricewaze_calculate_trust_score', {
        p_user_id: user.id,
      });
    } catch (gamificationError) {
      // Don't fail the visit verification if gamification fails
      console.error('Gamification error:', gamificationError);
    }

    // Create automatic signal for verified visit (many_visits)
    try {
      await supabase.from('pricewaze_property_signals').insert({
        property_id: property.id,
        signal_type: 'many_visits',
        source: 'system',
        weight: 1,
      });
    } catch (signalError) {
      // Don't fail the visit verification if signal creation fails
      console.error('Error creating visit signal:', signalError);
    }

    // Send notification to property owner that visit was completed
    if (visit.owner_id) {
      await createNotification(supabase, {
        user_id: visit.owner_id,
        title: 'Visit Completed',
        message: `${updatedVisit.visitor?.full_name || 'A visitor'} has completed their visit to ${property.title}`,
        type: 'visit_completed',
        data: {
          visit_id: id,
          property_id: property.id,
          verified_at: updatedVisit.verified_at,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Visit verified successfully',
      visit: updatedVisit,
      verification: {
        distance: Math.round(distance),
        verified_at: updatedVisit.verified_at,
      },
    });
  } catch (error) {
    console.error('Visit verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

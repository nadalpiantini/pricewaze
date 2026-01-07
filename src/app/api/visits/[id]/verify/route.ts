import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // TODO: Send notification to property owner that visit was completed
    // TODO: Award trust/reputation points to visitor

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

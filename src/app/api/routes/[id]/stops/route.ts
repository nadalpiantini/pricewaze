import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/routes/[id]/stops - Add a stop to the route
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: route, error: routeError } = await supabase
      .from('pricewaze_visit_routes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const body = await request.json();
    const { property_id, address, location } = body;

    if (!address || !location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Address and location (lat, lng) are required' },
        { status: 400 }
      );
    }

    // Get current max order_index to append at the end
    const { data: existingStops } = await supabase
      .from('pricewaze_visit_stops')
      .select('order_index')
      .eq('route_id', id)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = existingStops && existingStops.length > 0
      ? existingStops[0].order_index + 1
      : 0;

    // Insert stop
    const { data: stop, error: insertError } = await supabase
      .from('pricewaze_visit_stops')
      .insert({
        route_id: id,
        property_id: property_id || null,
        address: address.trim(),
        location: `POINT(${location.lng} ${location.lat})`,
        order_index: nextOrderIndex,
      })
      .select(`
        *,
        property:pricewaze_properties(
          id, title, address, images, price, area_m2, latitude, longitude
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating stop:', insertError);
      return NextResponse.json({ error: 'Failed to create stop' }, { status: 500 });
    }

    // Transform location
    const locationData = stop.location as { coordinates: [number, number] };
    return NextResponse.json({
      ...stop,
      location: {
        lat: locationData.coordinates[1],
        lng: locationData.coordinates[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Stop POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


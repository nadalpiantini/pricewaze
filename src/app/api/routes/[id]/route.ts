import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/routes/[id] - Get route with stops
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get route
    const { data: route, error: routeError } = await supabase
      .from('pricewaze_visit_routes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Get stops with property info
    const { data: stops, error: stopsError } = await supabase
      .from('pricewaze_visit_stops')
      .select(`
        *,
        property:pricewaze_properties(
          id, title, address, images, price, area_m2, latitude, longitude
        )
      `)
      .eq('route_id', id)
      .order('order_index', { ascending: true });

    if (stopsError) {
      console.error('Error fetching stops:', stopsError);
      return NextResponse.json({ error: 'Failed to fetch stops' }, { status: 500 });
    }

    // Transform location from PostGIS to { lat, lng }
    const transformedStops = stops?.map((stop) => {
      const location = stop.location as { coordinates: [number, number] };
      return {
        ...stop,
        location: {
          lat: location.coordinates[1],
          lng: location.coordinates[0],
        },
      };
    }) || [];

    return NextResponse.json({
      ...route,
      stops: transformedStops,
    });
  } catch (error) {
    console.error('Route GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/routes/[id] - Update route
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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
    const { name, start_location } = body;

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Route name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (start_location !== undefined) {
      if (start_location === null) {
        updates.start_location = null;
      } else if (start_location.lat && start_location.lng) {
        updates.start_location = `POINT(${start_location.lng} ${start_location.lat})`;
      }
    }

    const { data: updatedRoute, error: updateError } = await supabase
      .from('pricewaze_visit_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating route:', updateError);
      return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
    }

    return NextResponse.json(updatedRoute);
  } catch (error) {
    console.error('Route PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/routes/[id] - Delete route (cascades to stops)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { error: deleteError } = await supabase
      .from('pricewaze_visit_routes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting route:', deleteError);
      return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Route DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


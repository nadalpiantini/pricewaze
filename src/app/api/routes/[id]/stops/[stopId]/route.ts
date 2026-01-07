import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string; stopId: string }>;
};

/**
 * PUT /api/routes/[id]/stops/[stopId] - Update stop (e.g., reorder)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id, stopId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify route ownership
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
    const { order_index } = body;

    const updates: Record<string, unknown> = {};

    if (order_index !== undefined) {
      if (typeof order_index !== 'number' || order_index < 0) {
        return NextResponse.json(
          { error: 'order_index must be a non-negative number' },
          { status: 400 }
        );
      }
      updates.order_index = order_index;
    }

    const { data: stop, error: updateError } = await supabase
      .from('pricewaze_visit_stops')
      .update(updates)
      .eq('id', stopId)
      .eq('route_id', id)
      .select(`
        *,
        property:pricewaze_properties(
          id, title, address, images, price, area_m2, latitude, longitude
        )
      `)
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
      }
      console.error('Error updating stop:', updateError);
      return NextResponse.json({ error: 'Failed to update stop' }, { status: 500 });
    }

    // Transform location
    const locationData = stop.location as { coordinates: [number, number] };
    return NextResponse.json({
      ...stop,
      location: {
        lat: locationData.coordinates[1],
        lng: locationData.coordinates[0],
      },
    });
  } catch (error) {
    console.error('Stop PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/routes/[id]/stops/[stopId] - Remove stop from route
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id, stopId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify route ownership
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
      .from('pricewaze_visit_stops')
      .delete()
      .eq('id', stopId)
      .eq('route_id', id);

    if (deleteError) {
      console.error('Error deleting stop:', deleteError);
      return NextResponse.json({ error: 'Failed to delete stop' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stop DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


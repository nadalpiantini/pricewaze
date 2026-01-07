import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { optimizeRoute } from '@/lib/optimizeRoute';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/routes/[id]/optimize - Optimize route order using OSRM
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

    // Get all stops
    const { data: stops, error: stopsError } = await supabase
      .from('pricewaze_visit_stops')
      .select('id, location')
      .eq('route_id', id);

    if (stopsError) {
      console.error('Error fetching stops:', stopsError);
      return NextResponse.json({ error: 'Failed to fetch stops' }, { status: 500 });
    }

    if (!stops || stops.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 stops are required for optimization' },
        { status: 400 }
      );
    }

    // Transform PostGIS location to { lat, lng }
    const points = stops.map((stop) => {
      const location = stop.location as { coordinates: [number, number] };
      return {
        lat: location.coordinates[1],
        lng: location.coordinates[0],
      };
    });

    // Optimize route
    const { geometry, order } = await optimizeRoute(points);

    // Update stop order_index based on optimized order
    for (let i = 0; i < order.length; i++) {
      const stopId = stops[order[i]].id;
      const { error: updateError } = await supabase
        .from('pricewaze_visit_stops')
        .update({ order_index: i })
        .eq('id', stopId);

      if (updateError) {
        console.error(`Error updating stop ${stopId}:`, updateError);
        // Continue with other stops even if one fails
      }
    }

    return NextResponse.json({
      geometry,
      order,
    });
  } catch (error) {
    console.error('Route optimize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize route' },
      { status: 500 }
    );
  }
}


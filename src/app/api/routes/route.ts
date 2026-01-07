import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/routes - List all routes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: routes, error } = await supabase
      .from('pricewaze_visit_routes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routes:', error);
      return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
    }

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Routes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/routes - Create a new route
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, start_location } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Route name is required' },
        { status: 400 }
      );
    }

    // Build insert object
    const insertData: {
      user_id: string;
      name: string;
      start_location?: string;
    } = {
      user_id: user.id,
      name: name.trim(),
    };

    // Add start location if provided (format: POINT(lng lat))
    if (start_location && start_location.lat && start_location.lng) {
      insertData.start_location = `POINT(${start_location.lng} ${start_location.lat})`;
    }

    const { data: route, error } = await supabase
      .from('pricewaze_visit_routes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating route:', error);
      return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
    }

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error('Routes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


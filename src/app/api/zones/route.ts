import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/zones - List all zones (neighborhoods)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('pricewaze_zones')
      .select('id, name, city, avg_price_m2, total_listings, created_at, updated_at')
      .order('name', { ascending: true })
      .limit(limit);

    if (city) {
      query = query.eq('city', city);
    }

    const { data: zones, error } = await query;

    if (error) {
      console.error('Error fetching zones:', error);
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
    }

    return NextResponse.json(zones || []);
  } catch (error) {
    console.error('Zones GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


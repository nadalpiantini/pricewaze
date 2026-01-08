import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * List user's notifications
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Pagination parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('pricewaze_notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Handle gracefully if table doesn't exist or other errors
  if (error) {
    // PGRST116 = not found, 42P01 = undefined_table
    if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
      });
    }
    console.error('Notifications fetch error:', error);
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
    });
  }

  return NextResponse.json({
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: (count || 0) > offset + limit,
    },
  });
}


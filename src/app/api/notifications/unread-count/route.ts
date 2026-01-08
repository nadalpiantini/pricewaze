import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('pricewaze_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      // Table might not exist or RLS issue - return 0 as fallback
      console.error('Error fetching unread count:', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    // Graceful fallback
    return NextResponse.json({ count: 0 });
  }
}


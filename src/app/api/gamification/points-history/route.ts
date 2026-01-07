import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Only allow users to see their own points history
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: pointsHistory, error } = await supabase
      .from('pricewaze_points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(pointsHistory || []);
  } catch (error) {
    console.error('Points history fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points history' },
      { status: 500 }
    );
  }
}


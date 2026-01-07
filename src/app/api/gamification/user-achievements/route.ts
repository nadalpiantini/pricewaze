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

    // Only allow users to see their own achievements
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: userAchievements, error } = await supabase
      .from('pricewaze_user_achievements')
      .select(`
        *,
        achievement:pricewaze_achievements(*)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(userAchievements || []);
  } catch (error) {
    console.error('User achievements fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user achievements' },
      { status: 500 }
    );
  }
}


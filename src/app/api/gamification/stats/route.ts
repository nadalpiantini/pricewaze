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

    // Only allow users to see their own stats (or admin)
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user profile with points and trust score
    const { data: profile, error: profileError } = await supabase
      .from('pricewaze_profiles')
      .select('total_points, trust_score, level')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get badges count
    const { count: badgesCount } = await supabase
      .from('pricewaze_user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get achievements count
    const { count: achievementsCount } = await supabase
      .from('pricewaze_user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get completed achievements count
    const { count: completedAchievementsCount } = await supabase
      .from('pricewaze_user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    // Get recent badges (last 5)
    const { data: recentBadges } = await supabase
      .from('pricewaze_user_badges')
      .select(`
        *,
        badge:pricewaze_badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(5);

    // Get recent achievements (last 5)
    const { data: recentAchievements } = await supabase
      .from('pricewaze_user_achievements')
      .select(`
        *,
        achievement:pricewaze_achievements(*)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      total_points: profile.total_points || 0,
      trust_score: profile.trust_score || 0,
      level: profile.level || 1,
      badges_count: badgesCount || 0,
      achievements_count: achievementsCount || 0,
      completed_achievements_count: completedAchievementsCount || 0,
      recent_badges: Array.isArray(recentBadges) ? recentBadges : [],
      recent_achievements: Array.isArray(recentAchievements) ? recentAchievements : [],
    });
  } catch (error) {
    console.error('Gamification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gamification stats' },
      { status: 500 }
    );
  }
}


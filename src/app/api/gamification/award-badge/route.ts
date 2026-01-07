import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const awardBadgeSchema = z.object({
  badge_code: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { badge_code } = awardBadgeSchema.parse(body);

    // Call database function to award badge
    const { data, error } = await supabase.rpc('pricewaze_award_badge', {
      p_user_id: user.id,
      p_badge_code: badge_code,
    });

    if (error) {
      console.error('Award badge error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to award badge' },
        { status: 400 }
      );
    }

    // Fetch the awarded badge
    const { data: userBadge } = await supabase
      .from('pricewaze_user_badges')
      .select(`
        *,
        badge:pricewaze_badges(*)
      `)
      .eq('user_id', user.id)
      .eq('badge_id', data)
      .single();

    return NextResponse.json(userBadge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Award badge error:', error);
    return NextResponse.json(
      { error: 'Failed to award badge' },
      { status: 500 }
    );
  }
}


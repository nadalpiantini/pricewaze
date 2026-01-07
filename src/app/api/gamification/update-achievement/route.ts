import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateAchievementSchema = z.object({
  achievement_code: z.string(),
  progress_increment: z.number().int().positive().optional().default(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { achievement_code, progress_increment } = updateAchievementSchema.parse(body);

    // Call database function to update achievement
    const { data: completed, error } = await supabase.rpc('pricewaze_update_achievement', {
      p_user_id: user.id,
      p_achievement_code: achievement_code,
      p_progress_increment: progress_increment,
    });

    if (error) {
      console.error('Update achievement error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update achievement' },
        { status: 400 }
      );
    }

    return NextResponse.json({ completed: completed || false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update achievement error:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement' },
      { status: 500 }
    );
  }
}


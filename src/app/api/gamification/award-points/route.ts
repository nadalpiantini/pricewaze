import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const awardPointsSchema = z.object({
  points: z.number().int().positive(),
  source: z.enum(['badge', 'achievement', 'action', 'bonus']),
  source_id: z.string().uuid().optional(),
  description: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { points, source, source_id, description } = awardPointsSchema.parse(body);

    // Call database function to award points
    const { error } = await supabase.rpc('pricewaze_award_points', {
      p_user_id: user.id,
      p_points: points,
      p_source: source,
      p_source_id: source_id || null,
      p_description: description,
    });

    if (error) {
      console.error('Award points error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to award points' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Award points error:', error);
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    );
  }
}


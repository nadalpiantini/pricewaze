import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;

    // Only allow users to calculate their own trust score
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call database function to calculate trust score
    const { data: trustScore, error } = await supabase.rpc('pricewaze_calculate_trust_score', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Calculate trust score error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to calculate trust score' },
        { status: 400 }
      );
    }

    // Update user profile with new trust score
    const { error: updateError } = await supabase
      .from('pricewaze_profiles')
      .update({ trust_score: trustScore })
      .eq('id', userId);

    if (updateError) {
      console.error('Update trust score error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update trust score' },
        { status: 500 }
      );
    }

    return NextResponse.json({ trust_score: trustScore });
  } catch (error) {
    console.error('Calculate trust score error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trust score' },
      { status: 500 }
    );
  }
}


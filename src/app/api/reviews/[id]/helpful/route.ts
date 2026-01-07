import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/reviews/[id]/helpful - Mark review as helpful
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('pricewaze_reviews')
      .select('id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('pricewaze_review_helpful')
      .select('id')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 });
    }

    // Add vote
    const { error } = await supabase
      .from('pricewaze_review_helpful')
      .insert({
        review_id: id,
        user_id: user.id,
      });

    if (error) {
      logger.error('Failed to mark review as helpful', error);
      return NextResponse.json(
        { error: 'Failed to mark review as helpful' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in POST /api/reviews/[id]/helpful', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


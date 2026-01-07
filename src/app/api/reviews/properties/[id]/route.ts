import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// GET /api/reviews/properties/[id] - Get reviews for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent';
    const userId = searchParams.get('user_id');

    // Build query
    let query = supabase
      .from('pricewaze_reviews')
      .select(`
        *,
        user:pricewaze_profiles!pricewaze_reviews_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('property_id', id)
      .order('created_at', { ascending: false });

    // Filter by user if requested
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      logger.error('Failed to fetch reviews', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Sort reviews
    let sortedReviews = reviews || [];
    if (sort === 'helpful') {
      sortedReviews = sortedReviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
    } else if (sort === 'highest') {
      sortedReviews = sortedReviews.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      sortedReviews = sortedReviews.sort((a, b) => a.rating - b.rating);
    }

    // Calculate average rating
    const averageRating =
      sortedReviews.length > 0
        ? sortedReviews.reduce((sum, r) => sum + r.rating, 0) / sortedReviews.length
        : 0;

    return NextResponse.json({
      reviews: sortedReviews,
      averageRating,
      totalReviews: sortedReviews.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/reviews/properties/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


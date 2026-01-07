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
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 per page
    const offset = (page - 1) * limit;

    // Build query with appropriate ordering based on sort
    let query = supabase
      .from('pricewaze_reviews')
      .select(`
        *,
        user:pricewaze_profiles!pricewaze_reviews_user_id_fkey(id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('property_id', id);

    // Apply ordering based on sort parameter
    if (sort === 'helpful') {
      query = query.order('helpful_count', { ascending: false, nullsFirst: false });
    } else if (sort === 'highest') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'lowest') {
      query = query.order('rating', { ascending: true });
    } else {
      // Default: recent
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Filter by user if requested
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch reviews', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Get total reviews for average calculation (separate query for all reviews)
    const { data: allReviews } = await supabase
      .from('pricewaze_reviews')
      .select('rating')
      .eq('property_id', id);

    // Calculate average rating from all reviews
    const averageRating =
      allReviews && allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    return NextResponse.json({
      reviews: reviews || [],
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    logger.error('Error in GET /api/reviews/properties/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


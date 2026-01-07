import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createReviewSchema = z.object({
  property_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(3).max(100).optional().nullable(),
  comment: z.string().min(10).max(1000),
  visit_id: z.string().uuid().optional().nullable(),
});

// POST /api/reviews/properties - Create property review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createReviewSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id, rating, title, comment, visit_id } = result.data;

    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if user already reviewed this property
    const { data: existingReview } = await supabase
      .from('pricewaze_reviews')
      .select('id')
      .eq('property_id', property_id)
      .eq('user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this property' },
        { status: 409 }
      );
    }

    // Check if visit is verified (if visit_id provided)
    let verified_visit = false;
    if (visit_id) {
      const { data: visit } = await supabase
        .from('pricewaze_visits')
        .select('verified_at, visitor_id')
        .eq('id', visit_id)
        .eq('visitor_id', user.id)
        .single();

      verified_visit = !!visit?.verified_at;
    }

    // Create review
    const { data, error } = await supabase
      .from('pricewaze_reviews')
      .insert({
        property_id,
        user_id: user.id,
        rating,
        title: title || null,
        comment,
        visit_id: visit_id || null,
        verified_visit,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create review', error);
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/reviews/properties', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


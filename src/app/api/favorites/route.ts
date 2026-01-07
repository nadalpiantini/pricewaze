import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createFavoriteSchema = z.object({
  property_id: z.string().uuid(),
});

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: favorites, error } = await supabase
      .from('pricewaze_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch favorites', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json(favorites || []);
  } catch (error) {
    logger.error('Error in GET /api/favorites', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add property to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createFavoriteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id } = result.data;

    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Insert favorite (UNIQUE constraint will prevent duplicates)
    const { data, error } = await supabase
      .from('pricewaze_favorites')
      .insert({
        user_id: user.id,
        property_id,
      })
      .select()
      .single();

    if (error) {
      // If already exists, return success
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('pricewaze_favorites')
          .select()
          .eq('user_id', user.id)
          .eq('property_id', property_id)
          .single();

        return NextResponse.json(existing, { status: 200 });
      }

      logger.error('Failed to add favorite', error);
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/favorites', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


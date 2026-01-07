import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createComparisonSchema = z.object({
  property_ids: z.array(z.string().uuid()).min(1).max(3),
  name: z.string().optional(),
});

// GET /api/comparisons - List user's comparisons
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pricewaze_comparisons')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch comparisons', error);
      return NextResponse.json(
        { error: 'Failed to fetch comparisons' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error in GET /api/comparisons', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/comparisons - Create new comparison
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createComparisonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_ids, name } = result.data;

    // Verify all properties exist
    const { data: properties, error: propertiesError } = await supabase
      .from('pricewaze_properties')
      .select('id')
      .in('id', property_ids);

    if (propertiesError || !properties || properties.length !== property_ids.length) {
      return NextResponse.json(
        { error: 'One or more properties not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('pricewaze_comparisons')
      .insert({
        user_id: user.id,
        property_ids,
        name: name || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create comparison', error);
      return NextResponse.json(
        { error: 'Failed to create comparison' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/comparisons', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



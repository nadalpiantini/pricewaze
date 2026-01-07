import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateComparisonSchema = z.object({
  property_ids: z.array(z.string().uuid()).min(1).max(3).optional(),
  name: z.string().optional(),
});

// GET /api/comparisons/[id] - Get specific comparison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from('pricewaze_comparisons')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Comparison not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in GET /api/comparisons/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/comparisons/[id] - Update comparison
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateComparisonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_ids, name } = result.data;

    // If updating property_ids, verify they exist
    if (property_ids) {
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
    }

    const updateData: Record<string, unknown> = {};
    if (property_ids) updateData.property_ids = property_ids;
    if (name !== undefined) updateData.name = name || null;

    const { data, error } = await supabase
      .from('pricewaze_comparisons')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update comparison', error);
      return NextResponse.json(
        { error: 'Comparison not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in PUT /api/comparisons/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/comparisons/[id] - Delete comparison
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('pricewaze_comparisons')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Failed to delete comparison', error);
      return NextResponse.json(
        { error: 'Failed to delete comparison' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/comparisons/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



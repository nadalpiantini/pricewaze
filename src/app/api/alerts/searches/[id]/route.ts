import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateSearchSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().optional(),
  notification_frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
});

// PATCH /api/alerts/searches/[id] - Update saved search
export async function PATCH(
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

    const body = await request.json();
    const result = updateSearchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: search } = await supabase
      .from('pricewaze_saved_searches')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!search || search.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('pricewaze_saved_searches')
      .update(result.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update saved search', error);
      return NextResponse.json(
        { error: 'Failed to update saved search' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in PATCH /api/alerts/searches/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts/searches/[id] - Delete saved search
export async function DELETE(
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

    // Verify ownership
    const { data: search } = await supabase
      .from('pricewaze_saved_searches')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!search || search.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('pricewaze_saved_searches')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete saved search', error);
      return NextResponse.json(
        { error: 'Failed to delete saved search' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/alerts/searches/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


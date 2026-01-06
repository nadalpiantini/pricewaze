import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/visits/[id] - Get visit details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: visit, error } = await supabase
      .from('pricewaze_visits')
      .select(`
        *,
        property:pricewaze_properties(
          id, title, address, latitude, longitude, images, price, area_m2,
          owner:pricewaze_profiles!owner_id(id, full_name, email, phone, avatar_url)
        ),
        visitor:pricewaze_profiles!visitor_id(id, full_name, email, phone, avatar_url),
        owner:pricewaze_profiles!owner_id(id, full_name, email, phone, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Only visitor or owner can view
    if (visit.visitor_id !== user.id && visit.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hide verification code from visitor (only owner should see it)
    if (visit.visitor_id === user.id && visit.status === 'scheduled') {
      delete visit.verification_code;
    }

    return NextResponse.json(visit);
  } catch (error) {
    console.error('Visit GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/visits/[id] - Update visit (cancel, reschedule, complete)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current visit
    const { data: visit, error: fetchError } = await supabase
      .from('pricewaze_visits')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Only visitor or owner can update
    if (visit.visitor_id !== user.id && visit.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, scheduled_at, notes } = body;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      scheduled: ['cancelled', 'no_show', 'completed'],
      cancelled: [],
      completed: [],
      no_show: [],
    };

    if (status && !validTransitions[visit.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot change status from ${visit.status} to ${status}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;

      // Mark as no_show can only be done by owner after scheduled time
      if (status === 'no_show') {
        if (visit.owner_id !== user.id) {
          return NextResponse.json(
            { error: 'Only property owner can mark visit as no-show' },
            { status: 403 }
          );
        }
        if (new Date(visit.scheduled_at) > new Date()) {
          return NextResponse.json(
            { error: 'Cannot mark as no-show before scheduled time' },
            { status: 400 }
          );
        }
      }
    }

    if (scheduled_at && visit.status === 'scheduled') {
      updates.scheduled_at = new Date(scheduled_at).toISOString();
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data: updatedVisit, error: updateError } = await supabase
      .from('pricewaze_visits')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:pricewaze_properties(id, title, address, images),
        visitor:pricewaze_profiles!visitor_id(id, full_name, email),
        owner:pricewaze_profiles!owner_id(id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error updating visit:', updateError);
      return NextResponse.json({ error: 'Failed to update visit' }, { status: 500 });
    }

    return NextResponse.json(updatedVisit);
  } catch (error) {
    console.error('Visit PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/visits/[id] - Cancel/delete visit (soft delete via status change)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current visit
    const { data: visit, error: fetchError } = await supabase
      .from('pricewaze_visits')
      .select('visitor_id, owner_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Only visitor or owner can cancel
    if (visit.visitor_id !== user.id && visit.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can only cancel scheduled visits
    if (visit.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Can only cancel scheduled visits' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('pricewaze_visits')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      console.error('Error cancelling visit:', updateError);
      return NextResponse.json({ error: 'Failed to cancel visit' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Visit DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

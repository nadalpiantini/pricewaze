import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const recalculateSchema = z.object({
  property_id: z.string().uuid(),
});

// POST /api/signals/recalculate - Manually recalculate signal state for a property
// Note: This is usually done automatically by triggers, but useful for manual fixes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = recalculateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id } = result.data;

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Use admin client to call the function (SECURITY DEFINER)
    if (!supabaseAdmin) {
      logger.error('Supabase admin client not available');
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { error: functionError } = await supabaseAdmin.rpc(
      'pricewaze_recalculate_signal_state',
      { p_property_id: property_id }
    );

    if (functionError) {
      logger.error('Failed to recalculate signal state', functionError);
      return NextResponse.json(
        { error: 'Failed to recalculate signal state', details: functionError.message },
        { status: 500 }
      );
    }

    // Fetch updated state
    const { data: state, error: stateError } = await supabase
      .from('pricewaze_property_signal_state')
      .select('signals, updated_at')
      .eq('property_id', property_id)
      .single();

    if (stateError) {
      logger.error('Failed to fetch updated signal state', stateError);
      // Still return success since recalculation worked
    }

    return NextResponse.json({
      success: true,
      property_id,
      signals: state?.signals || {},
      updated_at: state?.updated_at,
      message: 'Signal state recalculated successfully',
    });
  } catch (error) {
    logger.error('Error in POST /api/signals/recalculate', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


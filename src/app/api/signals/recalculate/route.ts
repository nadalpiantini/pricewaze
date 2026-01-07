import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const recalculateSchema = z.object({
  property_id: z.string().uuid().optional(), // Optional: if not provided, recalculate all
});

// POST /api/signals/recalculate - Recalculate signal state with temporal decay
// If property_id is provided, recalculates that property only
// If not provided, recalculates all properties (for cron jobs)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // For single property recalculation, require auth
    // For bulk recalculation (cron), allow service role only
    const body = await request.json().catch(() => ({}));
    const result = recalculateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id } = result.data;

    // Use admin client to call the function (SECURITY DEFINER)
    if (!supabaseAdmin) {
      logger.error('Supabase admin client not available');
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // If property_id provided, recalculate single property
    if (property_id) {
      // Require authentication for single property recalculation
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Verify property exists
      const { data: property, error: propertyError } = await supabase
        .from('pricewaze_properties')
        .select('id')
        .eq('id', property_id)
        .single();

      if (propertyError || !property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      // Recalculate signal state (applies temporal decay and confirmation)
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

      // Fetch updated state (all signal types for this property)
      const { data: states, error: stateError } = await supabase
        .from('pricewaze_property_signal_state')
        .select('signal_type, strength, confirmed, last_seen_at, updated_at')
        .eq('property_id', property_id);

      if (stateError) {
        logger.error('Failed to fetch updated signal state', stateError);
        // Still return success since recalculation worked
      }

      return NextResponse.json({
        success: true,
        property_id,
        signals: states || [],
        message: 'Signal state recalculated successfully with temporal decay',
      });
    } else {
      // Bulk recalculation (for cron jobs) - requires service role
      // Check if request has service role key (from cron or internal call)
      const authHeader = request.headers.get('authorization');
      const isServiceRole = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

      if (!isServiceRole && !user) {
        return NextResponse.json(
          { error: 'Service role required for bulk recalculation' },
          { status: 403 }
        );
      }

      // Recalculate all properties
      const { data: result, error: functionError } = await supabaseAdmin.rpc(
        'pricewaze_recalculate_all_signals'
      );

      if (functionError) {
        logger.error('Failed to recalculate all signals', functionError);
        return NextResponse.json(
          { error: 'Failed to recalculate all signals', details: functionError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        ...result,
        message: 'All signal states recalculated successfully',
      });
    }
  } catch (error) {
    logger.error('Error in POST /api/signals/recalculate', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


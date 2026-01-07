import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const reportSignalSchema = z.object({
  property_id: z.string().uuid(),
  visit_id: z.string().uuid(),
  signal_type: z.enum(['noise', 'humidity', 'misleading_photos', 'price_issue']),
});

// POST /api/signals/report - Report a signal after verified visit
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = reportSignalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id, visit_id, signal_type } = result.data;

    // Verify that the visit exists, is verified, and belongs to the user
    const { data: visit, error: visitError } = await supabase
      .from('pricewaze_visits')
      .select('id, verified_at, visitor_id, status, property_id')
      .eq('id', visit_id)
      .single();

    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (visit.visitor_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only report signals for your own visits' },
        { status: 403 }
      );
    }

    if (!visit.verified_at) {
      return NextResponse.json(
        { error: 'Visit must be verified before reporting signals' },
        { status: 400 }
      );
    }

    if (visit.status !== 'completed') {
      return NextResponse.json(
        { error: 'Visit must be completed before reporting signals' },
        { status: 400 }
      );
    }

    if (visit.property_id !== property_id) {
      return NextResponse.json(
        { error: 'Visit does not match the specified property' },
        { status: 400 }
      );
    }

    // Check if user already reported this signal type for this visit
    const { data: existingReport } = await supabase
      .from('pricewaze_signal_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('visit_id', visit_id)
      .eq('signal_type', signal_type)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this signal for this visit' },
        { status: 409 }
      );
    }

    // Insert signal report (this will trigger RLS policy check)
    const { data: report, error: reportError } = await supabase
      .from('pricewaze_signal_reports')
      .insert({
        property_id,
        user_id: user.id,
        visit_id,
        signal_type,
      })
      .select()
      .single();

    if (reportError) {
      logger.error('Failed to create signal report', reportError);
      return NextResponse.json(
        { error: 'Failed to create signal report', details: reportError.message },
        { status: 500 }
      );
    }

    // Insert corresponding signal (user-generated)
    // The trigger will automatically recalculate the aggregated state
    const { error: signalError } = await supabase
      .from('pricewaze_property_signals')
      .insert({
        property_id,
        signal_type,
        source: 'user',
        weight: 1,
      });

    if (signalError) {
      logger.error('Failed to create property signal', signalError);
      // Don't fail the request, but log the error
      // The report was created successfully
    }

    return NextResponse.json({
      success: true,
      report,
      message: 'Signal reported successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/signals/report', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


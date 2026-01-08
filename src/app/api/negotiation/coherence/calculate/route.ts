import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags-server';
import { calculateNCEState } from '@/lib/negotiation-coherence/calculate';
import type { NegotiationEvent, VisitActivity, CompetingOffers, SignalPressure, VelocityState } from '@/types/negotiation-coherence';

interface MarketContext {
  visit_activity: VisitActivity;
  competing_offers: CompetingOffers;
  signal_pressure: SignalPressure;
  velocity_state: VelocityState;
}

/**
 * Calculate market velocity state from signal trends
 */
async function calculateVelocityState(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  propertyId: string
): Promise<VelocityState> {
  try {
    // Get signal history for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: signalHistory } = await supabase
      .from('pricewaze_property_signals_raw')
      .select('signal_type, created_at')
      .eq('property_id', propertyId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (!signalHistory || signalHistory.length < 3) {
      return 'stable';
    }

    // Split signals into two halves to detect trend
    const mid = Math.floor(signalHistory.length / 2);
    const firstHalf = signalHistory.slice(0, mid);
    const secondHalf = signalHistory.slice(mid);

    // Count high-activity signals in each half
    const highActivityTypes = ['high_activity', 'many_visits', 'competing_offers', 'price_reduction'];

    const firstHalfActivity = firstHalf.filter(s => highActivityTypes.includes(s.signal_type)).length;
    const secondHalfActivity = secondHalf.filter(s => highActivityTypes.includes(s.signal_type)).length;

    // Determine velocity based on activity trend
    const activityRatio = secondHalfActivity / Math.max(1, firstHalfActivity);

    if (activityRatio > 1.5) {
      return 'accelerating';
    } else if (activityRatio < 0.5) {
      return 'decelerating';
    }

    return 'stable';
  } catch (error) {
    console.warn('Error calculating velocity state:', error);
    return 'stable';
  }
}

/**
 * POST /api/negotiation/coherence/calculate
 * Worker endpoint to calculate NCE state for pending jobs
 * Called by cron or manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check feature flag
    const { data: { user } } = await supabase.auth.getUser();
    const enabled = user
      ? await isFeatureEnabled('nce_core', user.id)
      : false;

    // Allow service role to bypass (for cron)
    const isServiceRole = (await supabase.auth.getSession()).data.session?.user?.app_metadata?.role === 'service_role';

    if (!enabled && !isServiceRole) {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const jobId = body.job_id as string | undefined;
    const limit = body.limit || 10; // Process up to 10 jobs at a time

    // Get pending jobs
    let query = supabase
      .from('pricewaze_nce_jobs')
      .select('id, offer_id, event_id, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (jobId) {
      query = query.eq('id', jobId);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError || !jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending jobs' });
    }

    let processed = 0;
    let errors = 0;

    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase
          .from('pricewaze_nce_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        // Get event
        const { data: event, error: eventError } = await supabase
          .from('pricewaze_negotiation_events')
          .select('*')
          .eq('id', job.event_id)
          .single();

        if (eventError || !event) {
          throw new Error('Event not found');
        }

        // Get all previous events for this offer
        const { data: previousEvents, error: prevEventsError } = await supabase
          .from('pricewaze_negotiation_events')
          .select('*')
          .eq('offer_id', job.offer_id)
          .lt('created_at', event.created_at)
          .order('created_at', { ascending: true });

        if (prevEventsError) {
          throw prevEventsError;
        }

        // Get previous snapshot
        const { data: previousSnapshot } = await supabase
          .from('pricewaze_negotiation_state_snapshots')
          .select('alignment_state, rhythm_state, friction_level, market_pressure')
          .eq('offer_id', job.offer_id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();

        // Get market context (from property signals)
        const { data: offer } = await supabase
          .from('pricewaze_offers')
          .select('property_id')
          .eq('id', job.offer_id)
          .single();

        if (!offer) {
          throw new Error('Offer not found');
        }

        // Get property signals for market context
        const { data: signalStates } = await supabase
          .from('pricewaze_property_signal_state')
          .select('signal_type, strength')
          .eq('property_id', offer.property_id)
          .gt('strength', 0);

        // Get competing offers count
        const { count: competingCount } = await supabase
          .from('pricewaze_offers')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', offer.property_id)
          .eq('status', 'pending')
          .neq('id', job.offer_id);

        // Get visit activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: visitCount } = await supabase
          .from('pricewaze_visits')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', offer.property_id)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Build market context
        const visit_activity: MarketContext['visit_activity'] =
          visitCount && visitCount > 5 ? 'high' : visitCount && visitCount > 2 ? 'medium' : 'low';

        const competing_offers: MarketContext['competing_offers'] =
          competingCount && competingCount > 2 ? 'many' : competingCount && competingCount > 0 ? 'some' : 'none';

        const signal_pressure: MarketContext['signal_pressure'] =
          signalStates && signalStates.length > 3 ? 'high' : signalStates && signalStates.length > 1 ? 'medium' : 'low';

        // Calculate velocity state from signal trends
        const velocity_state: MarketContext['velocity_state'] = await calculateVelocityState(
          supabase,
          offer.property_id
        );

        const marketContext: MarketContext = {
          visit_activity,
          competing_offers,
          signal_pressure,
          velocity_state,
        };

        // Calculate NCE state
        const result = calculateNCEState({
          currentEvent: event as NegotiationEvent,
          previousEvents: (previousEvents || []) as NegotiationEvent[],
          marketContext,
          previousSnapshot: previousSnapshot || null,
        });

        // Create snapshot
        const { data: snapshot, error: snapshotError } = await supabase
          .from('pricewaze_negotiation_state_snapshots')
          .insert({
            offer_id: job.offer_id,
            event_id: job.event_id,
            alignment_state: result.alignment_state,
            rhythm_state: result.rhythm_state,
            friction_level: result.friction_level,
            market_pressure: result.market_pressure,
            coherence_score: result.coherence_score,
          })
          .select()
          .single();

        if (snapshotError || !snapshot) {
          throw snapshotError || new Error('Failed to create snapshot');
        }

        // Insert friction
        await supabase.from('pricewaze_negotiation_friction').insert({
          snapshot_id: snapshot.id,
          price_friction: result.friction.price_friction,
          timeline_friction: result.friction.timeline_friction,
          terms_friction: result.friction.terms_friction,
          dominant_friction: result.friction.dominant_friction,
        });

        // Insert rhythm
        await supabase.from('pricewaze_negotiation_rhythm').insert({
          snapshot_id: snapshot.id,
          avg_response_time_hours: result.rhythm.avg_response_time_hours,
          response_trend: result.rhythm.response_trend,
          concession_pattern: result.rhythm.concession_pattern,
        });

        // Insert market context
        await supabase.from('pricewaze_negotiation_market_context').insert({
          snapshot_id: snapshot.id,
          visit_activity: marketContext.visit_activity,
          competing_offers: marketContext.competing_offers,
          signal_pressure: marketContext.signal_pressure,
          velocity_state: marketContext.velocity_state,
        });

        // Insert insight
        await supabase.from('pricewaze_negotiation_insights').insert({
          snapshot_id: snapshot.id,
          summary: result.insight.summary,
          focus_area: result.focus_area,
          options: result.insight.options,
        });

        // Create alerts if needed
        if (result.should_alert.rhythm_slowing) {
          await supabase.from('pricewaze_negotiation_alerts').insert({
            snapshot_id: snapshot.id,
            offer_id: job.offer_id,
            alert_type: 'rhythm_slowing',
            message: 'Negotiation rhythm slowing. Alignment risk increasing.',
          });
        }

        if (result.should_alert.alignment_deteriorating) {
          await supabase.from('pricewaze_negotiation_alerts').insert({
            snapshot_id: snapshot.id,
            offer_id: job.offer_id,
            alert_type: 'alignment_deteriorating',
            message: 'Alignment deteriorating. Consider adjusting approach.',
          });
        }

        if (result.should_alert.pressure_increasing) {
          await supabase.from('pricewaze_negotiation_alerts').insert({
            snapshot_id: snapshot.id,
            offer_id: job.offer_id,
            alert_type: 'pressure_increasing',
            message: 'Market pressure rising during stalled negotiation. Timing risk rising.',
          });
        }

        // Mark job as done
        await supabase
          .from('pricewaze_nce_jobs')
          .update({
            status: 'done',
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        processed++;
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);

        // Mark job as failed
        await supabase
          .from('pricewaze_nce_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        errors++;
      }
    }

    return NextResponse.json({
      processed,
      errors,
      total: jobs.length,
    });
  } catch (error) {
    console.error('Error in POST /api/negotiation/coherence/calculate', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


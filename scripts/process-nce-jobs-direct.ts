/**
 * Process NCE Jobs Directly
 * 
 * This script processes pending NCE jobs by calling the calculation logic directly
 * Bypasses API authentication requirements
 */

import { createClient } from '@supabase/supabase-js';
import { calculateNCEState } from '../src/lib/negotiation-coherence/calculate';
import type { NegotiationEvent, MarketContext } from '../src/types/negotiation-coherence';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function processJobs(limit: number = 10) {
  console.log('🔄 Processing NCE jobs...');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Get pending jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('pricewaze_nce_jobs')
    .select('id, offer_id, event_id, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ No pending jobs');
    return { processed: 0, errors: 0, total: 0 };
  }

  console.log(`📋 Found ${jobs.length} pending jobs`);

  let processed = 0;
  let errors = 0;

  for (const job of jobs) {
    try {
      console.log(`\n🔄 Processing job ${job.id}...`);

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

      // Get previous events
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

      // Get offer for property_id
      const { data: offer } = await supabase
        .from('pricewaze_offers')
        .select('property_id')
        .eq('id', job.offer_id)
        .single();

      if (!offer) {
        throw new Error('Offer not found');
      }

      // Get market context
      const { data: signalStates } = await supabase
        .from('pricewaze_property_signal_state')
        .select('signal_type, strength')
        .eq('property_id', offer.property_id)
        .gt('strength', 0);

      const { count: competingCount } = await supabase
        .from('pricewaze_offers')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', offer.property_id)
        .eq('status', 'pending')
        .neq('id', job.offer_id);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: visitCount } = await supabase
        .from('pricewaze_visits')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', offer.property_id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const visit_activity: MarketContext['visit_activity'] =
        visitCount && visitCount > 5 ? 'high' : visitCount && visitCount > 2 ? 'medium' : 'low';

      const competing_offers: MarketContext['competing_offers'] =
        competingCount && competingCount > 2 ? 'many' : competingCount && competingCount > 0 ? 'some' : 'none';

      const signal_pressure: MarketContext['signal_pressure'] =
        signalStates && signalStates.length > 3 ? 'high' : signalStates && signalStates.length > 1 ? 'medium' : 'low';

      const marketContext: MarketContext = {
        visit_activity,
        competing_offers,
        signal_pressure,
        velocity_state: 'stable',
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

      // Insert related data
      await supabase.from('pricewaze_negotiation_friction').insert({
        snapshot_id: snapshot.id,
        price_friction: result.friction.price_friction,
        timeline_friction: result.friction.timeline_friction,
        terms_friction: result.friction.terms_friction,
        dominant_friction: result.friction.dominant_friction,
      });

      await supabase.from('pricewaze_negotiation_rhythm').insert({
        snapshot_id: snapshot.id,
        avg_response_time_hours: result.rhythm.avg_response_time_hours,
        response_trend: result.rhythm.response_trend,
        concession_pattern: result.rhythm.concession_pattern,
      });

      await supabase.from('pricewaze_negotiation_market_context').insert({
        snapshot_id: snapshot.id,
        visit_activity: marketContext.visit_activity,
        competing_offers: marketContext.competing_offers,
        signal_pressure: marketContext.signal_pressure,
        velocity_state: marketContext.velocity_state,
      });

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

      console.log(`✅ Job ${job.id} processed successfully`);
      processed++;
    } catch (error) {
      console.error(`❌ Error processing job ${job.id}:`, error);

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

  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${jobs.length}`);

  return { processed, errors, total: jobs.length };
}

// Run if called directly
if (require.main === module) {
  const limit = parseInt(process.argv[2] || '10', 10);
  
  processJobs(limit)
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { processJobs };


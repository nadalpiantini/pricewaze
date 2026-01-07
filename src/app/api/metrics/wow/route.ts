import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// I.3 Métrica WOW: Tiempo hasta primera decisión informada
// Eventos: seguir propiedad, ver alerta, abrir copiloto, ajustar oferta

interface WowMetricEvent {
  user_id: string;
  event_type: 'property_follow' | 'alert_viewed' | 'copilot_opened' | 'offer_adjusted';
  property_id?: string;
  offer_id?: string;
  timestamp: string;
  session_start?: string; // Timestamp when user first landed
}

// POST /api/metrics/wow - Track WOW metric events
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow anonymous tracking for demo/onboarding
    const body: WowMetricEvent = await request.json();
    const userId = user?.id || body.user_id || 'anonymous';

    // Store event (in production, use proper analytics table)
    // For now, we'll log it and optionally store in a simple table
    const event = {
      user_id: userId,
      event_type: body.event_type,
      property_id: body.property_id || null,
      offer_id: body.offer_id || null,
      timestamp: body.timestamp || new Date().toISOString(),
      session_start: body.session_start || null,
    };

    // Calculate time to first decision if we have session_start
    let time_to_decision: number | null = null;
    if (body.session_start) {
      const start = new Date(body.session_start).getTime();
      const now = new Date(body.timestamp || new Date()).getTime();
      time_to_decision = Math.round((now - start) / 1000); // seconds
    }

    // Log for analytics (in production, use proper analytics service)
    console.log('WOW Metric Event:', {
      ...event,
      time_to_decision,
    });

    // Store in database if table exists (optional)
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      event,
      time_to_decision,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('WOW metric POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/metrics/wow - Get WOW metric stats (for dashboard)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, query from analytics table
    // For now, return mock stats
    return NextResponse.json({
      average_time_to_decision: 240, // 4 minutes
      median_time_to_decision: 180, // 3 minutes
      target: 300, // 5 minutes
      events_today: 0,
      users_reached_decision: 0,
    });
  } catch (error) {
    console.error('WOW metric GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


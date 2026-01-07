import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createSignalSchema = z.object({
  zone_id: z.string().uuid().optional().nullable(),
  property_id: z.string().uuid().optional().nullable(),
  signal_type: z.enum([
    'price_drop',
    'price_increase',
    'inventory_spike',
    'inventory_drop',
    'trend_change',
    'new_listing',
    'status_change',
  ]),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  payload: z.record(z.string(), z.unknown()),
});

// GET /api/market-signals - Get recent market signals
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zone_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('pricewaze_market_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch market signals', error);
      return NextResponse.json(
        { error: 'Failed to fetch market signals' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error in GET /api/market-signals', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/market-signals - Create a market signal (admin/system only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // In production, add admin check here
    // For now, allow authenticated users to create signals (for testing)

    const body = await request.json();
    const result = createSignalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { zone_id, property_id, signal_type, severity, payload } = result.data;

    const { data, error } = await supabase
      .from('pricewaze_market_signals')
      .insert({
        zone_id: zone_id || null,
        property_id: property_id || null,
        signal_type,
        severity,
        payload,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create market signal', error);
      return NextResponse.json(
        { error: 'Failed to create market signal' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/market-signals', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


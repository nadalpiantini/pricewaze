import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createSavedSearchSchema = z.object({
  name: z.string().optional().nullable(),
  filters: z.record(z.string(), z.unknown()),
  notification_frequency: z.enum(['instant', 'daily', 'weekly']).default('daily'),
});

// GET /api/alerts - Get user's saved searches and alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get saved searches
    const { data: savedSearches, error: searchesError } = await supabase
      .from('pricewaze_saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (searchesError) {
      logger.error('Failed to fetch saved searches', searchesError);
      return NextResponse.json(
        { error: 'Failed to fetch saved searches' },
        { status: 500 }
      );
    }

    // Get price alerts
    const { data: priceAlerts, error: priceAlertsError } = await supabase
      .from('pricewaze_price_alerts')
      .select(`
        *,
        property:pricewaze_properties(id, title, price, images)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (priceAlertsError) {
      logger.error('Failed to fetch price alerts', priceAlertsError);
    }

    return NextResponse.json({
      saved_searches: savedSearches || [],
      price_alerts: priceAlerts || [],
    });
  } catch (error) {
    logger.error('Error in GET /api/alerts', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create saved search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createSavedSearchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, filters, notification_frequency } = result.data;

    const { data, error } = await supabase
      .from('pricewaze_saved_searches')
      .insert({
        user_id: user.id,
        name: name || null,
        filters,
        notification_frequency,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create saved search', error);
      return NextResponse.json(
        { error: 'Failed to create saved search' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/alerts', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { validateRule } from '@/lib/alerts/evaluateRule';
import { z } from 'zod';

const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  property_id: z.string().uuid().optional().nullable(),
  rule: z.record(z.string(), z.unknown()), // JSON Logic rule
  notification_channels: z.array(z.enum(['in_app', 'email', 'push'])).default(['in_app']),
});

const updateAlertRuleSchema = createAlertRuleSchema.partial().extend({
  active: z.boolean().optional(),
});

// GET /api/alert-rules - Get user's alert rules
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pricewaze_alert_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch alert rules', error);
      return NextResponse.json(
        { error: 'Failed to fetch alert rules' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error in GET /api/alert-rules', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/alert-rules - Create alert rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createAlertRuleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    // Validate JSON Logic rule
    const ruleValidation = validateRule(result.data.rule);
    if (!ruleValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid rule syntax', details: ruleValidation.error },
        { status: 400 }
      );
    }

    const { name, description, zone_id, property_id, rule, notification_channels } = result.data;

    const { data, error } = await supabase
      .from('pricewaze_alert_rules')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        zone_id: zone_id || null,
        property_id: property_id || null,
        rule,
        notification_channels,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create alert rule', error);
      return NextResponse.json(
        { error: 'Failed to create alert rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/alert-rules', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/alert-rules - Update alert rule
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const result = updateAlertRuleSchema.safeParse(updates);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    // Validate rule if provided
    if (result.data.rule) {
      const ruleValidation = validateRule(result.data.rule);
      if (!ruleValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid rule syntax', details: ruleValidation.error },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('pricewaze_alert_rules')
      .update(result.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update alert rule', error);
      return NextResponse.json(
        { error: 'Failed to update alert rule' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in PATCH /api/alert-rules', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/alert-rules - Delete alert rule
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('pricewaze_alert_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Failed to delete alert rule', error);
      return NextResponse.json(
        { error: 'Failed to delete alert rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/alert-rules', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
  static: z.boolean().optional(),
  isDraggable: z.boolean().optional(),
  isResizable: z.boolean().optional(),
});

const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  visible: z.boolean(),
  settings: z.record(z.string(), z.any()).optional(),
});

const dashboardConfigSchema = z.object({
  layout: z.array(layoutItemSchema),
  widgets: z.array(widgetConfigSchema),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Try to get existing config
    const { data, error } = await supabase
      .from('pricewaze_dashboard_configs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Handle errors gracefully - table might not exist yet
    // PGRST116 = not found, 42P01 = undefined_table
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        // Return empty config - frontend will use defaults
        return NextResponse.json({
          layout: null,
          widgets: null,
          updated_at: null,
        });
      }
      // Log other errors but still return empty config to not break the dashboard
      console.error('Dashboard config fetch error (using defaults):', error);
      return NextResponse.json({
        layout: null,
        widgets: null,
        updated_at: null,
      });
    }

    if (!data) {
      // Return empty config - frontend will use defaults
      return NextResponse.json({
        layout: null,
        widgets: null,
        updated_at: null,
      });
    }

    return NextResponse.json({
      layout: data.layout,
      widgets: data.widgets,
      updated_at: data.updated_at,
    });
  } catch (error) {
    console.error('Dashboard config GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = dashboardConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid config format', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { layout, widgets } = validation.data;

    // Upsert config
    const { data, error } = await supabase
      .from('pricewaze_dashboard_configs')
      .upsert(
        {
          user_id: user.id,
          layout,
          widgets,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to save dashboard config:', error);
      return NextResponse.json(
        { error: 'Failed to save dashboard config' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_at: data.updated_at,
    });
  } catch (error) {
    console.error('Dashboard config PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Reset to defaults - just delete the config
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('pricewaze_dashboard_configs')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to reset dashboard config:', error);
      return NextResponse.json(
        { error: 'Failed to reset dashboard config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dashboard config POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateAlertSchema = z.object({
  resolved: z.boolean().optional(),
});

/**
 * PATCH /api/copilot/alerts/[id]
 * 
 * Actualiza una alerta (principalmente para marcarla como resuelta)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que la alerta pertenece al usuario
    const { data: alert, error: alertError } = await supabase
      .from('pricewaze_copilot_alerts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (alertError || !alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (alert.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const result = updateAlertSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: result.error.issues },
        { status: 400 }
      );
    }

    // Actualizar alerta
    const { data: updatedAlert, error: updateError } = await supabase
      .from('pricewaze_copilot_alerts')
      .update(result.data)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating Copilot alert:', updateError);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert: updatedAlert });
  } catch (error) {
    logger.error('Copilot alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


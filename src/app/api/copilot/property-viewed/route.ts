import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/copilot/property-viewed
 * 
 * Evalúa alertas del Copilot cuando un usuario ve una propiedad.
 * Dispara la función evaluate_property_alerts_for_user() en Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { property_id } = body;

    if (!property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      );
    }

    // Verificar que la propiedad existe
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Llamar a la función de Supabase que evalúa alertas
    const { data: alerts, error: functionError } = await supabase.rpc(
      'evaluate_property_alerts_for_user',
      {
        p_user_id: user.id,
        p_property_id: property_id,
      }
    );

    if (functionError) {
      logger.error('Error evaluating property alerts:', functionError);
      // No fallar si hay error, solo loguear
      // El sistema puede funcionar sin alertas
      return NextResponse.json({
        alerts: [],
        message: 'Alerts evaluation completed',
      });
    }

    // Retornar alertas creadas (si las hay)
    return NextResponse.json({
      alerts: alerts || [],
      message: 'Property viewed, alerts evaluated',
    });
  } catch (error) {
    logger.error('Copilot property-viewed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


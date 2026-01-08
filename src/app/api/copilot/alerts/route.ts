import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/copilot/alerts
 * 
 * Obtiene alertas del Copilot para un usuario/propiedad/oferta
 * 
 * Query params:
 * - property_id: UUID (opcional)
 * - offer_id: UUID (opcional)
 * - user_id: UUID (opcional, default: usuario autenticado)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('property_id');
    const offerId = searchParams.get('offer_id');
    const userId = searchParams.get('user_id') || user.id;

    // Si hay property_id, evaluar alertas automáticamente
    if (propertyId) {
      const { data: alerts, error } = await supabase.rpc(
        'pricewaze_evaluate_all_alerts',
        {
          p_user_id: userId,
          p_property_id: propertyId,
          p_offer_id: offerId || null,
        }
      );

      // Handle gracefully if RPC doesn't exist or other errors
      if (error) {
        // 42883 = function doesn't exist, PGRST202 = function not found
        if (error.code === '42883' || error.code === 'PGRST202' || error.message?.includes('does not exist')) {
          // Return empty alerts - function not yet created
          return NextResponse.json({
            success: true,
            alerts: [],
          });
        }
        console.error('Error evaluating alerts:', error);
        // Still return empty alerts instead of 500 to not break the UI
        return NextResponse.json({
          success: true,
          alerts: [],
        });
      }

      // Convertir resultados a formato de alertas
      const formattedAlerts = (alerts || []).map((alert: any) => ({
        id: `alert-${Date.now()}-${Math.random()}`,
        type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata || {},
        propertyId,
        offerId: offerId || null,
      }));

      return NextResponse.json({
        success: true,
        alerts: formattedAlerts,
      });
    }

    // Si no hay property_id, obtener alertas guardadas del usuario
    const { data: savedAlerts, error: alertsError } = await supabase
      .from('pricewaze_copilot_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // Handle gracefully if table doesn't exist or other errors
    if (alertsError) {
      // PGRST116 = not found, 42P01 = undefined_table
      if (alertsError.code === 'PGRST116' || alertsError.code === '42P01' || alertsError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          alerts: [],
        });
      }
      console.error('Error fetching alerts:', alertsError);
      // Return empty alerts instead of 500 to not break the UI
      return NextResponse.json({
        success: true,
        alerts: [],
      });
    }

    const formattedAlerts = (savedAlerts || []).map((alert) => ({
      id: alert.id,
      type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata || {},
      propertyId: alert.property_id,
      offerId: null,
      createdAt: alert.created_at,
    }));

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
    });
  } catch (error) {
    console.error('Copilot alerts GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/copilot/alerts
 * 
 * Marca una alerta como resuelta
 * 
 * Body:
 * {
 *   alert_id: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alert_id } = body;

    if (!alert_id) {
      return NextResponse.json(
        { error: 'alert_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('pricewaze_copilot_alerts')
      .update({ resolved: true })
      .eq('id', alert_id)
      .eq('user_id', user.id);

    // Handle gracefully if table doesn't exist
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true });
      }
      console.error('Error resolving alert:', error);
      return NextResponse.json(
        { error: 'Failed to resolve alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Copilot alerts POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

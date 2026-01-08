import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDecisionIntelligence } from '@/lib/ai/decision-intelligence';
import type { DecisionIntelligenceResponse } from '@/types/decision-intelligence';

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

/**
 * GET /api/ai/decision-intelligence/[propertyId]
 * 
 * Genera análisis completo de Decision Intelligence para una propiedad.
 * 
 * Query params:
 * - offerAmount?: number - Monto de oferta (opcional)
 * - includeScenarios?: boolean - Incluir escenarios detallados
 * 
 * Returns:
 * - DecisionIntelligence completo con AVM, presión, dinámicas, riesgo y fairness
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { propertyId } = params;
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener query params
    const searchParams = request.nextUrl.searchParams;
    const offerAmountParam = searchParams.get('offerAmount');
    const offerAmount = offerAmountParam ? parseFloat(offerAmountParam) : undefined;
    const includeScenarios = searchParams.get('includeScenarios') === 'true';

    // Verificar acceso a la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id, seller_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Verificar permisos (vendedor, comprador con oferta, o propiedad activa)
    const { data: offers } = await supabase
      .from('pricewaze_offers')
      .select('id')
      .eq('property_id', propertyId)
      .eq('buyer_id', user.id)
      .limit(1);

    const hasAccess =
      property.seller_id === user.id ||
      (offers && offers.length > 0) ||
      (await supabase
        .from('pricewaze_properties')
        .select('status')
        .eq('id', propertyId)
        .eq('status', 'active')
        .single()).data !== null;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generar Decision Intelligence
    const decisionIntelligence = await generateDecisionIntelligence(
      supabase,
      propertyId,
      offerAmount,
      user.id
    );

    if (!decisionIntelligence) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate decision intelligence' },
        { status: 500 }
      );
    }

    // Si no se solicitan escenarios, simplificar
    if (!includeScenarios && decisionIntelligence.decisionRisk) {
      decisionIntelligence.decisionRisk.scenarios = [];
    }

    const response: DecisionIntelligenceResponse = {
      success: true,
      data: decisionIntelligence,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Decision Intelligence GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/decision-intelligence/[propertyId]
 * 
 * Genera Decision Intelligence con parámetros en el body.
 * 
 * Body:
 * {
 *   offerAmount?: number,
 *   userId?: string,
 *   includeScenarios?: boolean
 * }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { propertyId } = params;
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const { offerAmount, includeScenarios = false } = body;

    // Verificar acceso a la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select('id, seller_id, status')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const { data: offers } = await supabase
      .from('pricewaze_offers')
      .select('id')
      .eq('property_id', propertyId)
      .eq('buyer_id', user.id)
      .limit(1);

    const hasAccess =
      property.seller_id === user.id ||
      (offers && offers.length > 0) ||
      property.status === 'active';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generar Decision Intelligence
    const decisionIntelligence = await generateDecisionIntelligence(
      supabase,
      propertyId,
      offerAmount,
      user.id
    );

    if (!decisionIntelligence) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate decision intelligence' },
        { status: 500 }
      );
    }

    // Si no se solicitan escenarios, simplificar
    if (!includeScenarios && decisionIntelligence.decisionRisk) {
      decisionIntelligence.decisionRisk.scenarios = [];
    }

    const response: DecisionIntelligenceResponse = {
      success: true,
      data: decisionIntelligence,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Decision Intelligence POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


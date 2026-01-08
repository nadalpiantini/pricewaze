import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePricing } from '@/lib/ai/pricing';
import type { DecisionIntelligence } from '@/types/decision-intelligence';
import { getMarketConfig, formatPrice } from '@/config/market';

/**
 * GET /api/ai/fairness-panel
 * Returns DecisionIntelligence data for the Fairness Panel v2
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
    const offerAmountParam = searchParams.get('offer_amount');
    const userId = searchParams.get('user_id') || user.id;

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }

    const offerAmount = offerAmountParam ? parseFloat(offerAmountParam) : undefined;

    // Fetch property
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select(`
        id,
        title,
        description,
        price,
        area_m2,
        property_type,
        address,
        created_at,
        zone_id
      `)
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch zone context
    let zoneContext = { name: 'Unknown Zone', properties: [] };
    if (property.zone_id) {
      const { data: zone } = await supabase
        .from('pricewaze_zones')
        .select('name')
        .eq('id', property.zone_id)
        .single();

      if (zone) {
        const { data: zoneProperties } = await supabase
          .from('pricewaze_properties')
          .select('price, area_m2, property_type, status, created_at')
          .eq('zone_id', property.zone_id)
          .eq('status', 'active');

        zoneContext = {
          name: zone.name,
          properties: zoneProperties || [],
        };
      }
    }

    // Get pricing analysis
    const pricingAnalysis = await analyzePricing(property, zoneContext);

    // Calculate days on market
    const daysOnMarket = Math.floor(
      (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine price fairness status
    const priceDeviation = pricingAnalysis.estimatedFairValue > 0
      ? (property.price - pricingAnalysis.estimatedFairValue) / pricingAnalysis.estimatedFairValue
      : 0;

    const priceStatus: 'green' | 'yellow' | 'red' =
      Math.abs(priceDeviation) < 0.05 ? 'green' :
      Math.abs(priceDeviation) < 0.15 ? 'yellow' : 'red';

    // Determine uncertainty level
    const comparableCount = pricingAnalysis.zoneStats.propertyCount;
    const uncertaintyLevel: 'low' | 'medium' | 'high' =
      comparableCount >= 10 ? 'low' :
      comparableCount >= 5 ? 'medium' : 'high';

    const uncertaintyStatus: 'green' | 'yellow' | 'red' =
      uncertaintyLevel === 'low' ? 'green' :
      uncertaintyLevel === 'medium' ? 'yellow' : 'red';

    // Determine market velocity (simplified)
    const recentListings = zoneContext.properties.filter(
      p => new Date(p.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000
    ).length;
    const velocityStatus: 'green' | 'yellow' | 'red' =
      recentListings >= 5 ? 'yellow' : // Accelerating
      recentListings >= 2 ? 'green' : 'red'; // Stable / Decelerating

    const marketVelocity: 'accelerating' | 'stable' | 'decelerating' =
      recentListings >= 5 ? 'accelerating' :
      recentListings >= 2 ? 'stable' : 'decelerating';

    // Determine wait risk
    const waitRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
      daysOnMarket > 90 && priceStatus === 'red' ? 'low' : // Overpriced, no rush
      daysOnMarket < 30 && recentListings >= 5 ? 'critical' : // Hot market
      daysOnMarket < 60 && recentListings >= 3 ? 'high' :
      daysOnMarket < 90 ? 'medium' : 'low';

    const riskStatus: 'green' | 'yellow' | 'red' =
      waitRiskLevel === 'low' ? 'green' :
      waitRiskLevel === 'medium' ? 'yellow' :
      waitRiskLevel === 'high' ? 'red' : 'red';

    // Build fairness panel data
    const fairnessPanel: DecisionIntelligence['fairnessPanel'] = {
      price: {
        status: priceStatus,
        score: pricingAnalysis.fairnessScore,
        explanation: priceStatus === 'green'
          ? 'El precio está dentro del rango esperado para esta zona.'
          : priceStatus === 'yellow'
          ? 'El precio está en el límite superior del rango esperado.'
          : 'El precio está fuera del rango esperado para esta zona.',
      },
      uncertainty: {
        status: uncertaintyStatus,
        score: uncertaintyLevel === 'low' ? 80 : uncertaintyLevel === 'medium' ? 50 : 30,
        explanation: uncertaintyLevel === 'low'
          ? 'La estimación se basa en múltiples comparables recientes en esta zona.'
          : uncertaintyLevel === 'medium'
          ? 'La estimación se basa en algunos comparables recientes en esta zona.'
          : 'La estimación se basa en pocos comparables recientes en esta zona.',
      },
      risk: {
        status: riskStatus,
        score: waitRiskLevel === 'low' ? 20 : waitRiskLevel === 'medium' ? 50 : waitRiskLevel === 'high' ? 75 : 90,
        explanation: waitRiskLevel === 'low'
          ? 'El riesgo de esperar es bajo. Hay tiempo para evaluar.'
          : waitRiskLevel === 'medium'
          ? 'El riesgo de esperar es moderado. Considera actuar pronto.'
          : 'El riesgo de esperar es alto. La ventana podría cerrarse pronto.',
      },
      velocity: {
        status: velocityStatus,
        score: marketVelocity === 'accelerating' ? 70 : marketVelocity === 'stable' ? 50 : 30,
        explanation: marketVelocity === 'accelerating'
          ? 'La actividad aumentó significativamente en los últimos 14 días.'
          : marketVelocity === 'stable'
          ? 'La actividad del mercado se mantiene estable.'
          : 'La actividad del mercado ha disminuido recientemente.',
      },
    };

    // Generate timing insight
    const market = getMarketConfig();
    const timingInsight =
      waitRiskLevel === 'critical' || waitRiskLevel === 'high'
        ? `El precio está ${priceStatus === 'green' ? 'dentro del rango' : priceStatus === 'yellow' ? 'en el límite superior' : 'fuera del rango'}, pero la aceleración reciente y la competencia aumentan el riesgo de esperar.`
        : waitRiskLevel === 'low'
        ? 'No hay presión inmediata. Esperar es razonable en este momento.'
        : `El precio está ${priceStatus === 'green' ? 'dentro del rango' : 'en el límite superior'}, pero la aceleración reciente y la competencia aumentan el riesgo de esperar.`;

    // Build DecisionIntelligence response
    const decisionIntelligence: DecisionIntelligence = {
      propertyId,
      offerAmount,
      summary: {
        priceRange: {
          low: pricingAnalysis.estimatedFairValue * 0.9,
          high: pricingAnalysis.estimatedFairValue * 1.1,
          estimate: pricingAnalysis.estimatedFairValue,
        },
        uncertaintyLevel,
        marketVelocity,
        waitRisk: waitRiskLevel,
        recommendation: waitRiskLevel === 'critical' || waitRiskLevel === 'high'
          ? 'act_now'
          : waitRiskLevel === 'low'
          ? 'wait'
          : 'negotiate',
      },
      fairnessPanel,
      insights: {
        keyFactors: pricingAnalysis.insights.slice(0, 3),
        risks: pricingAnalysis.risks,
        opportunities: pricingAnalysis.opportunities,
        timing: timingInsight,
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: decisionIntelligence,
    });
  } catch (error) {
    console.error('Fairness panel API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


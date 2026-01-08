import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeDIE } from '@/lib/die';
import type { DIEInputs, UserDecisionProfile } from '@/types/die';

/**
 * GET /api/ai/die
 * 
 * Decision Intelligence Engine (DIE) v1
 * Returns: Price assessment, market dynamics, current pressure, explanations
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user decision profile for personalization (DIE-3)
  const { data: profile } = await supabase
    .from('pricewaze_profiles')
    .select('id, decision_urgency, decision_risk_tolerance, decision_objective, decision_budget_flexibility')
    .eq('id', user.id)
    .single();

  let userProfile: UserDecisionProfile | undefined = undefined;
  if (profile && (profile.decision_urgency || profile.decision_risk_tolerance || profile.decision_objective)) {
    const profileData: UserDecisionProfile = {
      userId: String(profile.id),
      urgency: (profile.decision_urgency as 'high' | 'medium' | 'low') || 'medium',
      riskTolerance: (profile.decision_risk_tolerance as 'conservative' | 'moderate' | 'aggressive') || 'moderate',
      objective: (profile.decision_objective as 'primary_residence' | 'investment' | 'vacation' | 'flip') || 'primary_residence',
      budgetFlexibility: (profile.decision_budget_flexibility as 'strict' | 'moderate' | 'flexible') || 'moderate',
    };
    userProfile = profileData ?? undefined;
  }

  const propertyId = request.nextUrl.searchParams.get('property_id');

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }

  try {
    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from('pricewaze_properties')
      .select(`
        id,
        title,
        price,
        area_m2,
        property_type,
        zone_id,
        status,
        created_at
      `)
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch zone info and properties
    let zoneName = 'Unknown Zone';
    let zoneProperties: Array<{
      price: number;
      area_m2?: number;
      property_type: string;
      status: string;
      created_at: string;
    }> = [];

    if (property.zone_id) {
      const { data: zone } = await supabase
        .from('pricewaze_zones')
        .select('id, name')
        .eq('id', property.zone_id)
        .single();

      if (zone) {
        zoneName = zone.name;

        // Get all properties in zone for market dynamics
        const { data: comparables } = await supabase
          .from('pricewaze_properties')
          .select('price, area_m2, property_type, status, created_at')
          .eq('zone_id', property.zone_id);

        if (comparables) {
          zoneProperties = comparables;
        }
      }
    }

    // Fetch property signals
    const { data: signalStates } = await supabase
      .from('pricewaze_property_signal_state')
      .select('signal_type, strength, confirmed')
      .eq('property_id', propertyId)
      .gt('strength', 0);

    // Fetch user-reported signals count
    const { count: userReportsCount } = await supabase
      .from('pricewaze_property_signals_raw')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('source', 'user');

    // Determine signal flags
    const highActivity = signalStates?.some(s => s.signal_type === 'high_activity') || false;
    const manyVisits = signalStates?.some(s => s.signal_type === 'many_visits') || false;
    const competingOffers = signalStates?.some(s => s.signal_type === 'competing_offers') || false;

    // Fetch competition metrics
    const { count: activeOffersCount } = await supabase
      .from('pricewaze_offers')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .in('status', ['pending', 'countered']);

    const { count: recentVisitsCount } = await supabase
      .from('pricewaze_visits')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .not('verified_at', 'is', null) // Only verified visits
      .gte('scheduled_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    // Build DIE inputs
    const dieInputs: DIEInputs = {
      property: {
        id: property.id,
        price: property.price,
        area_m2: property.area_m2 || undefined,
        property_type: property.property_type,
        zone_id: property.zone_id || '',
        created_at: property.created_at,
        status: property.status,
      },
      zone: {
        id: property.zone_id || '',
        name: zoneName,
        properties: zoneProperties,
      },
      signals: {
        highActivity,
        manyVisits,
        competingOffers,
        userReports: userReportsCount || 0,
      },
      competition: {
        activeOffers: activeOffersCount || 0,
        recentVisits: recentVisitsCount || 0,
        views: 0, // TODO: Add views_count from property if needed
      },
      ...(userProfile ? { userProfile } : {}), // DIE-3 personalization
    };

    // Run DIE analysis
    const analysis = await analyzeDIE(dieInputs);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('DIE analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze property decision intelligence' },
      { status: 500 }
    );
  }
}


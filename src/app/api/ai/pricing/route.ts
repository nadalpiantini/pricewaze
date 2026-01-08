import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePricing } from '@/lib/ai/pricing';
import { getZonePricingWithFallback } from '@/lib/ingest/zone-fallback';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const supabase = await createClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = request.nextUrl.searchParams.get('property_id');

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }

  // Fetch property details
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
      zone_id,
      latitude,
      longitude,
      created_at
    `)
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  // Fetch zone info
  let zone: { id: string; name: string; city: string; avg_price_m2: number | null } | null = null;
  if (property.zone_id) {
    const { data: zoneData } = await supabase
      .from('pricewaze_zones')
      .select('id, name, city, avg_price_m2')
      .eq('id', property.zone_id)
      .single();
    zone = zoneData;
  }

  // Use zone fallback system for pricing reference
  const fallbackResult = await getZonePricingWithFallback(
    supabase,
    zone as any, // Zone type is partial for this use case
    { lat: property.latitude, lng: property.longitude },
    'DO' // TODO: Get from property or user preference
  );

  // Fetch zone properties for AI analysis
  let zoneName = zone?.name || fallbackResult.zone_name;
  let zoneProperties: Array<{
    price: number;
    area_m2?: number;
    property_type: string;
    status: string;
    created_at: string;
  }> = [];

  if (property.zone_id) {
    const { data: comparables } = await supabase
      .from('pricewaze_properties')
      .select('price, area_m2, property_type, status, created_at')
      .eq('zone_id', property.zone_id)
      .neq('id', propertyId);

    if (comparables) {
      zoneProperties = comparables;
    }
  } else {
    // Expanded zone fallback
    const latRange = 0.02; // ~2km
    const lngRange = 0.02;

    const { data: nearby } = await supabase
      .from('pricewaze_properties')
      .select('price, area_m2, property_type, status, created_at')
      .eq('status', 'active')
      .neq('id', propertyId)
      .gte('latitude', property.latitude - latRange)
      .lte('latitude', property.latitude + latRange)
      .gte('longitude', property.longitude - lngRange)
      .lte('longitude', property.longitude + lngRange)
      .limit(20);

    if (nearby) {
      zoneProperties = nearby;
      zoneName = 'Nearby Area (2km)';
    }
  }

  try {
    const analysis = await analyzePricing(
      {
        id: property.id,
        title: property.title,
        price: property.price,
        area_m2: property.area_m2,
        property_type: property.property_type,
        address: property.address,
        description: property.description,
        created_at: property.created_at,
      },
      {
        name: zoneName,
        properties: zoneProperties,
      }
    );

    // Enhance response with confidence factors
    const enhancedAnalysis = {
      ...analysis,
      // Signal-based framing
      analysisType: 'signal_based',
      disclaimer: 'Pricing based on market signals from active listings, not verified sales data.',

      // Confidence factors from zone fallback
      confidenceFactors: {
        comparable_count: fallbackResult.sample_size,
        data_recency_days: 0, // TODO: Calculate from property dates
        zone_coverage: fallbackResult.confidence_level,
        source_quality: 0.7, // Default for crowdsourced
        reference_scope: fallbackResult.reference_scope,
      },

      // Numerical confidence score (0-100)
      confidenceScore: fallbackResult.confidence_score,

      // Warning if using fallback data
      dataWarning: fallbackResult.warning || null,

      // Reference zone info
      referenceZone: {
        name: fallbackResult.zone_name,
        scope: fallbackResult.reference_scope,
        avg_price_m2: fallbackResult.avg_price_m2,
        sample_size: fallbackResult.sample_size,
      },
    };

    return NextResponse.json(enhancedAnalysis);
  } catch (error) {
    logger.error('Pricing analysis error', error);
    return NextResponse.json(
      { error: 'Failed to analyze pricing' },
      { status: 500 }
    );
  }
}

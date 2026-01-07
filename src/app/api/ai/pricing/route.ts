import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePricing } from '@/lib/ai/pricing';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

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

  // Fetch zone info and comparable properties
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
      .select('name')
      .eq('id', property.zone_id)
      .single();

    if (zone) {
      zoneName = zone.name;
    }

    // Get comparable properties in the same zone
    const { data: comparables } = await supabase
      .from('pricewaze_properties')
      .select('price, area_m2, property_type, status, created_at')
      .eq('zone_id', property.zone_id)
      .neq('id', propertyId);

    if (comparables) {
      zoneProperties = comparables;
    }
  } else {
    // If no zone, try to find properties with similar coordinates (within ~5km)
    // This provides some context even without zones
    const { data: nearby } = await supabase
      .from('pricewaze_properties')
      .select('price, area_m2, property_type, status, created_at, latitude, longitude')
      .eq('status', 'active')
      .neq('id', propertyId)
      .limit(10);

    if (nearby && nearby.length > 0) {
      // Filter by distance (rough calculation - within ~0.05 degrees ≈ 5km)
      const nearbyFiltered = nearby.filter((p: any) => {
        if (!p.latitude || !p.longitude) return false;
        const latDiff = Math.abs((p.latitude as number) - property.latitude);
        const lngDiff = Math.abs((p.longitude as number) - property.longitude);
        return latDiff < 0.05 && lngDiff < 0.05;
      });

      if (nearbyFiltered.length > 0) {
        zoneName = 'Nearby Area';
        zoneProperties = nearbyFiltered.map((p: any) => ({
          price: p.price,
          area_m2: p.area_m2,
          property_type: p.property_type,
          status: p.status,
          created_at: p.created_at,
        }));
      }
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

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Pricing analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pricing' },
      { status: 500 }
    );
  }
}

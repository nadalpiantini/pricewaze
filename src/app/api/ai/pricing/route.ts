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

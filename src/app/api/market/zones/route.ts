import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/market/zones
 * Get zone price comparison data for charts
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: zones, error } = await supabase
      .from('pricewaze_zones')
      .select('id, name, avg_price_m2')
      .order('avg_price_m2', { ascending: false })
      .limit(6);

    if (error || !zones || zones.length === 0) {
      return NextResponse.json(getMockZones());
    }

    const zoneData = zones.map(zone => ({
      name: zone.name,
      priceM2: zone.avg_price_m2 || 1500,
    }));

    return NextResponse.json(zoneData);
  } catch (error) {
    console.error('Market zones error:', error);
    return NextResponse.json(getMockZones());
  }
}

function getMockZones() {
  return [
    { name: 'Piantini', priceM2: 2500 },
    { name: 'Naco', priceM2: 2200 },
    { name: 'Evaristo Morales', priceM2: 1800 },
    { name: 'Gazcue', priceM2: 1600 },
    { name: 'Bella Vista', priceM2: 2100 },
    { name: 'Los Prados', priceM2: 1400 },
  ];
}

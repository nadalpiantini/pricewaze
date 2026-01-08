import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Query params schema
const querySchema = z.object({
  country: z.enum(['DO', 'US', 'MX', 'ES', 'CO']).optional(),
  city: z.string().optional(),
});

type ZoneHealth = 'excellent' | 'good' | 'fair' | 'needs_data' | 'no_data';

interface ZoneHealthData {
  zone_id: string;
  name: string;
  city: string;
  property_count: number;
  avg_price_m2: number | null;
  avg_trust_score: number;
  last_update: string | null;
  health: ZoneHealth;
  call_to_action: boolean;
}

/**
 * Calculate zone health based on property count
 */
function getZoneHealth(propertyCount: number): ZoneHealth {
  if (propertyCount >= 20) return 'excellent';
  if (propertyCount >= 10) return 'good';
  if (propertyCount >= 5) return 'fair';
  if (propertyCount > 0) return 'needs_data';
  return 'no_data';
}

/**
 * GET /api/zones/health - Get data coverage by zone
 *
 * Shows which zones have enough data for reliable pricing
 * and which need more contributions.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const params = querySchema.safeParse({
      country: searchParams.get('country'),
      city: searchParams.get('city'),
    });

    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: params.error.issues },
        { status: 400 }
      );
    }

    const { country, city } = params.data;

    // Get all zones
    let zonesQuery = supabase
      .from('pricewaze_zones')
      .select('id, name, city, avg_price_m2');

    if (city) {
      zonesQuery = zonesQuery.eq('city', city);
    }

    const { data: zones, error: zonesError } = await zonesQuery;

    if (zonesError) {
      throw zonesError;
    }

    // Get property counts per zone
    const { data: propertyCounts, error: countError } = await supabase
      .from('pricewaze_properties')
      .select('zone_id, created_at')
      .eq('status', 'active')
      .not('zone_id', 'is', null);

    if (countError) {
      throw countError;
    }

    // Aggregate counts by zone
    const zoneStats: Record<string, { count: number; lastUpdate: string | null }> = {};
    for (const prop of propertyCounts || []) {
      if (!prop.zone_id) continue;

      if (!zoneStats[prop.zone_id]) {
        zoneStats[prop.zone_id] = { count: 0, lastUpdate: null };
      }

      zoneStats[prop.zone_id].count++;

      if (!zoneStats[prop.zone_id].lastUpdate ||
          prop.created_at > zoneStats[prop.zone_id].lastUpdate!) {
        zoneStats[prop.zone_id].lastUpdate = prop.created_at;
      }
    }

    // Build zone health data
    const zoneHealthData: ZoneHealthData[] = (zones || []).map(zone => {
      const stats = zoneStats[zone.id] || { count: 0, lastUpdate: null };
      const health = getZoneHealth(stats.count);

      return {
        zone_id: zone.id,
        name: zone.name,
        city: zone.city,
        property_count: stats.count,
        avg_price_m2: zone.avg_price_m2,
        avg_trust_score: stats.count > 0 ? 0.7 : 0, // TODO: Calculate from actual trust scores
        last_update: stats.lastUpdate,
        health,
        call_to_action: health === 'needs_data' || health === 'no_data',
      };
    });

    // Sort by property count descending
    zoneHealthData.sort((a, b) => b.property_count - a.property_count);

    // Calculate summary stats
    const totalZones = zoneHealthData.length;
    const zonesWithData = zoneHealthData.filter(z => z.property_count > 0).length;
    const zonesExcellent = zoneHealthData.filter(z => z.health === 'excellent').length;
    const zonesGood = zoneHealthData.filter(z => z.health === 'good').length;
    const zonesFair = zoneHealthData.filter(z => z.health === 'fair').length;
    const zonesNeedData = zoneHealthData.filter(z => z.health === 'needs_data').length;
    const zonesNoData = zoneHealthData.filter(z => z.health === 'no_data').length;

    const totalProperties = propertyCounts?.length || 0;

    return NextResponse.json({
      country: country || 'all',
      city: city || null,
      summary: {
        total_zones: totalZones,
        zones_with_data: zonesWithData,
        total_properties: totalProperties,
        coverage_percentage: totalZones > 0
          ? Math.round((zonesWithData / totalZones) * 100 * 10) / 10
          : 0,
        health_distribution: {
          excellent: zonesExcellent,
          good: zonesGood,
          fair: zonesFair,
          needs_data: zonesNeedData,
          no_data: zonesNoData,
        },
      },
      zones: zoneHealthData,
      recommendations: generateRecommendations(zoneHealthData),
    });

  } catch (error) {
    logger.error('Zone health endpoint error', error);
    return NextResponse.json(
      { error: 'Failed to get zone health' },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations for improving data coverage
 */
function generateRecommendations(zones: ZoneHealthData[]): string[] {
  const recommendations: string[] = [];

  const needsData = zones.filter(z => z.call_to_action);
  const noData = zones.filter(z => z.health === 'no_data');

  if (noData.length > 0) {
    const topNoData = noData.slice(0, 3).map(z => z.name).join(', ');
    recommendations.push(
      `${noData.length} zones have no data. Priority zones: ${topNoData}`
    );
  }

  if (needsData.length > 0) {
    recommendations.push(
      `${needsData.length} zones need more contributions for reliable pricing`
    );
  }

  const lowCoverage = zones.filter(z =>
    z.property_count > 0 && z.property_count < 5
  );

  if (lowCoverage.length > 0) {
    recommendations.push(
      `${lowCoverage.length} zones have less than 5 properties - pricing confidence is low`
    );
  }

  const staleZones = zones.filter(z => {
    if (!z.last_update) return false;
    const daysSinceUpdate = (Date.now() - new Date(z.last_update).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 90; // 3 months
  });

  if (staleZones.length > 0) {
    recommendations.push(
      `${staleZones.length} zones haven't received new data in 90+ days`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Data coverage is healthy across all zones');
  }

  return recommendations;
}

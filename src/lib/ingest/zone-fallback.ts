// Zone Fallback System
// Never return "no data" - always provide reference with confidence level

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Zone } from '@/types/database';

export type ReferenceScope =
  | 'exact_zone'      // Exact zone match (barrio)
  | 'expanded_zone'   // 1-3km radius
  | 'city'            // Same city
  | 'similar_city'    // Comparable socioeconomic city
  | 'country'         // Country baseline
  | 'global';         // Global fallback

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface ZoneFallbackResult {
  zone_id: string | null;
  zone_name: string;
  reference_scope: ReferenceScope;
  confidence_level: ConfidenceLevel;
  confidence_score: number;  // 0-100
  sample_size: number;
  avg_price_m2: number;
  median_price_m2: number | null;
  price_range: { min: number; max: number };
  warning?: string;
}

// Minimum properties needed for each confidence level
const MIN_PROPERTIES_HIGH = 10;
const MIN_PROPERTIES_MEDIUM = 5;
const MIN_PROPERTIES_LOW = 3;

// Confidence multipliers by scope
const SCOPE_CONFIDENCE: Record<ReferenceScope, number> = {
  exact_zone: 1.0,
  expanded_zone: 0.8,
  city: 0.6,
  similar_city: 0.4,
  country: 0.25,
  global: 0.1,
};

// Similar cities mapping (for socioeconomic matching)
const SIMILAR_CITIES: Record<string, string[]> = {
  // Dominican Republic
  'Santo Domingo': ['Santiago', 'La Romana'],
  'Santiago': ['Santo Domingo', 'Puerto Plata'],
  'Punta Cana': ['La Romana', 'Puerto Plata'],

  // Mexico
  'Ciudad de México': ['Guadalajara', 'Monterrey'],
  'Guadalajara': ['Ciudad de México', 'Puebla'],
  'Monterrey': ['Ciudad de México', 'Guadalajara'],

  // Spain
  'Madrid': ['Barcelona', 'Valencia'],
  'Barcelona': ['Madrid', 'Valencia'],

  // Colombia
  'Bogotá': ['Medellín', 'Cali'],
  'Medellín': ['Bogotá', 'Cali'],

  // USA
  'Miami': ['Fort Lauderdale', 'Orlando'],
  'New York': ['Los Angeles', 'Chicago'],
};

// Country baseline averages (USD/m2) - rough estimates
const COUNTRY_BASELINES: Record<string, number> = {
  'DO': 1200,   // Dominican Republic
  'US': 2500,   // United States
  'MX': 1100,   // Mexico
  'ES': 2200,   // Spain
  'CO': 900,    // Colombia
  'global': 1500,
};

/**
 * Calculate confidence level from score
 */
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

/**
 * Calculate confidence score based on sample size and scope
 */
function calculateConfidence(sampleSize: number, scope: ReferenceScope): number {
  const scopeMultiplier = SCOPE_CONFIDENCE[scope];

  // Sample size contribution (0-100)
  let sampleScore: number;
  if (sampleSize >= MIN_PROPERTIES_HIGH) {
    sampleScore = 100;
  } else if (sampleSize >= MIN_PROPERTIES_MEDIUM) {
    sampleScore = 70 + (sampleSize - MIN_PROPERTIES_MEDIUM) * 6;
  } else if (sampleSize >= MIN_PROPERTIES_LOW) {
    sampleScore = 40 + (sampleSize - MIN_PROPERTIES_LOW) * 15;
  } else if (sampleSize > 0) {
    sampleScore = sampleSize * 13;
  } else {
    sampleScore = 0;
  }

  return Math.round(sampleScore * scopeMultiplier);
}

/**
 * Get properties in exact zone
 */
async function getPropertiesInZone(
  supabase: SupabaseClient,
  zoneId: string
): Promise<Array<{ price: number; area_m2: number }>> {
  const { data, error } = await supabase
    .from('pricewaze_properties')
    .select('price, area_m2')
    .eq('zone_id', zoneId)
    .eq('status', 'active')
    .gt('area_m2', 0);

  return error ? [] : (data || []);
}

/**
 * Get properties within radius (expanded zone)
 */
async function getPropertiesInRadius(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<Array<{ price: number; area_m2: number }>> {
  // Approximate degree conversion (1 degree ≈ 111km)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const { data, error } = await supabase
    .from('pricewaze_properties')
    .select('price, area_m2')
    .eq('status', 'active')
    .gt('area_m2', 0)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta);

  return error ? [] : (data || []);
}

/**
 * Get properties in city
 */
async function getPropertiesInCity(
  supabase: SupabaseClient,
  city: string
): Promise<Array<{ price: number; area_m2: number }>> {
  // Get zones in city first
  const { data: zones } = await supabase
    .from('pricewaze_zones')
    .select('id')
    .eq('city', city);

  if (!zones || zones.length === 0) return [];

  const zoneIds = zones.map((z: any) => z.id);

  const { data, error } = await supabase
    .from('pricewaze_properties')
    .select('price, area_m2')
    .in('zone_id', zoneIds)
    .eq('status', 'active')
    .gt('area_m2', 0);

  return error ? [] : (data || []);
}

/**
 * Calculate stats from properties array
 */
function calculateStats(
  properties: Array<{ price: number; area_m2: number }>
): { avg: number; median: number | null; min: number; max: number } {
  if (properties.length === 0) {
    return { avg: 0, median: null, min: 0, max: 0 };
  }

  const pricesPerM2 = properties
    .map(p => p.price / p.area_m2)
    .filter(p => !isNaN(p) && isFinite(p));

  if (pricesPerM2.length === 0) {
    return { avg: 0, median: null, min: 0, max: 0 };
  }

  const sorted = [...pricesPerM2].sort((a, b) => a - b);
  const avg = pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  return {
    avg: Math.round(avg),
    median: Math.round(median),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

/**
 * Main fallback function - NEVER returns no data
 */
export async function getZonePricingWithFallback(
  supabase: SupabaseClient,
  zone: Zone | null,
  coordinates?: { lat: number; lng: number },
  marketCode: string = 'global'
): Promise<ZoneFallbackResult> {

  // Level 1: Exact Zone
  if (zone) {
    const properties = await getPropertiesInZone(supabase, zone.id);

    if (properties.length >= MIN_PROPERTIES_LOW) {
      const stats = calculateStats(properties);
      const confidence = calculateConfidence(properties.length, 'exact_zone');

      return {
        zone_id: zone.id,
        zone_name: zone.name,
        reference_scope: 'exact_zone',
        confidence_level: getConfidenceLevel(confidence),
        confidence_score: confidence,
        sample_size: properties.length,
        avg_price_m2: stats.avg,
        median_price_m2: stats.median,
        price_range: { min: stats.min, max: stats.max },
      };
    }
  }

  // Level 2: Expanded Zone (1-3km radius)
  if (coordinates || zone) {
    const lat = coordinates?.lat ?? 0;
    const lng = coordinates?.lng ?? 0;

    // Try 2km first, then 5km
    for (const radius of [2, 5]) {
      const properties = await getPropertiesInRadius(supabase, lat, lng, radius);

      if (properties.length >= MIN_PROPERTIES_LOW) {
        const stats = calculateStats(properties);
        const confidence = calculateConfidence(properties.length, 'expanded_zone');

        return {
          zone_id: zone?.id || null,
          zone_name: zone?.name || `${radius}km radius`,
          reference_scope: 'expanded_zone',
          confidence_level: getConfidenceLevel(confidence),
          confidence_score: confidence,
          sample_size: properties.length,
          avg_price_m2: stats.avg,
          median_price_m2: stats.median,
          price_range: { min: stats.min, max: stats.max },
          warning: `Using ${radius}km expanded zone due to limited data in exact location`,
        };
      }
    }
  }

  // Level 3: City
  if (zone?.city) {
    const properties = await getPropertiesInCity(supabase, zone.city);

    if (properties.length >= MIN_PROPERTIES_LOW) {
      const stats = calculateStats(properties);
      const confidence = calculateConfidence(properties.length, 'city');

      return {
        zone_id: null,
        zone_name: zone.city,
        reference_scope: 'city',
        confidence_level: getConfidenceLevel(confidence),
        confidence_score: confidence,
        sample_size: properties.length,
        avg_price_m2: stats.avg,
        median_price_m2: stats.median,
        price_range: { min: stats.min, max: stats.max },
        warning: `Using city-wide average for ${zone.city} due to limited neighborhood data`,
      };
    }

    // Level 4: Similar City
    const similarCities = SIMILAR_CITIES[zone.city] || [];
    for (const similarCity of similarCities) {
      const properties = await getPropertiesInCity(supabase, similarCity);

      if (properties.length >= MIN_PROPERTIES_LOW) {
        const stats = calculateStats(properties);
        const confidence = calculateConfidence(properties.length, 'similar_city');

        return {
          zone_id: null,
          zone_name: similarCity,
          reference_scope: 'similar_city',
          confidence_level: getConfidenceLevel(confidence),
          confidence_score: confidence,
          sample_size: properties.length,
          avg_price_m2: stats.avg,
          median_price_m2: stats.median,
          price_range: { min: stats.min, max: stats.max },
          warning: `Using comparable city (${similarCity}) data - limited local data available`,
        };
      }
    }
  }

  // Level 5: Country Baseline
  const countryBaseline = COUNTRY_BASELINES[marketCode] || COUNTRY_BASELINES.global;

  return {
    zone_id: null,
    zone_name: `${marketCode.toUpperCase()} baseline`,
    reference_scope: 'country',
    confidence_level: 'very_low',
    confidence_score: calculateConfidence(0, 'country'),
    sample_size: 0,
    avg_price_m2: countryBaseline,
    median_price_m2: null,
    price_range: { min: countryBaseline * 0.5, max: countryBaseline * 2 },
    warning: `No local data available - using ${marketCode.toUpperCase()} country baseline estimate`,
  };
}

/**
 * Get zone health status
 */
export async function getZoneHealth(
  supabase: SupabaseClient,
  zoneId: string
): Promise<{
  zone_id: string;
  property_count: number;
  data_quality: 'excellent' | 'good' | 'fair' | 'poor' | 'no_data';
  recommendation: string;
}> {
  const { data, error } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .eq('zone_id', zoneId)
    .eq('status', 'active');

  const count = error ? 0 : (data?.length || 0);

  let quality: 'excellent' | 'good' | 'fair' | 'poor' | 'no_data';
  let recommendation: string;

  if (count >= 20) {
    quality = 'excellent';
    recommendation = 'High confidence pricing available';
  } else if (count >= 10) {
    quality = 'good';
    recommendation = 'Good pricing reference available';
  } else if (count >= 5) {
    quality = 'fair';
    recommendation = 'Consider adding more listings to improve accuracy';
  } else if (count > 0) {
    quality = 'poor';
    recommendation = 'Limited data - pricing estimates have low confidence';
  } else {
    quality = 'no_data';
    recommendation = 'No listings in this zone - contribute data to enable pricing';
  }

  return {
    zone_id: zoneId,
    property_count: count,
    data_quality: quality,
    recommendation,
  };
}

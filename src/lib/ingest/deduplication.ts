// Property Deduplication Logic
// Detect duplicate properties from different sources

import type { NormalizedProperty, DeduplicationMatch } from '@/types/ingest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Distance threshold in meters for location-based matching
const LOCATION_THRESHOLD_METERS = 100;

// Price similarity threshold (10% difference)
const PRICE_SIMILARITY_THRESHOLD = 0.1;

// Area similarity threshold (10% difference)
const AREA_SIMILARITY_THRESHOLD = 0.1;

/**
 * Calculate Haversine distance between two coordinates in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate similarity score between two values
 */
function valueSimilarity(a: number, b: number): number {
  if (a === 0 && b === 0) return 1;
  if (a === 0 || b === 0) return 0;
  return 1 - Math.abs(a - b) / Math.max(a, b);
}

/**
 * Normalize string for comparison
 */
function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if two properties might be duplicates
 */
export function checkDuplicateMatch(
  newProp: NormalizedProperty,
  existingProp: {
    id: string;
    title: string;
    price: number;
    area_m2: number;
    latitude: number;
    longitude: number;
    address: string;
    property_type: string;
  }
): DeduplicationMatch | null {
  const matchedFields: string[] = [];
  let confidence = 0;

  // Check location proximity
  const distance = haversineDistance(
    newProp.latitude,
    newProp.longitude,
    existingProp.latitude,
    existingProp.longitude
  );

  const isNearby = distance <= LOCATION_THRESHOLD_METERS;

  // Exact location match (within 10 meters)
  if (distance <= 10) {
    matchedFields.push('exact_location');
    confidence += 40;
  } else if (isNearby) {
    matchedFields.push('nearby_location');
    confidence += 25;
  }

  // Price similarity
  const priceSimilarity = valueSimilarity(newProp.price, existingProp.price);
  if (priceSimilarity >= 0.95) {
    matchedFields.push('exact_price');
    confidence += 20;
  } else if (priceSimilarity >= 1 - PRICE_SIMILARITY_THRESHOLD) {
    matchedFields.push('similar_price');
    confidence += 10;
  }

  // Area similarity
  const areaSimilarity = valueSimilarity(newProp.area_m2, existingProp.area_m2);
  if (areaSimilarity >= 0.95) {
    matchedFields.push('exact_area');
    confidence += 20;
  } else if (areaSimilarity >= 1 - AREA_SIMILARITY_THRESHOLD) {
    matchedFields.push('similar_area');
    confidence += 10;
  }

  // Property type match
  if (newProp.property_type === existingProp.property_type) {
    matchedFields.push('property_type');
    confidence += 10;
  }

  // Title similarity (normalized)
  const newTitle = normalizeString(newProp.title);
  const existingTitle = normalizeString(existingProp.title);
  if (newTitle === existingTitle) {
    matchedFields.push('exact_title');
    confidence += 15;
  } else if (newTitle.includes(existingTitle) || existingTitle.includes(newTitle)) {
    matchedFields.push('similar_title');
    confidence += 8;
  }

  // Address match
  const newAddress = normalizeString(newProp.address);
  const existingAddress = normalizeString(existingProp.address);
  if (newAddress === existingAddress) {
    matchedFields.push('exact_address');
    confidence += 15;
  }

  // Determine match type
  if (confidence < 40) {
    return null; // Not a duplicate
  }

  let matchType: 'exact' | 'location' | 'similar';
  if (confidence >= 80) {
    matchType = 'exact';
  } else if (matchedFields.includes('exact_location') || matchedFields.includes('nearby_location')) {
    matchType = 'location';
  } else {
    matchType = 'similar';
  }

  return {
    property_id: existingProp.id,
    match_type: matchType,
    confidence: Math.min(confidence, 100),
    matched_fields: matchedFields,
  };
}

/**
 * Find duplicate properties in database
 */
export async function findDuplicates(
  supabase: SupabaseClient,
  property: NormalizedProperty
): Promise<DeduplicationMatch[]> {
  // Query properties in the same geographic area
  // Use a bounding box query first for efficiency
  const latRange = 0.001; // ~100m
  const lngRange = 0.001;

  const { data: candidates, error } = await supabase
    .from('pricewaze_properties')
    .select('id, title, price, area_m2, latitude, longitude, address, property_type')
    .gte('latitude', property.latitude - latRange)
    .lte('latitude', property.latitude + latRange)
    .gte('longitude', property.longitude - lngRange)
    .lte('longitude', property.longitude + lngRange)
    .eq('status', 'active')
    .limit(50);

  if (error || !candidates) {
    return [];
  }

  const matches: DeduplicationMatch[] = [];

  for (const candidate of candidates) {
    const match = checkDuplicateMatch(property, candidate);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if property should be skipped based on source_id
 */
export async function findBySourceId(
  supabase: SupabaseClient,
  sourceId: string,
  sourceName: string
): Promise<string | null> {
  // Look for source_id in the description or a metadata field
  // This is a simple implementation - could be enhanced with a dedicated field
  const searchPattern = `source:${sourceName}:${sourceId}`;

  const { data, error } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .ilike('description', `%${searchPattern}%`)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

/**
 * Add source tracking to property description
 */
export function addSourceTracking(
  description: string | null,
  source: string,
  sourceName: string,
  sourceId?: string
): string {
  const sourceTag = sourceId
    ? `\n\n---\nsource:${sourceName}:${sourceId}`
    : `\n\n---\nsource:${sourceName}`;

  return (description || '') + sourceTag;
}

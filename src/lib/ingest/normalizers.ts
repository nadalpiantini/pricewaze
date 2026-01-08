// Property Data Normalizers
// Transform raw input from various sources into normalized format

import type { RawPropertyInput, NormalizedProperty } from '@/types/ingest';
import type { PropertyType } from '@/types/database';

// Property type normalization map
const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  // Spanish
  'apartamento': 'apartment',
  'apartamentos': 'apartment',
  'apto': 'apartment',
  'piso': 'apartment',
  'casa': 'house',
  'casas': 'house',
  'villa': 'house',
  'chalet': 'house',
  'terreno': 'land',
  'solar': 'land',
  'lote': 'land',
  'parcela': 'land',
  'finca': 'land',
  'comercial': 'commercial',
  'local': 'commercial',
  'tienda': 'commercial',
  'negocio': 'commercial',
  'oficina': 'office',
  'oficinas': 'office',
  // English
  'apartment': 'apartment',
  'condo': 'apartment',
  'condominium': 'apartment',
  'flat': 'apartment',
  'house': 'house',
  'home': 'house',
  'single family': 'house',
  'townhouse': 'house',
  'land': 'land',
  'lot': 'land',
  'plot': 'land',
  'commercial': 'commercial',
  'retail': 'commercial',
  'store': 'commercial',
  'office': 'office',
};

// Area conversion factors to m2
const AREA_CONVERSION: Record<string, number> = {
  'm2': 1,
  'sqft': 0.092903,
  'varas': 0.6987,      // Dominican varas cuadradas
  'sqm': 1,
  'sf': 0.092903,
};

// Currency normalization by market
const MARKET_CURRENCIES: Record<string, string> = {
  'DO': 'DOP',
  'US': 'USD',
  'MX': 'MXN',
  'ES': 'EUR',
  'CO': 'COP',
  'global': 'USD',
};

/**
 * Normalize property type from various formats
 */
export function normalizePropertyType(type: string | undefined): PropertyType {
  if (!type) return 'apartment';

  const normalized = type.toLowerCase().trim();
  return PROPERTY_TYPE_MAP[normalized] || 'apartment';
}

/**
 * Convert area to square meters
 */
export function normalizeArea(area: number | undefined, unit: string = 'm2'): number {
  if (!area || area <= 0) return 0;

  const factor = AREA_CONVERSION[unit.toLowerCase()] || 1;
  return Math.round(area * factor * 100) / 100;
}

/**
 * Parse number from string with various formats
 */
export function parseNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  // Remove currency symbols, commas, spaces
  const cleaned = value
    .toString()
    .replace(/[$€RD\s,]/gi, '')
    .replace(/\./g, (match, offset, string) => {
      // Handle European number format (1.234.567,89)
      const afterDot = string.slice(offset + 1);
      if (afterDot.includes('.') || afterDot.includes(',')) {
        return ''; // This is a thousands separator
      }
      return match; // This is a decimal point
    })
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extract features from description text
 */
export function extractFeatures(description: string | undefined, existingFeatures?: string[]): string[] {
  const features = new Set(existingFeatures || []);

  if (!description) return Array.from(features);

  const text = description.toLowerCase();

  // Feature detection patterns (Spanish/English)
  const featurePatterns: Record<string, RegExp> = {
    'pool': /piscina|pool|alberca/i,
    'garage': /garage|garaje|cochera/i,
    'garden': /jardin|jardín|garden|patio/i,
    'terrace': /terraza|terrace|balcon|balcón|balcony/i,
    'air_conditioning': /aire acondicionado|a\/c|ac|air conditioning|clima/i,
    'elevator': /ascensor|elevador|elevator/i,
    'security': /seguridad|vigilancia|security|guardia|portero/i,
    'gym': /gimnasio|gym|fitness/i,
    'furnished': /amueblado|amoblado|furnished|muebles incluidos/i,
    'sea_view': /vista al mar|ocean view|sea view|frente al mar/i,
    'new_construction': /nuevo|new construction|estrenar|a estrenar/i,
    'pet_friendly': /mascotas|pets allowed|pet friendly/i,
  };

  for (const [feature, pattern] of Object.entries(featurePatterns)) {
    if (pattern.test(text)) {
      features.add(feature);
    }
  }

  return Array.from(features);
}

/**
 * Clean and normalize title
 */
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 200); // Max 200 chars
}

/**
 * Clean and normalize description
 */
export function normalizeDescription(description: string | undefined): string | null {
  if (!description) return null;

  return description
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 5000); // Max 5000 chars
}

/**
 * Validate and normalize coordinates
 */
export function normalizeCoordinates(
  lat: number | undefined,
  lng: number | undefined
): { latitude: number; longitude: number } | null {
  if (lat === undefined || lng === undefined) return null;

  // Validate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  // Check for obviously wrong values (0,0 is in the ocean)
  if (lat === 0 && lng === 0) return null;

  return {
    latitude: Math.round(lat * 1000000) / 1000000, // 6 decimal places
    longitude: Math.round(lng * 1000000) / 1000000,
  };
}

/**
 * Filter and validate image URLs
 * Rejects placeholder URLs, example.com, and invalid URLs
 */
export function normalizeImages(images: string[] | undefined): string[] {
  if (!images || !Array.isArray(images)) return [];

  return images
    .filter(url => {
      if (!url || typeof url !== 'string') return false;
      
      // Reject placeholder URLs
      if (url.includes('placeholder') || url.includes('example.com')) {
        return false;
      }
      
      // Must be a valid URL
      try {
        const parsed = new URL(url);
        // Must be http or https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 20); // Max 20 images
}

/**
 * Main normalization function
 */
export function normalizeProperty(
  raw: RawPropertyInput,
  marketCode: string = 'global'
): { property: NormalizedProperty; warnings: string[] } | { error: string } {
  const warnings: string[] = [];

  // Required: title
  if (!raw.title || raw.title.trim().length === 0) {
    return { error: 'Title is required' };
  }

  // Required: price
  const price = parseNumber(raw.price);
  if (!price || price <= 0) {
    return { error: 'Valid price is required' };
  }

  // Required: location
  const coords = normalizeCoordinates(raw.latitude, raw.longitude);
  if (!coords && !raw.address) {
    return { error: 'Either coordinates or address is required' };
  }

  // Normalize area
  let area_m2 = normalizeArea(raw.area, raw.area_unit || 'm2');
  if (area_m2 === 0) {
    warnings.push('Area is missing or invalid, defaulting to 0');
  }

  // Build address from parts if not provided
  let address = raw.address || '';
  if (!address && (raw.city || raw.zone)) {
    address = [raw.zone, raw.city].filter(Boolean).join(', ');
  }
  if (!address && coords) {
    address = `${coords.latitude}, ${coords.longitude}`;
    warnings.push('Address missing, using coordinates');
  }

  // Default coordinates if missing (will need geocoding later)
  const finalCoords = coords || { latitude: 0, longitude: 0 };
  if (!coords) {
    warnings.push('Coordinates missing, geocoding required');
  }

  const property: NormalizedProperty = {
    title: normalizeTitle(raw.title),
    description: normalizeDescription(raw.description),
    property_type: normalizePropertyType(raw.property_type),
    price,
    area_m2,
    bedrooms: parseNumber(raw.bedrooms),
    bathrooms: parseNumber(raw.bathrooms),
    parking_spaces: parseNumber(raw.parking_spaces),
    year_built: parseNumber(raw.year_built),
    address,
    latitude: finalCoords.latitude,
    longitude: finalCoords.longitude,
    images: normalizeImages(raw.images),
    features: extractFeatures(raw.description, raw.features),
    status: 'active',
  };

  return { property, warnings };
}

/**
 * Batch normalize properties
 */
export function normalizeProperties(
  rawProperties: RawPropertyInput[],
  marketCode: string = 'global'
): {
  normalized: Array<{ index: number; property: NormalizedProperty; warnings: string[] }>;
  failed: Array<{ index: number; error: string; raw: RawPropertyInput }>;
} {
  const normalized: Array<{ index: number; property: NormalizedProperty; warnings: string[] }> = [];
  const failed: Array<{ index: number; error: string; raw: RawPropertyInput }> = [];

  for (let i = 0; i < rawProperties.length; i++) {
    const result = normalizeProperty(rawProperties[i], marketCode);

    if ('error' in result) {
      failed.push({ index: i, error: result.error, raw: rawProperties[i] });
    } else {
      normalized.push({ index: i, property: result.property, warnings: result.warnings });
    }
  }

  return { normalized, failed };
}

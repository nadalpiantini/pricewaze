// Scraper Configurations
// Define how each portal should be scraped and transformed

import type { RawPropertyInput } from '@/types/ingest';
import type {
  ScraperConfig,
  ScraperName,
  SuperCasasRawItem,
  CorotosRawItem,
  RawScrapedItem,
} from '@/types/scraper';

// ============================================
// TRANSFORMERS
// ============================================

/**
 * Parse price string to number
 * Handles formats like: "RD$ 150,000", "$150000", "150.000"
 */
function parsePrice(priceStr: string | number | undefined): number | null {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return null;

  // Remove currency symbols, spaces, and parse
  const cleaned = priceStr
    .replace(/[RD$USD€]/gi, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
    .replace(/\./g, ''); // Handle thousands separator

  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Parse area string to number (always in m2)
 */
function parseArea(areaStr: string | number | undefined, unit?: string): number | null {
  if (typeof areaStr === 'number') return areaStr;
  if (!areaStr) return null;

  // Extract number
  const match = areaStr.toString().match(/[\d,.]+/);
  if (!match) return null;

  const num = parseFloat(match[0].replace(',', '.'));
  if (isNaN(num)) return null;

  // Convert to m2 if needed
  const lowerUnit = (unit || areaStr).toLowerCase();
  if (lowerUnit.includes('sqft') || lowerUnit.includes('sq ft') || lowerUnit.includes('pie')) {
    return Math.round(num * 0.0929); // sqft to m2
  }
  if (lowerUnit.includes('vara')) {
    return Math.round(num * 0.6987); // varas to m2 (Dominican varas)
  }

  return Math.round(num);
}

/**
 * Parse bedrooms/bathrooms/parking string to number
 */
function parseRooms(value: string | number | undefined): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;

  const match = value.toString().match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Normalize property type
 */
function normalizePropertyType(
  type: string | undefined
): 'apartment' | 'house' | 'land' | 'commercial' | 'office' {
  if (!type) return 'house';

  const lower = type.toLowerCase();

  if (lower.includes('apart') || lower.includes('apto') || lower.includes('piso')) {
    return 'apartment';
  }
  if (lower.includes('casa') || lower.includes('house') || lower.includes('villa')) {
    return 'house';
  }
  if (lower.includes('terren') || lower.includes('solar') || lower.includes('land') || lower.includes('lote')) {
    return 'land';
  }
  if (lower.includes('comercial') || lower.includes('local') || lower.includes('commercial')) {
    return 'commercial';
  }
  if (lower.includes('oficina') || lower.includes('office')) {
    return 'office';
  }

  return 'house';
}

/**
 * Extract city and zone from location string
 */
function parseLocation(location: string | undefined): { city: string | null; zone: string | null } {
  if (!location) return { city: null, zone: null };

  // Common patterns: "Zone, City" or "City - Zone" or "Zone (City)"
  const parts = location.split(/[,\-()]/).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    // Assume last part is city, first is zone
    return {
      zone: parts[0],
      city: parts[parts.length - 1],
    };
  }

  return { city: parts[0] || null, zone: null };
}

// ============================================
// SUPERCASAS TRANSFORMER
// ============================================

function transformSuperCasas(raw: unknown): RawPropertyInput | null {
  const item = raw as SuperCasasRawItem;

  if (!item.titulo || !item.precio) {
    return null;
  }

  const price = parsePrice(item.precio);
  if (!price || price < 1000) {
    return null; // Skip invalid prices
  }

  const area = parseArea(item.metros);
  const { city, zone } = parseLocation(item.sector || item.ciudad);

  return {
    title: item.titulo.trim(),
    price,
    currency: item.moneda?.includes('USD') ? 'USD' : 'DOP',
    area: area || undefined,
    area_unit: 'm2',
    address: item.direccion,
    city: city ?? item.ciudad ?? undefined,
    zone: zone ?? item.sector ?? undefined,
    property_type: normalizePropertyType(item.tipo),
    bedrooms: parseRooms(item.habitaciones) ?? undefined,
    bathrooms: parseRooms(item.banos) ?? undefined,
    parking_spaces: parseRooms(item.parqueos) ?? undefined,
    description: item.descripcion,
    images: item.imagenes || [],
    features: item.caracteristicas || [],
    source_url: item.url,
    source_id: item.id,
    source_updated_at: item.fechaPublicacion,
  };
}

// ============================================
// COROTOS TRANSFORMER
// ============================================

function transformCorotos(raw: unknown): RawPropertyInput | null {
  const item = raw as CorotosRawItem;

  if (!item.title || !item.price) {
    return null;
  }

  const price = parsePrice(item.price);
  if (!price || price < 1000) {
    return null;
  }

  const { city, zone } = parseLocation(item.location);

  // Extract attributes
  const attrs = item.attributes || {};
  const area = parseArea(attrs['Metros cuadrados'] || attrs['Area'] || attrs['Tamaño']);
  const bedrooms = parseRooms(attrs['Habitaciones'] || attrs['Dormitorios']);
  const bathrooms = parseRooms(attrs['Baños']);
  const parking = parseRooms(attrs['Parqueos'] || attrs['Estacionamientos']);

  return {
    title: item.title.trim(),
    price,
    currency: item.price.includes('USD') ? 'USD' : 'DOP',
    area: area || undefined,
    area_unit: 'm2',
    address: item.location,
    city: city ?? undefined,
    zone: zone ?? undefined,
    property_type: normalizePropertyType(item.category),
    bedrooms: bedrooms ?? undefined,
    bathrooms: bathrooms ?? undefined,
    parking_spaces: parking ?? undefined,
    description: item.description,
    images: item.images || [],
    source_url: item.url,
    source_id: item.id,
    source_updated_at: item.publishedDate,
  };
}

// ============================================
// GENERIC TRANSFORMER (for standard format)
// ============================================

function transformGeneric(raw: unknown): RawPropertyInput | null {
  const item = raw as RawScrapedItem;

  if (!item.title || !item.price) {
    return null;
  }

  const price = parsePrice(item.price);
  if (!price || price < 1000) {
    return null;
  }

  return {
    title: item.title.trim(),
    price,
    currency: item.currency,
    area: parseArea(item.area, item.areaUnit) || undefined,
    area_unit: 'm2',
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    city: item.city,
    zone: item.zone,
    property_type: normalizePropertyType(item.propertyType),
    bedrooms: parseRooms(item.bedrooms) ?? undefined,
    bathrooms: parseRooms(item.bathrooms) ?? undefined,
    parking_spaces: parseRooms(item.parking) ?? undefined,
    description: item.description,
    images: item.images || [],
    features: item.features || [],
    source_url: item.url,
    source_id: item.sourceId,
    source_updated_at: item.publishedAt,
  };
}

// ============================================
// SCRAPER CONFIGURATIONS
// ============================================

export const SCRAPER_CONFIGS: Record<ScraperName, ScraperConfig> = {
  supercasas: {
    name: 'supercasas',
    displayName: 'SuperCasas',
    country: 'Dominican Republic',
    marketCode: 'DO',
    baseUrl: 'https://www.supercasas.com',
    enabled: true,
    apifyActorId: process.env.APIFY_ACTOR_SUPERCASAS,
    defaultParams: {
      maxItems: 50,
      city: 'Santo Domingo',
    },
    rateLimit: {
      maxRequestsPerMinute: 30,
      maxConcurrency: 3,
    },
    transform: transformSuperCasas,
  },

  corotos: {
    name: 'corotos',
    displayName: 'Corotos',
    country: 'Dominican Republic',
    marketCode: 'DO',
    baseUrl: 'https://www.corotos.com.do',
    enabled: true,
    apifyActorId: process.env.APIFY_ACTOR_COROTOS,
    defaultParams: {
      maxItems: 50,
      city: 'Santo Domingo',
    },
    rateLimit: {
      maxRequestsPerMinute: 20,
      maxConcurrency: 2,
    },
    transform: transformCorotos,
  },

  inmuebles24: {
    name: 'inmuebles24',
    displayName: 'Inmuebles24',
    country: 'Mexico',
    marketCode: 'MX',
    baseUrl: 'https://www.inmuebles24.com',
    enabled: false, // Future
    defaultParams: {
      maxItems: 50,
    },
    rateLimit: {
      maxRequestsPerMinute: 20,
      maxConcurrency: 2,
    },
    transform: transformGeneric,
  },

  fotocasa: {
    name: 'fotocasa',
    displayName: 'Fotocasa',
    country: 'Spain',
    marketCode: 'ES',
    baseUrl: 'https://www.fotocasa.es',
    enabled: false, // Future
    defaultParams: {
      maxItems: 50,
    },
    rateLimit: {
      maxRequestsPerMinute: 15,
      maxConcurrency: 2,
    },
    transform: transformGeneric,
  },

  craigslist: {
    name: 'craigslist',
    displayName: 'Craigslist',
    country: 'United States',
    marketCode: 'US',
    baseUrl: 'https://craigslist.org',
    enabled: false, // Future
    defaultParams: {
      maxItems: 100,
    },
    rateLimit: {
      maxRequestsPerMinute: 10,
      maxConcurrency: 1,
    },
    transform: transformGeneric,
  },
};

/**
 * Get scraper config by name
 */
export function getScraperConfig(name: ScraperName): ScraperConfig {
  const config = SCRAPER_CONFIGS[name];
  if (!config) {
    throw new Error(`Unknown scraper: ${name}`);
  }
  return config;
}

/**
 * Get all enabled scrapers
 */
export function getEnabledScrapers(): ScraperConfig[] {
  return Object.values(SCRAPER_CONFIGS).filter(c => c.enabled);
}

/**
 * Get scrapers by market
 */
export function getScrapersByMarket(marketCode: string): ScraperConfig[] {
  return Object.values(SCRAPER_CONFIGS).filter(
    c => c.enabled && c.marketCode === marketCode
  );
}

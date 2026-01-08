// Market Data Adapter Pattern
// "Phantom plugs" ready for future API integrations

import type { RawPropertyInput, PropertySource } from '@/types/ingest';
import type { Zone } from '@/types/database';

// Source weights for confidence calculation
export const SOURCE_WEIGHTS: Record<PropertySource, number> = {
  opendata: 1.0,      // Government/official data = highest trust
  api: 0.95,          // Paid API integrations
  scraper: 0.85,      // Scraped from established portals
  import: 0.8,        // Bulk imports (CSV, etc.)
  user: 0.7,          // User-contributed
  seed: 0.5,          // Development seed data
};

// Adapter interface - ready for any data source
export interface MarketDataAdapter {
  readonly name: string;
  readonly source: PropertySource;
  readonly weight: number;
  readonly enabled: boolean;

  // Core methods
  getListings(zone: Zone): Promise<RawPropertyInput[]>;
  getMarketStats(zone: Zone): Promise<MarketStats | null>;

  // Optional methods (not all sources have this)
  getRecentSales?(zone: Zone): Promise<SaleRecord[]>;
  getHistoricalPrices?(zone: Zone, months: number): Promise<PriceHistory[]>;
}

export interface MarketStats {
  zone_id: string;
  avg_price_m2: number;
  median_price_m2: number;
  total_listings: number;
  price_trend_30d: number;  // percentage change
  days_on_market_avg: number;
  source: string;
  confidence: number;
  updated_at: string;
}

export interface SaleRecord {
  property_id?: string;
  address: string;
  price: number;
  area_m2: number;
  sale_date: string;
  source: string;
}

export interface PriceHistory {
  date: string;
  avg_price_m2: number;
  median_price_m2: number;
  sample_size: number;
}

// ============================================
// ADAPTER IMPLEMENTATIONS
// ============================================

/**
 * User Adapter - Crowdsourced data from PriceWaze users
 * STATUS: ✅ ACTIVE
 */
export class UserAdapter implements MarketDataAdapter {
  readonly name = 'user';
  readonly source: PropertySource = 'user';
  readonly weight = SOURCE_WEIGHTS.user;
  readonly enabled = true;

  constructor(private supabase: any) {}

  async getListings(zone: Zone): Promise<RawPropertyInput[]> {
    const { data, error } = await this.supabase
      .from('pricewaze_properties')
      .select('*')
      .eq('zone_id', zone.id)
      .eq('status', 'active');

    if (error || !data) return [];

    return data.map((p: any) => ({
      title: p.title,
      price: p.price,
      area: p.area_m2,
      area_unit: 'm2',
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      property_type: p.property_type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      description: p.description,
      images: p.images,
      source_id: p.id,
    }));
  }

  async getMarketStats(zone: Zone): Promise<MarketStats | null> {
    const { data, error } = await this.supabase
      .from('pricewaze_properties')
      .select('price, area_m2, created_at')
      .eq('zone_id', zone.id)
      .eq('status', 'active');

    if (error || !data || data.length === 0) return null;

    const pricesPerM2 = data
      .filter((p: any) => p.area_m2 > 0)
      .map((p: any) => p.price / p.area_m2);

    if (pricesPerM2.length === 0) return null;

    const sorted = [...pricesPerM2].sort((a, b) => a - b);
    const avg = pricesPerM2.reduce((a: number, b: number) => a + b, 0) / pricesPerM2.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      zone_id: zone.id,
      avg_price_m2: Math.round(avg),
      median_price_m2: Math.round(median),
      total_listings: data.length,
      price_trend_30d: 0, // TODO: Calculate from history
      days_on_market_avg: 0,
      source: 'user',
      confidence: this.weight * Math.min(data.length / 10, 1), // More data = more confidence
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Scraper Adapter - Data from web scrapers (Apify, etc.)
 * STATUS: 🟡 STUB (ready for implementation)
 */
export class ScraperAdapter implements MarketDataAdapter {
  readonly name = 'scraper';
  readonly source: PropertySource = 'scraper';
  readonly weight = SOURCE_WEIGHTS.scraper;
  readonly enabled = false; // Enable when connected

  constructor(
    private scraperName: string,
    private apiKey?: string
  ) {}

  async getListings(zone: Zone): Promise<RawPropertyInput[]> {
    // TODO: Implement when Apify is connected
    console.log(`[ScraperAdapter:${this.scraperName}] Not implemented yet`);
    return [];
  }

  async getMarketStats(zone: Zone): Promise<MarketStats | null> {
    // TODO: Implement when Apify is connected
    return null;
  }
}

/**
 * Open Data Adapter - Government/public datasets
 * STATUS: 🟡 STUB (ready for implementation)
 */
export class OpenDataAdapter implements MarketDataAdapter {
  readonly name = 'opendata';
  readonly source: PropertySource = 'opendata';
  readonly weight = SOURCE_WEIGHTS.opendata;
  readonly enabled = false; // Enable when connected

  constructor(private dataSource: string) {}

  async getListings(zone: Zone): Promise<RawPropertyInput[]> {
    // TODO: Implement for each open data source
    console.log(`[OpenDataAdapter:${this.dataSource}] Not implemented yet`);
    return [];
  }

  async getMarketStats(zone: Zone): Promise<MarketStats | null> {
    // TODO: Implement for each open data source
    return null;
  }

  async getRecentSales(zone: Zone): Promise<SaleRecord[]> {
    // Open data often includes sales records
    // TODO: Implement
    return [];
  }
}

/**
 * Paid API Adapter - Commercial real estate APIs
 * STATUS: 🔒 STUB (for future paid integrations)
 */
export class PaidAPIAdapter implements MarketDataAdapter {
  readonly name = 'paid_api';
  readonly source: PropertySource = 'api';
  readonly weight = SOURCE_WEIGHTS.api;
  readonly enabled = false; // Enable when subscribed

  constructor(
    private provider: string,
    private apiKey?: string
  ) {}

  async getListings(zone: Zone): Promise<RawPropertyInput[]> {
    // TODO: Implement for each paid API (Zillow, ATTOM, etc.)
    console.log(`[PaidAPIAdapter:${this.provider}] Not implemented - requires subscription`);
    return [];
  }

  async getMarketStats(zone: Zone): Promise<MarketStats | null> {
    // TODO: Implement for each paid API
    return null;
  }

  async getRecentSales(zone: Zone): Promise<SaleRecord[]> {
    // Paid APIs typically have sales data
    // TODO: Implement
    return [];
  }

  async getHistoricalPrices(zone: Zone, months: number): Promise<PriceHistory[]> {
    // Paid APIs typically have historical data
    // TODO: Implement
    return [];
  }
}

// ============================================
// ADAPTER REGISTRY
// ============================================

export class AdapterRegistry {
  private adapters: Map<string, MarketDataAdapter> = new Map();

  register(adapter: MarketDataAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): MarketDataAdapter | undefined {
    return this.adapters.get(name);
  }

  getEnabled(): MarketDataAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.enabled);
  }

  getAll(): MarketDataAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get combined market stats from all enabled adapters
   * Weighted by source confidence
   */
  async getCombinedStats(zone: Zone): Promise<MarketStats | null> {
    const enabledAdapters = this.getEnabled();
    const stats: Array<MarketStats & { weight: number }> = [];

    for (const adapter of enabledAdapters) {
      const adapterStats = await adapter.getMarketStats(zone);
      if (adapterStats) {
        stats.push({ ...adapterStats, weight: adapter.weight });
      }
    }

    if (stats.length === 0) return null;

    // Weighted average
    const totalWeight = stats.reduce((sum, s) => sum + s.weight * s.confidence, 0);
    if (totalWeight === 0) return stats[0];

    const weightedAvg = stats.reduce(
      (sum, s) => sum + s.avg_price_m2 * s.weight * s.confidence,
      0
    ) / totalWeight;

    const weightedMedian = stats.reduce(
      (sum, s) => sum + s.median_price_m2 * s.weight * s.confidence,
      0
    ) / totalWeight;

    return {
      zone_id: zone.id,
      avg_price_m2: Math.round(weightedAvg),
      median_price_m2: Math.round(weightedMedian),
      total_listings: stats.reduce((sum, s) => sum + s.total_listings, 0),
      price_trend_30d: stats[0].price_trend_30d, // Use primary source
      days_on_market_avg: stats[0].days_on_market_avg,
      source: 'combined',
      confidence: Math.min(totalWeight / stats.length, 1),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Create default adapter registry
 */
export function createAdapterRegistry(supabase: any): AdapterRegistry {
  const registry = new AdapterRegistry();

  // Active adapters
  registry.register(new UserAdapter(supabase));

  // Stub adapters (ready for future)
  registry.register(new ScraperAdapter('corotos'));
  registry.register(new ScraperAdapter('supercasas'));
  registry.register(new OpenDataAdapter('catastro_es'));
  registry.register(new OpenDataAdapter('inegi_mx'));
  registry.register(new PaidAPIAdapter('zillow'));
  registry.register(new PaidAPIAdapter('attom'));

  return registry;
}

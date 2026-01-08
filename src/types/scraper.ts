// Scraper System Types
// Handles web scraping from real estate portals

import type { RawPropertyInput } from './ingest';

// Supported scraper sources
export type ScraperName =
  | 'supercasas'    // supercasas.com (DR)
  | 'corotos'       // corotos.com.do (DR)
  | 'inmuebles24'   // inmuebles24.com (MX) - future
  | 'fotocasa'      // fotocasa.es (ES) - future
  | 'craigslist';   // craigslist.org (US) - future

// Scraper configuration
export interface ScraperConfig {
  name: ScraperName;
  displayName: string;
  country: string;
  marketCode: 'DO' | 'US' | 'MX' | 'ES' | 'CO';
  baseUrl: string;
  enabled: boolean;
  apifyActorId?: string;       // Apify actor ID (if using managed actor)
  customActorPath?: string;    // Path to custom actor code
  defaultParams: ScraperParams;
  rateLimit: {
    maxRequestsPerMinute: number;
    maxConcurrency: number;
  };
  transform: (raw: unknown) => RawPropertyInput | null;
}

// Parameters for scraper execution
export interface ScraperParams {
  maxItems?: number;
  startUrls?: string[];
  searchQuery?: string;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
}

// Scraper run request
export interface ScraperRunRequest {
  scraper: ScraperName;
  params?: ScraperParams;
  options?: {
    dryRun?: boolean;           // Don't save to database
    skipDuplicates?: boolean;   // Skip if already exists
    notifyOnComplete?: boolean; // Send notification when done
  };
}

// Scraper run status
export interface ScraperRunStatus {
  id: string;
  scraper: ScraperName;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'aborted';
  startedAt: string;
  finishedAt?: string;
  itemsScraped: number;
  itemsIngested: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: string[];
  apifyRunId?: string;
  cost?: number;
}

// Raw scraped item (before transformation)
export interface RawScrapedItem {
  url: string;
  title: string;
  price: string | number;
  currency?: string;
  area?: string | number;
  areaUnit?: string;
  address?: string;
  city?: string;
  zone?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  parking?: string | number;
  description?: string;
  images?: string[];
  features?: string[];
  propertyType?: string;
  publishedAt?: string;
  scrapedAt: string;
  sourceId: string;
  raw?: Record<string, unknown>;
}

// SuperCasas specific raw format
export interface SuperCasasRawItem {
  url: string;
  titulo: string;
  precio: string;
  moneda?: string;
  metros?: string;
  direccion?: string;
  ciudad?: string;
  sector?: string;
  habitaciones?: string;
  banos?: string;
  parqueos?: string;
  descripcion?: string;
  imagenes?: string[];
  caracteristicas?: string[];
  tipo?: string;
  fechaPublicacion?: string;
  id: string;
}

// Corotos specific raw format
export interface CorotosRawItem {
  url: string;
  title: string;
  price: string;
  location?: string;
  description?: string;
  images?: string[];
  attributes?: Record<string, string>;
  category?: string;
  publishedDate?: string;
  id: string;
}

// Scraper history record (for database)
export interface ScraperHistoryRecord {
  id: string;
  scraper: ScraperName;
  status: ScraperRunStatus['status'];
  started_at: string;
  finished_at?: string;
  items_scraped: number;
  items_ingested: number;
  items_skipped: number;
  items_failed: number;
  params: ScraperParams;
  apify_run_id?: string;
  cost?: number;
  error_log?: string[];
  created_at: string;
}

// Scraper stats
export interface ScraperStats {
  scraper: ScraperName;
  totalRuns: number;
  lastRun?: string;
  lastStatus?: ScraperRunStatus['status'];
  totalItemsScraped: number;
  totalItemsIngested: number;
  successRate: number;
  avgItemsPerRun: number;
}

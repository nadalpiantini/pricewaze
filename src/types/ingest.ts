// Property Ingest System Types
// Handles data normalization from multiple sources

export type PropertySource =
  | 'user'           // Manual user input
  | 'scraper'        // Apify or custom scraper
  | 'opendata'       // Government/public data
  | 'api'            // External API integration
  | 'import'         // Bulk CSV/JSON import
  | 'seed';          // Development seed data

export type ScraperSource =
  | 'corotos'        // corotos.com.do (DR)
  | 'supercasas'     // supercasas.com (DR)
  | 'inmuebles24'    // inmuebles24.com (MX)
  | 'fotocasa'       // fotocasa.es (ES)
  | 'idealista'      // idealista.com (ES)
  | 'fincaraiz'      // fincaraiz.com.co (CO)
  | 'craigslist'     // craigslist.org (US)
  | 'zillow_csv'     // Zillow Research data
  | 'custom';

export type OpenDataSource =
  | 'catastro_es'    // Catastro Spain
  | 'inegi_mx'       // INEGI Mexico
  | 'dgii_do'        // DGII Dominican Republic
  | 'datos_gov_co'   // datos.gov.co Colombia
  | 'zillow_research'; // Zillow Research CSVs

// Raw input from any source (before normalization)
export interface RawPropertyInput {
  // Required fields
  title: string;
  price: number;
  currency?: string;              // Will be normalized to market default
  area?: number;
  area_unit?: 'm2' | 'sqft' | 'varas'; // Will be normalized to m2

  // Location (at least one required)
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  zone?: string;
  postal_code?: string;

  // Property details
  property_type?: string;         // Will be normalized
  bedrooms?: number | string;
  bathrooms?: number | string;
  parking_spaces?: number | string;
  year_built?: number | string;

  // Media
  images?: string[];

  // Description
  description?: string;
  features?: string[];

  // Source metadata
  source_url?: string;            // Original listing URL
  source_id?: string;             // ID in source system
  source_updated_at?: string;     // When source was last updated

  // Additional raw data (preserved for debugging)
  raw_data?: Record<string, unknown>;
}

// Normalized property ready for database
export interface NormalizedProperty {
  title: string;
  description: string | null;
  property_type: 'apartment' | 'house' | 'land' | 'commercial' | 'office';
  price: number;
  area_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  year_built: number | null;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
  features: string[];
  status: 'active';
}

// Ingest request payload
export interface IngestRequest {
  source: PropertySource;
  source_name?: ScraperSource | OpenDataSource | string;
  market_code?: 'DO' | 'US' | 'MX' | 'ES' | 'CO' | 'global';
  properties: RawPropertyInput[];
  options?: {
    skip_duplicates?: boolean;    // Skip if similar property exists
    update_existing?: boolean;    // Update if source_id matches
    dry_run?: boolean;            // Don't save, just validate
  };
}

// Ingest response
export interface IngestResult {
  success: boolean;
  total_received: number;
  total_processed: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  total_failed: number;
  errors: IngestError[];
  created_ids: string[];
  dry_run: boolean;
}

export interface IngestError {
  index: number;
  source_id?: string;
  field?: string;
  message: string;
  raw_value?: unknown;
}

// Property metadata stored in database (JSON field)
export interface PropertySourceMetadata {
  source: PropertySource;
  source_name?: string;
  source_id?: string;
  source_url?: string;
  source_updated_at?: string;
  ingested_at: string;
  raw_data?: Record<string, unknown>;
}

// Deduplication result
export interface DeduplicationMatch {
  property_id: string;
  match_type: 'exact' | 'location' | 'similar';
  confidence: number;
  matched_fields: string[];
}

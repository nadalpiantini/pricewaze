// Ingest Library - Main Export
// Unified property data ingestion from multiple sources

export * from './normalizers';
export * from './deduplication';
export * from './adapters';
export * from './zone-fallback';
export * from './outlier-validation';

// Re-export types
export type {
  PropertySource,
  ScraperSource,
  OpenDataSource,
  RawPropertyInput,
  NormalizedProperty,
  IngestRequest,
  IngestResult,
  IngestError,
  PropertySourceMetadata,
  DeduplicationMatch,
} from '@/types/ingest';

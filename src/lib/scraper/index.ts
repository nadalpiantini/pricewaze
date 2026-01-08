// Scraper Module - Main Export
// Web scraping system for real estate portals

export * from './apify-client';
export * from './configs';
export * from './service';

// Re-export types
export type {
  ScraperName,
  ScraperConfig,
  ScraperParams,
  ScraperRunRequest,
  ScraperRunStatus,
  ScraperStats,
  ScraperHistoryRecord,
  RawScrapedItem,
  SuperCasasRawItem,
  CorotosRawItem,
} from '@/types/scraper';

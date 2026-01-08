-- Add source tracking columns for scraped properties
-- These enable deduplication and provenance tracking

ALTER TABLE pricewaze_properties
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

-- Create index for source_url lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_source_url
  ON pricewaze_properties(source_url) WHERE source_url IS NOT NULL;

-- Create index for source type filtering
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_source_type
  ON pricewaze_properties(source_type);

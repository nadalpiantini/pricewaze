-- Scraper History Table
-- Tracks all scraper runs for monitoring and debugging

-- Create scraper history table
CREATE TABLE IF NOT EXISTS pricewaze_scraper_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  items_scraped INTEGER NOT NULL DEFAULT 0,
  items_ingested INTEGER NOT NULL DEFAULT 0,
  items_skipped INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  params JSONB DEFAULT '{}',
  apify_run_id TEXT,
  cost DECIMAL(10,4),
  error_log TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'running', 'succeeded', 'failed', 'aborted')
  ),
  CONSTRAINT valid_scraper CHECK (
    scraper IN ('supercasas', 'corotos', 'inmuebles24', 'fotocasa', 'craigslist')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricewaze_scraper_history_scraper
  ON pricewaze_scraper_history(scraper);
CREATE INDEX IF NOT EXISTS idx_pricewaze_scraper_history_status
  ON pricewaze_scraper_history(status);
CREATE INDEX IF NOT EXISTS idx_pricewaze_scraper_history_started_at
  ON pricewaze_scraper_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricewaze_scraper_history_apify_run
  ON pricewaze_scraper_history(apify_run_id) WHERE apify_run_id IS NOT NULL;

-- Enable RLS
ALTER TABLE pricewaze_scraper_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only access)
CREATE POLICY "Admins can view scraper history" ON pricewaze_scraper_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pricewaze_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert scraper history" ON pricewaze_scraper_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update scraper history" ON pricewaze_scraper_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pricewaze_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass (for automated scraping)
CREATE POLICY "Service role full access" ON pricewaze_scraper_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add source tracking columns to properties table
ALTER TABLE pricewaze_properties
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,2) DEFAULT 0.70;

-- Create index for source lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_source
  ON pricewaze_properties(source_type, source_name, source_id);

-- Create index for trust score filtering
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_trust_score
  ON pricewaze_properties(trust_score DESC);

-- Add constraint for valid source types
ALTER TABLE pricewaze_properties
  DROP CONSTRAINT IF EXISTS valid_source_type;
ALTER TABLE pricewaze_properties
  ADD CONSTRAINT valid_source_type CHECK (
    source_type IN ('user', 'scraper', 'opendata', 'api', 'import', 'seed')
  );

-- Function to calculate trust score based on source and data quality
CREATE OR REPLACE FUNCTION pricewaze_calculate_trust_score(
  p_source_type TEXT,
  p_has_images BOOLEAN DEFAULT false,
  p_has_coordinates BOOLEAN DEFAULT false,
  p_has_area BOOLEAN DEFAULT false,
  p_has_description BOOLEAN DEFAULT false
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  base_score DECIMAL(3,2);
  bonus DECIMAL(3,2) := 0;
BEGIN
  -- Base score by source type
  base_score := CASE p_source_type
    WHEN 'opendata' THEN 1.00
    WHEN 'api' THEN 0.95
    WHEN 'scraper' THEN 0.85
    WHEN 'import' THEN 0.80
    WHEN 'user' THEN 0.70
    WHEN 'seed' THEN 0.50
    ELSE 0.50
  END;

  -- Bonus for data completeness (max 0.10)
  IF p_has_images THEN bonus := bonus + 0.03; END IF;
  IF p_has_coordinates THEN bonus := bonus + 0.03; END IF;
  IF p_has_area THEN bonus := bonus + 0.02; END IF;
  IF p_has_description THEN bonus := bonus + 0.02; END IF;

  -- Cap at 1.00
  RETURN LEAST(base_score + bonus, 1.00);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate trust score on insert/update
CREATE OR REPLACE FUNCTION pricewaze_set_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trust_score := pricewaze_calculate_trust_score(
    NEW.source_type,
    array_length(NEW.images, 1) > 0,
    NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL,
    NEW.area_m2 > 0,
    NEW.description IS NOT NULL AND length(NEW.description) > 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricewaze_properties_trust_score ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_trust_score
  BEFORE INSERT OR UPDATE OF source_type, images, latitude, longitude, area_m2, description
  ON pricewaze_properties
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_set_trust_score();

-- View for scraper stats
CREATE OR REPLACE VIEW pricewaze_scraper_stats AS
SELECT
  scraper,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful_runs,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'succeeded')::DECIMAL / NULLIF(COUNT(*), 0) * 100,
    1
  ) as success_rate,
  SUM(items_scraped) as total_items_scraped,
  SUM(items_ingested) as total_items_ingested,
  ROUND(AVG(items_scraped), 0) as avg_items_per_run,
  MAX(started_at) as last_run,
  COALESCE(SUM(cost), 0) as total_cost
FROM pricewaze_scraper_history
GROUP BY scraper;

COMMENT ON TABLE pricewaze_scraper_history IS 'Tracks all web scraper runs for monitoring and debugging';
COMMENT ON COLUMN pricewaze_properties.source_type IS 'Origin of the property data: user, scraper, opendata, api, import, seed';
COMMENT ON COLUMN pricewaze_properties.trust_score IS 'Data quality score 0-1 based on source and completeness';

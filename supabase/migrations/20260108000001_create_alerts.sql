-- PriceWaze Alerts System
-- Allows users to save searches and get notified of new properties or price changes

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS pricewaze_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  filters JSONB NOT NULL, -- Store all filter criteria
  is_active BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'daily', -- 'instant', 'daily', 'weekly'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property Alerts Table (tracks which properties match saved searches)
CREATE TABLE IF NOT EXISTS pricewaze_property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES pricewaze_saved_searches(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'new_property', 'price_change', 'status_change'
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(saved_search_id, property_id, alert_type)
);

-- Price Change Alerts (for properties in favorites or saved searches)
CREATE TABLE IF NOT EXISTS pricewaze_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  threshold_type TEXT DEFAULT 'any', -- 'any', 'percentage', 'amount'
  threshold_value DECIMAL(15,2),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON pricewaze_saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON pricewaze_saved_searches(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_property_alerts_search_id ON pricewaze_property_alerts(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_property_id ON pricewaze_property_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON pricewaze_price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_property_id ON pricewaze_price_alerts(property_id);

-- RLS Policies
ALTER TABLE pricewaze_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_price_alerts ENABLE ROW LEVEL SECURITY;

-- Saved Searches Policies
CREATE POLICY "Users can view their own saved searches"
  ON pricewaze_saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON pricewaze_saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON pricewaze_saved_searches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON pricewaze_saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Property Alerts Policies
CREATE POLICY "Users can view their own property alerts"
  ON pricewaze_property_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_saved_searches
      WHERE id = saved_search_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create property alerts"
  ON pricewaze_property_alerts FOR INSERT
  WITH CHECK (true); -- Managed by backend/cron

CREATE POLICY "Users can update their own property alerts"
  ON pricewaze_property_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_saved_searches
      WHERE id = saved_search_id AND user_id = auth.uid()
    )
  );

-- Price Alerts Policies
CREATE POLICY "Users can view their own price alerts"
  ON pricewaze_price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts"
  ON pricewaze_price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts"
  ON pricewaze_price_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts"
  ON pricewaze_price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON pricewaze_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- Comments
COMMENT ON TABLE pricewaze_saved_searches IS 'Stores saved property searches with filters';
COMMENT ON TABLE pricewaze_property_alerts IS 'Tracks properties that match saved searches';
COMMENT ON TABLE pricewaze_price_alerts IS 'Tracks price change alerts for specific properties';


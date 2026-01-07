-- Property Signals System (Waze-style)
-- Quick, aggregated signals visible on properties (no long reviews)
-- Signals are either system-generated (views, visits, offers) or user-reported (post-visit)

-- Property Signals Table (individual signal events)
CREATE TABLE IF NOT EXISTS pricewaze_property_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'high_activity',      -- System: many views
    'many_visits',        -- System: verified visits
    'competing_offers',   -- System: active offers
    'noise',              -- User: zona ruidosa
    'humidity',           -- User: posible humedad
    'misleading_photos',  -- User: fotos engañosas
    'price_issue'         -- User: precio discutido
  )),
  source TEXT NOT NULL CHECK (source IN ('system', 'user')),
  weight INTEGER DEFAULT 1, -- For future: trust-based weighting
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Signal Reports Table (user reports linked to verified visits)
-- Only users who verified a visit can report signals
CREATE TABLE IF NOT EXISTS pricewaze_signal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'noise',
    'humidity',
    'misleading_photos',
    'price_issue'
  )),
  visit_id UUID NOT NULL REFERENCES pricewaze_visits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, visit_id, signal_type) -- One signal type per visit per user
);

-- Property Signal State Table (aggregated view for realtime)
-- This is the "live dashboard" that shows current signal counts
CREATE TABLE IF NOT EXISTS pricewaze_property_signal_state (
  property_id UUID PRIMARY KEY REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  signals JSONB NOT NULL DEFAULT '{}', -- { "noise": 3, "humidity": 1, "many_visits": 6 }
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_signals_property_id ON pricewaze_property_signals(property_id);
CREATE INDEX IF NOT EXISTS idx_property_signals_type ON pricewaze_property_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_property_signals_created_at ON pricewaze_property_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_signals_source ON pricewaze_property_signals(source);

CREATE INDEX IF NOT EXISTS idx_signal_reports_property_id ON pricewaze_signal_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_signal_reports_user_id ON pricewaze_signal_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_reports_visit_id ON pricewaze_signal_reports(visit_id);
CREATE INDEX IF NOT EXISTS idx_signal_reports_type ON pricewaze_signal_reports(signal_type);

-- RLS Policies
ALTER TABLE pricewaze_property_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_signal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_signal_state ENABLE ROW LEVEL SECURITY;

-- Property Signals: Anyone can view (public signals)
DROP POLICY IF EXISTS "Anyone can view property signals" ON pricewaze_property_signals;
CREATE POLICY "Anyone can view property signals"
  ON pricewaze_property_signals
  FOR SELECT
  USING (true);

-- System can insert signals (via service role)
DROP POLICY IF EXISTS "System can insert property signals" ON pricewaze_property_signals;
CREATE POLICY "System can insert property signals"
  ON pricewaze_property_signals
  FOR INSERT
  WITH CHECK (source = 'system');

-- Users can insert their own user signals
DROP POLICY IF EXISTS "Users can insert their own signals" ON pricewaze_property_signals;
CREATE POLICY "Users can insert their own signals"
  ON pricewaze_property_signals
  FOR INSERT
  WITH CHECK (
    source = 'user' AND
    EXISTS (
      SELECT 1 FROM pricewaze_signal_reports
      WHERE pricewaze_signal_reports.user_id = auth.uid()
      AND pricewaze_signal_reports.property_id = property_id
      AND pricewaze_signal_reports.signal_type = signal_type
    )
  );

-- Signal Reports: Users can view all (transparency)
DROP POLICY IF EXISTS "Anyone can view signal reports" ON pricewaze_signal_reports;
CREATE POLICY "Anyone can view signal reports"
  ON pricewaze_signal_reports
  FOR SELECT
  USING (true);

-- Users can only report signals for their own verified visits
DROP POLICY IF EXISTS "Users can report signals for their verified visits" ON pricewaze_signal_reports;
CREATE POLICY "Users can report signals for their verified visits"
  ON pricewaze_signal_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM pricewaze_visits
      WHERE pricewaze_visits.id = visit_id
      AND pricewaze_visits.visitor_id = auth.uid()
      AND pricewaze_visits.verified_at IS NOT NULL
      AND pricewaze_visits.status = 'completed'
    )
  );

-- Property Signal State: Anyone can view (public aggregated state)
DROP POLICY IF EXISTS "Anyone can view property signal state" ON pricewaze_property_signal_state;
CREATE POLICY "Anyone can view property signal state"
  ON pricewaze_property_signal_state
  FOR SELECT
  USING (true);

-- System can upsert signal state (via service role or function)
DROP POLICY IF EXISTS "System can update signal state" ON pricewaze_property_signal_state;
CREATE POLICY "System can update signal state"
  ON pricewaze_property_signal_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to recalculate signal state for a property
CREATE OR REPLACE FUNCTION pricewaze_recalculate_signal_state(p_property_id UUID)
RETURNS void AS $$
DECLARE
  v_signals JSONB;
BEGIN
  -- Aggregate signals by type
  SELECT jsonb_object_agg(signal_type, count)
  INTO v_signals
  FROM (
    SELECT 
      signal_type,
      SUM(weight)::INTEGER as count
    FROM pricewaze_property_signals
    WHERE property_id = p_property_id
    GROUP BY signal_type
  ) aggregated;

  -- Upsert the state
  INSERT INTO pricewaze_property_signal_state (property_id, signals, updated_at)
  VALUES (p_property_id, COALESCE(v_signals, '{}'::jsonb), now())
  ON CONFLICT (property_id)
  DO UPDATE SET
    signals = EXCLUDED.signals,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-recalculate when signals change
CREATE OR REPLACE FUNCTION pricewaze_trigger_recalculate_signals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pricewaze_recalculate_signal_state(
    COALESCE(NEW.property_id, OLD.property_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recalculate_signals_on_insert ON pricewaze_property_signals;
CREATE TRIGGER recalculate_signals_on_insert
  AFTER INSERT ON pricewaze_property_signals
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_trigger_recalculate_signals();

DROP TRIGGER IF EXISTS recalculate_signals_on_delete ON pricewaze_property_signals;
CREATE TRIGGER recalculate_signals_on_delete
  AFTER DELETE ON pricewaze_property_signals
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_trigger_recalculate_signals();

-- Enable Realtime for signal_state (Waze-style live updates)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE pricewaze_property_signal_state;
      RAISE NOTICE 'Realtime enabled for pricewaze_property_signal_state';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Table already in realtime publication';
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add to realtime publication. Enable manually in Supabase Dashboard > Database > Replication';
    END;
  ELSE
    RAISE NOTICE 'supabase_realtime publication not found. Enable manually in Supabase Dashboard > Database > Replication';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE pricewaze_property_signals IS 'Individual signal events (system or user-generated)';
COMMENT ON TABLE pricewaze_signal_reports IS 'User reports linked to verified visits (prevents spam)';
COMMENT ON TABLE pricewaze_property_signal_state IS 'Aggregated signal counts for realtime display (Waze-style)';
COMMENT ON FUNCTION pricewaze_recalculate_signal_state IS 'Recalculates aggregated signal state for a property';


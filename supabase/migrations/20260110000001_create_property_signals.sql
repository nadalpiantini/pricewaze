-- Property Signals System (Waze-style)
-- Signals with temporal decay and community confirmation
-- Based on Waze model: signals lose strength over time, confirmed by consensus

-- ============================================================================
-- 1. RAW SIGNALS TABLE (Individual Events)
-- ============================================================================
-- Each signal event (user report or system-generated)
CREATE TABLE IF NOT EXISTS pricewaze_property_signals_raw (
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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system signals
  visit_id UUID REFERENCES pricewaze_visits(id) ON DELETE CASCADE, -- NULL for system signals
  created_at TIMESTAMPTZ DEFAULT now(),
  -- One signal type per visit per user (prevents duplicate reports)
  UNIQUE (user_id, visit_id, signal_type) WHERE user_id IS NOT NULL AND visit_id IS NOT NULL
);

-- ============================================================================
-- 2. SIGNAL STATE TABLE (Aggregated + Decay + Confirmation)
-- ============================================================================
-- One row per property + signal_type with strength, confirmation status, and last seen
CREATE TABLE IF NOT EXISTS pricewaze_property_signal_state (
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'high_activity',
    'many_visits',
    'competing_offers',
    'noise',
    'humidity',
    'misleading_photos',
    'price_issue'
  )),
  strength NUMERIC NOT NULL DEFAULT 0, -- Decayed strength (0-100+)
  confirmed BOOLEAN DEFAULT false, -- Confirmed by ≥3 users in last 30 days
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- Last time this signal was reported
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (property_id, signal_type)
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_property_id ON pricewaze_property_signals_raw(property_id);
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_type ON pricewaze_property_signals_raw(signal_type);
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_created_at ON pricewaze_property_signals_raw(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_source ON pricewaze_property_signals_raw(source);
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_user_id ON pricewaze_property_signals_raw(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_signals_raw_visit_id ON pricewaze_property_signals_raw(visit_id) WHERE visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_signal_state_property_id ON pricewaze_property_signal_state(property_id);
CREATE INDEX IF NOT EXISTS idx_property_signal_state_type ON pricewaze_property_signal_state(signal_type);
CREATE INDEX IF NOT EXISTS idx_property_signal_state_confirmed ON pricewaze_property_signal_state(confirmed);
CREATE INDEX IF NOT EXISTS idx_property_signal_state_strength ON pricewaze_property_signal_state(strength DESC);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
ALTER TABLE pricewaze_property_signals_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_signal_state ENABLE ROW LEVEL SECURITY;

-- Raw Signals: Anyone can view (transparency)
DROP POLICY IF EXISTS "Anyone can view property signals raw" ON pricewaze_property_signals_raw;
CREATE POLICY "Anyone can view property signals raw"
  ON pricewaze_property_signals_raw
  FOR SELECT
  USING (true);

-- System can insert signals (via service role)
DROP POLICY IF EXISTS "System can insert property signals raw" ON pricewaze_property_signals_raw;
CREATE POLICY "System can insert property signals raw"
  ON pricewaze_property_signals_raw
  FOR INSERT
  WITH CHECK (source = 'system');

-- Users can insert their own user signals (must have verified visit)
DROP POLICY IF EXISTS "Users can insert their own signals raw" ON pricewaze_property_signals_raw;
CREATE POLICY "Users can insert their own signals raw"
  ON pricewaze_property_signals_raw
  FOR INSERT
  WITH CHECK (
    source = 'user' AND
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM pricewaze_visits
      WHERE pricewaze_visits.id = visit_id
      AND pricewaze_visits.visitor_id = auth.uid()
      AND pricewaze_visits.verified_at IS NOT NULL
      AND pricewaze_visits.status = 'completed'
    )
  );

-- Signal State: Anyone can view (public aggregated state)
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

-- ============================================================================
-- 5. DECAY FUNCTION (Temporal Decay Logic)
-- ============================================================================
-- Returns decay factor based on days since last signal
-- 0-7 days: 1.0 (full strength)
-- 8-14 days: 0.7 (70%)
-- 15-30 days: 0.4 (40%)
-- 31+ days: 0.1 (10%)
CREATE OR REPLACE FUNCTION pricewaze_signal_decay_factor(days_old NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  IF days_old <= 7 THEN
    RETURN 1.0;
  ELSIF days_old <= 14 THEN
    RETURN 0.7;
  ELSIF days_old <= 30 THEN
    RETURN 0.4;
  ELSE
    RETURN 0.1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. RECALCULATE SIGNAL STATE FUNCTION
-- ============================================================================
-- Recalculates strength, confirmation, and last_seen_at for a property
-- Applies temporal decay and community confirmation rules
CREATE OR REPLACE FUNCTION pricewaze_recalculate_signal_state(p_property_id UUID)
RETURNS void AS $$
DECLARE
  v_signal_record RECORD;
  v_signal_type TEXT;
  v_signals_count INTEGER;
  v_unique_users INTEGER;
  v_last_seen TIMESTAMPTZ;
  v_days_old NUMERIC;
  v_decay_factor NUMERIC;
  v_strength NUMERIC;
  v_confirmed BOOLEAN;
BEGIN
  -- Process each signal type for this property
  FOR v_signal_type IN
    SELECT DISTINCT signal_type
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
  LOOP
    -- Count total signals of this type
    SELECT COUNT(*)
    INTO v_signals_count
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
    AND signal_type = v_signal_type;

    -- Count unique users (for confirmation)
    SELECT COUNT(DISTINCT user_id)
    INTO v_unique_users
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
    AND signal_type = v_signal_type
    AND user_id IS NOT NULL;

    -- Get last seen timestamp
    SELECT MAX(created_at)
    INTO v_last_seen
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
    AND signal_type = v_signal_type;

    -- Calculate days old
    v_days_old := EXTRACT(EPOCH FROM (NOW() - v_last_seen)) / 86400.0;

    -- Get decay factor
    v_decay_factor := pricewaze_signal_decay_factor(v_days_old);

    -- Calculate strength (count * decay factor)
    v_strength := v_signals_count * v_decay_factor;

    -- Check confirmation: ≥3 unique users AND within last 30 days
    v_confirmed := (v_unique_users >= 3) AND (v_days_old <= 30);

    -- Upsert signal state
    INSERT INTO pricewaze_property_signal_state (
      property_id,
      signal_type,
      strength,
      confirmed,
      last_seen_at,
      updated_at
    )
    VALUES (
      p_property_id,
      v_signal_type,
      v_strength,
      v_confirmed,
      v_last_seen,
      NOW()
    )
    ON CONFLICT (property_id, signal_type)
    DO UPDATE SET
      strength = EXCLUDED.strength,
      confirmed = EXCLUDED.confirmed,
      last_seen_at = EXCLUDED.last_seen_at,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  -- Remove signal states that no longer have any raw signals
  DELETE FROM pricewaze_property_signal_state
  WHERE property_id = p_property_id
  AND signal_type NOT IN (
    SELECT DISTINCT signal_type
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. TRIGGERS (Auto-recalculate on changes)
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_trigger_recalculate_signals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pricewaze_recalculate_signal_state(
    COALESCE(NEW.property_id, OLD.property_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on insert
DROP TRIGGER IF EXISTS recalculate_signals_on_insert ON pricewaze_property_signals_raw;
CREATE TRIGGER recalculate_signals_on_insert
  AFTER INSERT ON pricewaze_property_signals_raw
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_trigger_recalculate_signals();

-- Trigger on delete
DROP TRIGGER IF EXISTS recalculate_signals_on_delete ON pricewaze_property_signals_raw;
CREATE TRIGGER recalculate_signals_on_delete
  AFTER DELETE ON pricewaze_property_signals_raw
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_trigger_recalculate_signals();

-- ============================================================================
-- 8. REALTIME (Waze-style live updates)
-- ============================================================================
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

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================
COMMENT ON TABLE pricewaze_property_signals_raw IS 'Individual signal events (system or user-generated). Events decay over time.';
COMMENT ON TABLE pricewaze_property_signal_state IS 'Aggregated signal state with temporal decay and community confirmation (Waze-style). One row per property+signal_type.';
COMMENT ON FUNCTION pricewaze_signal_decay_factor IS 'Returns decay factor based on signal age (1.0 for 0-7 days, 0.7 for 8-14, 0.4 for 15-30, 0.1 for 31+)';
COMMENT ON FUNCTION pricewaze_recalculate_signal_state IS 'Recalculates signal strength with temporal decay and community confirmation (≥3 users in last 30 days)';

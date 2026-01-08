-- ============================================================================
-- NEGOTIATION COHERENCE ENGINE (NCE)
-- ============================================================================
-- Real-time tactical assistance system for negotiations
-- Recalculates coherence with each event (Waze-style)
-- ============================================================================

-- ============================================================================
-- 1. EXTEND OFFERS TABLE (closing_date, contingencies)
-- ============================================================================
ALTER TABLE pricewaze_offers
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS contingencies JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN pricewaze_offers.closing_date IS 'Proposed closing date in the offer';
COMMENT ON COLUMN pricewaze_offers.contingencies IS 'Array of contingencies: ["inspection", "financing", "appraisal", etc]';

-- ============================================================================
-- 2. NEGOTIATION EVENTS (temporal base - negotiation events)
-- ============================================================================
-- Each change is an event. Nothing is overwritten.
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'offer_sent',
    'counter_received',
    'counter_sent',
    'accepted',
    'rejected',
    'expired'
  )),

  price NUMERIC(15,2),
  closing_date DATE,
  contingencies JSONB,

  created_by TEXT NOT NULL CHECK (created_by IN ('buyer', 'seller', 'agent', 'system')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_events_offer
  ON pricewaze_negotiation_events(offer_id, created_at);

CREATE INDEX IF NOT EXISTS idx_negotiation_events_type
  ON pricewaze_negotiation_events(event_type, created_at);

-- ============================================================================
-- 3. STATE SNAPSHOTS (derived, not manual)
-- ============================================================================
-- One snapshot per relevant event
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES pricewaze_negotiation_events(id) ON DELETE CASCADE,

  -- CORE STATES
  alignment_state TEXT NOT NULL CHECK (alignment_state IN ('improving', 'stable', 'deteriorating')),
  rhythm_state TEXT NOT NULL CHECK (rhythm_state IN ('fast', 'normal', 'slowing')),
  friction_level TEXT NOT NULL CHECK (friction_level IN ('low', 'medium', 'high')),
  market_pressure TEXT NOT NULL CHECK (market_pressure IN ('low', 'medium', 'increasing')),

  coherence_score NUMERIC(5,2), -- optional internal metric (not shown in UI)

  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_snapshots_offer
  ON pricewaze_negotiation_state_snapshots(offer_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_negotiation_snapshots_event
  ON pricewaze_negotiation_state_snapshots(event_id);

-- ============================================================================
-- 4. FRICTION ANALYSIS (what's failing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_friction (
  snapshot_id UUID PRIMARY KEY REFERENCES pricewaze_negotiation_state_snapshots(id) ON DELETE CASCADE,

  price_friction TEXT NOT NULL CHECK (price_friction IN ('none', 'low', 'medium', 'high')),
  timeline_friction TEXT NOT NULL CHECK (timeline_friction IN ('none', 'low', 'medium', 'high')),
  terms_friction TEXT NOT NULL CHECK (terms_friction IN ('none', 'low', 'medium', 'high')),

  dominant_friction TEXT CHECK (dominant_friction IN ('price', 'timeline', 'terms', 'mixed')),
  notes TEXT
);

-- ============================================================================
-- 5. RHYTHM & TEMPORAL PATTERNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_rhythm (
  snapshot_id UUID PRIMARY KEY REFERENCES pricewaze_negotiation_state_snapshots(id) ON DELETE CASCADE,

  avg_response_time_hours NUMERIC(10,2),
  response_trend TEXT CHECK (response_trend IN ('faster', 'stable', 'slower')),
  concession_pattern TEXT CHECK (concession_pattern IN ('consistent', 'erratic', 'stalled')),

  notes TEXT
);

-- ============================================================================
-- 6. MARKET CONTEXT (input from DIE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_market_context (
  snapshot_id UUID PRIMARY KEY REFERENCES pricewaze_negotiation_state_snapshots(id) ON DELETE CASCADE,

  visit_activity TEXT NOT NULL CHECK (visit_activity IN ('low', 'medium', 'high')),
  competing_offers TEXT NOT NULL CHECK (competing_offers IN ('none', 'some', 'many')),
  signal_pressure TEXT NOT NULL CHECK (signal_pressure IN ('low', 'medium', 'high')),

  velocity_state TEXT NOT NULL CHECK (velocity_state IN ('stable', 'accelerating', 'decelerating'))
);

-- ============================================================================
-- 7. COPILOT INSIGHTS (explanation, not decision)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_insights (
  snapshot_id UUID PRIMARY KEY REFERENCES pricewaze_negotiation_state_snapshots(id) ON DELETE CASCADE,

  summary TEXT NOT NULL,          -- 1–2 sentences
  focus_area TEXT NOT NULL CHECK (focus_area IN ('price', 'timeline', 'terms')),
  options JSONB NOT NULL,          -- framed options (pros/cons)

  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. ALERTS (event-driven, rare and important)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_negotiation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES pricewaze_negotiation_state_snapshots(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'rhythm_slowing',
    'alignment_deteriorating',
    'pressure_increasing'
  )),

  message TEXT NOT NULL,
  delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_alerts_offer
  ON pricewaze_negotiation_alerts(offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_negotiation_alerts_delivered
  ON pricewaze_negotiation_alerts(delivered, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_negotiation_alerts_unique
  ON pricewaze_negotiation_alerts(snapshot_id, alert_type);

-- ============================================================================
-- 9. NCE JOBS (recalculation queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_nce_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES pricewaze_negotiation_events(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nce_jobs_status
  ON pricewaze_nce_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_nce_jobs_offer
  ON pricewaze_nce_jobs(offer_id, created_at DESC);

-- ============================================================================
-- 10. FEATURE FLAGS (DB-based with rollout %)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  rollout_percent INT DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial NCE flags
INSERT INTO pricewaze_feature_flags (key, enabled, rollout_percent) VALUES
('nce_core', false, 0),
('nce_alerts', false, 0),
('nce_ui_panel', false, 0)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 11. RLS POLICIES
-- ============================================================================
ALTER TABLE pricewaze_negotiation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_friction ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_rhythm ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_market_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_negotiation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_nce_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_feature_flags ENABLE ROW LEVEL SECURITY;

-- Participants can view all NCE data for their offers
DROP POLICY IF EXISTS "Participants can view negotiation events" ON pricewaze_negotiation_events;
CREATE POLICY "Participants can view negotiation events"
  ON pricewaze_negotiation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_negotiation_events.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation snapshots" ON pricewaze_negotiation_state_snapshots;
CREATE POLICY "Participants can view negotiation snapshots"
  ON pricewaze_negotiation_state_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_negotiation_state_snapshots.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation friction" ON pricewaze_negotiation_friction;
CREATE POLICY "Participants can view negotiation friction"
  ON pricewaze_negotiation_friction FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_negotiation_state_snapshots s
      JOIN pricewaze_offers o ON o.id = s.offer_id
      WHERE s.id = pricewaze_negotiation_friction.snapshot_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation rhythm" ON pricewaze_negotiation_rhythm;
CREATE POLICY "Participants can view negotiation rhythm"
  ON pricewaze_negotiation_rhythm FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_negotiation_state_snapshots s
      JOIN pricewaze_offers o ON o.id = s.offer_id
      WHERE s.id = pricewaze_negotiation_rhythm.snapshot_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation market context" ON pricewaze_negotiation_market_context;
CREATE POLICY "Participants can view negotiation market context"
  ON pricewaze_negotiation_market_context FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_negotiation_state_snapshots s
      JOIN pricewaze_offers o ON o.id = s.offer_id
      WHERE s.id = pricewaze_negotiation_market_context.snapshot_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation insights" ON pricewaze_negotiation_insights;
CREATE POLICY "Participants can view negotiation insights"
  ON pricewaze_negotiation_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_negotiation_state_snapshots s
      JOIN pricewaze_offers o ON o.id = s.offer_id
      WHERE s.id = pricewaze_negotiation_insights.snapshot_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view negotiation alerts" ON pricewaze_negotiation_alerts;
CREATE POLICY "Participants can view negotiation alerts"
  ON pricewaze_negotiation_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_negotiation_alerts.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- System can manage jobs (service role only)
DROP POLICY IF EXISTS "Service role can manage NCE jobs" ON pricewaze_nce_jobs;
CREATE POLICY "Service role can manage NCE jobs"
  ON pricewaze_nce_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Feature flags: public read, service role write
DROP POLICY IF EXISTS "Anyone can read feature flags" ON pricewaze_feature_flags;
CREATE POLICY "Anyone can read feature flags"
  ON pricewaze_feature_flags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage feature flags" ON pricewaze_feature_flags;
CREATE POLICY "Service role can manage feature flags"
  ON pricewaze_feature_flags FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 12. FUNCTION: Sync offer_events to negotiation_events
-- ============================================================================
-- Converts events from pricewaze_offer_events to pricewaze_negotiation_events
CREATE OR REPLACE FUNCTION sync_offer_event_to_negotiation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer RECORD;
  v_event_type TEXT;
  v_created_by TEXT;
BEGIN
  -- Get offer details
  SELECT * INTO v_offer
  FROM pricewaze_offers
  WHERE id = NEW.offer_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Map event types
  v_event_type := CASE NEW.event_type
    WHEN 'offer_sent' THEN 'offer_sent'
    WHEN 'counteroffer' THEN 'counter_sent'
    WHEN 'accepted' THEN 'accepted'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'expired' THEN 'expired'
    ELSE NULL
  END;

  -- Determine created_by
  v_created_by := CASE
    WHEN NEW.actor_id = v_offer.buyer_id THEN 'buyer'
    WHEN NEW.actor_id = v_offer.seller_id THEN 'seller'
    ELSE 'system'
  END;

  -- Only create negotiation event if we have a valid mapping
  IF v_event_type IS NOT NULL THEN
    INSERT INTO pricewaze_negotiation_events (
      offer_id,
      event_type,
      price,
      closing_date,
      contingencies,
      created_by
    )
    SELECT
      NEW.offer_id,
      v_event_type,
      NEW.amount,
      o.closing_date,
      o.contingencies,
      v_created_by
    FROM pricewaze_offers o
    WHERE o.id = NEW.offer_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to sync offer_events to negotiation_events
DROP TRIGGER IF EXISTS trg_sync_offer_event_to_negotiation ON pricewaze_offer_events;
CREATE TRIGGER trg_sync_offer_event_to_negotiation
  AFTER INSERT ON pricewaze_offer_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_offer_event_to_negotiation_event();

-- ============================================================================
-- 13. TRIGGER: Queue job when there's a new negotiation event
-- ============================================================================
CREATE OR REPLACE FUNCTION nce_on_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue the recalculation (doesn't do it here)
  INSERT INTO pricewaze_nce_jobs (
    offer_id,
    event_id,
    status
  ) VALUES (
    NEW.offer_id,
    NEW.id,
    'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nce_new_event ON pricewaze_negotiation_events;
CREATE TRIGGER trg_nce_new_event
  AFTER INSERT ON pricewaze_negotiation_events
  FOR EACH ROW
  EXECUTE FUNCTION nce_on_new_event();

-- ============================================================================
-- 14. FUNCTION: Evaluate feature flag with rollout %
-- ============================================================================
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key TEXT,
  p_seed_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_flag RECORD;
  v_hash INTEGER;
BEGIN
  -- Get flag
  SELECT * INTO v_flag
  FROM pricewaze_feature_flags
  WHERE key = p_flag_key;

  -- If flag doesn't exist or is disabled, return false
  IF NOT FOUND OR NOT v_flag.enabled THEN
    RETURN false;
  END IF;

  -- If rollout is 0%, return false
  IF v_flag.rollout_percent = 0 THEN
    RETURN false;
  END IF;

  -- If rollout is 100%, return true
  IF v_flag.rollout_percent = 100 THEN
    RETURN true;
  END IF;

  -- Calculate hash from seed_id (deterministic)
  -- Using hashtext() which returns a signed 32-bit integer
  v_hash := ABS(hashtext(p_seed_id)) % 100;

  -- Return true if hash < rollout_percent
  RETURN v_hash < v_flag.rollout_percent;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pricewaze_negotiation_events IS 'Negotiation events (temporal base). Each change is an event.';
COMMENT ON TABLE pricewaze_negotiation_state_snapshots IS 'Coherence state snapshots (derived, not manual). One snapshot per relevant event.';
COMMENT ON TABLE pricewaze_negotiation_friction IS 'Friction analysis: what''s failing (price, timeline, terms)';
COMMENT ON TABLE pricewaze_negotiation_rhythm IS 'Rhythm and temporal patterns of the negotiation';
COMMENT ON TABLE pricewaze_negotiation_market_context IS 'Market context (input from DIE) at the time of the snapshot';
COMMENT ON TABLE pricewaze_negotiation_insights IS 'Copilot insights (explanation, not decision)';
COMMENT ON TABLE pricewaze_negotiation_alerts IS 'Event-driven alerts (rare and important)';
COMMENT ON TABLE pricewaze_nce_jobs IS 'Job queue for NCE recalculation';
COMMENT ON TABLE pricewaze_feature_flags IS 'DB-based feature flags with percentage rollout';
COMMENT ON FUNCTION is_feature_enabled IS 'Evaluates feature flag with deterministic rollout % based on seed_id';


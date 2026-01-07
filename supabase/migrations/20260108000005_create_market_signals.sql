-- Market Signals & Alert Rules System
-- Enables Waze-style real-time market alerts with JSON Logic rules

-- Market Signals Table (stores market events)
CREATE TABLE IF NOT EXISTS pricewaze_market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES pricewaze_zones(id) ON DELETE SET NULL,
  property_id UUID REFERENCES pricewaze_properties(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL, -- 'price_drop' | 'price_increase' | 'inventory_spike' | 'inventory_drop' | 'trend_change' | 'new_listing' | 'status_change'
  severity TEXT DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  payload JSONB NOT NULL, -- Flexible data: { price_drop_pct, days, inventory_change, trend_score, etc }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Rules Table (user-defined JSON Logic rules)
CREATE TABLE IF NOT EXISTS pricewaze_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  zone_id UUID REFERENCES pricewaze_zones(id) ON DELETE SET NULL,
  property_id UUID REFERENCES pricewaze_properties(id) ON DELETE SET NULL,
  rule JSONB NOT NULL, -- JSON Logic expression
  active BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app' | 'email' | 'push'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Events Table (triggered alerts)
CREATE TABLE IF NOT EXISTS pricewaze_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES pricewaze_alert_rules(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES pricewaze_market_signals(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification Preferences (extends user preferences)
CREATE TABLE IF NOT EXISTS pricewaze_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT true,
  push BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'instant', -- 'instant' | 'daily_digest' | 'weekly_digest'
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_signals_zone_id ON pricewaze_market_signals(zone_id);
CREATE INDEX IF NOT EXISTS idx_market_signals_property_id ON pricewaze_market_signals(property_id);
CREATE INDEX IF NOT EXISTS idx_market_signals_type ON pricewaze_market_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_market_signals_created_at ON pricewaze_market_signals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON pricewaze_alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON pricewaze_alert_rules(user_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_alert_rules_zone_id ON pricewaze_alert_rules(zone_id) WHERE zone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alert_events_user_id ON pricewaze_alert_events(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_read ON pricewaze_alert_events(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_alert_events_created_at ON pricewaze_alert_events(created_at DESC);

-- RLS Policies
ALTER TABLE pricewaze_market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Market Signals: Read-only for authenticated users
DROP POLICY IF EXISTS "Users can view market signals" ON pricewaze_market_signals;
CREATE POLICY "Users can view market signals"
  ON pricewaze_market_signals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Alert Rules: Users manage their own
DROP POLICY IF EXISTS "Users can view their own alert rules" ON pricewaze_alert_rules;
CREATE POLICY "Users can view their own alert rules"
  ON pricewaze_alert_rules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own alert rules" ON pricewaze_alert_rules;
CREATE POLICY "Users can create their own alert rules"
  ON pricewaze_alert_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alert rules" ON pricewaze_alert_rules;
CREATE POLICY "Users can update their own alert rules"
  ON pricewaze_alert_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own alert rules" ON pricewaze_alert_rules;
CREATE POLICY "Users can delete their own alert rules"
  ON pricewaze_alert_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Alert Events: Users see their own
DROP POLICY IF EXISTS "Users can view their own alert events" ON pricewaze_alert_events;
CREATE POLICY "Users can view their own alert events"
  ON pricewaze_alert_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create alert events" ON pricewaze_alert_events;
CREATE POLICY "System can create alert events"
  ON pricewaze_alert_events FOR INSERT
  WITH CHECK (true); -- Managed by backend/cron

DROP POLICY IF EXISTS "Users can update their own alert events" ON pricewaze_alert_events;
CREATE POLICY "Users can update their own alert events"
  ON pricewaze_alert_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification Preferences: Users manage their own
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON pricewaze_notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
  ON pricewaze_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notification preferences" ON pricewaze_notification_preferences;
CREATE POLICY "Users can create their own notification preferences"
  ON pricewaze_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON pricewaze_notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
  ON pricewaze_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for alert_events (Waze-style live updates)
-- This enables live subscriptions to alert_events table for real-time UI updates
DO $$
BEGIN
  -- Try to add table to realtime publication
  -- This will work if pg_catalog.pg_publication exists and supabase_realtime publication exists
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE pricewaze_alert_events;
      RAISE NOTICE 'Realtime enabled for pricewaze_alert_events';
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

-- Functions
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON pricewaze_alert_rules;
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON pricewaze_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON pricewaze_notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON pricewaze_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Comments
COMMENT ON TABLE pricewaze_market_signals IS 'Market events and signals (price changes, inventory shifts, trends)';
COMMENT ON TABLE pricewaze_alert_rules IS 'User-defined alert rules using JSON Logic';
COMMENT ON TABLE pricewaze_alert_events IS 'Triggered alerts matching user rules';
COMMENT ON TABLE pricewaze_notification_preferences IS 'User notification channel preferences';


-- Enhanced Property Signals System (Waze-style with decay, confirmation, and realtime alerts)
-- This migration enhances the existing signals system with:
-- 1. Temporal decay (signals lose weight over time)
-- 2. Community confirmation (≥3 users within 30 days)
-- 3. Per-signal-type state tracking (strength, confirmed, last_seen_at)
-- 4. Realtime notifications when signals are confirmed
--
-- PREREQUISITE: This migration requires migration 20260110000001_create_property_signals.sql
-- to be executed first, which creates the pricewaze_property_signals_raw table.

-- Verify prerequisite: Check if base table exists
-- This migration REQUIRES migration 20260110000001_create_property_signals.sql to be executed first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pricewaze_property_signals_raw'
  ) THEN
    RAISE EXCEPTION 
      'Prerequisite migration not found: pricewaze_property_signals_raw table does not exist. '
      'Please execute migration 20260110000001_create_property_signals.sql FIRST, then run this migration. '
      'The migrations must be executed in order: 1) create_property_signals.sql, 2) enhance_property_signals_waze.sql';
  END IF;
  
  RAISE NOTICE 'Prerequisite check passed: pricewaze_property_signals_raw table exists. Proceeding with enhancement migration...';
END $$;

-- Step 1: Add user_id and visit_id to property_signals_raw for tracking
-- Note: The raw table is pricewaze_property_signals_raw (from first migration)
-- These columns should already exist, but we add them if not
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricewaze_property_signals_raw') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pricewaze_property_signals_raw' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE pricewaze_property_signals_raw
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pricewaze_property_signals_raw' AND column_name = 'visit_id'
    ) THEN
      ALTER TABLE pricewaze_property_signals_raw
        ADD COLUMN visit_id UUID REFERENCES pricewaze_visits(id) ON DELETE SET NULL;
    END IF;
    
    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS idx_property_signals_raw_user_id ON pricewaze_property_signals_raw(user_id) WHERE user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_property_signals_raw_visit_id ON pricewaze_property_signals_raw(visit_id) WHERE visit_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Table pricewaze_property_signals_raw does not exist. Make sure migration 20260110000001_create_property_signals.sql has been executed first.';
  END IF;
END $$;

-- Step 2: Update existing signal state table to include new signal types
-- Note: The table pricewaze_property_signal_state already exists from first migration
-- We just need to update the CHECK constraint to include new signal types
-- The table structure is already correct (property_id, signal_type, strength, confirmed, last_seen_at, updated_at)
-- Update the CHECK constraint on the existing table to include new signal types
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricewaze_property_signal_state') THEN
    -- Drop old constraint
    ALTER TABLE pricewaze_property_signal_state
      DROP CONSTRAINT IF EXISTS pricewaze_property_signal_state_signal_type_check;
    
    -- Add new constraint with all signal types
    ALTER TABLE pricewaze_property_signal_state
      ADD CONSTRAINT pricewaze_property_signal_state_signal_type_check
      CHECK (signal_type IN (
        'high_activity', 'many_visits', 'competing_offers', 'long_time_on_market', 'recent_price_change',
        'noise', 'humidity', 'misleading_photos', 'poor_parking', 'security_concern', 
        'maintenance_needed', 'price_issue',
        'quiet_area', 'good_condition', 'transparent_listing'
      ));
  END IF;
END $$;

-- Indexes should already exist from first migration, but create if not
CREATE INDEX IF NOT EXISTS idx_signal_state_confirmed ON pricewaze_property_signal_state(confirmed);
CREATE INDEX IF NOT EXISTS idx_signal_state_strength ON pricewaze_property_signal_state(strength DESC);

-- Step 3: Add missing signal types to property_signals_raw table
-- Add new system signals: long_time_on_market, recent_price_change
-- Add new user signals: poor_parking, security_concern, maintenance_needed
-- Add positive signals: quiet_area, good_condition, transparent_listing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricewaze_property_signals_raw') THEN
    ALTER TABLE pricewaze_property_signals_raw
      DROP CONSTRAINT IF EXISTS pricewaze_property_signals_raw_signal_type_check;

    ALTER TABLE pricewaze_property_signals_raw
      ADD CONSTRAINT pricewaze_property_signals_raw_signal_type_check
      CHECK (signal_type IN (
        -- System signals
        'high_activity', 'many_visits', 'competing_offers', 'long_time_on_market', 'recent_price_change',
        -- User negative signals
        'noise', 'humidity', 'misleading_photos', 'poor_parking', 'security_concern', 
        'maintenance_needed', 'price_issue',
        -- User positive signals
        'quiet_area', 'good_condition', 'transparent_listing'
      ));
  END IF;
END $$;

-- Update signal_reports to include new user signal types (if table exists)
-- Note: This table may not exist in all setups, so we check first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricewaze_signal_reports') THEN
    ALTER TABLE pricewaze_signal_reports
      DROP CONSTRAINT IF EXISTS pricewaze_signal_reports_signal_type_check;

    ALTER TABLE pricewaze_signal_reports
      ADD CONSTRAINT pricewaze_signal_reports_signal_type_check
      CHECK (signal_type IN (
        'noise', 'humidity', 'misleading_photos', 'poor_parking', 'security_concern',
        'maintenance_needed', 'price_issue',
        'quiet_area', 'good_condition', 'transparent_listing'
      ));
  END IF;
END $$;

-- Step 4: Function to calculate decay factor based on days since last seen
-- Drop existing function first if it has different parameter name
DROP FUNCTION IF EXISTS pricewaze_signal_decay_factor(NUMERIC);

CREATE FUNCTION pricewaze_signal_decay_factor(days_since NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  IF days_since <= 7 THEN
    RETURN 1.0;
  ELSIF days_since <= 14 THEN
    RETURN 0.7;
  ELSIF days_since <= 30 THEN
    RETURN 0.4;
  ELSE
    RETURN 0.1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Enhanced recalculate function with decay and confirmation
-- Note: This function requires both pricewaze_property_signals_raw and pricewaze_property_signal_state tables
-- The signal_type_state table is created in Step 2 of this migration
CREATE OR REPLACE FUNCTION pricewaze_recalculate_signal_state(p_property_id UUID)
RETURNS void AS $$
DECLARE
  v_signal_record RECORD;
  v_days_since NUMERIC;
  v_decay_factor NUMERIC;
  v_strength NUMERIC;
  v_confirmed BOOLEAN;
  v_last_seen TIMESTAMPTZ;
  v_unique_users INTEGER;
  v_recent_reports INTEGER;
  v_table_exists BOOLEAN;
BEGIN
  -- Check if required tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'pricewaze_property_signals_raw'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table pricewaze_property_signals_raw does not exist. Please run migration 20260110000001_create_property_signals.sql first.';
  END IF;
  
  -- Check if signal_state table exists (created in first migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'pricewaze_property_signal_state'
  ) THEN
    RAISE EXCEPTION 'Table pricewaze_property_signal_state does not exist. Please run migration 20260110000001_create_property_signals.sql first.';
  END IF;
  
  -- Verify that pricewaze_property_signals_raw has the signal_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'pricewaze_property_signals_raw' 
    AND column_name = 'signal_type'
  ) THEN
    RAISE EXCEPTION 'Table pricewaze_property_signals_raw exists but does not have signal_type column. The first migration may have failed. Please check and re-run migration 20260110000001_create_property_signals.sql.';
  END IF;
  
  -- Process each signal type separately
  FOR v_signal_record IN
    SELECT 
      signal_type,
      COUNT(*) as report_count,
      MAX(created_at) as last_report,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
      COUNT(*) FILTER (
        WHERE created_at >= NOW() - INTERVAL '30 days' 
        AND user_id IS NOT NULL
      ) as recent_reports
    FROM pricewaze_property_signals_raw
    WHERE property_id = p_property_id
    GROUP BY signal_type
  LOOP
    -- Skip if no signals found
    IF v_signal_record.signal_type IS NULL THEN
      CONTINUE;
    END IF;
    -- Calculate days since last report
    v_days_since := EXTRACT(EPOCH FROM (NOW() - v_signal_record.last_report)) / 86400.0;
    
    -- Get decay factor
    v_decay_factor := pricewaze_signal_decay_factor(v_days_since);
    
    -- Calculate strength (count * decay factor)
    v_strength := v_signal_record.report_count * v_decay_factor;
    
    -- Check if confirmed (≥3 unique users with visits in last 30 days)
    v_confirmed := (
      v_signal_record.unique_users >= 3 
      AND v_signal_record.recent_reports >= 3
      AND v_days_since <= 30
    );
    
    v_last_seen := v_signal_record.last_report;
    
    -- Upsert signal type state
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
      v_signal_record.signal_type,
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
  
  -- Legacy function is no longer needed since we use per-signal-type state
  -- The state is already updated above in the loop
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep legacy function for backward compatibility
-- Note: This function is kept for reference but pricewaze_property_signal_state
-- uses per-signal-type rows, not JSONB. The main recalculate function handles this.
CREATE OR REPLACE FUNCTION pricewaze_recalculate_signal_state_legacy(p_property_id UUID)
RETURNS void AS $$
BEGIN
  -- Legacy function is now a no-op since we use per-signal-type state
  -- The main pricewaze_recalculate_signal_state function handles everything
  -- This is kept for backward compatibility only
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Trigger to notify when a signal is confirmed (false → true)
-- Create trigger function (can be created even if table doesn't exist yet)
CREATE OR REPLACE FUNCTION pricewaze_notify_signal_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when a signal transitions from unconfirmed to confirmed
  IF NEW.confirmed = true AND (OLD.confirmed IS NULL OR OLD.confirmed = false) THEN
    PERFORM pg_notify(
      'signal_confirmed',
      json_build_object(
        'property_id', NEW.property_id,
        'signal_type', NEW.signal_type,
        'strength', NEW.strength
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if table exists and has required columns
DO $$
BEGIN
  -- Verify table exists and has required columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pricewaze_property_signal_state'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pricewaze_property_signal_state' 
    AND column_name = 'signal_type'
  ) THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS signal_confirmed_trigger ON pricewaze_property_signal_state;
    
    -- Create trigger
    EXECUTE 'CREATE TRIGGER signal_confirmed_trigger
      AFTER UPDATE ON pricewaze_property_signal_state
      FOR EACH ROW
      WHEN (NEW.confirmed IS DISTINCT FROM OLD.confirmed)
      EXECUTE FUNCTION pricewaze_notify_signal_confirmed()';
      
    RAISE NOTICE 'Signal confirmation trigger created successfully';
  ELSE
    RAISE WARNING 'Cannot create signal confirmation trigger: table pricewaze_property_signal_state or column signal_type does not exist';
  END IF;
END $$;

-- Step 7: Update existing trigger to use new recalculate function
-- (The trigger function name stays the same, but now calls the enhanced version)

-- Step 8: Enable Realtime for signal_type_state
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

-- Step 9: Create function to recalculate all properties with signals
-- Drop existing function if it exists (may have different signature from other migrations)
DROP FUNCTION IF EXISTS pricewaze_recalculate_all_signals() CASCADE;

CREATE FUNCTION pricewaze_recalculate_all_signals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Recalculate signal state for all properties with signals in last 60 days
  -- Only process if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricewaze_property_signals_raw') THEN
    FOR v_property_id IN
      SELECT DISTINCT property_id 
      FROM pricewaze_property_signals_raw
      WHERE created_at >= NOW() - INTERVAL '60 days'
    LOOP
    BEGIN
      PERFORM pricewaze_recalculate_signal_state(v_property_id);
      v_processed := v_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        -- Log error but continue processing other properties
        RAISE WARNING 'Error recalculating signals for property %: %', 
          v_property_id, SQLERRM;
    END;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$;

-- Step 10: Create cron job for periodic recalculation (every 6 hours)
-- Note: This requires pg_cron extension. If not available, use Supabase Edge Functions or external cron.
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing job if it exists
    PERFORM cron.unschedule('recalc-signals-decay') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'recalc-signals-decay'
    );
    
    -- Schedule recalculation for all properties with signals (every 6 hours)
    PERFORM cron.schedule(
      'recalc-signals-decay',
      '0 */6 * * *', -- Every 6 hours
      'SELECT pricewaze_recalculate_all_signals();'
    );
    RAISE NOTICE 'Cron job scheduled for signal recalculation';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Use Supabase Edge Functions or external cron service for periodic recalculation.';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE pricewaze_property_signal_state IS 'Per-signal-type state with decay, confirmation, and last seen time (Waze-style). One row per property+signal_type.';
COMMENT ON FUNCTION pricewaze_signal_decay_factor IS 'Calculates decay factor based on days since last report (0-7: 1.0, 8-14: 0.7, 15-30: 0.4, 30+: 0.1)';
COMMENT ON FUNCTION pricewaze_recalculate_signal_state IS 'Recalculates signal state with temporal decay and community confirmation (≥3 users in 30 days)';
COMMENT ON FUNCTION pricewaze_notify_signal_confirmed IS 'Notifies via pg_notify when a signal transitions to confirmed status';


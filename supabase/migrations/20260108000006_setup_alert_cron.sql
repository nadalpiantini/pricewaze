-- Setup Cron Job for Market Alerts Processing
-- Alternative to Vercel Cron Jobs (if using Supabase pg_cron extension)

-- Note: pg_cron setup should be done manually via Supabase Dashboard or CLI
-- This migration only creates a helper function
-- 
-- To setup pg_cron manually (if extension is enabled):
-- SELECT cron.schedule(
--   'process-market-alerts',
--   '*/15 * * * *',
--   'SELECT pricewaze_process_market_alerts();'
-- );

-- Alternative: Create a PostgreSQL function that can be called by external cron
-- This is simpler and doesn't require pg_cron extension
CREATE OR REPLACE FUNCTION pricewaze_process_market_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signals_count integer;
  v_rules_count integer;
  v_alerts_created integer := 0;
  v_signal record;
  v_rule record;
  v_result boolean;
BEGIN
  -- Get recent signals (last hour)
  SELECT COUNT(*) INTO v_signals_count
  FROM pricewaze_market_signals
  WHERE created_at >= NOW() - INTERVAL '1 hour';

  -- Get active rules
  SELECT COUNT(*) INTO v_rules_count
  FROM pricewaze_alert_rules
  WHERE active = true;

  -- Process signals and rules
  FOR v_signal IN
    SELECT * FROM pricewaze_market_signals
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
  LOOP
    FOR v_rule IN
      SELECT * FROM pricewaze_alert_rules
      WHERE active = true
      AND (zone_id IS NULL OR zone_id = v_signal.zone_id)
      AND (property_id IS NULL OR property_id = v_signal.property_id)
    LOOP
      -- Evaluate rule (simplified - in production, use JSON Logic evaluation)
      -- This is a placeholder - actual evaluation should be done in the API route
      -- because JSON Logic evaluation is better handled in Node.js
      
      -- For now, just log that we would process this
      NULL;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_signals_count,
    'rules_evaluated', v_rules_count,
    'alerts_created', v_alerts_created,
    'message', 'Use API endpoint /api/alerts/process for full JSON Logic evaluation'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION pricewaze_process_market_alerts() TO authenticated;

-- Comments
COMMENT ON FUNCTION pricewaze_process_market_alerts() IS 
  'Placeholder function for alert processing. Use API endpoint /api/alerts/process for full functionality with JSON Logic evaluation.';


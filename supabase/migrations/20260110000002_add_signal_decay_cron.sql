-- Cron Job for Automatic Signal Recalculation
-- Recalculates all property signals every 6 hours to apply temporal decay
-- This ensures signals lose strength over time (Waze-style)

-- Function to recalculate signals for all properties
-- Can be called by cron or manually
CREATE OR REPLACE FUNCTION pricewaze_recalculate_all_signals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_record RECORD;
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Process each property that has signals
  FOR v_property_record IN
    SELECT DISTINCT property_id
    FROM pricewaze_property_signals_raw
  LOOP
    BEGIN
      PERFORM pricewaze_recalculate_signal_state(v_property_record.property_id);
      v_processed := v_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        -- Log error but continue processing other properties
        RAISE WARNING 'Error recalculating signals for property %: %', 
          v_property_record.property_id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION pricewaze_recalculate_all_signals() TO authenticated;

-- Comments
COMMENT ON FUNCTION pricewaze_recalculate_all_signals() IS 
  'Recalculates signal state for all properties with signals. Applies temporal decay and updates confirmation status. Should be called every 6 hours via cron.';

-- Note: To setup pg_cron manually (if extension is enabled):
-- SELECT cron.schedule(
--   'recalc-property-signals',
--   '0 */6 * * *',  -- Every 6 hours
--   'SELECT pricewaze_recalculate_all_signals();'
-- );
--
-- Or use Supabase Edge Function + Vercel Cron:
-- Create edge function that calls this via service role
-- Schedule in vercel.json or Vercel Dashboard


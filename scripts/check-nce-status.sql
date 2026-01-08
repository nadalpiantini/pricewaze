-- ============================================================================
-- CHECK NCE STATUS
-- ============================================================================
-- Quick status check for NCE system
-- ============================================================================

-- 1. Feature Flags Status
SELECT 
  key,
  enabled,
  rollout_percent,
  updated_at
FROM pricewaze_feature_flags
WHERE key LIKE 'nce_%'
ORDER BY key;

-- 2. Jobs Status Overview
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0) as percentage
FROM pricewaze_nce_jobs
GROUP BY status
ORDER BY count DESC;

-- 3. Pending Jobs (Last 10)
SELECT 
  id,
  offer_id,
  event_id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) as wait_seconds
FROM pricewaze_nce_jobs
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10;

-- 4. Recent Processed Jobs (Last 10)
SELECT 
  id,
  offer_id,
  status,
  created_at,
  processed_at,
  EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_seconds,
  error_message
FROM pricewaze_nce_jobs
WHERE status IN ('done', 'failed')
ORDER BY processed_at DESC
LIMIT 10;

-- 5. Snapshots Created (Last 24h)
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT offer_id) as unique_offers,
  MIN(generated_at) as first_snapshot,
  MAX(generated_at) as last_snapshot
FROM pricewaze_negotiation_state_snapshots
WHERE generated_at >= now() - interval '24 hours';

-- 6. Events Processed (Last 24h)
SELECT 
  event_type,
  COUNT(*) as count
FROM pricewaze_negotiation_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY event_type
ORDER BY count DESC;


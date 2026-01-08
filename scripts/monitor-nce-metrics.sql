-- ============================================================================
-- MONITOR NCE METRICS
-- ============================================================================
-- Queries to monitor NCE system health and performance
-- ============================================================================

-- 1. Job Status Overview
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM pricewaze_nce_jobs
GROUP BY status
ORDER BY count DESC;

-- 2. Jobs by Status (Last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM pricewaze_nce_jobs
WHERE created_at >= now() - interval '24 hours'
GROUP BY status
ORDER BY count DESC;

-- 3. Failed Jobs (Last 24 hours)
SELECT 
  id,
  offer_id,
  error_message,
  created_at,
  processed_at
FROM pricewaze_nce_jobs
WHERE status = 'failed'
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Pending Jobs Queue
SELECT 
  COUNT(*) as pending_count,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending,
  AVG(EXTRACT(EPOCH FROM (now() - created_at))) as avg_wait_seconds
FROM pricewaze_nce_jobs
WHERE status = 'pending';

-- 5. Snapshots Created (Last 24 hours)
SELECT 
  COUNT(*) as snapshots_created,
  COUNT(DISTINCT offer_id) as unique_offers
FROM pricewaze_negotiation_state_snapshots
WHERE generated_at >= now() - interval '24 hours';

-- 6. Alerts Generated (Last 24 hours)
SELECT 
  alert_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE delivered = true) as delivered,
  COUNT(*) FILTER (WHERE delivered = false) as pending
FROM pricewaze_negotiation_alerts
WHERE created_at >= now() - interval '24 hours'
GROUP BY alert_type
ORDER BY count DESC;

-- 7. Feature Flag Status
SELECT 
  key,
  enabled,
  rollout_percent,
  updated_at
FROM pricewaze_feature_flags
WHERE key LIKE 'nce_%'
ORDER BY key;

-- 8. Events Processed (Last 24 hours)
SELECT 
  event_type,
  COUNT(*) as count
FROM pricewaze_negotiation_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- 9. Average Coherence Scores (Last 24 hours)
SELECT 
  CASE 
    WHEN coherence_score >= 0.7 THEN 'high'
    WHEN coherence_score >= 0.4 THEN 'medium'
    ELSE 'low'
  END as coherence_level,
  COUNT(*) as count,
  AVG(coherence_score) as avg_score
FROM pricewaze_negotiation_state_snapshots
WHERE generated_at >= now() - interval '24 hours'
  AND coherence_score IS NOT NULL
GROUP BY coherence_level
ORDER BY avg_score DESC;

-- 10. Alignment State Distribution (Last 24 hours)
SELECT 
  alignment_state,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM pricewaze_negotiation_state_snapshots
WHERE generated_at >= now() - interval '24 hours'
GROUP BY alignment_state
ORDER BY count DESC;


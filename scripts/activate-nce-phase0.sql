-- ============================================================================
-- ACTIVATE NCE PHASE 0 (Dark Mode - 5%)
-- ============================================================================
-- This enables NCE core calculation in background for 5% of offers
-- UI panel and alerts remain disabled
-- ============================================================================

-- Activate core calculation (5% rollout)
UPDATE pricewaze_feature_flags
SET enabled = true, rollout_percent = 5, updated_at = now()
WHERE key = 'nce_core';

-- Keep UI panel and alerts disabled
UPDATE pricewaze_feature_flags
SET enabled = false, rollout_percent = 0, updated_at = now()
WHERE key IN ('nce_ui_panel', 'nce_alerts');

-- Verify activation
SELECT 
  key,
  enabled,
  rollout_percent,
  updated_at
FROM pricewaze_feature_flags
WHERE key LIKE 'nce_%'
ORDER BY key;


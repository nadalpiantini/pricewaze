# ✅ NCE Phase 0 - Status Report

**Date:** 2026-01-14  
**Status:** 🟢 **ACTIVE**

---

## Feature Flags Status

✅ **Phase 0 Activated Successfully**

| Flag | Enabled | Rollout % | Status |
|------|---------|-----------|--------|
| `nce_core` | ✅ true | 5% | 🟢 Active (Dark Mode) |
| `nce_ui_panel` | ❌ false | 0% | ⚪ Disabled |
| `nce_alerts` | ❌ false | 0% | ⚪ Disabled |

**Configuration:** Correct ✅
- Core calculation running in background for 5% of offers
- UI panel disabled (users won't see it)
- Alerts disabled (no notifications)

---

## Next Steps

### 1. Process Pending Jobs

Run the processing script to calculate states for pending jobs:

```bash
# Option A: API Endpoint
curl -X POST http://localhost:3000/api/negotiation/coherence/calculate \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Option B: Shell Script
./scripts/process-nce-jobs.sh

# Option C: TypeScript
npx tsx scripts/process-nce-jobs.ts
```

### 2. Monitor Metrics

Check system health:

```bash
# Run status check
psql $DATABASE_URL -f scripts/check-nce-status.sql

# Or run full metrics
psql $DATABASE_URL -f scripts/monitor-nce-metrics.sql
```

### 3. Verify Calculations

Spot-check a few snapshots to ensure calculations are correct:

```sql
-- Get a recent snapshot with all related data
SELECT 
  s.id,
  s.offer_id,
  s.alignment_state,
  s.rhythm_state,
  s.friction_level,
  s.market_pressure,
  f.dominant_friction,
  r.concession_pattern,
  i.summary
FROM pricewaze_negotiation_state_snapshots s
LEFT JOIN pricewaze_negotiation_friction f ON f.snapshot_id = s.id
LEFT JOIN pricewaze_negotiation_rhythm r ON r.snapshot_id = s.id
LEFT JOIN pricewaze_negotiation_insights i ON i.snapshot_id = s.id
ORDER BY s.generated_at DESC
LIMIT 5;
```

---

## Expected Behavior (Phase 0)

### What Should Happen:
- ✅ Jobs created for ~5% of new offer events
- ✅ Jobs processed automatically (or via script)
- ✅ Snapshots created in background
- ✅ No user-visible changes (UI disabled)
- ✅ No alerts sent (alerts disabled)

### What to Monitor:
1. **Job Success Rate** - Should be >95%
2. **Processing Time** - Should be <5 seconds average
3. **Queue Depth** - Should stay <50 pending jobs
4. **Error Rate** - Should be <5%

---

## Monitoring Queries

### Quick Health Check
```sql
-- Job status
SELECT status, COUNT(*) 
FROM pricewaze_nce_jobs 
GROUP BY status;

-- Success rate (last 24h)
SELECT 
  COUNT(*) FILTER (WHERE status = 'done') * 100.0 / 
  NULLIF(COUNT(*), 0) as success_rate
FROM pricewaze_nce_jobs
WHERE created_at >= now() - interval '24 hours';
```

### Performance Check
```sql
-- Average processing time
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM pricewaze_nce_jobs
WHERE status = 'done'
  AND processed_at >= now() - interval '1 hour';
```

---

## Troubleshooting

### If No Jobs Are Being Created:
1. Check if events are being created:
   ```sql
   SELECT COUNT(*) FROM pricewaze_negotiation_events 
   WHERE created_at >= now() - interval '1 hour';
   ```

2. Check if triggers are working:
   ```sql
   SELECT * FROM pricewaze_nce_jobs 
   ORDER BY created_at DESC LIMIT 5;
   ```

### If Jobs Are Stuck:
1. Process manually:
   ```bash
   curl -X POST http://localhost:3000/api/negotiation/coherence/calculate
   ```

2. Check for errors:
   ```sql
   SELECT error_message, COUNT(*) 
   FROM pricewaze_nce_jobs 
   WHERE status = 'failed' 
   GROUP BY error_message;
   ```

---

## Timeline

- **Now:** Phase 0 active (5% dark mode)
- **24-48h:** Monitor and validate
- **After validation:** Move to Phase 1 (10% + UI)

---

**Status:** ✅ Phase 0 Active - Ready for Monitoring


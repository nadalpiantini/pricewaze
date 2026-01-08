# 🚀 Quick Start: NCE Phase 0 Activation

## Step 1: Activate Phase 0 (Dark Mode - 5%)

### Option A: Via Supabase Dashboard
1. Go to SQL Editor
2. Run: `scripts/activate-nce-phase0.sql`
3. Verify flags are set correctly

### Option B: Via CLI
```bash
# Set your database URL
export DATABASE_URL="postgresql://..."

# Run activation script
psql $DATABASE_URL -f scripts/activate-nce-phase0.sql
```

### Option C: Manual SQL
```sql
UPDATE pricewaze_feature_flags
SET enabled = true, rollout_percent = 5, updated_at = now()
WHERE key = 'nce_core';
```

**Verify:**
```sql
SELECT key, enabled, rollout_percent 
FROM pricewaze_feature_flags 
WHERE key LIKE 'nce_%';
```

---

## Step 2: Process Pending Jobs

### Option A: API Endpoint (Recommended)
```bash
# From your local machine or server
curl -X POST http://localhost:3000/api/negotiation/coherence/calculate \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### Option B: Shell Script
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
export NEXT_PUBLIC_API_URL="http://localhost:3000"
./scripts/process-nce-jobs.sh
```

### Option C: TypeScript Script
```bash
npx tsx scripts/process-nce-jobs.ts
```

### Option D: Cron Job (Production)
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /path/to/pricewaze && ./scripts/process-nce-jobs.sh >> /var/log/nce-jobs.log 2>&1
```

---

## Step 3: Monitor Metrics

### Quick Status
```sql
-- Job status overview
SELECT status, COUNT(*) as count
FROM pricewaze_nce_jobs
GROUP BY status;
```

### Full Report
```bash
psql $DATABASE_URL -f scripts/monitor-nce-metrics.sql
```

### Key Metrics Dashboard
```sql
-- 1. Job Success Rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'done') * 100.0 / COUNT(*) as success_rate
FROM pricewaze_nce_jobs
WHERE created_at >= now() - interval '24 hours';

-- 2. Average Processing Time
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM pricewaze_nce_jobs
WHERE status = 'done'
  AND processed_at >= now() - interval '1 hour';

-- 3. Pending Queue
SELECT COUNT(*) as pending_count
FROM pricewaze_nce_jobs
WHERE status = 'pending';

-- 4. Snapshots Created (Last 24h)
SELECT COUNT(*) as snapshots
FROM pricewaze_negotiation_state_snapshots
WHERE generated_at >= now() - interval '24 hours';
```

---

## ✅ Verification Checklist

After activation, verify:

- [ ] Feature flags activated (nce_core = 5%)
- [ ] Jobs are being created (check `pricewaze_nce_jobs`)
- [ ] Jobs are being processed (status = 'done')
- [ ] Snapshots are being created (check `pricewaze_negotiation_state_snapshots`)
- [ ] No errors in failed jobs
- [ ] Processing time < 5 seconds average

---

## 📊 Expected Results (Phase 0)

- **Job Creation:** ~5% of new offer events create jobs
- **Processing:** Jobs complete in <5 seconds
- **Success Rate:** >95%
- **Snapshots:** Created for 5% of offers
- **User Impact:** None (UI disabled)

---

## 🚨 Troubleshooting

### No Jobs Being Created
- Check if feature flag is enabled: `SELECT * FROM pricewaze_feature_flags WHERE key = 'nce_core';`
- Check if triggers are working: `SELECT * FROM pricewaze_negotiation_events LIMIT 5;`

### Jobs Stuck in Pending
- Run processing script manually
- Check API endpoint is accessible
- Verify service role key is set

### High Error Rate
- Check error messages: `SELECT error_message FROM pricewaze_nce_jobs WHERE status = 'failed' LIMIT 10;`
- Review calculation logic
- Check database permissions

---

## 📈 Next Steps (After 24-48h)

1. Review metrics
2. Validate calculations (spot-check snapshots)
3. Check for any performance impact
4. Move to Phase 1 (10% rollout + UI)

---

**Status:** Ready for Phase 0 activation ✅


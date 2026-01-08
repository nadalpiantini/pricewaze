# NCE Operations Guide

## Phase 0 Activation (Dark Mode - 5%)

### Step 1: Activate Feature Flags

Run the SQL script to activate Phase 0:

```bash
# In Supabase SQL Editor or via CLI
psql $DATABASE_URL -f scripts/activate-nce-phase0.sql
```

Or manually:

```sql
UPDATE pricewaze_feature_flags
SET enabled = true, rollout_percent = 5, updated_at = now()
WHERE key = 'nce_core';
```

### Step 2: Verify Activation

```sql
SELECT key, enabled, rollout_percent, updated_at
FROM pricewaze_feature_flags
WHERE key LIKE 'nce_%'
ORDER BY key;
```

Expected output:
- `nce_core`: enabled=true, rollout_percent=5
- `nce_ui_panel`: enabled=false, rollout_percent=0
- `nce_alerts`: enabled=false, rollout_percent=0

---

## Processing Jobs

### Option 1: Manual Processing (API Endpoint)

```bash
curl -X POST http://localhost:3000/api/negotiation/coherence/calculate \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### Option 2: Shell Script

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export NEXT_PUBLIC_API_URL="http://localhost:3000"
./scripts/process-nce-jobs.sh
```

### Option 3: TypeScript Script

```bash
npx tsx scripts/process-nce-jobs.ts
```

### Option 4: Cron Job (Production)

Add to crontab:

```bash
# Process NCE jobs every 5 minutes
*/5 * * * * cd /path/to/pricewaze && ./scripts/process-nce-jobs.sh >> /var/log/nce-jobs.log 2>&1
```

---

## Monitoring Metrics

### Quick Status Check

```sql
-- Job status overview
SELECT status, COUNT(*) as count
FROM pricewaze_nce_jobs
GROUP BY status;
```

### Full Metrics Report

Run the monitoring script:

```bash
psql $DATABASE_URL -f scripts/monitor-nce-metrics.sql
```

### Key Metrics to Watch

1. **Job Success Rate**
   - Target: >95% success rate
   - Alert if: <90% success rate

2. **Processing Time**
   - Target: <5 seconds per job
   - Alert if: >10 seconds average

3. **Queue Depth**
   - Target: <50 pending jobs
   - Alert if: >100 pending jobs

4. **Error Rate**
   - Target: <5% errors
   - Alert if: >10% errors

---

## Rollout Phases

### Phase 0: Dark Mode (Current)
- `nce_core`: 5%
- `nce_ui_panel`: 0%
- `nce_alerts`: 0%

**Duration:** 24-48 hours  
**Goal:** Validate calculation logic, no user impact

### Phase 1: Internal Users
- `nce_core`: 10%
- `nce_ui_panel`: 10%
- `nce_alerts`: 0%

**Duration:** 1 week  
**Goal:** Test UI, gather feedback

### Phase 2: Early Adopters
- `nce_core`: 25%
- `nce_ui_panel`: 25%
- `nce_alerts`: 10%

**Duration:** 2 weeks  
**Goal:** Validate alerts, measure engagement

### Phase 3: General Availability
- `nce_core`: 100%
- `nce_ui_panel`: 100%
- `nce_alerts`: 50%

**Duration:** Ongoing  
**Goal:** Full rollout

---

## Troubleshooting

### Jobs Stuck in "pending"

1. Check if worker is running:
   ```bash
   curl http://localhost:3000/api/negotiation/coherence/calculate
   ```

2. Check for errors:
   ```sql
   SELECT * FROM pricewaze_nce_jobs
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. Manually process:
   ```bash
   ./scripts/process-nce-jobs.sh
   ```

### High Error Rate

1. Check error messages:
   ```sql
   SELECT error_message, COUNT(*) as count
   FROM pricewaze_nce_jobs
   WHERE status = 'failed'
   GROUP BY error_message
   ORDER BY count DESC;
   ```

2. Check feature flag status:
   ```sql
   SELECT * FROM pricewaze_feature_flags WHERE key = 'nce_core';
   ```

### Performance Issues

1. Check processing times:
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
   FROM pricewaze_nce_jobs
   WHERE status = 'done'
     AND processed_at >= now() - interval '1 hour';
   ```

2. Check queue depth:
   ```sql
   SELECT COUNT(*) FROM pricewaze_nce_jobs WHERE status = 'pending';
   ```

---

## Rollback

### Instant Rollback (Disable All)

```sql
UPDATE pricewaze_feature_flags
SET enabled = false, rollout_percent = 0
WHERE key LIKE 'nce_%';
```

### Partial Rollback (Reduce Rollout)

```sql
-- Reduce to 1% for testing
UPDATE pricewaze_feature_flags
SET rollout_percent = 1
WHERE key = 'nce_core';
```

---

## Next Steps After Phase 0

1. **Monitor for 24-48 hours**
   - Check job success rate
   - Verify no performance impact
   - Review error logs

2. **Validate Calculations**
   - Spot-check snapshots
   - Verify insights make sense
   - Check alert triggers

3. **Move to Phase 1**
   - Increase rollout to 10%
   - Enable UI panel for 10%
   - Gather user feedback


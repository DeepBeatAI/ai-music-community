# Analytics System Deployment Checklist

## Pre-Deployment Validation

### 1. Database Schema

- [ ] Migration file exists: `supabase/migrations/20250113000000_analytics_metrics_complete.sql`
- [ ] Migration has been tested locally
- [ ] All tables created successfully:
  - [ ] `daily_metrics`
  - [ ] `metric_definitions`
  - [ ] `metric_collection_log`
- [ ] All indexes created:
  - [ ] `idx_daily_metrics_date_type`
  - [ ] `idx_daily_metrics_category`
  - [ ] `idx_daily_metrics_collection`
  - [ ] `idx_metric_collection_log_date`
- [ ] All functions created:
  - [ ] `collect_daily_metrics()`
  - [ ] `backfill_daily_metrics()`
- [ ] RLS policies configured correctly
- [ ] Metric definitions populated (5 core metrics)

**Validation Query:**
```sql
-- Verify all objects exist
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')) as tables_count,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE tablename = 'daily_metrics') as indexes_count,
  (SELECT COUNT(*) FROM pg_proc 
   WHERE proname IN ('collect_daily_metrics', 'backfill_daily_metrics')) as functions_count,
  (SELECT COUNT(*) FROM metric_definitions) as metrics_count;

-- Expected: tables_count=3, indexes_count=3, functions_count=2, metrics_count=5
```

### 2. Data Collection

- [ ] Manual collection test passed:
```sql
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```
- [ ] Backfill completed successfully
- [ ] All expected metrics present (5 per day)
- [ ] No gaps in date coverage
- [ ] Collection logs show success status

**Validation Query:**
```sql
-- Check recent collections
SELECT 
  metric_date,
  COUNT(*) as metric_count,
  MAX(collection_timestamp) as last_collected
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY metric_date
ORDER BY metric_date DESC;

-- Expected: 5 metrics per date
```

### 3. API Functions

- [ ] TypeScript functions implemented in `client/src/lib/analytics.ts`:
  - [ ] `fetchMetrics()`
  - [ ] `fetchCurrentMetrics()`
  - [ ] `fetchActivityData()`
  - [ ] `triggerMetricCollection()`
- [ ] Functions tested with real data
- [ ] Error handling works correctly
- [ ] Response times acceptable (< 100ms)

**Test Script:**
```typescript
// Run in browser console or test file
import { fetchCurrentMetrics, fetchActivityData } from '@/lib/analytics';

const current = await fetchCurrentMetrics();
console.log('Current metrics:', current);

const activity = await fetchActivityData();
console.log('Activity data:', activity);
```

### 4. Dashboard Integration

- [ ] Analytics dashboard displays metrics correctly
- [ ] Charts render without errors
- [ ] Data updates when refreshed
- [ ] Loading states work properly
- [ ] Error states handled gracefully
- [ ] Mobile responsive design verified

**Manual Test:**
1. Navigate to analytics dashboard
2. Verify all metrics display
3. Check chart interactions
4. Test on mobile device
5. Verify no console errors

### 5. Automation Setup

- [ ] Edge Function deployed: `supabase/functions/collect-metrics/index.ts`
- [ ] Cron trigger configured (daily at 00:00 UTC)
- [ ] Function has correct environment variables
- [ ] Function has service role permissions
- [ ] Test invocation successful

**Validation:**
```bash
# Test edge function locally
supabase functions serve collect-metrics

# Invoke manually
curl -X POST http://localhost:54321/functions/v1/collect-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 6. Performance Validation

- [ ] Collection time < 30 seconds
- [ ] Query time < 100ms for 30-day range
- [ ] Dashboard load time < 2 seconds
- [ ] No N+1 query issues
- [ ] Indexes being used (check EXPLAIN ANALYZE)

**Performance Test:**
```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC;

-- Should show index scan, not sequential scan
```

### 7. Security Validation

- [ ] RLS policies tested with different user roles
- [ ] Service role required for writes
- [ ] Public read access works
- [ ] Admin-only access to logs verified
- [ ] No sensitive data exposed in metadata

**Security Test:**
```sql
-- Test as anonymous user (should succeed)
SET ROLE anon;
SELECT * FROM daily_metrics LIMIT 1;

-- Test write as anonymous (should fail)
INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
VALUES (CURRENT_DATE, 'count', 'test', 1);

-- Reset role
RESET ROLE;
```

### 8. Documentation

- [ ] Main README created: `docs/features/analytics/README.md`
- [ ] Backfill guide created: `docs/features/analytics/BACKFILL_GUIDE.md`
- [ ] Adding metrics guide created: `docs/features/analytics/ADDING_METRICS.md`
- [ ] Deployment checklist created (this file)
- [ ] Testing guide updated
- [ ] Migration guide exists
- [ ] All documentation reviewed for accuracy

### 9. Testing

- [ ] Unit tests pass: `npm test analytics`
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error scenarios tested

**Run Tests:**
```bash
cd client
npm test -- analytics
```

### 10. Monitoring Setup

- [ ] Collection logs being written
- [ ] Error alerts configured (if applicable)
- [ ] Performance metrics tracked
- [ ] Dashboard for monitoring created

**Monitoring Query:**
```sql
-- Check collection health
SELECT 
  DATE(started_at) as date,
  COUNT(*) as collections,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM metric_collection_log
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

## Deployment Steps

### Step 1: Backup Current State

```bash
# Backup database (if applicable)
pg_dump -h your-db-host -U postgres -d your-db > backup_pre_analytics.sql

# Backup current code
git commit -am "Pre-analytics deployment backup"
git tag pre-analytics-deployment
```

### Step 2: Deploy Database Changes

```bash
# Apply migration
supabase db push

# Or manually apply
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20250113000000_analytics_metrics_complete.sql
```

### Step 3: Verify Database Deployment

```sql
-- Run validation queries from section 1
SELECT * FROM metric_definitions;
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

### Step 4: Run Initial Backfill

```bash
cd scripts
npx tsx backfill-analytics.ts
```

### Step 5: Deploy Application Code

```bash
# Deploy to Vercel (or your platform)
git push origin main

# Or manual deploy
vercel --prod
```

### Step 6: Deploy Edge Function

```bash
# Deploy collect-metrics function
supabase functions deploy collect-metrics

# Configure cron trigger
supabase functions schedule collect-metrics "0 0 * * *"
```

### Step 7: Verify Deployment

- [ ] Visit analytics dashboard
- [ ] Check metrics display correctly
- [ ] Verify data is current
- [ ] Test manual collection
- [ ] Check collection logs

### Step 8: Monitor Initial Period

- [ ] Check logs after first automated collection
- [ ] Verify no errors in production
- [ ] Monitor performance metrics
- [ ] Validate data accuracy

## Post-Deployment Validation

### Day 1 Checks

- [ ] Automated collection ran successfully
- [ ] New metrics appeared in database
- [ ] Dashboard shows updated data
- [ ] No errors in logs
- [ ] Performance within acceptable range

**Validation:**
```sql
-- Check today's collection
SELECT * FROM metric_collection_log
WHERE collection_date = CURRENT_DATE;

SELECT * FROM daily_metrics
WHERE metric_date = CURRENT_DATE;
```

### Week 1 Checks

- [ ] Daily collections running consistently
- [ ] No missed dates
- [ ] Data accuracy verified against source tables
- [ ] Performance stable
- [ ] No user-reported issues

**Validation:**
```sql
-- Check last 7 days
SELECT 
  metric_date,
  COUNT(*) as metrics_collected
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY metric_date
ORDER BY metric_date DESC;
```

### Month 1 Checks

- [ ] System running smoothly
- [ ] Data quality maintained
- [ ] Performance acceptable
- [ ] Documentation accurate
- [ ] No major issues

## Rollback Plan

If issues occur, follow this rollback procedure:

### 1. Stop Automated Collection

```bash
# Disable cron trigger
supabase functions unschedule collect-metrics
```

### 2. Assess Impact

```sql
-- Check what data was collected
SELECT * FROM daily_metrics
WHERE collection_timestamp >= 'DEPLOYMENT_TIMESTAMP';

-- Check for errors
SELECT * FROM metric_collection_log
WHERE status = 'failed';
```

### 3. Rollback Database (if needed)

```sql
-- Drop analytics tables
DROP TABLE IF EXISTS daily_metrics CASCADE;
DROP TABLE IF EXISTS metric_definitions CASCADE;
DROP TABLE IF EXISTS metric_collection_log CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS collect_daily_metrics(DATE);
DROP FUNCTION IF EXISTS backfill_daily_metrics(DATE, DATE);
```

### 4. Rollback Application Code

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or restore from tag
git checkout pre-analytics-deployment
```

### 5. Restore from Backup (if needed)

```bash
# Restore database
psql -h your-db-host -U postgres -d your-db < backup_pre_analytics.sql
```

## Troubleshooting Common Issues

### Issue: Migration fails

**Solution:**
1. Check error message in migration output
2. Verify no conflicting table/function names
3. Check database permissions
4. Try applying migration manually with detailed error output

### Issue: Backfill fails or is slow

**Solution:**
1. Run backfill in smaller date ranges
2. Check database load and available resources
3. Verify source tables have data
4. Check for missing indexes

### Issue: Dashboard not showing data

**Solution:**
1. Check browser console for errors
2. Verify API functions are working
3. Check RLS policies allow read access
4. Verify data exists in database

### Issue: Automated collection not running

**Solution:**
1. Check edge function deployment status
2. Verify cron trigger is configured
3. Check function logs for errors
4. Test manual invocation

### Issue: Performance degradation

**Solution:**
1. Check if indexes are being used
2. Verify query optimization
3. Check database resource usage
4. Consider adding more indexes or optimizing queries

## Success Criteria

Deployment is considered successful when:

- [ ] All pre-deployment checks pass
- [ ] Migration applied without errors
- [ ] Backfill completed successfully
- [ ] Dashboard displays metrics correctly
- [ ] Automated collection runs daily
- [ ] Performance meets benchmarks
- [ ] No critical errors in logs
- [ ] Documentation is complete and accurate
- [ ] Team is trained on the system

## Support Contacts

- **Technical Issues**: Check troubleshooting section
- **Documentation**: See `docs/features/analytics/`
- **Design Details**: `.kiro/specs/analytics-metrics-table/design.md`

## Related Documentation

- [Analytics System README](./README.md)
- [Backfill Guide](./BACKFILL_GUIDE.md)
- [Adding New Metrics](./ADDING_METRICS.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Version**: 1.0  
**Status**: ☐ Success ☐ Partial ☐ Rollback Required

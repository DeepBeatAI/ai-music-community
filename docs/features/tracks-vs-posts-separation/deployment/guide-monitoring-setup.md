# Monitoring and Alerts Setup: Tracks vs Posts Separation

## Document Information
- **Feature**: Tracks vs Posts Separation
- **Version**: 1.0
- **Created**: January 2025
- **Status**: Production Ready

## Overview

This document outlines the monitoring and alerting setup for the tracks-posts separation deployment. Proper monitoring ensures early detection of issues and enables quick response.

---

## Monitoring Strategy

### Monitoring Phases

**Phase 1: Pre-Deployment (Baseline)**
- Establish baseline metrics
- Document normal performance
- Set up comparison dashboards

**Phase 2: During Migration (Active)**
- Real-time migration progress
- Error detection
- Performance monitoring

**Phase 3: Post-Deployment (Validation)**
- Data integrity checks
- Performance comparison
- User impact assessment

**Phase 4: Ongoing (Steady State)**
- Long-term performance tracking
- Trend analysis
- Capacity planning

---

## Key Metrics to Monitor

### 1. Database Metrics

#### Query Performance
- **Metric**: Query execution time
- **Threshold**: <100ms for standard queries
- **Alert**: >200ms sustained for 5 minutes
- **Critical**: >500ms or timeout errors

#### Connection Pool
- **Metric**: Active connections
- **Threshold**: <80% of pool size
- **Alert**: >80% for 5 minutes
- **Critical**: >95% or connection errors

#### Database CPU
- **Metric**: CPU utilization
- **Threshold**: <70% average
- **Alert**: >80% for 10 minutes
- **Critical**: >90% sustained

#### Database Memory
- **Metric**: Memory usage
- **Threshold**: <80% of available
- **Alert**: >85% for 5 minutes
- **Critical**: >95% or OOM errors

### 2. Application Metrics

#### Error Rate
- **Metric**: Errors per minute
- **Threshold**: <1% of requests
- **Alert**: >5% for 2 minutes
- **Critical**: >10% or complete failures

#### API Response Time
- **Metric**: P95 response time
- **Threshold**: <500ms
- **Alert**: >1000ms for 5 minutes
- **Critical**: >2000ms or timeouts

#### Track Operations
- **Metric**: Track upload success rate
- **Threshold**: >95%
- **Alert**: <90% for 5 minutes
- **Critical**: <80% or complete failures

#### Post Creation
- **Metric**: Audio post creation success rate
- **Threshold**: >95%
- **Alert**: <90% for 5 minutes
- **Critical**: <80% or complete failures

### 3. Data Integrity Metrics

#### Orphaned Posts
- **Metric**: Audio posts without track_id
- **Threshold**: 0
- **Alert**: >0 detected
- **Critical**: >10 or increasing

#### Invalid References
- **Metric**: Posts/playlists with invalid track_id
- **Threshold**: 0
- **Alert**: >0 detected
- **Critical**: >5 or increasing

#### Migration Progress
- **Metric**: Percentage of posts migrated
- **Threshold**: 100% on completion
- **Alert**: Stalled for >10 minutes
- **Critical**: Errors during migration

---

## Monitoring Implementation

### 1. Database Monitoring Queries

Create these as saved queries in Supabase or monitoring tool:


```sql
-- Query 1: Track Operations Health
-- Run every 5 minutes
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as tracks_created_5min,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as tracks_created_1hr,
  COUNT(*) as total_tracks
FROM tracks;

-- Query 2: Post-Track Integrity
-- Run every 5 minutes
SELECT 
  COUNT(*) FILTER (WHERE post_type = 'audio' AND track_id IS NULL) as orphaned_posts,
  COUNT(*) FILTER (WHERE post_type = 'audio' AND track_id IS NOT NULL) as valid_audio_posts,
  COUNT(*) FILTER (WHERE post_type = 'text') as text_posts
FROM posts;

-- Query 3: Playlist Integrity
-- Run every 10 minutes
SELECT 
  COUNT(*) as total_playlist_tracks,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM tracks WHERE id = playlist_tracks.track_id
  )) as valid_references,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM tracks WHERE id = playlist_tracks.track_id
  )) as invalid_references
FROM playlist_tracks;

-- Query 4: Query Performance
-- Run every 5 minutes
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%tracks%' OR query LIKE '%posts%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Query 5: Active Connections
-- Run every 2 minutes
SELECT 
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity
WHERE datname = current_database();

-- Query 6: Migration Progress (during migration only)
-- Run every 1 minute during migration
SELECT 
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as total_audio_posts,
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NOT NULL) as migrated_posts,
  (SELECT COUNT(*) FROM tracks) as total_tracks,
  ROUND(
    (SELECT COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NOT NULL)::numeric / 
    NULLIF((SELECT COUNT(*) FROM posts WHERE post_type = 'audio'), 0) * 100,
    2
  ) as migration_progress_pct;
```

### 2. Application Logging

Add logging for track operations in the application:

```typescript
// client/src/lib/tracks.ts

import { logger } from '@/lib/logger';

export async function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Track upload started', {
      userId,
      fileName: uploadData.file.name,
      fileSize: uploadData.file.size,
      mimeType: uploadData.file.type,
    });

    // ... upload logic ...

    const duration = Date.now() - startTime;
    logger.info('Track upload successful', {
      userId,
      trackId: track.id,
      duration,
      fileSize: uploadData.file.size,
    });

    // Track metric
    trackMetric('track_upload_success', {
      duration,
      fileSize: uploadData.file.size,
    });

    return { success: true, track };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Track upload failed', {
      userId,
      fileName: uploadData.file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    // Track metric
    trackMetric('track_upload_failure', {
      duration,
      errorType: error instanceof Error ? error.name : 'Unknown',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Similar logging for other track operations
export async function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post> {
  const startTime = Date.now();
  
  try {
    logger.info('Audio post creation started', {
      userId,
      trackId,
      hasCaption: !!caption,
    });

    // ... creation logic ...

    const duration = Date.now() - startTime;
    logger.info('Audio post creation successful', {
      userId,
      trackId,
      postId: post.id,
      duration,
    });

    trackMetric('audio_post_creation_success', { duration });

    return post;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Audio post creation failed', {
      userId,
      trackId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    trackMetric('audio_post_creation_failure', {
      duration,
      errorType: error instanceof Error ? error.name : 'Unknown',
    });

    throw error;
  }
}
```

### 3. Error Tracking Setup

Configure error tracking (e.g., Sentry) with custom tags:

```typescript
// client/src/lib/error-tracking.ts

import * as Sentry from '@sentry/nextjs';

export function initializeErrorTracking() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Add custom tags for track operations
    beforeSend(event, hint) {
      // Tag track-related errors
      if (event.message?.includes('track') || 
          event.exception?.values?.[0]?.value?.includes('track')) {
        event.tags = {
          ...event.tags,
          feature: 'tracks-posts-separation',
          operation: 'track-operation',
        };
      }

      // Tag migration-related errors
      if (event.message?.includes('migration') ||
          event.message?.includes('track_id')) {
        event.tags = {
          ...event.tags,
          feature: 'tracks-posts-separation',
          operation: 'migration',
        };
      }

      return event;
    },
  });
}

// Custom error reporting for track operations
export function reportTrackError(
  operation: string,
  error: Error,
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('feature', 'tracks-posts-separation');
    scope.setTag('operation', operation);
    scope.setContext('track_operation', context || {});
    Sentry.captureException(error);
  });
}
```

### 4. Performance Monitoring

Set up performance monitoring for critical queries:

```typescript
// client/src/lib/performance.ts

export async function monitoredQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    // Log slow queries
    if (duration > 100) {
      logger.warn('Slow query detected', {
        queryName,
        duration,
        threshold: 100,
      });
    }
    
    // Track metric
    trackMetric('query_duration', {
      queryName,
      duration,
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.error('Query failed', {
      queryName,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

// Usage example
export async function fetchPostsWithTracks(page: number, limit: number) {
  return monitoredQuery('fetchPostsWithTracks', async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    return data;
  });
}
```

---

## Alert Configuration

### 1. Database Alerts

Configure alerts in Supabase dashboard or monitoring tool:

#### Critical Alerts (Immediate Response)

**Alert: Orphaned Audio Posts**
- **Condition**: `COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NULL > 0`
- **Frequency**: Every 5 minutes
- **Notification**: Slack + Email + PagerDuty
- **Action**: Investigate immediately, may need data fix

**Alert: Invalid Track References**
- **Condition**: Invalid foreign key references detected
- **Frequency**: Every 5 minutes
- **Notification**: Slack + Email + PagerDuty
- **Action**: Check data integrity, may need cleanup

**Alert: Database CPU Critical**
- **Condition**: CPU > 90% for 5 minutes
- **Frequency**: Every 2 minutes
- **Notification**: Slack + PagerDuty
- **Action**: Check slow queries, consider scaling

**Alert: Connection Pool Exhausted**
- **Condition**: Active connections > 95% of pool
- **Frequency**: Every 2 minutes
- **Notification**: Slack + PagerDuty
- **Action**: Check for connection leaks, scale pool

#### Warning Alerts (Monitor Closely)

**Alert: Slow Queries**
- **Condition**: Query execution time > 200ms
- **Frequency**: Every 10 minutes
- **Notification**: Slack
- **Action**: Review query performance, optimize if needed

**Alert: High Error Rate**
- **Condition**: Error rate > 5% for 5 minutes
- **Frequency**: Every 5 minutes
- **Notification**: Slack + Email
- **Action**: Check error logs, identify pattern

**Alert: Track Upload Failures**
- **Condition**: Upload success rate < 90%
- **Frequency**: Every 10 minutes
- **Notification**: Slack
- **Action**: Check storage service, review errors

### 2. Application Alerts

Configure in error tracking tool (Sentry):

**Alert: Track Operation Errors**
- **Condition**: >10 track-related errors in 10 minutes
- **Notification**: Slack + Email
- **Action**: Review error details, check for pattern

**Alert: Migration Errors**
- **Condition**: Any error tagged with 'migration'
- **Notification**: Slack + Email + PagerDuty
- **Action**: Immediate investigation, may need rollback

**Alert: Performance Degradation**
- **Condition**: P95 response time > 1000ms for 10 minutes
- **Notification**: Slack
- **Action**: Check database performance, review slow queries

### 3. Alert Notification Channels

**Slack Configuration:**
```yaml
# Slack webhook setup
channels:
  critical: "#alerts-critical"
  warning: "#alerts-warning"
  info: "#alerts-info"
  
webhooks:
  critical: "https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK"
  warning: "https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK"
  info: "https://hooks.slack.com/services/YOUR/INFO/WEBHOOK"
```

**Email Configuration:**
```yaml
# Email alert setup
recipients:
  critical:
    - oncall@company.com
    - devops@company.com
  warning:
    - dev-team@company.com
  info:
    - dev-team@company.com
```

**PagerDuty Configuration:**
```yaml
# PagerDuty integration
services:
  database: "DATABASE_SERVICE_KEY"
  application: "APPLICATION_SERVICE_KEY"
  
escalation:
  - level: 1
    delay: 0
    targets: ["oncall-engineer"]
  - level: 2
    delay: 15
    targets: ["database-admin", "devops-lead"]
  - level: 3
    delay: 30
    targets: ["engineering-manager"]
```

---

## Monitoring Dashboards

### Dashboard 1: Migration Progress

**Purpose**: Track migration execution in real-time

**Widgets:**
1. Migration Progress Bar (0-100%)
2. Posts Migrated Count
3. Tracks Created Count
4. Migration Duration
5. Current Migration Phase
6. Errors Encountered

**Refresh**: Every 30 seconds during migration

### Dashboard 2: Data Integrity

**Purpose**: Monitor data consistency

**Widgets:**
1. Orphaned Posts Count (should be 0)
2. Invalid References Count (should be 0)
3. Track-Post Mapping Health
4. Playlist Integrity Status
5. Recent Data Issues Log

**Refresh**: Every 5 minutes

### Dashboard 3: Performance Metrics

**Purpose**: Track system performance

**Widgets:**
1. Query Response Times (P50, P95, P99)
2. Database CPU Usage
3. Database Memory Usage
4. Active Connections
5. Slow Query Log
6. API Response Times

**Refresh**: Every 2 minutes

### Dashboard 4: Application Health

**Purpose**: Monitor application-level metrics

**Widgets:**
1. Error Rate (per minute)
2. Track Upload Success Rate
3. Post Creation Success Rate
4. Active Users
5. Recent Errors
6. Feature Usage Stats

**Refresh**: Every 1 minute

---

## Monitoring Procedures

### Pre-Deployment Monitoring

**1 Week Before:**
- [ ] Set up all monitoring queries
- [ ] Configure alert thresholds
- [ ] Test alert notifications
- [ ] Create monitoring dashboards
- [ ] Document baseline metrics

**1 Day Before:**
- [ ] Verify all monitors active
- [ ] Test alert escalation
- [ ] Confirm team access to dashboards
- [ ] Review alert response procedures

### During Deployment Monitoring

**Active Monitoring (Every 5 minutes):**
- [ ] Check migration progress dashboard
- [ ] Review error logs
- [ ] Monitor database performance
- [ ] Check alert notifications
- [ ] Verify data integrity

**Continuous Monitoring:**
- [ ] Keep dashboards visible
- [ ] Monitor Slack alerts
- [ ] Watch for performance degradation
- [ ] Track migration duration
- [ ] Document any issues

### Post-Deployment Monitoring

**First Hour:**
- [ ] Monitor every 5 minutes
- [ ] Run all verification queries
- [ ] Check error rates
- [ ] Verify performance metrics
- [ ] Test critical functionality

**First 24 Hours:**
- [ ] Monitor every 30 minutes
- [ ] Review daily metrics
- [ ] Check for anomalies
- [ ] Verify user activity normal
- [ ] Document any issues

**First Week:**
- [ ] Daily monitoring review
- [ ] Weekly metrics comparison
- [ ] Trend analysis
- [ ] Performance optimization
- [ ] Alert threshold tuning

---

## Monitoring Checklist

### Setup Phase
- [ ] Database monitoring queries created
- [ ] Application logging implemented
- [ ] Error tracking configured
- [ ] Performance monitoring set up
- [ ] Alerts configured
- [ ] Notification channels tested
- [ ] Dashboards created
- [ ] Team trained on dashboards
- [ ] Baseline metrics documented

### Deployment Phase
- [ ] All monitors active
- [ ] Dashboards accessible
- [ ] Alert notifications working
- [ ] Team monitoring actively
- [ ] Escalation procedures ready

### Post-Deployment Phase
- [ ] Monitoring data collected
- [ ] Metrics compared to baseline
- [ ] Issues documented
- [ ] Alerts tuned
- [ ] Dashboards updated

---

## Troubleshooting Monitoring Issues

### Issue: Alerts Not Firing

**Possible Causes:**
- Alert configuration incorrect
- Notification channel down
- Threshold too high
- Query syntax error

**Resolution:**
1. Verify alert configuration
2. Test notification manually
3. Check query execution
4. Review threshold settings

### Issue: False Positive Alerts

**Possible Causes:**
- Threshold too sensitive
- Normal variance in metrics
- Temporary spike

**Resolution:**
1. Review alert history
2. Adjust thresholds
3. Add time-based conditions
4. Implement alert dampening

### Issue: Missing Metrics

**Possible Causes:**
- Query not running
- Database connection issue
- Monitoring service down

**Resolution:**
1. Check monitoring service status
2. Verify database connectivity
3. Review query logs
4. Restart monitoring if needed

---

*Monitoring Setup Guide Version: 1.0*  
*Created: January 2025*  
*Status: Production Ready*

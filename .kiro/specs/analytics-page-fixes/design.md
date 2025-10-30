# Design Document

## Overview

This design addresses critical issues in the analytics page. After reviewing existing implementations, we found that trending tracks and popular creators database functions already exist and are working (trending tracks confirmed working by user). The main issues are:

1. **Data Fetching Logic**: Incorrect queries for current metrics and activity data
2. **RLS Policies**: Collection log access blocked for authenticated users
3. **UI Integration**: Play button not connected to PlaybackContext
4. **Activity Chart**: Missing users data line

**Key Finding**: Database functions for trending analytics already exist in migration `20250127000003_play_count_tracking.sql` and should NOT be recreated.

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Analytics Page, Charts, Trending Section, Monitor)    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      API Layer                           │
│  (analytics.ts, trendingAnalytics.ts)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                        │
│  (PostgreSQL Functions, Tables, RLS Policies)           │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Layer (Existing - No Changes)

**Status**: ✅ All required database functions already exist

#### Existing Functions:
- `get_trending_tracks(days_back, result_limit)` - ✅ Working correctly
- `get_popular_creators(days_back, result_limit)` - ✅ Exists but may have data issues
- `increment_play_count(track_uuid)` - ✅ Working correctly
- `collect_daily_metrics(target_date)` - ✅ Working correctly

**No database migrations needed** - all functions are already implemented.

### 2. RLS Policy Update (Required)

**Issue**: `metric_collection_log` table blocks authenticated user access

**Current Policy**:
```sql
CREATE POLICY "Service role can view collection logs" ON metric_collection_log
FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
```

**Required Change**:
```sql
-- Drop restrictive policy
DROP POLICY IF EXISTS "Service role can view collection logs" ON metric_collection_log;

-- Create new policy allowing authenticated users
CREATE POLICY "Authenticated users can view collection logs" 
ON metric_collection_log
FOR SELECT 
USING (auth.role() = 'authenticated');
```

**Migration File**: `supabase/migrations/YYYYMMDD_fix_collection_log_rls.sql`


### 3. API Layer Fixes

#### File: `client/src/lib/analytics.ts`

**Issue 1**: `fetchCurrentMetrics()` assumes single row contains all metrics

**Current (Broken) Logic**:
```typescript
const { data, error } = await supabase
  .from('daily_metrics')
  .select('*')
  .order('metric_date', { ascending: false })
  .limit(1);  // ❌ Only gets ONE metric row
```

**Fixed Logic**:
```typescript
export async function fetchCurrentMetrics(): Promise<CurrentMetrics> {
  // Step 1: Get the most recent date
  const { data: latestDate } = await supabase
    .from('daily_metrics')
    .select('metric_date')
    .order('metric_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestDate) {
    return { totalUsers: 0, totalPosts: 0, totalComments: 0 };
  }

  // Step 2: Get ALL metrics for that date
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('metric_date', latestDate.metric_date);

  if (error) throw error;

  // Step 3: Aggregate by category
  const metrics: CurrentMetrics = {
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
  };

  data?.forEach((metric) => {
    if (metric.metric_category === 'users_total') {
      metrics.totalUsers = metric.value;
    } else if (metric.metric_category === 'posts_total') {
      metrics.totalPosts = metric.value;
    } else if (metric.metric_category === 'comments_total') {
      metrics.totalComments = metric.value;
    }
  });

  return metrics;
}
```

**Issue 2**: `fetchActivityData()` doesn't filter by date range correctly

**Current (Broken) Logic**:
```typescript
const { data, error } = await supabase
  .from('daily_metrics')
  .select('*')
  .order('metric_date', { ascending: true })
  .limit(30); // ❌ Gets oldest 30 rows, not last 30 days
```

**Fixed Logic**:
```typescript
export async function fetchActivityData(): Promise<ActivityDataPoint[]> {
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];

  // Query metrics for last 30 days
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('metric_date', startDate)
    .order('metric_date', { ascending: true });

  if (error) throw error;

  // Group by date and aggregate
  const activityMap = new Map<string, ActivityDataPoint>();

  data?.forEach((metric) => {
    const date = metric.metric_date;
    if (!activityMap.has(date)) {
      activityMap.set(date, {
        date,
        users: 0,      // NEW: Add users
        posts: 0,
        comments: 0,
      });
    }

    const activity = activityMap.get(date)!;
    if (metric.metric_category === 'users_total') {
      activity.users = metric.value;  // NEW: Populate users
    } else if (metric.metric_category === 'posts_created') {
      activity.posts = metric.value;
    } else if (metric.metric_category === 'comments_created') {
      activity.comments = metric.value;
    }
  });

  return Array.from(activityMap.values());
}
```

#### File: `client/src/lib/analytics.ts` - Collection Status

**Issue**: `getCollectionStatus()` uses `.single()` which throws error when no data

**Fixed Logic**:
```typescript
export async function getCollectionStatus(): Promise<CollectionStatus | null> {
  try {
    const { data, error } = await supabase
      .from('metric_collection_log')
      .select('*')
      .order('collection_date', { ascending: false })
      .limit(1)
      .maybeSingle();  // ✅ Use maybeSingle instead of single

    if (error) throw error;
    
    if (!data) {
      return null;  // No collections yet - this is OK
    }
    
    return {
      last_run: data.collection_date || new Date().toISOString(),
      status: data.status || 'completed',
      metrics_collected: data.metrics_collected || 0,
      duration_ms: data.duration_ms || 0,
      error_message: data.error_message,
    };
  } catch (error) {
    console.error('Error fetching collection status:', error);
    throw error;
  }
}
```


### 4. Type Definitions Update

#### File: `client/src/types/analytics.ts`

**Add users field to ActivityDataPoint**:
```typescript
export interface ActivityDataPoint {
  date: string;
  users: number;    // NEW: Total users as of this date
  posts: number;    // Daily posts created
  comments: number; // Daily comments created
}
```

**Verify TrendingTrack includes audio_url** (may need to update RPC return):
```typescript
export interface TrendingTrack {
  track_id: string;
  title: string;
  author: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  // May need to add:
  audio_url?: string;  // For playback integration
}
```

### 5. UI Component Updates

#### Component: `ActivityChart`

**File**: `client/src/components/ActivityChart.tsx`

**Changes Required**:
1. Update interface to include users
2. Add users dataset to chart configuration
3. Update chart colors and labels

**Implementation**:
```typescript
// Update chart data configuration
const chartData = {
  labels: data.map(d => new Date(d.date).toLocaleDateString()),
  datasets: [
    {
      label: 'Total Users',
      data: data.map(d => d.users),
      borderColor: 'rgb(59, 130, 246)',      // blue
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    },
    {
      label: 'Posts Created',
      data: data.map(d => d.posts),
      borderColor: 'rgb(16, 185, 129)',      // green
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
    },
    {
      label: 'Comments Created',
      data: data.map(d => d.comments),
      borderColor: 'rgb(245, 158, 11)',      // amber
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.4,
    },
  ],
};
```

#### Component: `TrendingTrackCard`

**File**: `client/src/components/analytics/TrendingTrackCard.tsx`

**Issue**: Play button has TODO comment, not integrated with PlaybackContext

**Implementation**:
```typescript
'use client';

import { usePlayback } from '@/contexts/PlaybackContext';
import type { TrendingTrack } from '@/lib/trendingAnalytics';
import type { PlaylistTrackDisplay } from '@/types/playlist';

interface TrendingTrackCardProps {
  track: TrendingTrack;
  rank: number;
  showDate?: boolean;
}

export function TrendingTrackCard({ track, rank, showDate }: TrendingTrackCardProps) {
  const { playTrack, currentTrack, isPlaying, pause } = usePlayback();
  
  const handlePlay = async () => {
    try {
      // Check if this track is currently playing
      if (currentTrack?.id === track.track_id && isPlaying) {
        pause();
        return;
      }
      
      // Need to fetch full track data to get audio_url
      // Option 1: Add audio_url to RPC return
      // Option 2: Fetch track details here
      
      // For now, we'll need to fetch the track
      const { data: fullTrack, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', track.track_id)
        .single();
      
      if (error || !fullTrack) {
        console.error('Failed to load track:', error);
        return;
      }
      
      // Convert to PlaylistTrackDisplay format
      const trackToPlay: PlaylistTrackDisplay = {
        id: fullTrack.id,
        title: fullTrack.title,
        author: fullTrack.author,
        file_url: fullTrack.file_url,
        created_at: fullTrack.created_at,
        updated_at: fullTrack.updated_at,
        user_id: fullTrack.user_id,
        description: fullTrack.description,
        duration: fullTrack.duration,
        file_size: fullTrack.file_size,
        is_public: fullTrack.is_public,
        play_count: fullTrack.play_count,
      };
      
      await playTrack(trackToPlay);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  const isCurrentTrack = currentTrack?.id === track.track_id;
  const buttonText = isCurrentTrack && isPlaying ? 'Pause' : 'Play';
  
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
      {/* Rank */}
      <div className="text-2xl font-bold text-gray-500 w-8 flex-shrink-0">
        #{rank}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate">{track.title}</h4>
        <p className="text-sm text-gray-400 truncate">by {track.author}</p>
        {showDate && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(track.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm flex-shrink-0">
        <div className="text-center">
          <div className="font-semibold text-white">{track.play_count}</div>
          <div className="text-gray-500 text-xs">plays</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-white">{track.like_count}</div>
          <div className="text-gray-500 text-xs">likes</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-blue-400">{track.trending_score.toFixed(1)}</div>
          <div className="text-gray-500 text-xs">score</div>
        </div>
      </div>

      {/* Play Button */}
      <button 
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex-shrink-0 disabled:opacity-50"
        onClick={handlePlay}
        disabled={!track.track_id}
      >
        {buttonText}
      </button>
    </div>
  );
}
```

**Alternative Approach** (Better): Update `get_trending_tracks` to include `file_url`:

```sql
-- Add file_url to the SELECT in get_trending_tracks function
SELECT
  t.id as track_id,
  t.title,
  t.author,
  t.file_url,  -- ADD THIS
  t.play_count,
  -- ... rest of fields
```

This would eliminate the need for an extra query in the component.


## Data Models

### Updated Type Definitions

```typescript
// client/src/types/analytics.ts

export interface ActivityDataPoint {
  date: string;
  users: number;    // NEW: Total users as of this date
  posts: number;    // Daily posts created
  comments: number; // Daily comments created
}

export interface TrendingTrack {
  track_id: string;
  title: string;
  author: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  file_url?: string;  // OPTIONAL: Add if updating RPC function
}

export interface PopularCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}
```

## Error Handling

### Error Categories and Responses

1. **No Data Available**
   - Scenario: No metrics collected yet
   - User Message: "No data available yet. Metrics will appear after the first collection run."
   - Action: Show empty state with collection trigger button

2. **RLS Policy Blocking**
   - Scenario: Permission denied for table
   - User Message: "Unable to access analytics data. Please contact support."
   - Action: Log error with user context, show retry button

3. **Network/Connection Error**
   - Scenario: Network timeout or connection refused
   - User Message: "Connection error. Retrying automatically..."
   - Action: Implement exponential backoff retry (already exists)

4. **Invalid Data**
   - Scenario: Unexpected data format
   - User Message: "Data format error. Please refresh the page."
   - Action: Log error details, show refresh button

### Error Handling Pattern

```typescript
try {
  const data = await fetchData();
  return data;
} catch (error) {
  // Log full error for debugging
  console.error('Detailed error:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  
  // Throw user-friendly error
  if (error.code === '42501') {
    throw new Error('Permission denied. Please contact support.');
  } else if (error.message.includes('maybeSingle')) {
    // No data - this is OK
    return null;
  } else {
    throw new Error(`Failed to load analytics: ${error.message}`);
  }
}
```

## Testing Strategy

### Unit Tests

1. **API Functions**
   - Test `fetchCurrentMetrics()` with multiple metric rows
   - Test `fetchActivityData()` with date range filtering
   - Test `getCollectionStatus()` with no data (null case)
   - Test error handling for each function

2. **UI Components**
   - Test play button integration with PlaybackContext
   - Test chart rendering with users data
   - Test error state display
   - Test loading states

### Integration Tests

1. **End-to-End Analytics Flow**
   - Trigger metric collection
   - Verify data appears in UI
   - Test refresh functionality
   - Test play button triggers playback

2. **Error Scenarios**
   - Test with no data
   - Test with RLS blocking (before fix)
   - Test network failures
   - Test invalid data formats

### Manual Testing Checklist

- [ ] Verify Total Users, Posts, Comments show correct non-zero values
- [ ] Verify Activity Chart displays 30 days of data
- [ ] Verify Activity Chart shows users line (blue)
- [ ] Verify Trending Tracks (7d) shows correct data
- [ ] Verify Trending Tracks (All Time) shows correct data
- [ ] Verify Popular Creators (7d) shows data (investigate if empty)
- [ ] Verify Popular Creators (All Time) shows data (investigate if empty)
- [ ] Verify Play button loads track in mini player
- [ ] Verify Play button shows Pause when track is playing
- [ ] Verify Metric Collection Status shows last run details (not "Unknown error")
- [ ] Verify Manual collection trigger works
- [ ] Verify error messages are user-friendly
- [ ] Verify refresh button retries failed queries


## Performance Considerations

### Database Query Optimization

1. **Existing Indexes** (Already in place):
   - `idx_daily_metrics_date_type` on (metric_date DESC, metric_type, metric_category)
   - `idx_tracks_play_count` on (play_count DESC)
   - `idx_tracks_trending` on (play_count DESC, created_at DESC)

2. **Query Efficiency**:
   - Use `.gte()` for date range filtering (indexed)
   - Limit result sets appropriately
   - Avoid N+1 queries with proper data fetching

3. **Caching**:
   - Client-side cache for 5 minutes (already implemented in trendingAnalytics.ts)
   - SessionStorage for temporary state

### Frontend Performance

1. **Component Optimization**:
   - Memoize expensive calculations
   - Use React.memo for pure components
   - Debounce user interactions (refresh button)

2. **Data Loading**:
   - Parallel data fetching with Promise.all (already implemented)
   - Progressive loading with skeleton states (already implemented)
   - Retry logic with exponential backoff (already implemented)

3. **Chart Rendering**:
   - Limit data points to 30 days
   - Use efficient chart library (Chart.js)
   - Lazy load chart components

## Security Considerations

### Row Level Security (RLS)

1. **Metrics Data** (Already Secure):
   - Public read access (analytics are public)
   - Service role only for writes
   - Immutable records prevent tampering

2. **Collection Logs** (Needs Fix):
   - Currently: Service role only
   - Required: Authenticated users can view
   - Service role only for writes

3. **Trending Data** (Already Secure):
   - Public read access via RPC functions
   - Functions use SECURITY DEFINER with proper checks
   - Granted to authenticated and anon users

## Deployment Strategy

### Implementation Order

**Phase 1: Database RLS Fix** (5 minutes)
1. Create and run RLS policy migration
2. Test collection log access
3. Verify no security issues

**Phase 2: API Layer Fixes** (30 minutes)
1. Update `fetchCurrentMetrics()` logic
2. Update `fetchActivityData()` logic
3. Update `getCollectionStatus()` to use maybeSingle
4. Update ActivityDataPoint type
5. Test data fetching

**Phase 3: UI Updates** (45 minutes)
1. Update ActivityChart to include users dataset
2. Update TrendingTrackCard with play button integration
3. Test chart rendering
4. Test play button functionality

**Phase 4: Optional Enhancement** (30 minutes)
1. Update `get_trending_tracks` to include file_url
2. Simplify TrendingTrackCard implementation
3. Test playback integration

**Phase 5: Validation** (30 minutes)
1. Run manual test checklist
2. Monitor error logs
3. Verify all issues resolved
4. Document any remaining issues

### Rollback Plan

If issues occur:
1. Revert frontend changes (no data impact)
2. Keep RLS policy change (improves access)
3. Monitor for errors
4. Fix and redeploy

### Monitoring

1. **Metrics to Track**:
   - Collection success rate
   - Query performance (execution time)
   - Error rates by type
   - User engagement with analytics page

2. **Alerts**:
   - Collection failures
   - Query timeouts
   - RLS policy violations
   - High error rates

## Summary of Changes

### What's Already Working ✅
- Database functions for trending tracks and popular creators
- Play count tracking system
- Metrics collection system
- Client-side caching
- Error retry logic

### What Needs Fixing 🔧
1. **RLS Policy**: Allow authenticated users to view collection logs
2. **fetchCurrentMetrics**: Query all metrics for latest date, not just one row
3. **fetchActivityData**: Filter by date range (last 30 days), add users data
4. **getCollectionStatus**: Use maybeSingle instead of single
5. **ActivityChart**: Add users dataset to chart
6. **TrendingTrackCard**: Integrate play button with PlaybackContext

### Optional Enhancements 💡
1. Add file_url to get_trending_tracks RPC return
2. Investigate why popular creators shows "No creators yet"
3. Add more detailed error messages
4. Add loading skeletons for better UX

---

**Design Version**: 1.0  
**Last Updated**: 2025-01-30  
**Status**: Ready for Implementation  
**Estimated Effort**: 2-3 hours

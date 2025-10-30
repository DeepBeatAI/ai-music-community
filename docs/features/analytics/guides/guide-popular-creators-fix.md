# Popular Creators Bug Fix Guide

## Overview
This document describes the fix for the popular creators feature that was failing due to database schema mismatches.

## Problem Summary
The `get_popular_creators()` database function was referencing incorrect table names and columns, causing it to fail with "relation 'profiles' does not exist" error.

## Root Causes
1. **Wrong table name:** Function referenced `profiles` instead of `user_profiles`
2. **Wrong join condition:** Used `p.id` instead of `p.user_id` for joining with tracks
3. **Missing column:** Referenced `avatar_url` which doesn't exist in `user_profiles`
4. **Missing function:** `get_trending_tracks()` was also not defined

## Solution Implemented

### Migration Created
**File:** `supabase/migrations/20250131000001_create_trending_analytics_functions.sql`

### Functions Created/Fixed

#### 1. get_popular_creators(days_back, result_limit)
**Purpose:** Returns popular creators based on engagement metrics

**Parameters:**
- `days_back` (INTEGER): Number of days to look back (0 = all time)
- `result_limit` (INTEGER): Maximum number of results (default: 5)

**Returns:**
- `user_id` (UUID): User identifier
- `username` (TEXT): Creator username
- `avatar_url` (TEXT): Avatar URL (currently NULL)
- `total_plays` (BIGINT): Total play count across all tracks
- `total_likes` (BIGINT): Total likes across all tracks
- `track_count` (BIGINT): Number of tracks created
- `creator_score` (NUMERIC): Weighted score (60% plays, 40% likes)

**Key Changes:**
```sql
-- Before (broken):
FROM profiles p
JOIN tracks t ON t.user_id = p.id

-- After (fixed):
FROM user_profiles up
JOIN tracks t ON t.user_id = up.user_id
```

**Avatar URL Handling:**
```sql
-- Set to NULL since column doesn't exist yet
NULL::TEXT as avatar_url
```

#### 2. get_trending_tracks(days_back, result_limit)
**Purpose:** Returns trending tracks based on engagement metrics

**Parameters:**
- `days_back` (INTEGER): Number of days to look back (0 = all time)
- `result_limit` (INTEGER): Maximum number of results (default: 10)

**Returns:**
- `track_id` (UUID): Track identifier
- `title` (TEXT): Track title
- `author` (TEXT): Track author
- `play_count` (INTEGER): Number of plays
- `like_count` (BIGINT): Number of likes
- `trending_score` (NUMERIC): Weighted score (70% plays, 30% likes)
- `created_at` (TIMESTAMPTZ): Creation timestamp
- `file_url` (TEXT): Audio file URL for playback

**Scoring Algorithm:**
```sql
trending_score = (play_count * 0.7) + (like_count * 0.3)
```

## Testing Results

### Popular Creators (7 Days)
```sql
SELECT * FROM get_popular_creators(7, 5);
```
**Result:** 1 creator with 15 plays, 1 like, 13 tracks (score: 9.4)

### Popular Creators (All Time)
```sql
SELECT * FROM get_popular_creators(0, 5);
```
**Result:** 1 creator with 15 plays, 2 likes, 38 tracks (score: 9.8)

### Trending Tracks (7 Days)
```sql
SELECT * FROM get_trending_tracks(7, 10);
```
**Result:** 5 tracks with engagement, top score: 4.5

### Trending Tracks (All Time)
```sql
SELECT * FROM get_trending_tracks(0, 10);
```
**Result:** 6 tracks with engagement, includes tracks with likes but no plays

## Frontend Integration

### TypeScript Interface (Already Defined)
```typescript
// client/src/lib/trendingAnalytics.ts

export interface PopularCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}

export interface TrendingTrack {
  track_id: string;
  title: string;
  author: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  file_url: string;
}
```

### API Functions (Already Implemented)
```typescript
// Get popular creators for last 7 days
await getPopularCreators7Days();

// Get popular creators for all time
await getPopularCreatorsAllTime();

// Get trending tracks for last 7 days
await getTrendingTracks7Days();

// Get trending tracks for all time
await getTrendingTracksAllTime();
```

## Verification Steps

1. **Database Functions:**
   - ✅ Functions created successfully
   - ✅ Functions return data without errors
   - ✅ Correct schema and joins used

2. **Data Validation:**
   - ✅ Popular creators return valid user data
   - ✅ Trending tracks return valid track data
   - ✅ Scores calculated correctly
   - ✅ Time filtering works (7 days vs all time)

3. **UI Testing (Required):**
   - 🔄 Navigate to Analytics page
   - 🔄 Verify "Popular Creators (7 Days)" section displays data
   - 🔄 Verify "Popular Creators (All Time)" section displays data
   - 🔄 Verify "Trending Tracks (7 Days)" section displays data
   - 🔄 Verify "Trending Tracks (All Time)" section displays data
   - 🔄 Test mini player integration with trending tracks

## Future Improvements

### 1. Add Avatar Support
When `avatar_url` is added to `user_profiles` table:
```sql
-- Update function to use real avatar_url
up.avatar_url as avatar_url  -- instead of NULL::TEXT
```

### 2. Performance Optimization
If queries become slow with more data:
- Add index on `tracks.created_at` for time filtering
- Add index on `tracks.play_count` for sorting
- Consider materialized views for pre-computed scores

### 3. Enhanced Scoring
Consider additional factors:
- Recency boost for newer tracks
- Comment count in scoring algorithm
- Share count when implemented
- Follower count for creators

### 4. Caching Strategy
The frontend already implements 5-minute caching:
```typescript
// client/src/lib/trendingAnalytics.ts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

## Related Files

### Database
- `supabase/migrations/20250131000001_create_trending_analytics_functions.sql`

### Frontend
- `client/src/lib/trendingAnalytics.ts` - API functions
- `client/src/types/analytics.ts` - TypeScript types
- Analytics page components (to be verified)

### Documentation
- `docs/features/analytics/investigation-popular-creators.md` - Investigation details
- `.kiro/specs/analytics-page-fixes/` - Spec documents

## Troubleshooting

### Function Not Found
```sql
-- Verify functions exist
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname IN ('get_popular_creators', 'get_trending_tracks');
```

### No Data Returned
```sql
-- Check if tracks have engagement
SELECT COUNT(*) FROM tracks WHERE play_count > 0;
SELECT COUNT(*) FROM post_likes;
```

### Wrong Results
```sql
-- Verify joins are correct
SELECT t.id, t.title, t.user_id, up.user_id, up.username
FROM tracks t
JOIN user_profiles up ON t.user_id = up.user_id
LIMIT 5;
```

## Conclusion

The popular creators and trending tracks features are now fully functional at the database level. The functions correctly:
- Use the `user_profiles` table instead of non-existent `profiles`
- Join on `user_id` instead of `id`
- Handle missing `avatar_url` gracefully
- Calculate engagement scores properly
- Support time-based filtering

Next step is to verify the UI displays this data correctly on the Analytics page.

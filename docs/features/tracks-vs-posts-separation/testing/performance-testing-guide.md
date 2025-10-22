# Performance Testing Guide - Tracks vs Posts Separation

## Overview

This guide provides instructions for testing the performance of the tracks-posts separation feature, including query performance, large dataset handling, caching verification, and optimization.

## Performance Targets

### Database Query Performance

- **Post fetching with tracks**: < 100ms
- **Playlist fetching with tracks**: < 100ms
- **User tracks fetching**: < 50ms
- **Search queries with tracks**: < 150ms

### Page Load Performance

- **Feed page load**: < 3 seconds
- **Playlist page load**: < 2 seconds
- **Track library page load**: < 2 seconds

### API Response Times

- **Track upload**: < 5 seconds (including compression)
- **Post creation**: < 500ms
- **Track metadata update**: < 200ms

## Test Scenarios

### 1. Query Performance with Joins

#### Test 1.1: Measure Post Fetch Performance

**SQL Query:**

```sql
SELECT
  p.*,
  t.*,
  up.username
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
LEFT JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.post_type = 'audio'
ORDER BY p.created_at DESC
LIMIT 15;
```

**Test Steps:**

1. Open browser DevTools
2. Navigate to Network tab
3. Load feed page
4. Measure query time in Supabase dashboard
5. Record results

**Expected Results:**

- Query execution: < 100ms
- Total page load: < 3s
- No N+1 queries

#### Test 1.2: Measure Playlist Fetch Performance

**SQL Query:**

```sql
SELECT
  pl.*,
  pt.position,
  pt.added_at,
  t.*
FROM playlists pl
LEFT JOIN playlist_tracks pt ON pl.id = pt.playlist_id
LEFT JOIN tracks t ON pt.track_id = t.id
WHERE pl.id = 'playlist-id'
ORDER BY pt.position ASC;
```

**Test Steps:**

1. Open playlist page
2. Measure query time
3. Record results

**Expected Results:**

- Query execution: < 100ms
- Page load: < 2s

#### Test 1.3: Measure User Tracks Performance

**SQL Query:**

```sql
SELECT *
FROM tracks
WHERE user_id = 'user-id'
ORDER BY created_at DESC;
```

**Test Steps:**

1. Open track library
2. Measure query time
3. Record results

**Expected Results:**

- Query execution: < 50ms
- Page load: < 2s

#### Test 1.4: Measure Search Performance

**SQL Query:**

```sql
SELECT
  p.*,
  t.*
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE t.title ILIKE '%search-term%'
   OR t.tags ILIKE '%search-term%'
ORDER BY p.created_at DESC
LIMIT 20;
```

**Test Steps:**

1. Perform search
2. Measure query time
3. Record results

**Expected Results:**

- Query execution: < 150ms
- Results display: < 1s

### 2. Large Dataset Testing

#### Test 2.1: User with 100+ Tracks

**Setup:**

1. Create test user
2. Upload 100+ tracks
3. Test library performance

**Tests:**

- [ ] Library loads in < 2s
- [ ] Pagination works correctly
- [ ] Scrolling is smooth
- [ ] Search within library works
- [ ] No memory leaks

**Performance Metrics:**

```
Initial load: ___ ms
Scroll performance: ___ fps
Memory usage: ___ MB
```

#### Test 2.2: Playlist with 50+ Tracks

**Setup:**

1. Create playlist
2. Add 50+ tracks
3. Test playlist performance

**Tests:**

- [ ] Playlist loads in < 2s
- [ ] All tracks display correctly
- [ ] Playback works smoothly
- [ ] Track switching is fast
- [ ] No lag when scrolling

**Performance Metrics:**

```
Initial load: ___ ms
Track switch time: ___ ms
Memory usage: ___ MB
```

#### Test 2.3: Feed with 1000+ Posts

**Setup:**

1. Seed database with 1000+ posts
2. Test feed performance

**Tests:**

- [ ] Initial load < 3s
- [ ] Infinite scroll works
- [ ] No duplicate posts
- [ ] Audio players load on demand
- [ ] Memory doesn't grow unbounded

**Performance Metrics:**

```
Initial load: ___ ms
Scroll to 100 posts: ___ ms
Memory after 100 posts: ___ MB
```

#### Test 2.4: User with 50+ Posts

**Setup:**

1. Create user with 50+ posts
2. Test profile page performance

**Tests:**

- [ ] Profile loads in < 2s
- [ ] Posts paginate correctly
- [ ] Track data loads efficiently
- [ ] No performance degradation

### 3. Caching Verification

#### Test 3.1: Audio URL Caching

**Test Steps:**

1. Load post with audio
2. Check if `getCachedAudioUrl()` is called
3. Verify cache hit on subsequent loads
4. Measure performance improvement

**Expected Results:**

- First load: Full URL generation
- Subsequent loads: Cache hit (< 1ms)
- Cache hit rate: > 90%

**Verification:**

```javascript
// Check browser console for cache logs
console.log("Cache hit:", cacheHit);
console.log("Cache miss:", cacheMiss);
console.log("Hit rate:", (cacheHit / (cacheHit + cacheMiss)) * 100);
```

#### Test 3.2: Track Data Caching

**Test Steps:**

1. Load track data
2. Navigate away
3. Return to same track
4. Verify cached data used

**Expected Results:**

- Cache hit on return
- No unnecessary API calls
- Instant data display

#### Test 3.3: Post Data Caching

**Test Steps:**

1. Load feed
2. Scroll down
3. Scroll back up
4. Verify posts cached

**Expected Results:**

- Cached posts display instantly
- No re-fetch of visible posts
- Smooth scrolling

#### Test 3.4: Cache Invalidation

**Test Steps:**

1. Load track data
2. Update track metadata
3. Verify cache invalidated
4. Verify new data loaded

**Expected Results:**

- Cache cleared on update
- New data fetched
- Updated data displayed

### 4. N+1 Query Detection

#### Test 4.1: Post Fetching

**Check for N+1:**

```sql
-- BAD: N+1 query pattern
SELECT * FROM posts WHERE post_type = 'audio';
-- Then for each post:
SELECT * FROM tracks WHERE id = post.track_id;

-- GOOD: Single query with JOIN
SELECT p.*, t.*
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio';
```

**Test Steps:**

1. Enable query logging in Supabase
2. Load feed with 15 posts
3. Count number of queries
4. Verify only 1 query for posts+tracks

**Expected Results:**

- Total queries: 1 (for posts with tracks)
- Additional queries: 1 per post (for likes/comments)
- No N+1 for track data

#### Test 4.2: Playlist Fetching

**Test Steps:**

1. Load playlist with 20 tracks
2. Count queries
3. Verify single query with JOIN

**Expected Results:**

- Total queries: 1 (for playlist with tracks)
- No separate queries per track

#### Test 4.3: User Tracks Fetching

**Test Steps:**

1. Load user library with 50 tracks
2. Count queries
3. Verify single query

**Expected Results:**

- Total queries: 1
- All tracks in single query

### 5. Slow Query Optimization

#### Test 5.1: Identify Slow Queries

**Tools:**

- Supabase Dashboard → Database → Query Performance
- Browser DevTools → Network tab
- PostgreSQL `EXPLAIN ANALYZE`

**Steps:**

1. Monitor all queries
2. Identify queries > 100ms
3. Document slow queries
4. Analyze execution plans

**Common Issues:**

- Missing indexes
- Inefficient JOINs
- Large result sets
- Complex WHERE clauses

#### Test 5.2: Add Missing Indexes

**Check Existing Indexes:**

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'tracks', 'playlist_tracks')
ORDER BY tablename, indexname;
```

**Required Indexes:**

```sql
-- Posts table
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON posts(track_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);

-- Tracks table
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON tracks(is_public) WHERE is_public = true;

-- Playlist tracks table
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
```

#### Test 5.3: Optimize JOIN Queries

**Before Optimization:**

```sql
-- Potentially slow
SELECT *
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.user_id = 'user-id';
```

**After Optimization:**

```sql
-- Optimized with specific columns
SELECT
  p.id, p.content, p.created_at,
  t.id as track_id, t.title, t.file_url, t.duration
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.user_id = 'user-id'
  AND p.post_type = 'audio';
```

#### Test 5.4: Verify Improvements

**Steps:**

1. Run slow query before optimization
2. Record execution time
3. Apply optimization
4. Run query again
5. Compare results

**Expected Improvement:**

- Query time reduced by 50%+
- Consistent performance
- No regression in other queries

## Performance Testing Tools

### Browser Tools

- Chrome DevTools (Network, Performance, Memory)
- Firefox Developer Tools
- Safari Web Inspector

### Database Tools

- Supabase Dashboard (Query Performance)
- PostgreSQL `EXPLAIN ANALYZE`
- pgAdmin (Query Analysis)

### Monitoring Tools

- Sentry (Error tracking, Performance monitoring)
- Vercel Analytics (Page load times)
- Custom performance logging

## Performance Test Results Template

```markdown
### Performance Test Session: [Date]

**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Database Size:** [Number of records]

#### Query Performance Results

| Query Type     | Target  | Actual    | Status |
| -------------- | ------- | --------- | ------ |
| Post fetch     | < 100ms | \_\_\_ ms | ✅/❌  |
| Playlist fetch | < 100ms | \_\_\_ ms | ✅/❌  |
| User tracks    | < 50ms  | \_\_\_ ms | ✅/❌  |
| Search         | < 150ms | \_\_\_ ms | ✅/❌  |

#### Large Dataset Results

| Test         | Target | Actual   | Status |
| ------------ | ------ | -------- | ------ |
| 100+ tracks  | < 2s   | \_\_\_ s | ✅/❌  |
| 50+ playlist | < 2s   | \_\_\_ s | ✅/❌  |
| 1000+ posts  | < 3s   | \_\_\_ s | ✅/❌  |

#### Caching Results

| Test       | Hit Rate | Status        |
| ---------- | -------- | ------------- |
| Audio URL  | > 90%    | \_\_\_% ✅/❌ |
| Track data | > 90%    | \_\_\_% ✅/❌ |
| Post data  | > 90%    | \_\_\_% ✅/❌ |

#### N+1 Query Detection

| Test        | Queries | Status       |
| ----------- | ------- | ------------ |
| Post fetch  | 1       | \_\_\_ ✅/❌ |
| Playlist    | 1       | \_\_\_ ✅/❌ |
| User tracks | 1       | \_\_\_ ✅/❌ |

#### Optimizations Applied

1. [Optimization description]
   - Before: \_\_\_ ms
   - After: \_\_\_ ms
   - Improvement: \_\_\_%

#### Issues Found

1. **Issue Title**
   - Query: ...
   - Execution time: \_\_\_ ms
   - Recommendation: ...
```

## Completion Checklist

- [ ] All query performance tests passed
- [ ] Large dataset tests passed
- [ ] Caching verified and working
- [ ] No N+1 queries detected
- [ ] All slow queries optimized
- [ ] Performance targets met
- [ ] No performance regressions
- [ ] Results documented

---

_Last Updated: January 2025_

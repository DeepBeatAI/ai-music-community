# Design Document

## Overview

This design document outlines the technical approach for aligning popularity calculation logic across the Home and Discover pages with the Analytics page baseline. The implementation will replace inconsistent client-side algorithms with centralized database functions, rename sections for clarity, and establish clear separation between objective popularity metrics and personalized recommendations.

### Goals

1. Replace client-side trending/popular logic with database functions from Analytics
2. Ensure consistent 7-day time filtering across all pages
3. Rename "Featured Creators" to "Popular Creators" on both pages
4. Rename "Recommended for You" to "Suggested for You" on Discover page
5. Remove deprecated utility functions after migration
6. Maintain existing "Suggested for You" personalized recommendation logic

### Non-Goals

- Modifying the Analytics page (it's the baseline)
- Changing database function formulas (70/30 and 60/40 splits)
- Altering personalized recommendation algorithms
- Major UI/UX redesigns beyond label changes

## Architecture

### Current Architecture (Problems)

**Home Page (`client/src/app/page.tsx` → `AuthenticatedHome.tsx`):**
```
AuthenticatedHome
├── "Trending This Week" → getTrendingContent() from recommendations.ts
│   └── Problem: Uses (likes × 3) + recency, ignores plays
├── "Suggested for You" → getRecommendedUsers() 
│   └── OK: Personalized, keep as-is
└── "Featured Creators" → getFeaturedCreators() from recommendations.ts
    └── Problem: Complex scoring without plays, includes followers
```

**Discover Page (`client/src/app/discover/page.tsx`):**
```
DiscoverPage
├── "Trending This Week" → getTrendingContent() from search.ts
│   └── Problem: Uses (likes × 3) + recency, ignores plays
├── "Recommended for You" → UserRecommendations component
│   └── Problem: Wrong label, should be "Suggested for You"
└── "Featured Creators" → getFeaturedCreators() from search.ts
    └── Problem: Uses (posts × 2) + followers + likes, ignores plays
```

### Target Architecture (Solution)

**Home Page:**
```
AuthenticatedHome
├── "Trending This Week" → getTrendingTracks7Days() from trendingAnalytics.ts
│   └── Uses: (play_count × 0.7) + (like_count × 0.3)
├── "Suggested for You" → getRecommendedUsers()
│   └── Unchanged: Personalized recommendations
└── "Popular Creators" → getPopularCreators7Days() from trendingAnalytics.ts
    └── Uses: (total_plays × 0.6) + (total_likes × 0.4)
```

**Discover Page:**
```
DiscoverPage
├── "Trending This Week" → getTrendingTracks7Days() from trendingAnalytics.ts
│   └── Uses: (play_count × 0.7) + (like_count × 0.3)
├── "Suggested for You" → UserRecommendations component
│   └── Label changed from "Recommended for You"
└── "Popular Creators" → getPopularCreators7Days() from trendingAnalytics.ts
    └── Uses: (total_plays × 0.6) + (total_likes × 0.4)
```

## Components and Interfaces

### Existing Components (Reuse)

**1. Database Functions (Already Exist)**
- Location: `supabase/migrations/20250131000001_create_trending_analytics_functions.sql`
- Functions:
  - `get_trending_tracks(days_back, result_limit)` - Returns trending tracks
  - `get_popular_creators(days_back, result_limit)` - Returns popular creators

**2. TypeScript API Module (Already Exists)**
- Location: `client/src/lib/trendingAnalytics.ts`
- Functions:
  - `getTrendingTracks7Days()` - Fetches trending tracks for last 7 days
  - `getTrendingTracksAllTime()` - Fetches all-time trending tracks
  - `getPopularCreators7Days()` - Fetches popular creators for last 7 days
  - `getPopularCreatorsAllTime()` - Fetches all-time popular creators
  - `getCachedAnalytics()` - Cache wrapper with 5-minute TTL

**3. Display Components (Already Exist)**
- `TrendingTrackCard` - Displays individual trending track
- `PopularCreatorCard` - Displays individual popular creator
- `UserRecommendations` - Displays personalized user suggestions

### Components to Modify

**1. AuthenticatedHome Component**
- File: `client/src/components/AuthenticatedHome.tsx`
- Changes:
  - Replace `getTrendingContent()` with `getTrendingTracks7Days()`
  - Replace `getFeaturedCreators()` with `getPopularCreators7Days()`
  - Update section header from "Featured Creators" to "Popular Creators"
  - Update display logic to handle new data structure

**2. DiscoverPage Component**
- File: `client/src/app/discover/page.tsx`
- Changes:
  - Replace `getTrendingContent()` with `getTrendingTracks7Days()`
  - Replace `getFeaturedCreators()` with `getPopularCreators7Days()`
  - Update section header from "Featured Creators" to "Popular Creators"
  - Update section header from "Recommended for You" to "Suggested for You"
  - Update display logic to handle new data structure

**3. UserRecommendations Component**
- File: `client/src/components/UserRecommendations.tsx`
- Changes:
  - Update default `title` prop from "Suggested for you" to "Suggested for You" (capitalization)
  - Ensure consistent title casing across all usages

### Components to Create

**1. TrendingTracksSection Component (Optional - for code reuse)**
- Purpose: Reusable component for displaying trending tracks
- Props:
  - `limit: number` - Number of tracks to display
  - `showPlayButton?: boolean` - Whether to show play button
- Benefits: Reduces code duplication between Home and Discover pages
- Decision: Create if time permits, otherwise inline the logic

**2. PopularCreatorsSection Component (Optional - for code reuse)**
- Purpose: Reusable component for displaying popular creators
- Props:
  - `limit: number` - Number of creators to display
  - `currentUserId?: string` - For follow button state
- Benefits: Reduces code duplication between Home and Discover pages
- Decision: Create if time permits, otherwise inline the logic


## Data Models

### TrendingTrack Interface (Already Exists)

```typescript
interface TrendingTrack {
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

**Source:** `client/src/lib/trendingAnalytics.ts`

**Usage:**
- Returned by `getTrendingTracks7Days()` and `getTrendingTracksAllTime()`
- Displayed by `TrendingTrackCard` component
- Contains all necessary data for display and playback

### PopularCreator Interface (Already Exists)

```typescript
interface PopularCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}
```

**Source:** `client/src/lib/trendingAnalytics.ts`

**Usage:**
- Returned by `getPopularCreators7Days()` and `getPopularCreatorsAllTime()`
- Displayed by `PopularCreatorCard` component
- Contains engagement metrics and creator info

### Data Mapping Requirements

**Current Home Page Data Structure:**
```typescript
// getTrendingContent() returns
{
  id: string;
  content: string;
  post_type: string;
  track?: { title: string; ... };
  user_profiles: { username: string; ... };
  likes_count: number;
  created_at: string;
}
```

**New Data Structure:**
```typescript
// getTrendingTracks7Days() returns
{
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

**Migration Strategy:**
- Replace post-based display with track-based display
- Use `TrendingTrackCard` component instead of `EditablePost`
- Map `author` to username display
- Use `file_url` for audio playback integration

**Current Featured Creators Data Structure:**
```typescript
// getFeaturedCreators() returns
{
  id: string;
  username: string;
  user_id: string;
  user_stats: {
    posts_count: number;
    audio_posts_count: number;
    followers_count: number;
    likes_received: number;
  };
  score: number;
  reason: string;
}
```

**New Data Structure:**
```typescript
// getPopularCreators7Days() returns
{
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}
```

**Migration Strategy:**
- Replace custom creator cards with `PopularCreatorCard` component
- Map `track_count` to display instead of `posts_count`
- Show `total_plays` and `total_likes` instead of `followers_count`
- Remove `reason` field (not applicable for objective popularity)

## Error Handling

### Database Query Failures

**Scenario:** Database function returns error or times out

**Handling Strategy:**
```typescript
try {
  const tracks = await getTrendingTracks7Days();
  setTrendingTracks(tracks);
} catch (error) {
  console.error('Error loading trending tracks:', error);
  setTrendingTracks([]); // Show empty state
  // Optional: Show error message to user
}
```

**User Experience:**
- Display empty state with friendly message
- Provide retry button if appropriate
- Don't crash the entire page
- Log error for debugging

### Empty Results

**Scenario:** No tracks or creators meet the criteria (new platform, low activity)

**Handling Strategy:**
- Display appropriate empty state message
- Suggest actions (e.g., "Be the first to upload a track!")
- Don't show the section at all if no data
- Gracefully handle zero results without errors

### Cache Failures

**Scenario:** Cache read/write fails (localStorage full, etc.)

**Handling Strategy:**
- Fall back to direct database queries
- Log warning but don't fail the request
- Cache is optimization, not requirement
- Ensure functionality works without cache

### Network Failures

**Scenario:** User loses internet connection during data fetch

**Handling Strategy:**
- Show loading state with timeout
- Display error message after timeout
- Provide manual retry button
- Consider showing stale cached data if available

## Testing Strategy

### Unit Tests

**1. Data Fetching Functions**
- Test `getTrendingTracks7Days()` returns correct data structure
- Test `getPopularCreators7Days()` returns correct data structure
- Test cache hit/miss scenarios
- Test error handling for failed queries

**2. Component Rendering**
- Test `AuthenticatedHome` renders with trending tracks
- Test `DiscoverPage` renders with popular creators
- Test empty state rendering
- Test loading state rendering
- Test error state rendering

### Integration Tests

**1. End-to-End User Flows**
- User navigates to home page → sees trending tracks and popular creators
- User navigates to discover page → sees trending tracks and popular creators
- User clicks on trending track → plays audio
- User clicks on popular creator → navigates to profile
- User sees consistent data across pages

**2. Database Integration**
- Verify database functions return expected results
- Verify 7-day filtering works correctly
- Verify sorting by score works correctly
- Verify caching reduces database load

### Manual Testing Checklist

**Home Page:**
- [ ] "Trending This Week" section displays tracks with play counts
- [ ] "Popular Creators" section displays creators with engagement metrics
- [ ] "Suggested for You" section unchanged (personalized)
- [ ] Section headers use correct labels
- [ ] Empty states display appropriately
- [ ] Loading states work correctly
- [ ] Error states handle gracefully

**Discover Page:**
- [ ] "Trending This Week" section displays tracks with play counts
- [ ] "Popular Creators" section displays creators with engagement metrics
- [ ] "Suggested for You" section displays (renamed from "Recommended")
- [ ] Section headers use correct labels
- [ ] Empty states display appropriately
- [ ] Loading states work correctly
- [ ] Error states handle gracefully

**Consistency:**
- [ ] Same tracks appear in "Trending This Week" on both pages
- [ ] Same creators appear in "Popular Creators" on both pages
- [ ] Analytics page shows same trending tracks and popular creators
- [ ] 7-day filtering consistent across all pages
- [ ] Scoring formulas produce expected results

### Performance Testing

**Metrics to Monitor:**
- Database query execution time (target: < 100ms)
- Cache hit rate (target: > 80%)
- Page load time impact (target: < 50ms increase)
- Memory usage (ensure no leaks)

**Load Testing:**
- Test with 0 tracks/creators (empty platform)
- Test with 10 tracks/creators (small platform)
- Test with 1000+ tracks/creators (large platform)
- Test with concurrent users accessing same data


## Implementation Plan Overview

### Phase 1: Home Page Migration
1. Update `AuthenticatedHome.tsx` to use `trendingAnalytics` functions
2. Replace trending content display logic
3. Replace featured creators display logic
4. Update section headers
5. Test and verify

### Phase 2: Discover Page Migration
1. Update `discover/page.tsx` to use `trendingAnalytics` functions
2. Replace trending content display logic
3. Replace featured creators display logic
4. Update section headers (including "Suggested for You" rename)
5. Test and verify

### Phase 3: Cleanup
1. Search codebase for usages of deprecated functions
2. Remove unused functions from `recommendations.ts`
3. Remove unused functions from `search.ts`
4. Run full test suite
5. Verify no regressions

### Phase 4: Validation
1. Manual testing on both pages
2. Cross-page consistency verification
3. Analytics comparison
4. Performance monitoring
5. Documentation updates

## Technical Decisions and Rationale

### Decision 1: Reuse Existing Database Functions

**Rationale:**
- Database functions already exist and are proven to work in Analytics
- Ensures consistency across all pages
- Centralizes logic in one place (database)
- Reduces client-side complexity
- Improves performance with server-side calculations

**Alternatives Considered:**
- Create new client-side algorithms → Rejected: Would create inconsistency
- Duplicate database functions → Rejected: Violates DRY principle
- Modify existing functions → Rejected: Analytics is the baseline

### Decision 2: Use Existing trendingAnalytics Module

**Rationale:**
- Module already provides TypeScript wrappers for database functions
- Includes built-in caching (5-minute TTL)
- Handles error cases gracefully
- Provides type safety with interfaces
- Already used successfully in Analytics page

**Alternatives Considered:**
- Create new API module → Rejected: Unnecessary duplication
- Call database functions directly → Rejected: Loses caching and type safety
- Use Supabase client directly → Rejected: Less maintainable

### Decision 3: Rename "Featured Creators" to "Popular Creators"

**Rationale:**
- "Popular" more accurately describes engagement-based ranking
- Distinguishes from "Suggested" (personalized) recommendations
- Aligns with Analytics page terminology
- Clearer user understanding of what the section shows
- "Featured" implies editorial curation, which isn't happening

**Alternatives Considered:**
- Keep "Featured Creators" → Rejected: Misleading terminology
- Use "Top Creators" → Rejected: Less descriptive than "Popular"
- Use "Trending Creators" → Rejected: "Trending" reserved for tracks

### Decision 4: Rename "Recommended for You" to "Suggested for You"

**Rationale:**
- Consistency with Home page terminology
- Both pages should use identical section names
- "Suggested" is already established on Home page
- Reduces user confusion when navigating between pages
- Minor change with no functional impact

**Alternatives Considered:**
- Keep different names → Rejected: Creates inconsistency
- Rename both to "Recommended" → Rejected: Home page already uses "Suggested"
- Use "Personalized for You" → Rejected: Too verbose

### Decision 5: Keep "Suggested for You" Algorithm Unchanged

**Rationale:**
- Personalized recommendations serve a different purpose than popularity
- Current algorithm includes valuable signals (mutual follows, activity)
- Follower count is appropriate for personalized suggestions
- No user complaints about current recommendations
- Out of scope for this alignment work

**Alternatives Considered:**
- Remove follower count from suggestions → Rejected: Reduces recommendation quality
- Align with popularity formula → Rejected: Loses personalization value
- Create new algorithm → Rejected: Out of scope

### Decision 6: Display Tracks Instead of Posts for Trending

**Rationale:**
- Database function returns track data, not post data
- Tracks are the primary content type for engagement
- Cleaner data model (one track, multiple posts possible)
- Aligns with Analytics page display
- Better represents actual content being engaged with

**Alternatives Considered:**
- Fetch posts separately → Rejected: Extra queries, complexity
- Modify database function → Rejected: Analytics is baseline
- Show both tracks and posts → Rejected: Confusing UX

### Decision 7: Use Existing Display Components

**Rationale:**
- `TrendingTrackCard` and `PopularCreatorCard` already exist
- Proven to work in Analytics page
- Consistent visual design across pages
- Reduces development time
- Maintains design system consistency

**Alternatives Considered:**
- Create new components → Rejected: Unnecessary duplication
- Reuse post components → Rejected: Different data structure
- Inline rendering → Rejected: Less maintainable

## Migration Strategy

### Backward Compatibility Approach

**Step 1: Verify No External Dependencies**
```bash
# Search for usages of functions to be removed
grep -r "getTrendingContent" client/src/
grep -r "getFeaturedCreators" client/src/
```

**Step 2: Update Imports Gradually**
- Update one page at a time
- Test thoroughly before moving to next page
- Keep old functions until all migrations complete

**Step 3: Remove Deprecated Functions**
- Only after all pages migrated
- Run full test suite
- Monitor for any runtime errors

### Rollback Plan

**If Issues Arise:**
1. Revert component changes via git
2. Old functions still exist until cleanup phase
3. Database functions unchanged (no risk)
4. Cache can be cleared if needed

**Monitoring:**
- Watch error logs for new errors
- Monitor page load times
- Check user engagement metrics
- Verify data accuracy

## Security Considerations

### Row Level Security (RLS)

**Database Functions:**
- `get_trending_tracks()` uses `SECURITY DEFINER`
- `get_popular_creators()` uses `SECURITY DEFINER`
- Both functions only return public data
- No user-specific filtering needed
- Safe for unauthenticated users

**Client-Side:**
- No sensitive data exposed
- Public engagement metrics only
- User IDs are UUIDs (not sequential)
- No PII in trending/popular data

### Data Privacy

**What's Exposed:**
- Track titles, authors, play counts, like counts
- Creator usernames, engagement metrics
- All data is already public on the platform

**What's Protected:**
- User email addresses (not in queries)
- Private tracks (filtered by `is_public = true`)
- User IP addresses (not tracked)
- Personal information (not in these tables)

### Rate Limiting

**Caching Strategy:**
- 5-minute cache reduces database load
- Prevents excessive queries from single user
- Shared cache across all users (same data)
- No per-user rate limiting needed

**Database Protection:**
- Functions use `STABLE` (can be cached)
- Queries are optimized with indexes
- Result limits prevent large data transfers
- No user input in queries (SQL injection safe)

## Performance Optimization

### Caching Strategy

**Current Implementation:**
```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();
```

**Benefits:**
- Reduces database queries by ~95%
- Improves page load time
- Reduces server load
- Shared across all users

**Cache Keys:**
- `trending_7d` - Trending tracks (7 days)
- `trending_all` - Trending tracks (all time)
- `creators_7d` - Popular creators (7 days)
- `creators_all` - Popular creators (all time)

### Database Optimization

**Existing Indexes:**
- `tracks.created_at` - For time filtering
- `tracks.is_public` - For public filtering
- `tracks.user_id` - For creator aggregation
- `post_likes.post_id` - For like counting

**Query Performance:**
- Aggregations done in database (faster)
- Filtering done before aggregation (efficient)
- Result limits prevent large transfers
- Stable functions can be cached by Postgres

### Client-Side Optimization

**Loading Strategy:**
- Load trending tracks and popular creators in parallel
- Use `Promise.all()` for concurrent requests
- Show loading states immediately
- Render incrementally as data arrives

**Rendering Optimization:**
- Use React keys for list rendering
- Memoize expensive calculations
- Avoid unnecessary re-renders
- Lazy load images if needed

## Monitoring and Observability

### Metrics to Track

**Performance Metrics:**
- Database query execution time
- Cache hit rate
- Page load time
- Time to first content

**Business Metrics:**
- Number of trending tracks shown
- Number of popular creators shown
- Click-through rate on trending content
- User engagement with popular creators

**Error Metrics:**
- Database query failures
- Cache failures
- Component render errors
- Network timeouts

### Logging Strategy

**What to Log:**
- Cache hits/misses
- Database query errors
- Empty result sets
- Slow queries (> 100ms)

**What Not to Log:**
- User IDs (privacy)
- Full query results (too verbose)
- Successful operations (noise)
- Cached data (redundant)

### Alerting

**Critical Alerts:**
- Database function failures (> 5% error rate)
- Query timeouts (> 1 second)
- Zero results for extended period (platform issue)

**Warning Alerts:**
- Cache hit rate < 80%
- Query time > 100ms
- Empty results (might be normal for new platform)

## Documentation Updates

### Code Documentation

**Files to Update:**
- `AuthenticatedHome.tsx` - Add comments explaining data flow
- `discover/page.tsx` - Add comments explaining data flow
- `trendingAnalytics.ts` - Update usage examples

### User-Facing Documentation

**Updates Needed:**
- Explain "Popular Creators" vs "Suggested for You"
- Document 7-day time window
- Explain engagement metrics (plays, likes)
- Clarify difference from personalized recommendations

### Developer Documentation

**Updates Needed:**
- Architecture diagram showing data flow
- API documentation for trending functions
- Migration guide for future changes
- Performance benchmarks and targets

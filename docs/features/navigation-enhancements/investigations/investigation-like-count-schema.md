# Like Count Database Schema Investigation

## Investigation Date
November 15, 2025

## Task Reference
Task 14: Investigate like count database schema
Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

---

## Database Schema Findings

### 1. Tracks Table Structure

**Key Findings:**
- ❌ **No `like_count` column exists** in the `tracks` table
- ✅ The tracks table has columns for: `id`, `user_id`, `title`, `description`, `file_url`, `duration`, `genre`, `tags`, `is_public`, `play_count`, `created_at`, `updated_at`, etc.
- ✅ The `play_count` column exists and is properly maintained with an `increment_play_count()` function

### 2. Likes System Architecture

**Current Implementation:**
- ✅ A `post_likes` table exists for storing likes
- ✅ Tracks are linked to posts via `posts.track_id` foreign key
- ✅ Likes are stored as: `post_likes` → `posts` → `tracks`

**Schema Relationships:**
```
tracks (id)
  ↑
  |
posts (track_id) ← References tracks.id
  ↑
  |
post_likes (post_id) ← References posts.id
```

**Tables Involved:**
1. **tracks**: Contains track metadata
2. **posts**: Links tracks to the social feed (post_type = 'audio', track_id references tracks)
3. **post_likes**: Stores user likes on posts (user_id, post_id)

### 3. Like Count Data Verification

**Query Results:**
- ✅ Tracks with likes exist in the database
- ✅ Sample tracks with like counts:
  - "You changed me.mp3" - 1 like
  - "Final - Sailor Moon Theme Song" - 1 like
  - "Behind the Mask" - 1 like

**SQL Query Used:**
```sql
SELECT 
  t.id as track_id,
  t.title,
  t.user_id,
  COUNT(pl.id) as like_count
FROM tracks t
LEFT JOIN posts p ON p.track_id = t.id
LEFT JOIN post_likes pl ON pl.post_id = p.id
GROUP BY t.id, t.title, t.user_id
HAVING COUNT(pl.id) > 0
ORDER BY like_count DESC;
```

### 4. Current Code Implementation

**Frontend Display:**
- ✅ `CreatorTrackCard.tsx` already displays `track.like_count || 0`
- ❌ The `getPublicTracks()` function in `profileService.ts` does NOT fetch like counts
- ❌ The Track type from database doesn't include `like_count` field

**Current Query in `getPublicTracks()`:**
```typescript
const { data, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('user_id', userId)
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

---

## Solution Approach Analysis

### Option A: Add JOIN to Query (RECOMMENDED) ✅

**Approach:**
Modify the `getPublicTracks()` query to join with posts and post_likes tables to calculate like counts.

**Implementation:**
```typescript
const { data, error } = await supabase
  .from('tracks')
  .select(`
    *,
    posts!inner(
      id,
      post_likes(count)
    )
  `)
  .eq('user_id', userId)
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

**Pros:**
- ✅ No database schema changes required
- ✅ Works with existing RLS policies
- ✅ Real-time accuracy (no stale data)
- ✅ Minimal code changes
- ✅ Follows existing patterns (similar to play_count)

**Cons:**
- ⚠️ Slightly more complex query
- ⚠️ May need to handle tracks without posts

**Complexity:** Low
**Risk:** Low
**Recommended:** ✅ YES

---

### Option B: Add `like_count` Column with Trigger

**Approach:**
Add a `like_count` column to the tracks table and maintain it with database triggers.

**Implementation:**
1. Add migration to create `like_count` column
2. Create trigger to update count when post_likes change
3. Backfill existing like counts

**Pros:**
- ✅ Simpler queries (no joins needed)
- ✅ Better query performance
- ✅ Consistent with `play_count` pattern

**Cons:**
- ❌ Requires database migration
- ❌ More complex trigger logic (tracks → posts → post_likes)
- ❌ Risk of count drift if triggers fail
- ❌ Need to handle tracks without posts

**Complexity:** Medium
**Risk:** Medium
**Recommended:** ⚠️ Consider for future optimization

---

### Option C: Database Function

**Approach:**
Create a database function that returns tracks with like counts calculated.

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION get_tracks_with_likes(p_user_id UUID)
RETURNS TABLE (
  -- all track columns
  like_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.*,
    COALESCE(COUNT(pl.id), 0) as like_count
  FROM tracks t
  LEFT JOIN posts p ON p.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  WHERE t.user_id = p_user_id AND t.is_public = true
  GROUP BY t.id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

**Pros:**
- ✅ Encapsulates complex logic in database
- ✅ Reusable across different queries
- ✅ No schema changes to tracks table

**Cons:**
- ❌ Requires database migration
- ❌ More complex to maintain
- ❌ May not work well with Supabase RLS

**Complexity:** Medium-High
**Risk:** Medium
**Recommended:** ⚠️ Overkill for this use case

---

## Recommended Solution: Option A (Query JOIN)

### Rationale

1. **No Schema Changes:** Works with existing database structure
2. **Low Risk:** Simple query modification, easy to test and rollback
3. **Real-time Accuracy:** Always shows current like counts
4. **Consistent Pattern:** Similar to how we handle other aggregations
5. **Quick Implementation:** Can be done in a single task

### Implementation Plan

1. **Modify `getPublicTracks()` in `profileService.ts`:**
   - Add join to posts and post_likes tables
   - Calculate like count using Supabase aggregation
   - Handle tracks without posts (return 0 likes)

2. **Update TypeScript types:**
   - Extend Track type to include `like_count` field
   - Or use a custom type for tracks with like counts

3. **Test thoroughly:**
   - Tracks with 0 likes
   - Tracks with 1+ likes
   - Tracks without posts
   - Performance with large datasets

### Edge Cases to Handle

1. **Tracks without posts:** Some tracks may not have associated posts yet
   - Solution: Use LEFT JOIN and COALESCE to return 0
2. **Multiple posts per track:** A track could theoretically be in multiple posts
   - Solution: Aggregate all likes across all posts for that track
3. **RLS policies:** Ensure the join respects existing security policies
   - Solution: Test with different user contexts

---

## Next Steps

1. ✅ Investigation complete - documented findings
2. ⏭️ Proceed to Task 15: Implement like count display solution
3. ⏭️ Use Option A (Query JOIN) approach
4. ⏭️ Update `getPublicTracks()` function
5. ⏭️ Update TypeScript types
6. ⏭️ Test implementation

---

## Additional Notes

### Database Query Performance
- The join query should perform well with proper indexes
- Existing indexes on `posts.track_id` and `post_likes.post_id` should help
- Monitor query performance after implementation

### Future Optimization
- If performance becomes an issue with large datasets, consider Option B (denormalized like_count column)
- Could implement caching layer for frequently accessed creator pages
- Consider pagination optimization if needed

### Related Systems
- This investigation revealed the architecture for the likes system
- Similar approach could be used for comment counts if needed in the future
- The pattern of tracks → posts → interactions is consistent across the platform

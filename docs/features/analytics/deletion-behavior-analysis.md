# Analytics Deletion Behavior Analysis

## Question
**When a comment or post is created and later deleted, how does it count in the analytics?**

---

## Current Implementation: Hard Delete ❌

### Database Schema Analysis

Based on the current database schema:

**Posts Table:**
- No `deleted_at` column
- No `is_deleted` flag
- Uses **hard delete** (ON DELETE CASCADE)

**Comments Table:**
- No `deleted_at` column
- No `is_deleted` flag
- Uses **hard delete** (ON DELETE CASCADE)

### Current Behavior

When a post or comment is deleted:

1. **Immediate Removal**: The row is permanently removed from the database
2. **Analytics Impact**: The count decreases immediately
3. **Historical Data Loss**: No record of the deletion exists
4. **Activity Chart Impact**: Past activity data is lost

### Example Scenario

```
Day 1: User creates 5 posts
  → Analytics shows: 5 posts

Day 2: User deletes 2 posts
  → Analytics shows: 3 posts (not 5)

Day 3: View activity chart
  → Day 1 shows only 3 posts (not the original 5)
```

---

## Problem: Inaccurate Historical Analytics ⚠️

### Issues with Current Approach

1. **Historical Inaccuracy**: Activity chart shows incorrect past data
   - If 10 posts were created on Monday but 5 deleted on Tuesday
   - Monday's chart will show only 5 posts (incorrect)

2. **Misleading Metrics**: Total counts don't reflect actual platform activity
   - Total posts created ≠ Current post count
   - Can't track deletion rates or content moderation

3. **Lost Business Intelligence**:
   - Can't analyze why users delete content
   - Can't track content lifecycle
   - Can't measure content quality/retention

4. **Cascade Deletion Issues**:
   - Deleting a post removes all its comments
   - Comments count drops even though users created them
   - Activity data becomes inconsistent

---

## Recommended Solution: Soft Delete ✅

### What is Soft Delete?

Instead of removing rows, mark them as deleted with a timestamp:

```sql
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;
```

### How It Works

**Before (Hard Delete):**
```sql
DELETE FROM posts WHERE id = 'abc123';
-- Row is gone forever
```

**After (Soft Delete):**
```sql
UPDATE posts 
SET deleted_at = NOW() 
WHERE id = 'abc123';
-- Row still exists, just marked as deleted
```

### Benefits

1. **Accurate Historical Data**: Activity chart shows true creation counts
2. **Flexible Analytics**: Can show "created" vs "active" counts
3. **Audit Trail**: Know when and what was deleted
4. **Reversible**: Can implement "undelete" feature
5. **Business Intelligence**: Track deletion patterns and reasons

---

## Implementation Options

### Option 1: Soft Delete (Recommended) ⭐

**Database Changes:**
```sql
-- Add deleted_at columns
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at);
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at);
```

**Query Changes:**
```typescript
// Current: Shows all posts
const { count } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true });

// New: Shows only active posts
const { count } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null);

// New: Shows all posts ever created (for historical analytics)
const { count: totalCreated } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true });
```

**Analytics Dashboard Changes:**
```typescript
// Show both metrics
interface PlatformMetrics {
  totalUsers: number;
  totalPostsCreated: number;    // All posts ever
  activePosts: number;           // Posts not deleted
  totalCommentsCreated: number;  // All comments ever
  activeComments: number;        // Comments not deleted
}
```

### Option 2: Separate Analytics Table

**Create dedicated analytics table:**
```sql
CREATE TABLE platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  posts_created INTEGER DEFAULT 0,
  posts_deleted INTEGER DEFAULT 0,
  comments_created INTEGER DEFAULT 0,
  comments_deleted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits:**
- Historical data preserved regardless of deletions
- Fast analytics queries (no need to scan main tables)
- Can aggregate daily/weekly/monthly

**Drawbacks:**
- More complex to maintain
- Requires triggers or scheduled jobs
- Data can get out of sync

### Option 3: Hybrid Approach (Best for Scale) 🚀

Combine both approaches:
1. Use soft delete for recent data (last 90 days)
2. Archive to analytics table for historical data
3. Hard delete after retention period (e.g., 1 year)

---

## Recommended Implementation Plan

### Phase 1: Add Soft Delete (Immediate)

1. **Migration to add columns:**
```sql
-- Migration: Add soft delete support
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_posts_deleted_at ON posts(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_comments_deleted_at ON comments(deleted_at) 
WHERE deleted_at IS NOT NULL;
```

2. **Update RLS policies:**
```sql
-- Update policies to exclude soft-deleted items
CREATE POLICY "Posts are viewable by everyone"
ON posts FOR SELECT
USING (deleted_at IS NULL);
```

3. **Update application code:**
```typescript
// Delete function (change from hard to soft delete)
const deletePost = async (postId: string) => {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId);
  
  return { error };
};
```

### Phase 2: Update Analytics (Next)

1. **Add new metrics to dashboard:**
```typescript
interface PlatformMetrics {
  totalUsers: number;
  
  // Posts metrics
  totalPostsCreated: number;
  activePosts: number;
  deletedPosts: number;
  
  // Comments metrics
  totalCommentsCreated: number;
  activeComments: number;
  deletedComments: number;
}
```

2. **Update activity chart to show accurate historical data:**
```typescript
// Query includes all posts created on that date (even if later deleted)
const { data: postsData } = await supabase
  .from('posts')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo.toISOString());
// No filter on deleted_at for historical accuracy
```

### Phase 3: Add Cleanup Job (Future)

1. **Permanently delete old soft-deleted items:**
```sql
-- Delete posts soft-deleted more than 1 year ago
DELETE FROM posts 
WHERE deleted_at < NOW() - INTERVAL '1 year';
```

2. **Archive to analytics table before deletion**

---

## Impact on Current Analytics

### Current State (Hard Delete)
```
Metrics Display:
- Total Users: 100
- Total Posts: 50 (only active posts)
- Total Comments: 200 (only active comments)

Activity Chart:
- Shows only posts/comments that still exist
- Historical data is inaccurate
```

### After Soft Delete Implementation
```
Metrics Display:
- Total Users: 100
- Total Posts Created: 75 (all time)
- Active Posts: 50 (not deleted)
- Total Comments Created: 250 (all time)
- Active Comments: 200 (not deleted)

Activity Chart:
- Shows accurate historical creation counts
- Can toggle between "created" and "active" views
```

---

## Migration Strategy

### Step 1: Add Columns (Non-Breaking)
```sql
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;
```
**Impact:** None - existing queries still work

### Step 2: Update Delete Functions (Breaking)
```typescript
// Change all DELETE operations to UPDATE
// This is a breaking change - requires code deployment
```
**Impact:** Requires coordinated deployment

### Step 3: Update Queries (Breaking)
```typescript
// Add .is('deleted_at', null) to all SELECT queries
// This filters out soft-deleted items
```
**Impact:** Changes what users see

### Step 4: Update Analytics (Enhancement)
```typescript
// Add new metrics and historical accuracy
```
**Impact:** Better analytics, no breaking changes

---

## Recommendation

**Implement Soft Delete ASAP** for these reasons:

1. ✅ **Accurate Analytics**: Historical data will be correct
2. ✅ **Better UX**: Can implement "undo delete" feature
3. ✅ **Business Intelligence**: Track deletion patterns
4. ✅ **Compliance**: Audit trail for content moderation
5. ✅ **Minimal Effort**: Relatively simple to implement

**Estimated Effort:**
- Migration: 30 minutes
- Code updates: 2-3 hours
- Testing: 1 hour
- **Total: ~4 hours** (one week of development time)

---

## Conclusion

**Current Answer to Your Question:**
> When a post or comment is deleted, it is **permanently removed** from the database. The analytics count **decreases immediately**, and the activity chart shows **inaccurate historical data** because it only counts items that still exist.

**Recommended Solution:**
> Implement **soft delete** to preserve historical accuracy while still hiding deleted content from users. This will make analytics meaningful and provide better business intelligence.

---

**Document Created:** October 8, 2025  
**Status:** Analysis Complete - Awaiting Implementation Decision  
**Priority:** High (affects data accuracy and business intelligence)

# Debug: Filtered Load More Issue

## 🔍 **Debugging Steps**

### Step 1: Check Console Logs
1. Open browser developer tools (F12)
2. Go to Console tab
3. Apply a filter (e.g., "Audio Posts")
4. Look for these debug messages:

```
🔍 Dashboard: Handling filter change: {postType: "audio"}
🔍 Dashboard: Applying filters to loaded posts (filter-only mode)
🔍 hasActiveSearchFilters: {searchFilters: {...}, result: true/false}
🔍 detectPaginationMode: {isSearchActive: false, hasFiltersApplied: false, searchFiltersActive: true/false}
🔍 Using CLIENT mode due to active search/filters
🔍 applyFiltersAndSearch: Starting with X posts
🔍 Active filters: {postType: "audio", sortBy: "recent", timeRange: "all"}
🔍 Applying post type filter: audio
Before filter: X posts
After filter: Y posts
🔍 Final filtered posts: Y
🔍 CLIENT pagination state: {currentPage: 1, postsPerPage: 15, displayPostsLength: Y, hasMorePosts: true/false}
```

### Step 2: Check Pagination State
Look for the LoadMoreButton component and verify:
- `paginationState?.paginationMode === 'client'` should be true
- `hasMorePosts` should be true if there are more than 15 filtered posts
- `totalFilteredPosts` should show the correct number of filtered posts

### Step 3: Manual Test Scenario
1. Go to dashboard
2. Wait for initial posts to load (should see ~15 posts)
3. Apply "Audio Posts" filter
4. Check console for debug messages
5. Verify filtered posts appear
6. Look for "Show More" button
7. Click "Show More" button
8. Check console for loadMore debug messages

### Expected Behavior:
- Filter applied → Client mode detected → Show More button appears → Clicking loads more filtered posts

### Current Issue Symptoms:
- Filter applied → ??? → Show More button doesn't work or doesn't appear

## 🐛 **Potential Issues to Check**

### Issue 1: Mode Detection Not Working
If you see `🔍 Using SERVER mode` instead of `🔍 Using CLIENT mode`, then:
- `hasActiveSearchFilters` is returning false
- Check what filters are being passed to `updateSearch`

### Issue 2: Filter Application Not Working  
If you see `🔍 Final filtered posts: X` where X equals the original post count:
- Filters are not being applied correctly
- Check the `post.post_type` values in your database

### Issue 3: Pagination Calculation Wrong
If you see `hasMorePosts: false` when there should be more posts:
- Check `displayPostsLength` vs `currentPage * postsPerPage`
- Verify `postsPerPage` is 15

### Issue 4: Button Not Appearing
If the Show More button doesn't appear at all:
- Check `paginationState.hasMorePosts` in React DevTools
- Verify LoadMoreButton component is receiving correct props

## 🔧 **Quick Fixes to Try**

### Fix 1: Force Client Mode
Temporarily force client mode by modifying `detectPaginationMode`:
```typescript
export function detectPaginationMode(context: ModeDetectionContext): PaginationMode {
  // TEMPORARY: Always use client mode for debugging
  return 'client';
}
```

### Fix 2: Check Filter Values
Add this to dashboard `handleFiltersChange`:
```typescript
console.log('🔍 Filter values being passed:', filters);
console.log('🔍 hasActiveFilters:', Object.keys(filters).length > 0);
```

### Fix 3: Verify Post Types
Check your database posts table:
```sql
SELECT DISTINCT post_type FROM posts;
```
Should return: 'text', 'audio'

## 📊 **Expected Debug Output**

When working correctly, you should see:
```
🔍 Dashboard: Handling filter change: {postType: "audio"}
🔍 hasActiveSearchFilters: {searchFilters: {postType: "audio"}, result: true}
🔍 detectPaginationMode: {isSearchActive: false, searchFiltersActive: true}
🔍 Using CLIENT mode due to active search/filters
🔍 applyFiltersAndSearch: Starting with 45 posts
🔍 Applying post type filter: audio
Before filter: 45 posts
After filter: 12 posts
🔍 CLIENT pagination state: {currentPage: 1, postsPerPage: 15, displayPostsLength: 12, hasMorePosts: false}
```

If `displayPostsLength` > 15 and `hasMorePosts: true`, then Show More should work.
# Simple Filter Test

## 🧪 **Manual Test Steps**

### Test 1: Basic Filter Application
1. Open browser console (F12)
2. Go to dashboard
3. Wait for posts to load
4. Click on "Audio Posts" filter
5. **Expected**: Console should show:
   ```
   🔄 SearchBar notifying parent of filter changes: {postType: "audio"}
   🔄 Dashboard: Handling filter change: {postType: "audio"}
   🔍 Dashboard: Applying filters to loaded posts (filter-only mode)
   ```

### Test 2: Check Pagination Mode
After applying filter, look for:
```
🔍 hasActiveSearchFilters: {searchFilters: {postType: "audio"}, result: true}
🔍 detectPaginationMode: {searchFiltersActive: true}
🔍 Using CLIENT mode due to active search/filters
```

### Test 3: Check Filter Application
Look for:
```
🔍 applyFiltersAndSearch: Starting with X posts
🔍 Applying post type filter: audio
Before filter: X posts
After filter: Y posts
🔍 CLIENT pagination state: {hasMorePosts: true/false}
```

### Test 4: Check Button Appearance
- If `hasMorePosts: true` → "Show More" button should appear
- If `hasMorePosts: false` → No button (not enough filtered posts)

## 🔧 **Quick Debug Fix**

If the button doesn't appear, try this temporary fix in `updatePaginationState`:

```typescript
// TEMPORARY: Force hasMorePosts to true for debugging
return {
  ...state,
  paginatedPosts: paginatedResults,
  hasMorePosts: true, // Force true for testing
  metadata: {
    ...state.metadata,
    totalFilteredPosts: displayPosts.length,
    visibleFilteredPosts: paginatedResults.length,
  },
};
```

This will make the button always appear so we can test if the click handler works.

## 🎯 **Expected Results**

If everything works:
1. Filter applied → Client mode detected
2. Posts filtered → Some posts remain
3. If filtered posts > 15 → "Show More" button appears
4. Click "Show More" → More filtered posts load instantly

## 🚨 **Common Issues**

### Issue 1: No Debug Messages
- SearchBar not calling `onFiltersChange`
- Check if filter values are being set correctly

### Issue 2: Server Mode Instead of Client Mode
- `hasActiveSearchFilters` returning false
- Check filter values being passed

### Issue 3: No Filtered Posts
- Filter not being applied
- Check `post.post_type` values in database

### Issue 4: Button Not Appearing
- `hasMorePosts` is false
- Not enough filtered posts to paginate
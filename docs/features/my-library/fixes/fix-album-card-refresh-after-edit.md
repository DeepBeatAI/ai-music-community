# Fix: Album Card Not Updating After Edit/Delete

## Problem

When editing or deleting an album from the album detail page or edit page, navigating back to the library page would show stale data. The album card would not reflect the updated information until a full page refresh.

## Root Cause

The issue occurred because:

1. The `MyAlbumsSection` component was already mounted when navigating back to the library page
2. Cache invalidation happened in the edit/delete pages, but the component didn't know to re-fetch
3. Next.js client-side navigation doesn't trigger component remounts by default
4. The `useEffect` with `fetchAlbums` dependency didn't run again because the function was memoized

## Solution

Implemented a cache-event-based refresh mechanism that leverages the built-in cache invalidation events:

### 1. Library Page Listens for Cache Invalidation

The library page (`client/src/app/library/page.tsx`) listens for the built-in `cache-invalidated` events that are automatically dispatched by the cache utility:

```typescript
useEffect(() => {
  if (!user) return;

  // Check if cache is missing on mount (in case we missed the invalidation event)
  const checkCacheOnMount = () => {
    const albumsCache = cache.get(CACHE_KEYS.ALBUMS(user.id));
    if (!albumsCache) {
      console.log('Albums cache is empty on mount, triggering refresh...');
      setRefreshKey(prev => prev + 1);
    }
  };

  // Check immediately on mount
  checkCacheOnMount();

  const handleCacheInvalidated = (event: Event) => {
    const customEvent = event as CustomEvent<{ key: string }>;
    const invalidatedKey = customEvent.detail?.key;
    
    // Check if the invalidated key is relevant to this page
    if (
      invalidatedKey === CACHE_KEYS.ALBUMS(user.id) ||
      invalidatedKey === CACHE_KEYS.TRACKS(user.id) ||
      invalidatedKey === CACHE_KEYS.STATS(user.id)
    ) {
      console.log(`Cache invalidated for ${invalidatedKey}, refreshing library...`);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Listen for cache invalidation events from the cache utility
  window.addEventListener('cache-invalidated', handleCacheInvalidated);

  return () => {
    window.removeEventListener('cache-invalidated', handleCacheInvalidated);
  };
}, [user]);
```

### 2. Edit/Delete Pages Dispatch Refresh Events

Modified three pages to dispatch the custom event after successful operations:

#### Album Edit Page (`client/src/app/library/albums/[id]/edit/page.tsx`)

```typescript
if (result.success) {
  // Invalidate albums and stats cache
  // The cache utility automatically dispatches 'cache-invalidated' events
  cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
  cache.invalidate(CACHE_KEYS.STATS(user.id));
  
  // Navigate back to library
  router.push('/library');
}
```

#### Album Detail Page - Delete (`client/src/app/library/albums/[id]/page.tsx`)

```typescript
if (result.success) {
  // Invalidate caches
  // The cache utility automatically dispatches 'cache-invalidated' events
  if (user) {
    cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
    cache.invalidate(CACHE_KEYS.STATS(user.id));
  }
  
  // Redirect to library page
  router.push('/library');
}
```

#### Album Detail Page - Edit Modal (`client/src/app/library/albums/[id]/page.tsx`)

```typescript
if (result.success) {
  // Invalidate caches to trigger refresh on library page
  if (user) {
    cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
    cache.invalidate(CACHE_KEYS.STATS(user.id));
  }
  
  await fetchAlbum();
  setShowEditModal(false);
}
```

### 3. Key-Based Component Remounting

The `MyAlbumsSection` component already has a `key` prop that uses `refreshKey`:

```typescript
<MyAlbumsSection 
  userId={user.id}
  initialLimit={8}
  key={`albums-${refreshKey}`}
/>
```

When `refreshKey` is incremented, React unmounts and remounts the component, triggering a fresh data fetch.

## How It Works

1. User edits or deletes an album
2. The operation completes successfully
3. Caches are invalidated: `cache.invalidate(CACHE_KEYS.ALBUMS(user.id))` and `cache.invalidate(CACHE_KEYS.STATS(user.id))`
4. The cache utility automatically dispatches `cache-invalidated` events for each invalidated key
5. User is navigated back to library page
6. Library page either:
   - Catches the `cache-invalidated` event (if already mounted), OR
   - Checks cache on mount and finds it empty
7. `refreshKey` is incremented
8. `MyAlbumsSection` remounts with the new key
9. Component fetches fresh data (cache is empty, so it fetches from database)
10. Updated album information is displayed

### Dual Detection Mechanism

The solution uses two complementary detection mechanisms:

1. **Event Listener**: Catches `cache-invalidated` events dispatched by the cache utility in real-time
2. **Mount Check**: Checks if cache is empty when the page loads (catches any missed events)

## Benefits

- **Highly Reliable**: Dual detection (events + mount check) ensures refresh happens
- **Efficient**: Only refreshes when cache is actually invalidated
- **Clean**: Leverages existing cache utility events, no custom event system needed
- **Maintainable**: Easy to extend to other sections (tracks, playlists, etc.)
- **No Polling**: Doesn't require continuous interval-based checking
- **Fast**: No artificial delays, immediate response to cache invalidation
- **Consistent**: Uses the same cache invalidation pattern across the entire app

## Testing

To verify the fix works:

1. **Edit Album Test**:
   - Navigate to an album detail page
   - Click "Edit Album" or navigate to the edit page
   - Change the album name, description, or privacy setting
   - Save changes
   - Click "Back to Library"
   - Verify the album card shows the updated information immediately

2. **Delete Album Test**:
   - Navigate to an album detail page
   - Click "Delete" button
   - Confirm deletion
   - Verify you're redirected to the library page
   - Verify the album card is no longer visible

3. **Inline Edit Test**:
   - Navigate to an album detail page
   - Click "Edit Album" button (opens modal)
   - Change album information
   - Save changes
   - Navigate back to library
   - Verify the album card shows updated information

## Files Modified

1. `client/src/app/library/page.tsx` - Added event listener for refresh
2. `client/src/app/library/albums/[id]/edit/page.tsx` - Dispatch event on save
3. `client/src/app/library/albums/[id]/page.tsx` - Dispatch event on delete and inline edit
4. `client/src/components/library/MyAlbumsSection.tsx` - Simplified (removed complex cache checking)

## Related Requirements

- Requirement 9.4: Album cards must reflect updated information after editing

## Status

✅ **Completed** - Album cards now update immediately after edit or delete operations

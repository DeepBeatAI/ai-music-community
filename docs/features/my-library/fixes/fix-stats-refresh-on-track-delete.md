# Fix: Stats Refresh on Track Delete

## Issue

When deleting a track from the `/library` page, the "Total Tracks" stat card at the top of the page did not update immediately. It required a page refresh to show the updated count.

## Root Cause

The `StatsSection` component was caching stats for 5 minutes and had no mechanism to detect when the cache was invalidated. While the `TrackCardWithActions` component was correctly invalidating the stats cache after deleting a track, the `StatsSection` component was not listening for these cache invalidation events.

## Solution

Implemented a custom event system for cache invalidation:

### 1. Enhanced Cache Utility (`client/src/utils/cache.ts`)

Added event dispatching to the `invalidate` method:

```typescript
invalidate(key: string): void {
  this.cache.delete(key);
  
  // Dispatch custom event for cache invalidation
  // This allows components to listen for cache changes and refetch data
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cache-invalidated', { 
      detail: { key } 
    }));
  }
}
```

### 2. Updated StatsSection Component (`client/src/components/library/StatsSection.tsx`)

Added event listener to refetch stats when cache is invalidated:

```typescript
// Listen for cache invalidation events
useEffect(() => {
  if (!effectiveUserId) return;

  const handleCacheInvalidated = (event: Event) => {
    const customEvent = event as CustomEvent<{ key: string }>;
    const invalidatedKey = customEvent.detail.key;
    const statsKey = CACHE_KEYS.STATS(effectiveUserId);

    // If the stats cache was invalidated, refetch
    if (invalidatedKey === statsKey) {
      console.log('📊 Stats cache invalidated, refetching...');
      fetchStats();
    }
  };

  window.addEventListener('cache-invalidated', handleCacheInvalidated);

  return () => {
    window.removeEventListener('cache-invalidated', handleCacheInvalidated);
  };
}, [effectiveUserId, fetchStats]);
```

## How It Works

1. User deletes a track from the library page
2. `TrackCardWithActions` calls `deleteTrack()` from `client/src/lib/tracks.ts`
3. Track deletion succeeds (including deletion of related posts)
4. `TrackCardWithActions` invalidates the stats cache: `cache.invalidate(CACHE_KEYS.STATS(userId))`
5. Cache utility dispatches a `cache-invalidated` custom event with the cache key
6. `StatsSection` receives the event and checks if it's for the stats cache
7. If it matches, `StatsSection` automatically refetches the stats
8. UI updates immediately with the new track count

## Benefits

- **Immediate UI updates**: Stats refresh automatically without page reload
- **Reusable pattern**: Any component can listen for cache invalidation events
- **Minimal overhead**: Event system is lightweight and only fires when cache is invalidated
- **Type-safe**: Uses TypeScript custom events with proper typing
- **Clean separation**: Cache utility doesn't need to know about components

## Testing

To verify the fix:

1. Navigate to `/library` page
2. Note the "Total Tracks" count in the stats section
3. Delete a track using the delete button on any track card
4. Observe that the "Total Tracks" count decreases immediately without page refresh

## Related Files

- `client/src/utils/cache.ts` - Cache utility with event dispatching
- `client/src/components/library/StatsSection.tsx` - Stats component with event listener
- `client/src/components/library/TrackCardWithActions.tsx` - Track card that invalidates cache
- `client/src/lib/tracks.ts` - Track deletion function

## Requirements Satisfied

- 7.1: Track deletion removes track from database
- 7.2: Related posts are deleted before track deletion
- 7.3: UI updates immediately after track deletion
- 7.4: Stats reflect accurate track count
- 7.5: No page refresh required for UI updates

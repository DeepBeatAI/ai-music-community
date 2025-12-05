# Rollback Instructions for TrackPicker Cache Fix

If you need to rollback the TrackPicker cache changes, follow these steps:

## Files to Revert

### 1. Delete New File
```bash
rm client/src/utils/trackPickerCache.ts
```

### 2. Revert TrackPicker.tsx
Remove the import:
```typescript
import { clearTrackPickerCache as clearCacheUtil } from '@/utils/trackPickerCache';
```

Remove the handleRefresh function (around line 268):
```typescript
// Handle manual refresh
const handleRefresh = useCallback(() => {
  // Clear cache using utility function
  clearCacheUtil(userId);
  setPage(1);
  setTracks([]);
  fetchTracks(1, false); // Force fresh fetch
  console.log('🔄 TrackPicker manually refreshed');
}, [userId, fetchTracks]);
```

Remove the refresh button from the JSX (around line 378):
```typescript
<button
  onClick={handleRefresh}
  disabled={loading}
  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  title="Refresh track list"
>
  <svg 
    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
    />
  </svg>
  Refresh
</button>
```

### 3. Revert AudioUpload.tsx
Remove the import:
```typescript
import { clearTrackPickerCache } from '@/utils/trackPickerCache';
```

Remove the cache clearing line (around line 245):
```typescript
// CRITICAL: Clear TrackPicker cache so new track appears immediately
clearTrackPickerCache(user.id);
```

## Verification
After rollback:
1. Run `npm run build` to verify no errors
2. The TrackPicker will work as before (with 5-minute cache)
3. Users will need to wait or refresh page to see new tracks

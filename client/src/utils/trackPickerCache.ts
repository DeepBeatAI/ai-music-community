/**
 * TrackPicker Cache Management Utility
 * 
 * Provides centralized cache management for the TrackPicker component.
 * This ensures that when tracks are uploaded or modified, the TrackPicker
 * cache is properly invalidated so users see the latest data.
 */

/**
 * Clear the TrackPicker cache for a specific user
 * 
 * @param userId - The user ID whose cache should be cleared
 */
export function clearTrackPickerCache(userId: string): void {
  if (typeof window === 'undefined') {
    console.warn('clearTrackPickerCache called on server side');
    return;
  }

  const cacheKey = `track_picker_${userId}`;
  const cacheTimestampKey = `${cacheKey}_timestamp`;

  try {
    sessionStorage.removeItem(cacheKey);
    sessionStorage.removeItem(cacheTimestampKey);
    console.log('🗑️ TrackPicker cache cleared for user:', userId);
  } catch (error) {
    console.error('Error clearing TrackPicker cache:', error);
  }
}

/**
 * Clear all TrackPicker caches (useful for logout or global refresh)
 */
export function clearAllTrackPickerCaches(): void {
  if (typeof window === 'undefined') {
    console.warn('clearAllTrackPickerCaches called on server side');
    return;
  }

  try {
    // Find all track_picker cache keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('track_picker_')) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} TrackPicker cache entries`);
  } catch (error) {
    console.error('Error clearing all TrackPicker caches:', error);
  }
}

/**
 * Check if TrackPicker cache exists for a user
 * 
 * @param userId - The user ID to check
 * @returns true if cache exists and is valid, false otherwise
 */
export function hasValidTrackPickerCache(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const cacheKey = `track_picker_${userId}`;
  const cacheTimestampKey = `${cacheKey}_timestamp`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTimestamp = sessionStorage.getItem(cacheTimestampKey);

    if (!cachedData || !cachedTimestamp) {
      return false;
    }

    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();

    return (now - timestamp) < CACHE_DURATION;
  } catch (error) {
    console.error('Error checking TrackPicker cache:', error);
    return false;
  }
}

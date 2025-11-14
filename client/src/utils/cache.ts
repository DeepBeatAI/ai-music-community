/**
 * Cache Utility
 * 
 * Provides a simple in-memory cache with TTL (time-to-live) support.
 * Used for caching component data to reduce redundant API calls.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set a value in the cache with a TTL
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get a value from the cache
   * Returns null if the key doesn't exist or has expired
   * 
   * @param key - Cache key
   * @returns Cached data or null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is not expired
   * 
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate (delete) a cache entry
   * 
   * @param key - Cache key
   */
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

  /**
   * Invalidate all cache entries matching a pattern
   * 
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export a singleton instance
export const cache = new Cache();

// Export cache key constants
export const CACHE_KEYS = {
  STATS: (userId: string) => `stats:${userId}`,
  TRACKS: (userId: string) => `tracks:${userId}`,
  ALBUMS: (userId: string) => `albums:${userId}`,
  PLAYLISTS: (userId: string) => `playlists:${userId}`,
  SAVED_TRACKS: (userId: string) => `saved-tracks:${userId}`,
  SAVED_ALBUMS: (userId: string) => `saved-albums:${userId}`,
  SAVED_PLAYLISTS: (userId: string) => `saved-playlists:${userId}`,
} as const;

// Export TTL constants (in milliseconds)
export const CACHE_TTL = {
  STATS: 5 * 60 * 1000, // 5 minutes
  TRACKS: 2 * 60 * 1000, // 2 minutes
  ALBUMS: 2 * 60 * 1000, // 2 minutes
  PLAYLISTS: 2 * 60 * 1000, // 2 minutes
  SAVED_TRACKS: 2 * 60 * 1000, // 2 minutes
  SAVED_ALBUMS: 2 * 60 * 1000, // 2 minutes
  SAVED_PLAYLISTS: 2 * 60 * 1000, // 2 minutes
} as const;

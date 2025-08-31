interface CacheEntry {
  results: any;
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private maxSize = 50; // Maximum cache entries

  private getCacheKey(filters: any, offset: number, limit: number): string {
    return JSON.stringify({ ...filters, offset, limit });
  }

  get(filters: any, offset: number = 0, limit: number = 20): any | null {
    const key = this.getCacheKey(filters, offset, limit);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.results;
  }

  set(filters: any, results: any, offset: number = 0, limit: number = 20): void {
    const key = this.getCacheKey(filters, offset, limit);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

export const searchCache = new SearchCache();
// Create: src/utils/metadataCache.ts

// Define specific types for commonly cached data
export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface PostMetadata {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  post_type: string;
}

export interface UserStats {
  total_posts: number;
  total_likes: number;
  followers_count: number;
  following_count: number;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  user_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Union type for all cacheable data
export type CacheableData = 
  | UserProfile
  | UserProfile[]
  | PostMetadata
  | PostMetadata[]
  | UserStats
  | ActivityFeedItem[]
  | NotificationItem[]
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

interface CachedMetadata {
  data: CacheableData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  strategies: {
    [key: string]: number; // Custom TTLs for different data types
  };
}

class MetadataCacheManager {
  private cache = new Map<string, CachedMetadata>();
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxEntries: 500,
    strategies: {
      'user_profiles': 15 * 60 * 1000, // 15 minutes
      'post_metadata': 10 * 60 * 1000, // 10 minutes
      'user_stats': 30 * 60 * 1000, // 30 minutes
      'activity_feed': 2 * 60 * 1000, // 2 minutes
      'notifications': 1 * 60 * 1000, // 1 minute
    }
  };

  set(key: string, data: CacheableData, customTTL?: number): void {
    const ttl = customTTL || this.getTTLForKey(key);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup if over limit
    if (this.cache.size > this.config.maxEntries) {
      this.cleanup();
    }
  }

  get<T extends CacheableData>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  async getOrFetch<T extends CacheableData>(
    key: string, 
    fetchFn: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetchFn();
      this.set(key, data, customTTL);
      return data;
    } catch (error) {
      console.error(`Failed to fetch data for key ${key}:`, error);
      throw error;
    }
  }

  invalidate(pattern: string | RegExp): number {
    let removed = 0;
    
    for (const key of this.cache.keys()) {
      const match = typeof pattern === 'string' 
        ? key.includes(pattern)
        : pattern.test(key);
        
      if (match) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  private getTTLForKey(key: string): number {
    for (const [pattern, ttl] of Object.entries(this.config.strategies)) {
      if (key.includes(pattern)) {
        return ttl;
      }
    }
    return this.config.defaultTTL;
  }

  private cleanup(): void {
    // Remove expired entries first
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }

    // If still over limit, remove oldest entries
    if (this.cache.size > this.config.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.cache.size - Math.floor(this.config.maxEntries * 0.8);
      
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  getStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    memoryUsage: number;
    averageAge: number;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(e => now - e.timestamp <= e.ttl).length,
      expiredEntries: entries.filter(e => now - e.timestamp > e.ttl).length,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
      averageAge: entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length || 0
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const metadataCache = new MetadataCacheManager();
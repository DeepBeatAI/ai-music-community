import { Post } from '@/types';

interface CachedCreatorPosts {
  creatorId: string;
  posts: Post[];
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class CreatorPostCache {
  private cache = new Map<string, CachedCreatorPosts>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes default TTL
  
  /**
   * Get cached posts for a creator
   * @param creatorId - The creator's user ID
   * @returns The cached posts or null if not found/expired
   */
  get(creatorId: string): Post[] | null {
    const cached = this.cache.get(creatorId);
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(creatorId);
      return null;
    }
    
    console.log(`📦 Cache hit for creator ${creatorId} (${cached.posts.length} posts)`);
    return cached.posts;
  }
  
  /**
   * Set cache for a creator's posts
   * @param creatorId - The creator's user ID
   * @param posts - The posts to cache
   * @param ttl - Optional custom TTL in milliseconds
   */
  set(creatorId: string, posts: Post[], ttl?: number) {
    this.cache.set(creatorId, {
      creatorId,
      posts,
      timestamp: Date.now(),
      ttl: ttl || this.TTL
    });
    console.log(`💾 Cached ${posts.length} posts for creator ${creatorId}`);
  }
  
  /**
   * Invalidate cache for a specific creator
   * @param creatorId - The creator's user ID
   */
  invalidate(creatorId: string) {
    const deleted = this.cache.delete(creatorId);
    if (deleted) {
      console.log(`🗑️ Cache invalidated for creator ${creatorId}`);
    }
  }
  
  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cleared entire cache (${size} entries)`);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { entries: number; creators: string[]; totalPosts: number } {
    const creators: string[] = [];
    let totalPosts = 0;
    
    this.cache.forEach((cached, creatorId) => {
      creators.push(creatorId);
      totalPosts += cached.posts.length;
    });
    
    return {
      entries: this.cache.size,
      creators,
      totalPosts
    };
  }
  
  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    this.cache.forEach((cached, creatorId) => {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(creatorId);
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
    }
  }
}

// Export singleton instance
export const creatorCache = new CreatorPostCache();

// Optional: Set up periodic cleanup (every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    creatorCache.cleanup();
  }, 10 * 60 * 1000);
}

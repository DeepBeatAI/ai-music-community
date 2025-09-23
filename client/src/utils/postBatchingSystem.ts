/**
 * Intelligent Post Batching and Caching System
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

import { Post } from '@/types';

export interface PostBatchMetadata {
  batchId: string;
  fetchTimestamp: number;
  pageNumber: number;
  postsPerPage: number;
  totalPostsInBatch: number;
  fetchDuration: number;
  cacheHitRate: number;
  memoryUsageAtFetch: number;
  filterContext?: {
    hasFilters: boolean;
    filterTypes: string[];
    estimatedEfficiency: number;
  };
}

interface PostCacheEntry {
  post: Post;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  memorySize: number;
  batchId: string;
}

export interface MemoryUsageStats {
  totalEntries: number;
  totalMemoryBytes: number;
  averagePostSize: number;
  oldestEntry: number;
  newestEntry: number;
  cacheHitRate: number;
  evictionCount: number;
}

export interface CacheConfig {
  maxMemoryBytes: number;
  maxEntries: number;
  maxAgeMs: number;
  cleanupIntervalMs: number;
  evictionThreshold: number;
  batchRetentionMs: number;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxMemoryBytes: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  maxAgeMs: 30 * 60 * 1000, // 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  evictionThreshold: 0.8,
  batchRetentionMs: 60 * 60 * 1000, // 1 hour
};

export class PostBatchingSystem {
  private cache: Map<string, PostCacheEntry> = new Map();
  private batches: Map<string, PostBatchMetadata> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private totalEvictions: number = 0;
  private totalCacheHits: number = 0;
  private totalCacheRequests: number = 0;
  private memoryUsage: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  addBatch(
    posts: Post[],
    batchMetadata: Omit<PostBatchMetadata, 'batchId' | 'totalPostsInBatch'>
  ): string {
    const batchId = this.generateBatchId();
    const timestamp = Date.now();

    const completeBatchMetadata: PostBatchMetadata = {
      ...batchMetadata,
      batchId,
      totalPostsInBatch: posts.length,
    };

    this.batches.set(batchId, completeBatchMetadata);

    posts.forEach(post => {
      const postSize = this.estimatePostSize(post);
      const cacheEntry: PostCacheEntry = {
        post,
        timestamp,
        accessCount: 0,
        lastAccessed: timestamp,
        memorySize: postSize,
        batchId,
      };

      this.cache.set(post.id, cacheEntry);
      this.memoryUsage += postSize;
    });

    this.checkMemoryThreshold();
    return batchId;
  }

  getPosts(postIds: string[]): { posts: Post[]; cacheHits: number; cacheMisses: number } {
    const posts: Post[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    const now = Date.now();

    postIds.forEach(postId => {
      this.totalCacheRequests++;
      const entry = this.cache.get(postId);

      if (entry && !this.isEntryExpired(entry)) {
        entry.accessCount++;
        entry.lastAccessed = now;
        posts.push(entry.post);
        cacheHits++;
        this.totalCacheHits++;
      } else {
        cacheMisses++;
        if (entry && this.isEntryExpired(entry)) {
          this.removeEntry(postId);
        }
      }
    });

    return { posts, cacheHits, cacheMisses };
  }

  getAllCachedPosts(): Post[] {
    const posts: Post[] = [];
    const now = Date.now();

    this.cache.forEach((entry, postId) => {
      if (!this.isEntryExpired(entry)) {
        entry.accessCount++;
        entry.lastAccessed = now;
        posts.push(entry.post);
      } else {
        this.removeEntry(postId);
      }
    });

    return posts;
  }

  getMemoryStats(): MemoryUsageStats {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalMemoryBytes = this.memoryUsage;

    if (totalEntries === 0) {
      return {
        totalEntries: 0,
        totalMemoryBytes: 0,
        averagePostSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        cacheHitRate: 0,
        evictionCount: this.totalEvictions,
      };
    }

    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = Math.min(...timestamps);
    const newestEntry = Math.max(...timestamps);
    const averagePostSize = totalMemoryBytes / totalEntries;
    const cacheHitRate = this.totalCacheRequests > 0 ? this.totalCacheHits / this.totalCacheRequests : 0;

    return {
      totalEntries,
      totalMemoryBytes,
      averagePostSize,
      oldestEntry,
      newestEntry,
      cacheHitRate,
      evictionCount: this.totalEvictions,
    };
  }

  optimizeCache(): { entriesRemoved: number; memoryFreed: number; batchesCleanedUp: number } {
    const initialEntries = this.cache.size;
    const initialMemory = this.memoryUsage;
    const initialBatches = this.batches.size;

    this.cleanupExpiredEntries();

    if (this.isOverMemoryThreshold()) {
      this.evictLeastRecentlyUsed();
    }

    this.cleanupOldBatches();

    return {
      entriesRemoved: initialEntries - this.cache.size,
      memoryFreed: initialMemory - this.memoryUsage,
      batchesCleanedUp: initialBatches - this.batches.size,
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.batches.clear();
    this.memoryUsage = 0;
    this.totalEvictions = 0;
    this.totalCacheHits = 0;
    this.totalCacheRequests = 0;
  }

  destroy(): void {
    this.stopCleanupTimer();
    this.clearCache();
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private estimatePostSize(post: Post): number {
    const baseSize = 200;
    const contentSize = (post.content?.length || 0) * 2;
    const audioUrlSize = (post.audio_url?.length || 0) * 2;
    const filenameSize = (post.audio_filename?.length || 0) * 2;
    const userProfileSize = post.user_profiles ? 100 : 0;
    return baseSize + contentSize + audioUrlSize + filenameSize + userProfileSize;
  }

  private isEntryExpired(entry: PostCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.maxAgeMs;
  }

  private removeEntry(postId: string): void {
    const entry = this.cache.get(postId);
    if (entry) {
      this.memoryUsage -= entry.memorySize;
      this.cache.delete(postId);
    }
  }

  private checkMemoryThreshold(): void {
    if (this.isOverMemoryThreshold() || this.cache.size > this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }
  }

  private isOverMemoryThreshold(): boolean {
    return this.memoryUsage > this.config.maxMemoryBytes * this.config.evictionThreshold;
  }

  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    const targetMemory = this.config.maxMemoryBytes * (this.config.evictionThreshold - 0.1);
    const targetEntries = Math.floor(this.config.maxEntries * 0.9);

    for (const [postId] of entries) {
      if (this.memoryUsage <= targetMemory && this.cache.size <= targetEntries) {
        break;
      }
      this.removeEntry(postId);
      this.totalEvictions++;
    }
  }

  private cleanupExpiredEntries(): void {
    const expiredEntries: string[] = [];
    this.cache.forEach((entry, postId) => {
      if (this.isEntryExpired(entry)) {
        expiredEntries.push(postId);
      }
    });
    expiredEntries.forEach(postId => this.removeEntry(postId));
  }

  private cleanupOldBatches(): void {
    const now = Date.now();
    const oldBatches: string[] = [];
    this.batches.forEach((batch, batchId) => {
      if (now - batch.fetchTimestamp > this.config.batchRetentionMs) {
        oldBatches.push(batchId);
      }
    });
    oldBatches.forEach(batchId => this.batches.delete(batchId));
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.optimizeCache();
    }, this.config.cleanupIntervalMs);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export function createPostBatchingSystem(config?: Partial<CacheConfig>): PostBatchingSystem {
  return new PostBatchingSystem(config);
}
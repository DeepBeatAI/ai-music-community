/**
 * Memory Management and Cleanup Strategies
 * 
 * This module provides comprehensive memory management for the dashboard,
 * including post cleanup, cache management, and garbage collection triggers.
 */

import { Post } from '@/types';
import { performanceMetricsCollector } from './performanceMetricsCollector';

/**
 * Memory management configuration
 */
export interface MemoryManagementConfig {
  // Post management thresholds
  maxPostsInMemory: number;
  maxDisplayPosts: number;
  cleanupThresholdPosts: number;
  
  // Memory thresholds (in MB)
  memoryWarningThreshold: number;
  memoryCriticalThreshold: number;
  
  // Cache management
  maxCacheSize: number; // in MB
  cacheCleanupInterval: number; // in milliseconds
  
  // Garbage collection
  gcTriggerInterval: number; // in milliseconds
  gcMemoryThreshold: number; // in MB
  
  // Cleanup strategies
  enableAggressiveCleanup: boolean;
  keepRecentPostsCount: number;
  keepPopularPostsCount: number;
}

/**
 * Default memory management configuration
 */
const DEFAULT_CONFIG: MemoryManagementConfig = {
  maxPostsInMemory: 500,
  maxDisplayPosts: 200,
  cleanupThresholdPosts: 300,
  
  memoryWarningThreshold: 100, // 100 MB
  memoryCriticalThreshold: 200, // 200 MB
  
  maxCacheSize: 50, // 50 MB
  cacheCleanupInterval: 300000, // 5 minutes
  
  gcTriggerInterval: 600000, // 10 minutes
  gcMemoryThreshold: 150, // 150 MB
  
  enableAggressiveCleanup: false,
  keepRecentPostsCount: 50,
  keepPopularPostsCount: 25,
};

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  totalPosts: number;
  displayPosts: number;
  estimatedMemoryUsage: number;
  cacheSize: number;
  lastCleanupTime: number;
  cleanupCount: number;
  gcTriggerCount: number;
}

/**
 * Post cleanup strategy
 */
export type CleanupStrategy = 
  | 'oldest-first'
  | 'least-popular'
  | 'least-recent-interaction'
  | 'balanced';

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  postsRemoved: number;
  memoryFreed: number; // estimated in MB
  strategy: CleanupStrategy;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Cache cleanup result
 */
export interface CacheCleanupResult {
  itemsRemoved: number;
  sizeFreed: number; // in MB
  cacheType: string;
  duration: number;
}

/**
 * Memory Manager Class
 */
export class MemoryManager {
  private config: MemoryManagementConfig;
  private stats: MemoryStats;
  private cleanupInterval?: NodeJS.Timeout;
  private gcInterval?: NodeJS.Timeout;
  private cacheCleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<MemoryManagementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalPosts: 0,
      displayPosts: 0,
      estimatedMemoryUsage: 0,
      cacheSize: 0,
      lastCleanupTime: 0,
      cleanupCount: 0,
      gcTriggerCount: 0,
    };

    this.startMonitoring();
  }

  /**
   * Clean up old posts when memory thresholds are reached
   */
  async cleanupPosts(
    allPosts: Post[],
    strategy: CleanupStrategy = 'balanced'
  ): Promise<{ cleanedPosts: Post[]; result: CleanupResult }> {
    const startTime = performance.now();
    const initialCount = allPosts.length;
    const initialMemory = this.estimatePostsMemoryUsage(allPosts);

    try {
      let cleanedPosts: Post[];

      switch (strategy) {
        case 'oldest-first':
          cleanedPosts = this.cleanupOldestFirst(allPosts);
          break;
        case 'least-popular':
          cleanedPosts = this.cleanupLeastPopular(allPosts);
          break;
        case 'least-recent-interaction':
          cleanedPosts = this.cleanupLeastRecentInteraction(allPosts);
          break;
        case 'balanced':
        default:
          cleanedPosts = this.cleanupBalanced(allPosts);
          break;
      }

      const endTime = performance.now();
      const finalMemory = this.estimatePostsMemoryUsage(cleanedPosts);

      const result: CleanupResult = {
        postsRemoved: initialCount - cleanedPosts.length,
        memoryFreed: initialMemory - finalMemory,
        strategy,
        duration: endTime - startTime,
        success: true,
      };

      this.stats.lastCleanupTime = Date.now();
      this.stats.cleanupCount++;

      // Track performance
      performanceMetricsCollector.trackEvent({
        type: 'memory-cleanup',
        duration: result.duration,
        metadata: {
          strategy,
          postsRemoved: result.postsRemoved,
          memoryFreed: result.memoryFreed,
        },
      });

      return { cleanedPosts, result };
    } catch (error) {
      const endTime = performance.now();
      const result: CleanupResult = {
        postsRemoved: 0,
        memoryFreed: 0,
        strategy,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return { cleanedPosts: allPosts, result };
    }
  }

  /**
   * Manage cache size with configurable limits
   */
  async manageCacheSize(): Promise<CacheCleanupResult[]> {
    const results: CacheCleanupResult[] = [];

    // Clean up different cache types
    const cacheTypes = [
      'audio-cache',
      'image-cache',
      'metadata-cache',
      'search-cache',
    ];

    for (const cacheType of cacheTypes) {
      const result = await this.cleanupCacheType(cacheType);
      results.push(result);
    }

    return results;
  }

  /**
   * Trigger garbage collection for long browsing sessions
   */
  triggerGarbageCollection(): void {
    if (typeof window === 'undefined') return;

    const currentMemory = this.getCurrentMemoryUsage();
    
    if (currentMemory > this.config.gcMemoryThreshold) {
      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        try {
          (window as any).gc();
          this.stats.gcTriggerCount++;
          
          performanceMetricsCollector.trackEvent({
            type: 'gc-trigger',
            metadata: {
              memoryBefore: currentMemory,
              memoryAfter: this.getCurrentMemoryUsage(),
              trigger: 'manual',
            },
          });
        } catch (error) {
          console.warn('Manual garbage collection failed:', error);
        }
      }

      // Alternative cleanup strategies
      this.performAlternativeCleanup();
    }
  }

  /**
   * Check if cleanup is needed based on current state
   */
  shouldCleanup(totalPosts: number, currentMemory?: number): boolean {
    const memory = currentMemory || this.getCurrentMemoryUsage();
    
    return (
      totalPosts > this.config.cleanupThresholdPosts ||
      memory > this.config.memoryWarningThreshold ||
      (this.config.enableAggressiveCleanup && totalPosts > this.config.maxDisplayPosts)
    );
  }

  /**
   * Get optimal cleanup strategy based on current conditions
   */
  getOptimalCleanupStrategy(
    totalPosts: number,
    memoryUsage: number,
    userActivity: 'high' | 'medium' | 'low' = 'medium'
  ): CleanupStrategy {
    // Critical memory situation
    if (memoryUsage > this.config.memoryCriticalThreshold) {
      return 'oldest-first'; // Most aggressive
    }

    // High post count
    if (totalPosts > this.config.maxPostsInMemory * 1.5) {
      return 'least-recent-interaction';
    }

    // High user activity - keep popular content
    if (userActivity === 'high') {
      return 'least-popular';
    }

    // Default balanced approach
    return 'balanced';
  }

  /**
   * Update memory statistics
   */
  updateStats(totalPosts: number, displayPosts: number): void {
    this.stats.totalPosts = totalPosts;
    this.stats.displayPosts = displayPosts;
    this.stats.estimatedMemoryUsage = this.getCurrentMemoryUsage();
    this.stats.cacheSize = this.estimateCacheSize();
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Get memory management recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const currentMemory = this.getCurrentMemoryUsage();

    if (currentMemory > this.config.memoryCriticalThreshold) {
      recommendations.push('Critical: Memory usage is very high. Consider aggressive cleanup.');
    } else if (currentMemory > this.config.memoryWarningThreshold) {
      recommendations.push('Warning: Memory usage is elevated. Cleanup recommended.');
    }

    if (this.stats.totalPosts > this.config.maxPostsInMemory) {
      recommendations.push('Too many posts in memory. Enable automatic cleanup.');
    }

    if (this.stats.cacheSize > this.config.maxCacheSize) {
      recommendations.push('Cache size is large. Consider reducing cache limits.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage is optimal.');
    }

    return recommendations;
  }

  /**
   * Export memory management data
   */
  exportData(): {
    config: MemoryManagementConfig;
    stats: MemoryStats;
    recommendations: string[];
    currentMemory: number;
  } {
    return {
      config: this.config,
      stats: this.getStats(),
      recommendations: this.getRecommendations(),
      currentMemory: this.getCurrentMemoryUsage(),
    };
  }

  /**
   * Destroy the memory manager and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
    if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
  }

  // Private methods

  private startMonitoring(): void {
    // Start garbage collection monitoring
    this.gcInterval = setInterval(() => {
      this.triggerGarbageCollection();
    }, this.config.gcTriggerInterval);

    // Start cache cleanup monitoring
    this.cacheCleanupInterval = setInterval(() => {
      this.manageCacheSize();
    }, this.config.cacheCleanupInterval);
  }

  private cleanupOldestFirst(posts: Post[]): Post[] {
    const sorted = [...posts].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const keepCount = Math.min(this.config.maxDisplayPosts, posts.length);
    return sorted.slice(-keepCount);
  }

  private cleanupLeastPopular(posts: Post[]): Post[] {
    const sorted = [...posts].sort((a, b) => {
      const aPopularity = (a.like_count || 0);
      const bPopularity = (b.like_count || 0);
      return bPopularity - aPopularity;
    });
    
    const keepCount = Math.min(this.config.maxDisplayPosts, posts.length);
    return sorted.slice(0, keepCount);
  }

  private cleanupLeastRecentInteraction(posts: Post[]): Post[] {
    const sorted = [...posts].sort((a, b) => {
      // Use created_at as proxy for recent interaction
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
    
    const keepCount = Math.min(this.config.maxDisplayPosts, posts.length);
    return sorted.slice(0, keepCount);
  }

  private cleanupBalanced(posts: Post[]): Post[] {
    // Keep a mix of recent and popular posts
    const recentPosts = this.cleanupOldestFirst(posts)
      .slice(-this.config.keepRecentPostsCount);
    
    const popularPosts = this.cleanupLeastPopular(posts)
      .slice(0, this.config.keepPopularPostsCount);
    
    // Combine and deduplicate
    const combinedPosts = [...recentPosts];
    popularPosts.forEach(post => {
      if (!combinedPosts.find(p => p.id === post.id)) {
        combinedPosts.push(post);
      }
    });
    
    // Limit to max display posts
    return combinedPosts.slice(0, this.config.maxDisplayPosts);
  }

  private async cleanupCacheType(cacheType: string): Promise<CacheCleanupResult> {
    const startTime = performance.now();
    
    try {
      // This would integrate with actual cache implementations
      // For now, we'll simulate cache cleanup
      let itemsRemoved = 0;
      let sizeFreed = 0;

      switch (cacheType) {
        case 'audio-cache':
          // Clean up audio cache
          itemsRemoved = await this.cleanupAudioCache();
          sizeFreed = itemsRemoved * 2; // Estimate 2MB per audio file
          break;
        case 'image-cache':
          // Clean up image cache
          itemsRemoved = await this.cleanupImageCache();
          sizeFreed = itemsRemoved * 0.5; // Estimate 0.5MB per image
          break;
        case 'metadata-cache':
          // Clean up metadata cache
          itemsRemoved = await this.cleanupMetadataCache();
          sizeFreed = itemsRemoved * 0.01; // Estimate 10KB per metadata entry
          break;
        case 'search-cache':
          // Clean up search cache
          itemsRemoved = await this.cleanupSearchCache();
          sizeFreed = itemsRemoved * 0.1; // Estimate 100KB per search result
          break;
      }

      return {
        itemsRemoved,
        sizeFreed,
        cacheType,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        itemsRemoved: 0,
        sizeFreed: 0,
        cacheType,
        duration: performance.now() - startTime,
      };
    }
  }

  private async cleanupAudioCache(): Promise<number> {
    // This would integrate with the actual audio cache system
    // For now, return a simulated cleanup count
    return Math.floor(Math.random() * 10);
  }

  private async cleanupImageCache(): Promise<number> {
    // This would integrate with the actual image cache system
    return Math.floor(Math.random() * 20);
  }

  private async cleanupMetadataCache(): Promise<number> {
    // This would integrate with the actual metadata cache system
    return Math.floor(Math.random() * 50);
  }

  private async cleanupSearchCache(): Promise<number> {
    // This would integrate with the actual search cache system
    return Math.floor(Math.random() * 15);
  }

  private performAlternativeCleanup(): void {
    // Alternative cleanup strategies when GC is not available
    
    // Clear any temporary variables
    if (typeof window !== 'undefined') {
      // Clear any global temporary data
      (window as any).tempData = null;
    }

    // Suggest browser cleanup
    console.log('Consider closing unused tabs or refreshing the page to free memory');
  }

  getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    const memory = (performance as any).memory;
    if (memory) {
      return Math.round(memory.usedJSHeapSize / (1024 * 1024));
    }

    return 0;
  }

  private estimatePostsMemoryUsage(posts: Post[]): number {
    // Rough estimation: each post ~2KB in memory
    return (posts.length * 2) / 1024; // Convert to MB
  }

  private estimateCacheSize(): number {
    // This would integrate with actual cache size calculations
    // For now, return a simulated size
    return Math.random() * 20; // 0-20 MB
  }
}

// Create and export singleton instance
export const memoryManager = new MemoryManager();

// Export utility functions
export const cleanupPostsWhenNeeded = async (
  posts: Post[],
  strategy?: CleanupStrategy
) => {
  if (memoryManager.shouldCleanup(posts.length)) {
    const optimalStrategy = strategy || memoryManager.getOptimalCleanupStrategy(
      posts.length,
      memoryManager.getCurrentMemoryUsage()
    );
    
    return await memoryManager.cleanupPosts(posts, optimalStrategy);
  }
  
  return { cleanedPosts: posts, result: null };
};

export const checkMemoryHealth = () => {
  const stats = memoryManager.getStats();
  const recommendations = memoryManager.getRecommendations();
  
  return {
    isHealthy: stats.estimatedMemoryUsage < 100, // Under 100MB
    stats,
    recommendations,
  };
};
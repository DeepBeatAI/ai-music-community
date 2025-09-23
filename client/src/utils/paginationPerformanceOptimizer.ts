/**
 * Performance Optimization Utilities for Load More System
 * 
 * This module provides performance optimizations including:
 * - Memory management and cleanup strategies
 * - Request batching and deduplication
 * - Intelligent caching
 * - Performance monitoring
 */

import { Post } from '@/types';

// Performance configuration
interface PerformanceConfig {
  maxMemoryPosts: number;
  cleanupThreshold: number;
  requestTimeout: number;
  cacheSize: number;
  batchSize: number;
}

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxMemoryPosts: 500, // Maximum posts to keep in memory
  cleanupThreshold: 0.8, // Cleanup when 80% of max is reached
  requestTimeout: 10000, // 10 second timeout
  cacheSize: 100, // Cache size for requests
  batchSize: 15, // Standard batch size
};

// Performance metrics tracking
interface PerformanceMetrics {
  loadTime: number;
  serverFetchTime: number;
  clientPaginationTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  requestCount: number;
  errorRate: number;
  lastCleanupTime: number;
}

// Request cache entry
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  hitCount: number;
}

/**
 * Performance Optimizer for Load More System
 */
export class PaginationPerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private requestCache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.metrics = {
      loadTime: 0,
      serverFetchTime: 0,
      clientPaginationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      requestCount: 0,
      errorRate: 0,
      lastCleanupTime: Date.now(),
    };

    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.includes('load-more')) {
              this.updateMetric('loadTime', entry.duration);
            }
          });
        });

        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  /**
   * Memory management - cleanup old posts
   */
  optimizeMemoryUsage(posts: Post[]): Post[] {
    const currentCount = posts.length;
    
    if (currentCount <= this.config.maxMemoryPosts) {
      return posts;
    }

    // Keep the most recent posts up to maxMemoryPosts
    const optimizedPosts = posts.slice(-this.config.maxMemoryPosts);

    console.log(`🧹 Memory optimization: Cleaned up ${currentCount - optimizedPosts.length} posts`);
    this.metrics.lastCleanupTime = Date.now();
    
    return optimizedPosts;
  }

  /**
   * Intelligent post batching for optimal loading
   */
  optimizeBatchSize(
    currentPostCount: number,
    totalAvailable: number,
    userBehavior: 'fast' | 'normal' | 'slow' = 'normal'
  ): number {
    let batchSize = this.config.batchSize;

    // Adjust batch size based on user behavior
    switch (userBehavior) {
      case 'fast':
        batchSize = Math.min(25, this.config.batchSize * 1.5);
        break;
      case 'slow':
        batchSize = Math.max(10, this.config.batchSize * 0.7);
        break;
      default:
        batchSize = this.config.batchSize;
    }

    // Don't load more than what's available
    const remaining = totalAvailable - currentPostCount;
    return Math.min(batchSize, remaining);
  }

  /**
   * Request deduplication and caching
   */
  async optimizeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    cacheDuration: number = 300000 // 5 minutes
  ): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Request deduplication: Using pending request for ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // Check cache
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      cached.hitCount++;
      this.updateCacheHitRate();
      console.log(`💾 Cache hit: Using cached data for ${key}`);
      return cached.data;
    }

    // Create new request
    const requestPromise = this.executeOptimizedRequest(key, requestFn);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      this.requestCache.set(key, {
        key,
        data: result,
        timestamp: Date.now(),
        hitCount: 0,
      });

      // Clean up cache if needed
      this.cleanupCache();
      
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Execute request with timeout and error handling
   */
  private async executeOptimizedRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    this.metrics.requestCount++;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout);
      });

      // Race between request and timeout
      const result = await Promise.race([requestFn(), timeoutPromise]);
      
      const duration = performance.now() - startTime;
      this.updateMetric('serverFetchTime', duration);
      
      console.log(`⚡ Request completed: ${key} in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.requestCount;
      console.error(`❌ Request failed: ${key}`, error);
      throw error;
    }
  }

  /**
   * Optimize client-side pagination performance
   */
  optimizeClientPagination(
    posts: Post[],
    page: number,
    pageSize: number
  ): { posts: Post[]; duration: number } {
    const startTime = performance.now();

    // Use efficient slicing
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    const duration = performance.now() - startTime;
    this.updateMetric('clientPaginationTime', duration);

    return { posts: paginatedPosts, duration };
  }

  /**
   * Intelligent prefetching based on user behavior
   */
  shouldPrefetch(
    currentPage: number,
    totalPages: number,
    userScrollSpeed: number,
    timeOnPage: number
  ): boolean {
    // Don't prefetch if we're at the end
    if (currentPage >= totalPages) {
      return false;
    }

    // Prefetch if user is scrolling fast
    if (userScrollSpeed > 1000) { // pixels per second
      return true;
    }

    // Prefetch if user has been on page for a while
    if (timeOnPage > 30000) { // 30 seconds
      return true;
    }

    // Prefetch if we're near the end of current content
    const remainingPages = totalPages - currentPage;
    return remainingPages <= 2;
  }

  /**
   * Cache cleanup to prevent memory leaks
   */
  private cleanupCache(): void {
    if (this.requestCache.size <= this.config.cacheSize) {
      return;
    }

    // Sort by hit count and timestamp (LRU with popularity)
    const entries = Array.from(this.requestCache.entries()).sort((a, b) => {
      const scoreA = a[1].hitCount + (Date.now() - a[1].timestamp) / 1000000;
      const scoreB = b[1].hitCount + (Date.now() - b[1].timestamp) / 1000000;
      return scoreA - scoreB;
    });

    // Remove least valuable entries
    const toRemove = entries.slice(0, entries.length - this.config.cacheSize);
    toRemove.forEach(([key]) => {
      this.requestCache.delete(key);
    });

    console.log(`🧹 Cache cleanup: Removed ${toRemove.length} entries`);
  }

  /**
   * Update performance metrics
   */
  private updateMetric(metric: keyof PerformanceMetrics, value: number): void {
    this.metrics[metric] = value;
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const totalRequests = this.metrics.requestCount;
    const cacheHits = Array.from(this.requestCache.values())
      .reduce((sum, entry) => sum + entry.hitCount, 0);
    
    this.metrics.cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage if available
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const performanceWithMemory = performance as unknown;
      if ((performanceWithMemory as any).memory && (performanceWithMemory as any).memory.usedJSHeapSize) {
        this.metrics.memoryUsage = (performanceWithMemory as any).memory.usedJSHeapSize;
      }
    }

    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      loadTime: 0,
      serverFetchTime: 0,
      clientPaginationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      requestCount: 0,
      errorRate: 0,
      lastCleanupTime: Date.now(),
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    
    return `
📊 Load More Performance Report
==============================

⚡ Response Times:
  - Average Load Time: ${metrics.loadTime.toFixed(2)}ms
  - Server Fetch Time: ${metrics.serverFetchTime.toFixed(2)}ms
  - Client Pagination: ${metrics.clientPaginationTime.toFixed(2)}ms

💾 Memory & Caching:
  - Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
  - Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
  - Cache Size: ${this.requestCache.size} entries

🌐 Network:
  - Total Requests: ${metrics.requestCount}
  - Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%
  - Last Cleanup: ${new Date(metrics.lastCleanupTime).toLocaleTimeString()}

🎯 Optimization Status:
  - Memory Optimization: ${this.requestCache.size < this.config.cacheSize ? '✅' : '⚠️'}
  - Request Deduplication: ✅
  - Performance Monitoring: ${this.performanceObserver ? '✅' : '❌'}
    `;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.requestCache.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const paginationPerformanceOptimizer = new PaginationPerformanceOptimizer();

// Export utility functions
export const optimizeMemoryUsage = (posts: Post[]): Post[] => {
  return paginationPerformanceOptimizer.optimizeMemoryUsage(posts);
};

export const optimizeRequest = <T>(
  key: string,
  requestFn: () => Promise<T>,
  cacheDuration?: number
): Promise<T> => {
  return paginationPerformanceOptimizer.optimizeRequest(key, requestFn, cacheDuration);
};

export const optimizeClientPagination = (
  posts: Post[],
  page: number,
  pageSize: number
) => {
  return paginationPerformanceOptimizer.optimizeClientPagination(posts, page, pageSize);
};

export const getPerformanceMetrics = () => {
  return paginationPerformanceOptimizer.getMetrics();
};

export const generatePerformanceReport = () => {
  return paginationPerformanceOptimizer.generatePerformanceReport();
};
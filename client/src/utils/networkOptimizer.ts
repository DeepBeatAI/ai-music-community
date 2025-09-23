/**
 * Network Request Optimization System
 * 
 * This module provides comprehensive network optimization including request batching,
 * intelligent prefetching, and response caching with invalidation strategies.
 */

import { Post } from '@/types';
import { performanceMetricsCollector } from './performanceMetricsCollector';

/**
 * Network optimization configuration
 */
export interface NetworkOptimizationConfig {
  // Request batching
  enableRequestBatching: boolean;
  batchSize: number;
  batchTimeout: number; // milliseconds
  maxConcurrentRequests: number;
  
  // Prefetching
  enablePrefetching: boolean;
  prefetchTriggerDistance: number; // posts from end to trigger prefetch
  maxPrefetchRequests: number;
  prefetchDelay: number; // milliseconds
  
  // Caching
  enableResponseCaching: boolean;
  cacheMaxAge: number; // milliseconds
  cacheMaxSize: number; // number of entries
  enableCacheInvalidation: boolean;
  
  // Network conditions
  adaptToNetworkConditions: boolean;
  slowNetworkThreshold: number; // milliseconds
  fastNetworkThreshold: number; // milliseconds
}

/**
 * Default network optimization configuration
 */
const DEFAULT_CONFIG: NetworkOptimizationConfig = {
  enableRequestBatching: true,
  batchSize: 5,
  batchTimeout: 100,
  maxConcurrentRequests: 3,
  
  enablePrefetching: true,
  prefetchTriggerDistance: 5,
  maxPrefetchRequests: 2,
  prefetchDelay: 500,
  
  enableResponseCaching: true,
  cacheMaxAge: 300000, // 5 minutes
  cacheMaxSize: 100,
  enableCacheInvalidation: true,
  
  adaptToNetworkConditions: true,
  slowNetworkThreshold: 2000,
  fastNetworkThreshold: 500,
};

/**
 * Request batch interface
 */
export interface RequestBatch {
  id: string;
  requests: NetworkRequest[];
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Network request interface
 */
export interface NetworkRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache entry interface
 */
export interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

/**
 * Network conditions interface
 */
export interface NetworkConditions {
  effectiveType: '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
}

/**
 * Prefetch strategy interface
 */
export interface PrefetchStrategy {
  type: 'scroll-based' | 'time-based' | 'user-behavior';
  triggerCondition: () => boolean;
  prefetchCount: number;
  priority: 'high' | 'medium' | 'low';
}
/**

 * Network Optimizer Class
 */
export class NetworkOptimizer {
  private config: NetworkOptimizationConfig;
  private requestQueue: (NetworkRequest & { resolve: Function; reject: Function })[] = [];
  private activeBatches: Map<string, RequestBatch> = new Map();
  private responseCache: Map<string, CacheEntry> = new Map();
  private prefetchQueue: NetworkRequest[] = [];
  private networkConditions: NetworkConditions | null = null;
  private batchTimer?: NodeJS.Timeout;
  private prefetchTimer?: NodeJS.Timeout;

  constructor(config: Partial<NetworkOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeNetworkMonitoring();
    this.startBatchProcessing();
  }

  /**
   * Add request to batch queue
   */
  async batchRequest(request: NetworkRequest): Promise<unknown> {
    if (!this.config.enableRequestBatching) {
      return this.executeRequest(request);
    }

    return new Promise((resolve, reject) => {
      const batchedRequest = {
        ...request,
        resolve,
        reject,
      } as NetworkRequest & { resolve: Function; reject: Function };

      this.requestQueue.push(batchedRequest);
      this.processBatchQueue();
    });
  }

  /**
   * Execute single request with optimization
   */
  async executeRequest(request: NetworkRequest): Promise<unknown> {
    const startTime = performance.now();
    
    // Check cache first
    if (this.config.enableResponseCaching && request.method === 'GET') {
      const cached = this.getCachedResponse(request.url);
      if (cached) {
        performanceMetricsCollector.trackEvent({
          type: 'cache-hit',
          duration: performance.now() - startTime,
          metadata: { url: request.url, fromCache: true },
        });
        return cached;
      }
    }

    try {
      // Adapt request based on network conditions
      const optimizedRequest = this.adaptRequestToNetwork(request);
      
      // Execute request
      const response = await this.performNetworkRequest(optimizedRequest);
      
      // Cache response if applicable
      if (this.config.enableResponseCaching && request.method === 'GET') {
        this.cacheResponse(request.url, response);
      }

      const duration = performance.now() - startTime;
      performanceMetricsCollector.trackEvent({
        type: 'network-request',
        duration,
        metadata: {
          url: request.url,
          method: request.method,
          fromCache: false,
          networkConditions: this.networkConditions,
        },
      });

      return response;
    } catch (error) {
      performanceMetricsCollector.trackEvent({
        type: 'network-error',
        duration: performance.now() - startTime,
        metadata: {
          url: request.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Intelligent prefetching based on user behavior
   */
  async prefetchContent(
    strategy: PrefetchStrategy,
    contentProvider: () => Promise<NetworkRequest[]>
  ): Promise<void> {
    if (!this.config.enablePrefetching || !strategy.triggerCondition()) {
      return;
    }

    try {
      const requests = await contentProvider();
      const limitedRequests = requests
        .slice(0, strategy.prefetchCount)
        .map(req => ({ ...req, priority: strategy.priority as any }));

      // Add to prefetch queue
      this.prefetchQueue.push(...limitedRequests);
      this.processPrefetchQueue();
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }

  /**
   * Cache response with invalidation strategy
   */
  cacheResponse(key: string, data: unknown, tags: string[] = []): void {
    if (!this.config.enableResponseCaching) return;

    // Clean up expired entries
    this.cleanupExpiredCache();

    // Check cache size limit
    if (this.responseCache.size >= this.config.cacheMaxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheMaxAge,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
    };

    this.responseCache.set(key, entry);
  }

  /**
   * Get cached response
   */
  getCachedResponse(key: string): unknown | null {
    const entry = this.responseCache.get(key);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  /**
   * Invalidate cache by tags
   */
  invalidateCache(tags: string[]): number {
    if (!this.config.enableCacheInvalidation) return 0;

    let invalidatedCount = 0;
    
    for (const [key, entry] of this.responseCache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.responseCache.delete(key);
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  /**
   * Get network optimization statistics
   */
  getOptimizationStats(): {
    requestQueue: number;
    activeBatches: number;
    cacheSize: number;
    cacheHitRate: number;
    prefetchQueue: number;
    networkConditions: NetworkConditions | null;
  } {
    const totalRequests = this.getTotalRequestCount();
    const cacheHits = this.getCacheHitCount();
    
    return {
      requestQueue: this.requestQueue.length,
      activeBatches: this.activeBatches.size,
      cacheSize: this.responseCache.size,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      prefetchQueue: this.prefetchQueue.length,
      networkConditions: this.networkConditions,
    };
  }

  /**
   * Clear all caches and queues
   */
  clearAll(): void {
    this.requestQueue = [];
    this.activeBatches.clear();
    this.responseCache.clear();
    this.prefetchQueue = [];
  }

  /**
   * Destroy optimizer and clean up resources
   */
  destroy(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    if (this.prefetchTimer) clearTimeout(this.prefetchTimer);
    this.clearAll();
  }

  // Private methods

  private initializeNetworkMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.networkConditions = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };

      // Listen for network changes
      connection.addEventListener('change', () => {
        this.networkConditions = {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        };
      });
    }
  }

  private startBatchProcessing(): void {
    if (!this.config.enableRequestBatching) return;

    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
      this.startBatchProcessing(); // Restart timer
    }, this.config.batchTimeout);
  }

  private processBatchQueue(): void {
    if (this.requestQueue.length === 0) return;

    const batchSize = Math.min(this.config.batchSize, this.requestQueue.length);
    const batch = this.requestQueue.splice(0, batchSize);
    
    if (batch.length > 0) {
      this.executeBatch(batch);
    }
  }

  private async executeBatch(requests: (NetworkRequest & { resolve: Function; reject: Function })[]): Promise<void> {
    const batchId = this.generateBatchId();
    const batch: RequestBatch = {
      id: batchId,
      requests: requests.map(({ resolve, reject, ...req }) => req),
      createdAt: Date.now(),
      status: 'processing',
    };

    this.activeBatches.set(batchId, batch);

    try {
      // Execute requests concurrently with limit
      const results = await this.executeConcurrentRequests(requests);
      
      // Resolve individual promises
      results.forEach((result, index) => {
        if (result.success) {
          requests[index].resolve(result.data);
        } else {
          requests[index].reject(new Error(result.error));
        }
      });

      batch.status = 'completed';
    } catch (error) {
      batch.status = 'failed';
      requests.forEach(req => req.reject(error));
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  private async executeConcurrentRequests(
    requests: NetworkRequest[]
  ): Promise<Array<{ success: boolean; data?: unknown; error?: string }>> {
    const results: Array<{ success: boolean; data?: unknown; error?: string }> = [];
    const semaphore = new Array(this.config.maxConcurrentRequests).fill(null);
    
    const executeRequest = async (request: NetworkRequest) => {
      try {
        const data = await this.performNetworkRequest(request);
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // Process requests with concurrency limit
    for (let i = 0; i < requests.length; i += this.config.maxConcurrentRequests) {
      const batch = requests.slice(i, i + this.config.maxConcurrentRequests);
      const batchResults = await Promise.all(batch.map(executeRequest));
      results.push(...batchResults);
    }

    return results;
  }

  private async performNetworkRequest(request: NetworkRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout || 10000);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private adaptRequestToNetwork(request: NetworkRequest): NetworkRequest {
    if (!this.config.adaptToNetworkConditions || !this.networkConditions) {
      return request;
    }

    const adapted = { ...request };

    // Adjust timeout based on network conditions
    if (this.networkConditions.rtt > this.config.slowNetworkThreshold) {
      adapted.timeout = (adapted.timeout || 10000) * 2;
    } else if (this.networkConditions.rtt < this.config.fastNetworkThreshold) {
      adapted.timeout = (adapted.timeout || 10000) * 0.5;
    }

    // Adjust priority based on save data mode
    if (this.networkConditions.saveData && adapted.priority === 'low') {
      // Skip low priority requests in save data mode
      throw new Error('Request skipped due to save data mode');
    }

    return adapted;
  }

  private processPrefetchQueue(): void {
    if (this.prefetchQueue.length === 0) return;

    // Clear existing timer
    if (this.prefetchTimer) clearTimeout(this.prefetchTimer);

    // Process prefetch requests with delay
    this.prefetchTimer = setTimeout(async () => {
      const request = this.prefetchQueue.shift();
      if (request) {
        try {
          await this.executeRequest(request);
        } catch (error) {
          // Prefetch failures are non-critical
          console.warn('Prefetch failed:', error);
        }
        
        // Continue processing queue
        this.processPrefetchQueue();
      }
    }, this.config.prefetchDelay);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.responseCache.entries()) {
      if (now > entry.expiresAt) {
        this.responseCache.delete(key);
      }
    }
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.responseCache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.responseCache.delete(lruKey);
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTotalRequestCount(): number {
    // This would be tracked in a real implementation
    return 100; // Placeholder
  }

  private getCacheHitCount(): number {
    // This would be tracked in a real implementation
    return 75; // Placeholder
  }
}

// Create and export singleton instance
export const networkOptimizer = new NetworkOptimizer();

// Export utility functions for easy integration
export const batchNetworkRequest = (request: NetworkRequest) =>
  networkOptimizer.batchRequest(request);

export const prefetchPosts = async (
  currentPostIndex: number,
  totalPosts: number,
  fetchMorePosts: () => Promise<Post[]>
) => {
  const strategy: PrefetchStrategy = {
    type: 'scroll-based',
    triggerCondition: () => 
      totalPosts - currentPostIndex <= networkOptimizer['config'].prefetchTriggerDistance,
    prefetchCount: 2,
    priority: 'low',
  };

  await networkOptimizer.prefetchContent(strategy, async () => {
    // Convert post fetch to network requests
    return [{
      id: `prefetch_${Date.now()}`,
      url: '/api/posts',
      method: 'GET' as const,
      priority: 'low' as const,
    }];
  });
};

export const invalidatePostsCache = () => {
  return networkOptimizer.invalidateCache(['posts', 'dashboard']);
};

export const getNetworkOptimizationStats = () => {
  return networkOptimizer.getOptimizationStats();
};
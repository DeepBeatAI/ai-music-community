/**
 * Enhanced Performance Metrics Collection System
 * 
 * This module provides comprehensive performance monitoring for Load More operations,
 * filter applications, search functionality, and memory usage tracking.
 */

import { PerformanceMetrics } from '@/types/pagination';

/**
 * Load More specific performance metrics
 */
export interface LoadMorePerformanceMetrics extends PerformanceMetrics {
  loadMoreType: 'server-fetch' | 'client-paginate' | 'auto-fetch';
  postsLoaded: number;
  totalPostsAfterLoad: number;
  filterApplicationTime?: number;
  searchApplicationTime?: number;
  stateTransitionTime: number;
  renderTime: number;
}

/**
 * Filter operation performance metrics
 */
export interface FilterPerformanceMetrics {
  filterType: 'postType' | 'sortBy' | 'timeRange' | 'combined';
  startTime: number;
  endTime: number;
  duration: number;
  postsFiltered: number;
  resultsCount: number;
  autoFetchTriggered: boolean;
  autoFetchDuration?: number;
  memoryUsageBefore: number;
  memoryUsageAfter: number;
}

/**
 * Search operation performance metrics
 */
export interface SearchPerformanceMetrics {
  searchType: 'query' | 'filter' | 'combined';
  startTime: number;
  endTime: number;
  duration: number;
  queryLength: number;
  resultsCount: number;
  cacheHit: boolean;
  networkLatency?: number;
  renderTime: number;
}

/**
 * Memory usage tracking interface
 */
export interface MemoryUsageMetrics {
  timestamp: number;
  totalPosts: number;
  displayPosts: number;
  paginatedPosts: number;
  estimatedMemoryUsage: number; // in MB
  jsHeapSizeUsed?: number;
  jsHeapSizeTotal?: number;
  jsHeapSizeLimit?: number;
}

/**
 * Performance event types for tracking
 */
export type PerformanceEventType = 
  | 'load-more-start'
  | 'load-more-complete'
  | 'load-more-error'
  | 'filter-start'
  | 'filter-complete'
  | 'search-start'
  | 'search-complete'
  | 'memory-check'
  | 'memory-cleanup'
  | 'gc-trigger'
  | 'cache-hit'
  | 'network-request'
  | 'network-error'
  | 'state-transition'
  | 'render-start'
  | 'render-complete';

/**
 * Performance event interface
 */
export interface PerformanceEvent {
  id: string;
  type: PerformanceEventType;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  enableDetailedTracking: boolean;
  enableMemoryMonitoring: boolean;
  memoryCheckInterval: number; // milliseconds
  maxEventsToStore: number;
  performanceThresholds: {
    loadMoreWarning: number; // milliseconds
    loadMoreError: number; // milliseconds
    filterWarning: number; // milliseconds
    searchWarning: number; // milliseconds
    memoryWarning: number; // MB
    memoryError: number; // MB
  };
}

/**
 * Default performance monitoring configuration
 */
const DEFAULT_CONFIG: PerformanceMonitoringConfig = {
  enableDetailedTracking: true,
  enableMemoryMonitoring: true,
  memoryCheckInterval: 30000, // 30 seconds
  maxEventsToStore: 1000,
  performanceThresholds: {
    loadMoreWarning: 2000, // 2 seconds
    loadMoreError: 5000, // 5 seconds
    filterWarning: 500, // 0.5 seconds
    searchWarning: 1000, // 1 second
    memoryWarning: 100, // 100 MB
    memoryError: 200, // 200 MB
  },
};

/**
 * Performance Metrics Collector Class
 */
export class PerformanceMetricsCollector {
  private events: PerformanceEvent[] = [];
  private activeOperations: Map<string, PerformanceEvent> = new Map();
  private memoryHistory: MemoryUsageMetrics[] = [];
  private config: PerformanceMonitoringConfig;
  private memoryMonitorInterval?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enableMemoryMonitoring && typeof window !== 'undefined') {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Start tracking a Load More operation
   */
  startLoadMoreOperation(
    operationType: 'server-fetch' | 'client-paginate' | 'auto-fetch',
    metadata: Record<string, unknown> = {}
  ): string {
    const operationId = this.generateOperationId();
    const event: PerformanceEvent = {
      id: operationId,
      type: 'load-more-start',
      timestamp: performance.now(),
      metadata: {
        operationType,
        ...metadata,
      },
    };

    this.activeOperations.set(operationId, event);
    this.addEvent(event);

    return operationId;
  }

  /**
   * Complete a Load More operation
   */
  completeLoadMoreOperation(
    operationId: string,
    result: {
      success: boolean;
      postsLoaded: number;
      totalPostsAfterLoad: number;
      error?: string;
    }
  ): LoadMorePerformanceMetrics | null {
    const startEvent = this.activeOperations.get(operationId);
    if (!startEvent) {
      console.warn(`No active Load More operation found for ID: ${operationId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startEvent.timestamp;

    const completeEvent: PerformanceEvent = {
      id: this.generateOperationId(),
      type: result.success ? 'load-more-complete' : 'load-more-error',
      timestamp: endTime,
      duration,
      metadata: {
        operationId,
        ...result,
      },
    };

    this.addEvent(completeEvent);
    this.activeOperations.delete(operationId);

    // Create detailed metrics
    const metrics: LoadMorePerformanceMetrics = {
      loadMoreType: startEvent.metadata.operationType as any,
      startTime: startEvent.timestamp,
      endTime,
      duration,
      requestCount: 1,
      successCount: result.success ? 1 : 0,
      errorCount: result.success ? 0 : 1,
      averageResponseTime: duration,
      memoryUsage: this.getCurrentMemoryUsage(),
      cacheHitRate: 0, // Will be calculated separately
      networkLatency: duration, // Approximation
      postsLoaded: result.postsLoaded,
      totalPostsAfterLoad: result.totalPostsAfterLoad,
      stateTransitionTime: 0, // Will be measured separately
      renderTime: 0, // Will be measured separately
    };

    // Check performance thresholds
    this.checkPerformanceThresholds('loadMore', duration);

    return metrics;
  }

  /**
   * Track filter operation performance
   */
  trackFilterOperation(
    filterType: 'postType' | 'sortBy' | 'timeRange' | 'combined',
    operation: () => Promise<{ resultsCount: number; autoFetchTriggered: boolean }>
  ): Promise<FilterPerformanceMetrics> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      const memoryBefore = this.getCurrentMemoryUsage();
      
      const startEvent: PerformanceEvent = {
        id: this.generateOperationId(),
        type: 'filter-start',
        timestamp: startTime,
        metadata: { filterType },
      };
      this.addEvent(startEvent);

      try {
        const result = await operation();
        const endTime = performance.now();
        const memoryAfter = this.getCurrentMemoryUsage();

        const metrics: FilterPerformanceMetrics = {
          filterType,
          startTime,
          endTime,
          duration: endTime - startTime,
          postsFiltered: 0, // Will be provided by caller
          resultsCount: result.resultsCount,
          autoFetchTriggered: result.autoFetchTriggered,
          memoryUsageBefore: memoryBefore,
          memoryUsageAfter: memoryAfter,
        };

        const completeEvent: PerformanceEvent = {
          id: this.generateOperationId(),
          type: 'filter-complete',
          timestamp: endTime,
          duration: metrics.duration,
          metadata: { filterType, ...result },
        };
        this.addEvent(completeEvent);

        this.checkPerformanceThresholds('filter', metrics.duration);
        resolve(metrics);
      } catch (error) {
        const endTime = performance.now();
        const errorEvent: PerformanceEvent = {
          id: this.generateOperationId(),
          type: 'filter-complete',
          timestamp: endTime,
          duration: endTime - startTime,
          metadata: { filterType, error: error instanceof Error ? error.message : 'Unknown error' },
        };
        this.addEvent(errorEvent);

        resolve({
          filterType,
          startTime,
          endTime,
          duration: endTime - startTime,
          postsFiltered: 0,
          resultsCount: 0,
          autoFetchTriggered: false,
          memoryUsageBefore: memoryBefore,
          memoryUsageAfter: this.getCurrentMemoryUsage(),
        });
      }
    });
  }

  /**
   * Track search operation performance
   */
  trackSearchOperation(
    searchType: 'query' | 'filter' | 'combined',
    queryLength: number,
    operation: () => Promise<{ resultsCount: number; cacheHit: boolean }>
  ): Promise<SearchPerformanceMetrics> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      
      const startEvent: PerformanceEvent = {
        id: this.generateOperationId(),
        type: 'search-start',
        timestamp: startTime,
        metadata: { searchType, queryLength },
      };
      this.addEvent(startEvent);

      try {
        const result = await operation();
        const endTime = performance.now();

        const metrics: SearchPerformanceMetrics = {
          searchType,
          startTime,
          endTime,
          duration: endTime - startTime,
          queryLength,
          resultsCount: result.resultsCount,
          cacheHit: result.cacheHit,
          renderTime: 0, // Will be measured separately
        };

        const completeEvent: PerformanceEvent = {
          id: this.generateOperationId(),
          type: 'search-complete',
          timestamp: endTime,
          duration: metrics.duration,
          metadata: { searchType, ...result },
        };
        this.addEvent(completeEvent);

        this.checkPerformanceThresholds('search', metrics.duration);
        resolve(metrics);
      } catch (error) {
        const endTime = performance.now();
        resolve({
          searchType,
          startTime,
          endTime,
          duration: endTime - startTime,
          queryLength,
          resultsCount: 0,
          cacheHit: false,
          renderTime: 0,
        });
      }
    });
  }

  /**
   * Get current memory usage metrics
   */
  getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    // Try to get memory info from performance API
    const memory = (performance as any).memory;
    if (memory) {
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // Convert to MB
    }

    // Fallback estimation based on data size
    const estimatedSize = this.events.length * 0.001; // Rough estimate
    return estimatedSize;
  }

  /**
   * Get detailed memory usage metrics
   */
  getDetailedMemoryMetrics(): MemoryUsageMetrics {
    const memory = typeof window !== 'undefined' && (performance as any).memory;
    
    return {
      timestamp: Date.now(),
      totalPosts: 0, // Will be provided by caller
      displayPosts: 0, // Will be provided by caller
      paginatedPosts: 0, // Will be provided by caller
      estimatedMemoryUsage: this.getCurrentMemoryUsage(),
      jsHeapSizeUsed: memory?.usedJSHeapSize,
      jsHeapSizeTotal: memory?.totalJSHeapSize,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit,
    };
  }

  /**
   * Get performance summary for Load More operations
   */
  getLoadMorePerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowOperations: number;
    errorOperations: number;
    performanceScore: number;
  } {
    const loadMoreEvents = this.events.filter(e => 
      e.type === 'load-more-complete' || e.type === 'load-more-error'
    );

    if (loadMoreEvents.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        slowOperations: 0,
        errorOperations: 0,
        performanceScore: 100,
      };
    }

    const totalDuration = loadMoreEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const successfulOperations = loadMoreEvents.filter(e => e.type === 'load-more-complete').length;
    const slowOperations = loadMoreEvents.filter(e => 
      (e.duration || 0) > this.config.performanceThresholds.loadMoreWarning
    ).length;
    const errorOperations = loadMoreEvents.filter(e => e.type === 'load-more-error').length;

    const averageDuration = totalDuration / loadMoreEvents.length;
    const successRate = successfulOperations / loadMoreEvents.length;

    // Calculate performance score (0-100)
    let score = 100;
    if (averageDuration > this.config.performanceThresholds.loadMoreWarning) score -= 20;
    if (averageDuration > this.config.performanceThresholds.loadMoreError) score -= 30;
    if (successRate < 0.95) score -= 25;
    if (slowOperations / loadMoreEvents.length > 0.1) score -= 15;

    return {
      totalOperations: loadMoreEvents.length,
      averageDuration,
      successRate,
      slowOperations,
      errorOperations,
      performanceScore: Math.max(0, score),
    };
  }

  /**
   * Get all performance events
   */
  getAllEvents(): PerformanceEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: PerformanceEventType): PerformanceEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Clear all stored events
   */
  clearEvents(): void {
    this.events = [];
    this.activeOperations.clear();
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): {
    events: PerformanceEvent[];
    memoryHistory: MemoryUsageMetrics[];
    summary: {
      loadMore: {
        totalOperations: number;
        averageDuration: number;
        successRate: number;
        slowOperations: number;
        errorOperations: number;
        performanceScore: number;
      };
      currentMemory: MemoryUsageMetrics;
      config: PerformanceMonitoringConfig;
    };
  } {
    return {
      events: this.getAllEvents(),
      memoryHistory: [...this.memoryHistory],
      summary: {
        loadMore: this.getLoadMorePerformanceSummary(),
        currentMemory: this.getDetailedMemoryMetrics(),
        config: this.config,
      },
    };
  }

  /**
   * Destroy the collector and clean up resources
   */
  destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    this.clearEvents();
  }

  // Private methods

  /**
   * Track a generic performance event
   */
  trackEvent(event: {
    type: PerformanceEventType;
    metadata?: Record<string, unknown>;
    duration?: number;
  }): void {
    const performanceEvent: PerformanceEvent = {
      id: this.generateOperationId(),
      type: event.type,
      timestamp: performance.now(),
      duration: event.duration,
      metadata: event.metadata || {},
    };

    this.addEvent(performanceEvent);
  }

  private generateOperationId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addEvent(event: PerformanceEvent): void {
    this.events.push(event);

    // Limit stored events
    if (this.events.length > this.config.maxEventsToStore) {
      this.events = this.events.slice(-Math.floor(this.config.maxEventsToStore * 0.8));
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      const memoryMetrics = this.getDetailedMemoryMetrics();
      this.memoryHistory.push(memoryMetrics);

      // Limit memory history
      if (this.memoryHistory.length > 100) {
        this.memoryHistory = this.memoryHistory.slice(-80);
      }

      // Check memory thresholds
      this.checkMemoryThresholds(memoryMetrics.estimatedMemoryUsage);
    }, this.config.memoryCheckInterval);
  }

  private checkPerformanceThresholds(operation: 'loadMore' | 'filter' | 'search', duration: number): void {
    const thresholds = this.config.performanceThresholds;
    let warningThreshold: number;
    let errorThreshold: number;

    switch (operation) {
      case 'loadMore':
        warningThreshold = thresholds.loadMoreWarning;
        errorThreshold = thresholds.loadMoreError;
        break;
      case 'filter':
        warningThreshold = thresholds.filterWarning;
        errorThreshold = thresholds.filterWarning * 2; // No separate error threshold
        break;
      case 'search':
        warningThreshold = thresholds.searchWarning;
        errorThreshold = thresholds.searchWarning * 2; // No separate error threshold
        break;
    }

    if (duration > errorThreshold) {
      console.error(`Performance Error: ${operation} operation took ${duration}ms (threshold: ${errorThreshold}ms)`);
    } else if (duration > warningThreshold) {
      console.warn(`Performance Warning: ${operation} operation took ${duration}ms (threshold: ${warningThreshold}ms)`);
    }
  }

  private checkMemoryThresholds(memoryUsage: number): void {
    const thresholds = this.config.performanceThresholds;

    if (memoryUsage > thresholds.memoryError) {
      console.error(`Memory Error: Usage at ${memoryUsage}MB (threshold: ${thresholds.memoryError}MB)`);
    } else if (memoryUsage > thresholds.memoryWarning) {
      console.warn(`Memory Warning: Usage at ${memoryUsage}MB (threshold: ${thresholds.memoryWarning}MB)`);
    }
  }
}

// Create and export a singleton instance
export const performanceMetricsCollector = new PerformanceMetricsCollector();

// Export utility functions for easy integration
export const trackLoadMoreOperation = (
  operationType: 'server-fetch' | 'client-paginate' | 'auto-fetch',
  metadata?: Record<string, unknown>
) => performanceMetricsCollector.startLoadMoreOperation(operationType, metadata);

export const completeLoadMoreOperation = (
  operationId: string,
  result: {
    success: boolean;
    postsLoaded: number;
    totalPostsAfterLoad: number;
    error?: string;
  }
) => performanceMetricsCollector.completeLoadMoreOperation(operationId, result);

export const trackFilterOperation = (
  filterType: 'postType' | 'sortBy' | 'timeRange' | 'combined',
  operation: () => Promise<{ resultsCount: number; autoFetchTriggered: boolean }>
) => performanceMetricsCollector.trackFilterOperation(filterType, operation);

export const trackSearchOperation = (
  searchType: 'query' | 'filter' | 'combined',
  queryLength: number,
  operation: () => Promise<{ resultsCount: number; cacheHit: boolean }>
) => performanceMetricsCollector.trackSearchOperation(searchType, queryLength, operation);
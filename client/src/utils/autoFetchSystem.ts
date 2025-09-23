/**
 * Smart Auto-Fetch System for Comprehensive Filtering
 * 
 * This module implements intelligent auto-fetch detection and triggering logic
 * that determines when additional posts are needed for filtering and fetches
 * them with configurable target counts, performance monitoring, and timeout handling.
 * 
 * Requirements: 2.4, 2.5, 6.2
 */

import { Post } from '@/types';
import { 
  PaginationState, 
  ModeDetectionContext,
  AutoFetchConfig,
  AutoFetchResult,
  PerformanceMetrics 
} from '@/types/pagination';

/**
 * Auto-fetch detection configuration
 */
export interface AutoFetchDetectionConfig {
  minResultsThreshold: number;      // Minimum filtered results before auto-fetch
  targetResultsCount: number;       // Target number of results after auto-fetch
  maxAutoFetchPosts: number;        // Maximum posts to fetch in one operation
  maxTotalAutoFetched: number;      // Maximum total posts to auto-fetch per session
  performanceThreshold: number;     // Maximum response time in ms
  timeoutMs: number;               // Request timeout in milliseconds
  retryAttempts: number;           // Number of retry attempts on failure
  retryDelayMs: number;            // Delay between retry attempts
}

/**
 * Default auto-fetch configuration optimized for performance
 */
export const DEFAULT_AUTO_FETCH_CONFIG: AutoFetchDetectionConfig = {
  minResultsThreshold: 10,
  targetResultsCount: 25,
  maxAutoFetchPosts: 50,
  maxTotalAutoFetched: 200,
  performanceThreshold: 3000,
  timeoutMs: 8000,
  retryAttempts: 2,
  retryDelayMs: 1000,
};

/**
 * Auto-fetch operation context
 */
interface AutoFetchContext {
  paginationState: PaginationState;
  config: AutoFetchDetectionConfig;
  performanceMetrics: PerformanceMetrics;
  abortController: AbortController;
  requestId: string;
}

/**
 * Auto-fetch detection result
 */
export interface AutoFetchDetectionResult {
  shouldAutoFetch: boolean;
  reason: string;
  estimatedPostsNeeded: number;
  targetFetchCount: number;
  confidence: number; // 0-1 confidence score
  metadata: {
    currentFilteredCount: number;
    totalLoadedCount: number;
    filterEfficiency: number;
    estimatedTotalNeeded: number;
  };
}

/**
 * Performance monitoring for auto-fetch operations
 */
class AutoFetchPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private operationHistory: Array<{
    requestId: string;
    startTime: number;
    endTime: number;
    success: boolean;
    postsRequested: number;
    postsFetched: number;
    error?: string;
  }> = [];

  /**
   * Start performance monitoring for an operation
   */
  startOperation(requestId: string): void {
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      requestCount: 1,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: 0,
      networkLatency: 0,
    };

    this.metrics.set(requestId, metrics);
  }

  /**
   * Complete performance monitoring for an operation
   */
  completeOperation(
    requestId: string, 
    success: boolean, 
    postsRequested: number, 
    postsFetched: number,
    error?: string
  ): PerformanceMetrics {
    const metrics = this.metrics.get(requestId);
    if (!metrics) {
      throw new Error(`No metrics found for request ${requestId}`);
    }

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    // Update metrics
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.successCount = success ? 1 : 0;
    metrics.errorCount = success ? 0 : 1;
    metrics.averageResponseTime = duration;
    metrics.networkLatency = duration; // Simplified for now

    // Add to history
    this.operationHistory.push({
      requestId,
      startTime: metrics.startTime,
      endTime,
      success,
      postsRequested,
      postsFetched,
      error,
    });

    // Trim history to last 50 operations
    if (this.operationHistory.length > 50) {
      this.operationHistory = this.operationHistory.slice(-50);
    }

    // Clean up metrics map
    this.metrics.delete(requestId);

    return metrics;
  }

  /**
   * Get average performance metrics
   */
  getAverageMetrics(): PerformanceMetrics {
    const recentOperations = this.operationHistory.slice(-10);
    
    if (recentOperations.length === 0) {
      return {
        startTime: 0,
        endTime: 0,
        duration: 0,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: this.getMemoryUsage(),
        cacheHitRate: 0,
        networkLatency: 0,
      };
    }

    const totalDuration = recentOperations.reduce((sum, op) => sum + (op.endTime - op.startTime), 0);
    const successCount = recentOperations.filter(op => op.success).length;

    return {
      startTime: recentOperations[0].startTime,
      endTime: recentOperations[recentOperations.length - 1].endTime,
      duration: totalDuration / recentOperations.length,
      requestCount: recentOperations.length,
      successCount,
      errorCount: recentOperations.length - successCount,
      averageResponseTime: totalDuration / recentOperations.length,
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: successCount / recentOperations.length,
      networkLatency: totalDuration / recentOperations.length,
    };
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  isPerformanceAcceptable(thresholdMs: number): boolean {
    const avgMetrics = this.getAverageMetrics();
    
    // If no operations yet, assume performance is acceptable
    if (avgMetrics.requestCount === 0) {
      return true;
    }
    
    return avgMetrics.averageResponseTime <= thresholdMs && avgMetrics.cacheHitRate >= 0.5;
  }

  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window.performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }
}

/**
 * Smart Auto-Fetch Detection System
 */
export class AutoFetchDetectionSystem {
  private config: AutoFetchDetectionConfig;
  private performanceMonitor: AutoFetchPerformanceMonitor;
  private totalAutoFetched: number = 0;
  private sessionStartTime: number = Date.now();

  constructor(config: Partial<AutoFetchDetectionConfig> = {}) {
    this.config = { ...DEFAULT_AUTO_FETCH_CONFIG, ...config };
    this.performanceMonitor = new AutoFetchPerformanceMonitor();
  }

  /**
   * Main auto-fetch detection function
   * Determines when additional posts are needed for filtering
   */
  shouldAutoFetch(
    paginationState: PaginationState,
    context: ModeDetectionContext
  ): AutoFetchDetectionResult {
    // Check basic prerequisites
    if (!this.meetsBasicRequirements(paginationState, context)) {
      return this.createNegativeResult('Basic requirements not met', paginationState, context);
    }

    // Check session limits
    if (this.totalAutoFetched >= this.config.maxTotalAutoFetched) {
      return this.createNegativeResult('Session auto-fetch limit reached', paginationState, context);
    }

    // Check performance constraints
    if (!this.performanceMonitor.isPerformanceAcceptable(this.config.performanceThreshold)) {
      return this.createNegativeResult('Performance threshold exceeded', paginationState, context);
    }

    // Calculate filter efficiency
    const filterEfficiency = this.calculateFilterEfficiency(paginationState, context);
    
    // Determine if auto-fetch is needed
    const currentFilteredCount = context.totalFilteredPosts;
    const needsMoreResults = currentFilteredCount < this.config.minResultsThreshold;
    
    if (!needsMoreResults) {
      return this.createNegativeResult('Sufficient filtered results available', paginationState, context);
    }

    // Calculate optimal fetch amount
    const estimatedPostsNeeded = this.estimatePostsNeeded(
      currentFilteredCount,
      this.config.targetResultsCount,
      filterEfficiency
    );

    const targetFetchCount = Math.min(
      estimatedPostsNeeded,
      this.config.maxAutoFetchPosts,
      this.config.maxTotalAutoFetched - this.totalAutoFetched
    );

    // Calculate confidence score
    const confidence = this.calculateConfidence(filterEfficiency, currentFilteredCount, context);

    return {
      shouldAutoFetch: true,
      reason: `Insufficient filtered results (${currentFilteredCount}/${this.config.minResultsThreshold})`,
      estimatedPostsNeeded,
      targetFetchCount,
      confidence,
      metadata: {
        currentFilteredCount,
        totalLoadedCount: context.totalLoadedPosts,
        filterEfficiency,
        estimatedTotalNeeded: this.config.targetResultsCount,
      },
    };
  }

  /**
   * Execute auto-fetch operation with performance monitoring and timeout handling
   */
  async fetchAdditionalPosts(
    targetCount: number,
    paginationState: PaginationState,
    fetchFunction: (page: number, limit: number, signal: AbortSignal) => Promise<{ posts: Post[]; hasMore: boolean }>
  ): Promise<AutoFetchResult> {
    const requestId = this.generateRequestId();
    const abortController = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.timeoutMs);

    let timeoutOccurred = false;
    abortController.signal.addEventListener('abort', () => {
      if (!abortController.signal.reason) {
        timeoutOccurred = true;
      }
    });

    // Start performance monitoring
    this.performanceMonitor.startOperation(requestId);

    try {
      const result = await this.executeAutoFetchWithRetry(
        targetCount,
        paginationState,
        fetchFunction,
        abortController,
        requestId
      );

      // Update session tracking
      if (result.success) {
        this.totalAutoFetched += result.newPosts.length;
      }

      return result;
    } catch (error) {
      // Handle timeout specifically
      if (timeoutOccurred || (error instanceof Error && error.name === 'AbortError')) {
        this.performanceMonitor.completeOperation(
          requestId,
          false,
          targetCount,
          0,
          'Request timeout'
        );

        return {
          success: false,
          newPosts: [],
          hasMore: paginationState.hasMorePosts,
          error: 'Request timeout',
          requestId,
          performanceMetrics: this.performanceMonitor.getAverageMetrics(),
        };
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get current auto-fetch statistics
   */
  getStatistics(): {
    totalAutoFetched: number;
    sessionDuration: number;
    averagePerformance: PerformanceMetrics;
    config: AutoFetchDetectionConfig;
  } {
    return {
      totalAutoFetched: this.totalAutoFetched,
      sessionDuration: Date.now() - this.sessionStartTime,
      averagePerformance: this.performanceMonitor.getAverageMetrics(),
      config: this.config,
    };
  }

  /**
   * Reset session statistics
   */
  resetSession(): void {
    this.totalAutoFetched = 0;
    this.sessionStartTime = Date.now();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoFetchDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private methods

  private meetsBasicRequirements(
    paginationState: PaginationState,
    context: ModeDetectionContext
  ): boolean {
    // Must have filters or search active
    if (!context.hasFiltersApplied && !context.isSearchActive && !context.searchFiltersActive) {
      return false;
    }

    // Must have more posts available on server
    if (!paginationState.hasMorePosts) {
      return false;
    }

    // Must not be already loading
    if (paginationState.isLoadingMore) {
      return false;
    }

    return true;
  }

  private calculateFilterEfficiency(
    paginationState: PaginationState,
    context: ModeDetectionContext
  ): number {
    const totalLoaded = context.totalLoadedPosts;
    const totalFiltered = context.totalFilteredPosts;

    if (totalLoaded === 0) {
      return 0.5; // Default assumption
    }

    return Math.min(totalFiltered / totalLoaded, 1.0);
  }

  private estimatePostsNeeded(
    currentFiltered: number,
    targetFiltered: number,
    filterEfficiency: number
  ): number {
    const additionalNeeded = targetFiltered - currentFiltered;
    
    if (filterEfficiency <= 0) {
      return this.config.maxAutoFetchPosts; // Conservative estimate
    }

    // Estimate based on filter efficiency with safety margin
    const estimated = Math.ceil(additionalNeeded / filterEfficiency * 1.5);
    return Math.min(estimated, this.config.maxAutoFetchPosts);
  }

  private calculateConfidence(
    filterEfficiency: number,
    currentFilteredCount: number,
    context: ModeDetectionContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence with better filter efficiency
    confidence += filterEfficiency * 0.3;

    // Higher confidence with more data points
    if (context.totalLoadedPosts > 30) {
      confidence += 0.1;
    }

    // Lower confidence if we have very few filtered results
    if (currentFilteredCount < 3) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private createNegativeResult(
    reason: string,
    paginationState: PaginationState,
    context: ModeDetectionContext
  ): AutoFetchDetectionResult {
    return {
      shouldAutoFetch: false,
      reason,
      estimatedPostsNeeded: 0,
      targetFetchCount: 0,
      confidence: 0,
      metadata: {
        currentFilteredCount: context.totalFilteredPosts,
        totalLoadedCount: context.totalLoadedPosts,
        filterEfficiency: this.calculateFilterEfficiency(paginationState, context),
        estimatedTotalNeeded: this.config.targetResultsCount,
      },
    };
  }

  private async executeAutoFetchWithRetry(
    targetCount: number,
    paginationState: PaginationState,
    fetchFunction: (page: number, limit: number, signal: AbortSignal) => Promise<{ posts: Post[]; hasMore: boolean }>,
    abortController: AbortController,
    requestId: string
  ): Promise<AutoFetchResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Calculate next page to fetch
        const nextPage = Math.ceil(paginationState.allPosts.length / paginationState.postsPerPage) + 1;
        
        // Execute fetch
        const result = await fetchFunction(nextPage, targetCount, abortController.signal);
        
        // Complete performance monitoring
        this.performanceMonitor.completeOperation(
          requestId,
          true,
          targetCount,
          result.posts.length
        );

        return {
          success: true,
          newPosts: result.posts,
          hasMore: result.hasMore,
          requestId,
          performanceMetrics: this.performanceMonitor.getAverageMetrics(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on abort or timeout
        if (lastError.name === 'AbortError' || lastError.message === 'Request timeout') {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }

    // Complete performance monitoring with error
    this.performanceMonitor.completeOperation(
      requestId,
      false,
      targetCount,
      0,
      lastError?.message
    );

    return {
      success: false,
      newPosts: [],
      hasMore: paginationState.hasMorePosts,
      error: lastError?.message || 'Auto-fetch failed',
      requestId,
      performanceMetrics: this.performanceMonitor.getAverageMetrics(),
    };
  }

  private generateRequestId(): string {
    return `auto-fetch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create a new auto-fetch detection system
 */
export function createAutoFetchSystem(
  config?: Partial<AutoFetchDetectionConfig>
): AutoFetchDetectionSystem {
  return new AutoFetchDetectionSystem(config);
}

/**
 * Utility function for quick auto-fetch detection
 */
export function shouldAutoFetch(
  paginationState: PaginationState,
  context: ModeDetectionContext,
  config?: Partial<AutoFetchDetectionConfig>
): boolean {
  const system = createAutoFetchSystem(config);
  const result = system.shouldAutoFetch(paginationState, context);
  return result.shouldAutoFetch;
}
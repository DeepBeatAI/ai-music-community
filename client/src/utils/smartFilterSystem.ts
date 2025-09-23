/**
 * Smart Filter System with Auto-Fetch Integration
 * 
 * This module enhances filter application logic with smart fetching integration,
 * implements filter result validation and automatic data expansion when needed,
 * and adds logging and performance tracking for filter operations.
 * 
 * Requirements: 2.1, 2.2, 2.4
 */

import { Post } from '@/types';
import { 
  PaginationState, 
  FilterOptions, 
  SearchFilters
} from '@/types/pagination';
import { AutoFetchDetectionSystem } from './autoFetchSystem';

/**
 * Filter operation result with validation and expansion info
 */
export interface FilterResult {
  filteredPosts: Post[];
  totalMatched: number;
  filterEfficiency: number;
  needsMoreData: boolean;
  expansionRecommended: boolean;
  performanceMetrics: FilterOperationMetrics;
  validationResult: FilterValidationResult;
}

/**
 * Filter validation result
 */
export interface FilterValidationResult {
  isValid: boolean;
  hasMinimumResults: boolean;
  meetsQualityThreshold: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Filter operation performance metrics
 */
export interface FilterOperationMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  postsProcessed: number;
  postsMatched: number;
  cacheHitRate: number;
  memoryUsage: number;
  operationType: 'initial' | 'expansion' | 'refinement';
}

/**
 * Smart filter configuration
 */
export interface SmartFilterConfig {
  minResultsThreshold: number;
  qualityThreshold: number;
  maxExpansionAttempts: number;
  expansionBatchSize: number;
  performanceLogging: boolean;
  autoExpansionEnabled: boolean;
}

/**
 * Default smart filter configuration
 */
export const DEFAULT_SMART_FILTER_CONFIG: SmartFilterConfig = {
  minResultsThreshold: 10,
  qualityThreshold: 0.15, // 15% filter efficiency minimum
  maxExpansionAttempts: 3,
  expansionBatchSize: 50,
  performanceLogging: true,
  autoExpansionEnabled: true,
};

/**
 * Filter operation context for tracking and logging
 */
interface FilterOperationContext {
  operationId: string;
  startTime: number;
  filters: FilterOptions;
  searchFilters: SearchFilters;
  initialPostCount: number;
  expansionAttempts: number;
  performanceMetrics: FilterOperationMetrics[];
}

/**
 * Smart Filter System with Auto-Fetch Integration
 */
export class SmartFilterSystem {
  private config: SmartFilterConfig;
  private autoFetchSystem: AutoFetchDetectionSystem;
  private operationHistory: FilterOperationContext[] = [];
  private currentOperation: FilterOperationContext | null = null;

  constructor(
    config: Partial<SmartFilterConfig> = {},
    autoFetchSystem?: AutoFetchDetectionSystem
  ) {
    this.config = { ...DEFAULT_SMART_FILTER_CONFIG, ...config };
    this.autoFetchSystem = autoFetchSystem || new AutoFetchDetectionSystem();
  }

  /**
   * Enhanced filter application with smart fetching integration
   */
  async applyFiltersAndSearch(
    allPosts: Post[],
    filters: FilterOptions,
    searchFilters: SearchFilters,
    searchResults: { posts: Post[]; users: unknown[]; totalResults: number },
    isSearchActive: boolean,
    paginationState: PaginationState,
    fetchMorePosts?: (count: number) => Promise<{ posts: Post[]; hasMore: boolean }>
  ): Promise<FilterResult> {
    // Start operation tracking
    const operationId = this.generateOperationId();
    this.startOperation(operationId, filters, searchFilters, allPosts.length);

    try {
      // Initial filter application
      let filteredPosts = this.performInitialFiltering(
        allPosts,
        filters,
        searchFilters,
        searchResults,
        isSearchActive
      );

      // Validate initial results
      const validationResult = this.validateFilterResults(filteredPosts, allPosts.length);
      
      // Check if expansion is needed and possible
      const needsExpansion = this.shouldExpandData(
        filteredPosts,
        validationResult,
        paginationState
      );

      // Perform auto-expansion if needed and enabled
      if (needsExpansion && this.config.autoExpansionEnabled && fetchMorePosts) {
        const expansionResult = await this.performDataExpansion(
          filteredPosts,
          allPosts,
          filters,
          searchFilters,
          searchResults,
          isSearchActive,
          paginationState,
          fetchMorePosts
        );
        
        if (expansionResult.success) {
          filteredPosts = expansionResult.filteredPosts;
        }
      }

      // Final validation and metrics
      const finalValidation = this.validateFilterResults(filteredPosts, allPosts.length);
      const performanceMetrics = this.completeOperation(operationId, filteredPosts.length);

      // Log performance if enabled
      if (this.config.performanceLogging) {
        this.logFilterOperation(operationId, performanceMetrics, finalValidation);
      }

      return {
        filteredPosts,
        totalMatched: filteredPosts.length,
        filterEfficiency: this.calculateFilterEfficiency(filteredPosts.length, allPosts.length),
        needsMoreData: needsExpansion && (!this.config.autoExpansionEnabled || !fetchMorePosts),
        expansionRecommended: needsExpansion,
        performanceMetrics,
        validationResult: finalValidation,
      };
    } catch (error) {
      this.handleFilterError(operationId, error);
      throw error;
    }
  }

  /**
   * Get filter operation statistics
   */
  getFilterStatistics(): {
    totalOperations: number;
    averageFilterTime: number;
    averageFilterEfficiency: number;
    expansionSuccessRate: number;
    recentOperations: FilterOperationContext[];
  } {
    const recentOps = this.operationHistory.slice(-10);
    
    if (recentOps.length === 0) {
      return {
        totalOperations: 0,
        averageFilterTime: 0,
        averageFilterEfficiency: 0,
        expansionSuccessRate: 0,
        recentOperations: [],
      };
    }

    const totalTime = recentOps.reduce((sum, op) => {
      const lastMetric = op.performanceMetrics[op.performanceMetrics.length - 1];
      return sum + (lastMetric?.duration || 0);
    }, 0);

    const totalEfficiency = recentOps.reduce((sum, op) => {
      const lastMetric = op.performanceMetrics[op.performanceMetrics.length - 1];
      const efficiency = lastMetric ? lastMetric.postsMatched / lastMetric.postsProcessed : 0;
      return sum + efficiency;
    }, 0);

    const expansionAttempts = recentOps.reduce((sum, op) => sum + op.expansionAttempts, 0);
    const successfulExpansions = recentOps.filter(op => op.expansionAttempts > 0).length;

    return {
      totalOperations: this.operationHistory.length,
      averageFilterTime: totalTime / recentOps.length,
      averageFilterEfficiency: totalEfficiency / recentOps.length,
      expansionSuccessRate: expansionAttempts > 0 ? successfulExpansions / expansionAttempts : 0,
      recentOperations: recentOps,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SmartFilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private methods

  private performInitialFiltering(
    allPosts: Post[],
    filters: FilterOptions,
    searchFilters: SearchFilters,
    searchResults: { posts: Post[]; users: unknown[]; totalResults: number },
    isSearchActive: boolean
  ): Post[] {
    let filtered = [...allPosts];

    // Apply search first if active
    if (isSearchActive && searchResults.posts.length >= 0) {
      const searchPostIds = new Set(searchResults.posts.map(p => p.id));
      filtered = allPosts.filter(post => searchPostIds.has(post.id));
    }

    // Determine active filters (search filters take precedence)
    const hasSearchFilters = Object.keys(searchFilters).some(key => {
      const filterKey = key as keyof SearchFilters;
      const value = searchFilters[filterKey];
      return value && value !== 'all' && value !== 'recent';
    });

    const activeFilters = hasSearchFilters ? {
      postType: searchFilters.postType || 'all',
      sortBy: searchFilters.sortBy || 'recent',
      timeRange: searchFilters.timeRange || 'all'
    } : filters;

    // Apply post type filter
    if (activeFilters.postType !== 'all' && activeFilters.postType !== 'creators') {
      filtered = filtered.filter(post => post.post_type === activeFilters.postType);
    }

    // Apply time range filter
    if (activeFilters.timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (activeFilters.timeRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(post => new Date(post.created_at) >= cutoff);
    }

    // Apply sorting
    const sortBy = activeFilters.sortBy;
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'popular':
        case 'likes':
          const likeDiff = (b.like_count || 0) - (a.like_count || 0);
          if (likeDiff === 0) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return likeDiff;
        case 'recent':
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }

  private validateFilterResults(
    filteredPosts: Post[],
    totalPosts: number
  ): FilterValidationResult {
    const hasMinimumResults = filteredPosts.length >= this.config.minResultsThreshold;
    const filterEfficiency = this.calculateFilterEfficiency(filteredPosts.length, totalPosts);
    const meetsQualityThreshold = filterEfficiency >= this.config.qualityThreshold;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!hasMinimumResults) {
      warnings.push(`Filter results (${filteredPosts.length}) below minimum threshold (${this.config.minResultsThreshold})`);
      recommendations.push('Consider expanding data or relaxing filter criteria');
    }

    if (!meetsQualityThreshold) {
      warnings.push(`Filter efficiency (${(filterEfficiency * 100).toFixed(1)}%) below quality threshold (${(this.config.qualityThreshold * 100).toFixed(1)}%)`);
      recommendations.push('Consider refining filter criteria or expanding data set');
    }

    return {
      isValid: hasMinimumResults && meetsQualityThreshold,
      hasMinimumResults,
      meetsQualityThreshold,
      warnings,
      recommendations,
    };
  }

  private shouldExpandData(
    filteredPosts: Post[],
    validationResult: FilterValidationResult,
    paginationState: PaginationState
  ): boolean {
    // Don't expand if we don't have more posts available
    if (!paginationState.hasMorePosts) {
      return false;
    }

    // Don't expand if already at max attempts
    if (this.currentOperation && this.currentOperation.expansionAttempts >= this.config.maxExpansionAttempts) {
      return false;
    }

    // Expand if validation failed
    if (!validationResult.isValid) {
      return true;
    }

    // Expand if we have very few results and low efficiency
    const efficiency = this.calculateFilterEfficiency(filteredPosts.length, paginationState.allPosts.length);
    if (filteredPosts.length < this.config.minResultsThreshold / 2 && efficiency < this.config.qualityThreshold) {
      return true;
    }

    return false;
  }

  private async performDataExpansion(
    currentFiltered: Post[],
    allPosts: Post[],
    filters: FilterOptions,
    searchFilters: SearchFilters,
    searchResults: { posts: Post[]; users: unknown[]; totalResults: number },
    isSearchActive: boolean,
    paginationState: PaginationState,
    fetchMorePosts: (count: number) => Promise<{ posts: Post[]; hasMore: boolean }>
  ): Promise<{ success: boolean; filteredPosts: Post[] }> {
    if (!this.currentOperation) {
      return { success: false, filteredPosts: currentFiltered };
    }

    this.currentOperation.expansionAttempts++;

    try {
      // Fetch more posts
      const fetchResult = await fetchMorePosts(this.config.expansionBatchSize);
      
      if (!fetchResult.posts || fetchResult.posts.length === 0) {
        return { success: false, filteredPosts: currentFiltered };
      }

      // Apply filters to the expanded dataset
      const expandedPosts = [...allPosts, ...fetchResult.posts];
      const newFiltered = this.performInitialFiltering(
        expandedPosts,
        filters,
        searchFilters,
        searchResults,
        isSearchActive
      );

      // Log expansion metrics
      const expansionMetrics: FilterOperationMetrics = {
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        postsProcessed: fetchResult.posts.length,
        postsMatched: newFiltered.length - currentFiltered.length,
        cacheHitRate: 0,
        memoryUsage: 0,
        operationType: 'expansion',
      };

      this.currentOperation.performanceMetrics.push(expansionMetrics);

      return { success: true, filteredPosts: newFiltered };
    } catch (error) {
      console.error('Data expansion failed:', error);
      return { success: false, filteredPosts: currentFiltered };
    }
  }

  private calculateFilterEfficiency(filteredCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return filteredCount / totalCount;
  }

  private startOperation(
    operationId: string,
    filters: FilterOptions,
    searchFilters: SearchFilters,
    initialPostCount: number
  ): void {
    this.currentOperation = {
      operationId,
      startTime: Date.now(),
      filters,
      searchFilters,
      initialPostCount,
      expansionAttempts: 0,
      performanceMetrics: [],
    };
  }

  private completeOperation(operationId: string, finalResultCount: number): FilterOperationMetrics {
    if (!this.currentOperation || this.currentOperation.operationId !== operationId) {
      throw new Error('No matching operation found');
    }

    const endTime = Date.now();
    const duration = Math.max(1, endTime - this.currentOperation.startTime); // Ensure minimum 1ms duration

    const metrics: FilterOperationMetrics = {
      startTime: this.currentOperation.startTime,
      endTime,
      duration,
      postsProcessed: this.currentOperation.initialPostCount,
      postsMatched: finalResultCount,
      cacheHitRate: 0, // Could be enhanced with cache integration
      memoryUsage: 0, // Could be enhanced with memory monitoring
      operationType: 'initial',
    };

    this.currentOperation.performanceMetrics.push(metrics);
    this.operationHistory.push(this.currentOperation);

    // Keep only recent operations
    if (this.operationHistory.length > 50) {
      this.operationHistory = this.operationHistory.slice(-50);
    }

    this.currentOperation = null;
    return metrics;
  }

  private handleFilterError(operationId: string, error: unknown): void {
    console.error(`Filter operation ${operationId} failed:`, error);
    
    if (this.currentOperation && this.currentOperation.operationId === operationId) {
      this.currentOperation = null;
    }
  }

  private logFilterOperation(
    operationId: string,
    metrics: FilterOperationMetrics,
    validation: FilterValidationResult
  ): void {
    const efficiency = (metrics.postsMatched / metrics.postsProcessed * 100).toFixed(1);
    
    console.log(`🔍 Filter Operation ${operationId}:`, {
      duration: `${metrics.duration}ms`,
      processed: metrics.postsProcessed,
      matched: metrics.postsMatched,
      efficiency: `${efficiency}%`,
      valid: validation.isValid,
      warnings: validation.warnings.length,
    });

    if (validation.warnings.length > 0) {
      console.warn('Filter warnings:', validation.warnings);
    }

    if (validation.recommendations.length > 0) {
      console.info('Filter recommendations:', validation.recommendations);
    }
  }

  private generateOperationId(): string {
    return `filter-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create a new smart filter system
 */
export function createSmartFilterSystem(
  config?: Partial<SmartFilterConfig>,
  autoFetchSystem?: AutoFetchDetectionSystem
): SmartFilterSystem {
  return new SmartFilterSystem(config, autoFetchSystem);
}

/**
 * Utility function for quick filter application
 */
export async function applySmartFilters(
  allPosts: Post[],
  filters: FilterOptions,
  searchFilters: SearchFilters,
  searchResults: { posts: Post[]; users: unknown[]; totalResults: number },
  isSearchActive: boolean,
  paginationState: PaginationState,
  fetchMorePosts?: (count: number) => Promise<{ posts: Post[]; hasMore: boolean }>
): Promise<FilterResult> {
  const system = createSmartFilterSystem();
  return await system.applyFiltersAndSearch(
    allPosts,
    filters,
    searchFilters,
    searchResults,
    isSearchActive,
    paginationState,
    fetchMorePosts
  );
}
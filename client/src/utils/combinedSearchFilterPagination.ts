/**
 * Combined Search and Filter Pagination Logic
 * 
 * This module handles the complex logic of combining search results with filter
 * operations while maintaining proper pagination state and Load More functionality.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { Post } from '@/types';
import { 
  PaginationState, 
  FilterOptions, 
  SearchFilters, 
  SearchResults,
  LoadMoreStrategy,
  PaginationMode
} from '@/types/pagination';

/**
 * Combined search and filter operation mode
 */
export type CombinedMode = 'search-only' | 'filter-only' | 'search-and-filter' | 'none';

/**
 * State transition information for combined operations
 */
export interface StateTransition {
  fromMode: CombinedMode;
  toMode: CombinedMode;
  requiresPaginationReset: boolean;
  requiresCacheInvalidation: boolean;
  affectedDataSources: ('search' | 'filter' | 'server')[];
}

/**
 * Combined operation result with metadata
 */
export interface CombinedOperationResult {
  filteredPosts: Post[];
  totalResults: number;
  appliedMode: CombinedMode;
  paginationMode: PaginationMode;
  loadMoreStrategy: LoadMoreStrategy;
  resultCount: {
    searchMatches: number;
    filterMatches: number;
    combinedMatches: number;
  };
  stateTransition: StateTransition;
  performanceMetrics: {
    searchTime: number;
    filterTime: number;
    combinationTime: number;
    totalTime: number;
  };
}

/**
 * Combined Search and Filter Pagination Manager
 */
export class CombinedSearchFilterPagination {
  private currentMode: CombinedMode = 'none';
  private lastSearchFilters: SearchFilters = {};
  private lastDashboardFilters: FilterOptions = { postType: 'all', sortBy: 'newest', timeRange: 'all' };
  private operationHistory: CombinedOperationResult[] = [];

  /**
   * Determines the current combined operation mode
   */
  private determineCombinedMode(
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions,
    isSearchActive: boolean
  ): CombinedMode {
    const hasSearchQuery = isSearchActive && searchFilters.query?.trim();
    const hasSearchFilters = this.hasActiveSearchFilters(searchFilters);
    const hasDashboardFilters = this.hasActiveDashboardFilters(dashboardFilters);

    if (hasSearchQuery && (hasSearchFilters || hasDashboardFilters)) {
      return 'search-and-filter';
    } else if (hasSearchQuery) {
      return 'search-only';
    } else if (hasSearchFilters || hasDashboardFilters) {
      return 'filter-only';
    } else {
      return 'none';
    }
  }

  /**
   * Checks if search filters are active (excluding query)
   */
  private hasActiveSearchFilters(searchFilters: SearchFilters): boolean {
    return !!(
      (searchFilters.postType && searchFilters.postType !== 'all') ||
      (searchFilters.sortBy && searchFilters.sortBy !== 'recent') ||
      (searchFilters.timeRange && searchFilters.timeRange !== 'all')
    );
  }

  /**
   * Checks if dashboard filters are active
   */
  private hasActiveDashboardFilters(dashboardFilters: FilterOptions): boolean {
    return !!(
      dashboardFilters.postType !== 'all' ||
      dashboardFilters.sortBy !== 'newest' ||
      dashboardFilters.timeRange !== 'all'
    );
  }

  /**
   * Detects state transitions and their requirements
   */
  private detectStateTransition(
    newMode: CombinedMode,
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions
  ): StateTransition {
    const fromMode = this.currentMode;
    const toMode = newMode;

    // Check if filters changed significantly
    const searchFiltersChanged = JSON.stringify(searchFilters) !== JSON.stringify(this.lastSearchFilters);
    const dashboardFiltersChanged = JSON.stringify(dashboardFilters) !== JSON.stringify(this.lastDashboardFilters);

    const requiresPaginationReset = 
      fromMode !== toMode || 
      searchFiltersChanged || 
      dashboardFiltersChanged;

    const requiresCacheInvalidation = 
      searchFiltersChanged || 
      (fromMode === 'search-only' && toMode !== 'search-only') ||
      (fromMode !== 'search-only' && toMode === 'search-only');

    const affectedDataSources: ('search' | 'filter' | 'server')[] = [];
    
    if (toMode.includes('search')) {
      affectedDataSources.push('search');
    }
    if (toMode.includes('filter') || toMode === 'filter-only') {
      affectedDataSources.push('filter');
    }
    if (fromMode === 'none' || toMode === 'none') {
      affectedDataSources.push('server');
    }

    return {
      fromMode,
      toMode,
      requiresPaginationReset,
      requiresCacheInvalidation,
      affectedDataSources,
    };
  }

  /**
   * Main method to apply combined search and filter logic
   */
  async applyCombinedSearchAndFilter(
    allPosts: Post[],
    searchResults: SearchResults,
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions,
    isSearchActive: boolean,
    paginationState: PaginationState
  ): Promise<CombinedOperationResult> {
    const startTime = Date.now();
    let searchTime = 0;
    let filterTime = 0;
    let combinationTime = 0;

    // Determine operation mode
    const newMode = this.determineCombinedMode(searchFilters, dashboardFilters, isSearchActive);
    const stateTransition = this.detectStateTransition(newMode, searchFilters, dashboardFilters);

    console.log(`🔄 Combined operation: ${stateTransition.fromMode} → ${stateTransition.toMode}`);

    let filteredPosts: Post[] = [];
    let searchMatches = 0;
    let filterMatches = 0;

    try {
      switch (newMode) {
        case 'search-only':
          const searchOnlyResult = await this.handleSearchOnly(
            allPosts,
            searchResults,
            searchFilters,
            isSearchActive
          );
          filteredPosts = searchOnlyResult.posts;
          searchMatches = searchOnlyResult.count;
          searchTime = searchOnlyResult.time;
          break;

        case 'filter-only':
          const filterOnlyResult = await this.handleFilterOnly(
            allPosts,
            searchFilters,
            dashboardFilters
          );
          filteredPosts = filterOnlyResult.posts;
          filterMatches = filterOnlyResult.count;
          filterTime = filterOnlyResult.time;
          break;

        case 'search-and-filter':
          const combinedResult = await this.handleSearchAndFilter(
            allPosts,
            searchResults,
            searchFilters,
            dashboardFilters,
            isSearchActive
          );
          filteredPosts = combinedResult.posts;
          searchMatches = combinedResult.searchCount;
          filterMatches = combinedResult.filterCount;
          searchTime = combinedResult.searchTime;
          filterTime = combinedResult.filterTime;
          combinationTime = combinedResult.combinationTime;
          break;

        case 'none':
        default:
          filteredPosts = [...allPosts];
          break;
      }

      // Determine pagination mode and strategy
      const { paginationMode, loadMoreStrategy } = this.determinePaginationStrategy(
        newMode,
        filteredPosts.length,
        paginationState
      );

      // Update internal state
      this.currentMode = newMode;
      this.lastSearchFilters = { ...searchFilters };
      this.lastDashboardFilters = { ...dashboardFilters };

      const totalTime = Date.now() - startTime;

      const result: CombinedOperationResult = {
        filteredPosts,
        totalResults: filteredPosts.length,
        appliedMode: newMode,
        paginationMode,
        loadMoreStrategy,
        resultCount: {
          searchMatches,
          filterMatches,
          combinedMatches: filteredPosts.length,
        },
        stateTransition,
        performanceMetrics: {
          searchTime,
          filterTime,
          combinationTime,
          totalTime,
        },
      };

      // Store in history for debugging
      this.operationHistory.push(result);
      if (this.operationHistory.length > 20) {
        this.operationHistory = this.operationHistory.slice(-20);
      }

      return result;
    } catch (error) {
      console.error('Combined search and filter operation failed:', error);
      
      // Return safe fallback
      return {
        filteredPosts: [],
        totalResults: 0,
        appliedMode: 'none',
        paginationMode: 'server',
        loadMoreStrategy: 'server-fetch',
        resultCount: {
          searchMatches: 0,
          filterMatches: 0,
          combinedMatches: 0,
        },
        stateTransition,
        performanceMetrics: {
          searchTime: 0,
          filterTime: 0,
          combinationTime: 0,
          totalTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle search-only mode
   */
  private async handleSearchOnly(
    allPosts: Post[],
    searchResults: SearchResults,
    searchFilters: SearchFilters,
    isSearchActive: boolean
  ): Promise<{ posts: Post[]; count: number; time: number }> {
    const startTime = Date.now();

    if (!isSearchActive || !searchResults.posts.length) {
      return { posts: [], count: 0, time: Date.now() - startTime };
    }

    // Use search results as base
    const searchPostIds = new Set(searchResults.posts.map(p => p.id));
    let filtered = allPosts.filter(post => searchPostIds.has(post.id));

    // Apply search-specific filters (sortBy, timeRange, postType from SearchBar)
    filtered = this.applySearchFilters(filtered, searchFilters);

    return {
      posts: filtered,
      count: filtered.length,
      time: Date.now() - startTime,
    };
  }

  /**
   * Handle filter-only mode
   */
  private async handleFilterOnly(
    allPosts: Post[],
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions
  ): Promise<{ posts: Post[]; count: number; time: number }> {
    const startTime = Date.now();

    // Determine which filters to use (search filters take precedence)
    const hasSearchFilters = this.hasActiveSearchFilters(searchFilters);
    const activeFilters = hasSearchFilters ? {
      postType: searchFilters.postType || 'all',
      sortBy: searchFilters.sortBy || 'recent',
      timeRange: searchFilters.timeRange || 'all'
    } : dashboardFilters;

    const filtered = this.applyFilters(allPosts, activeFilters);

    return {
      posts: filtered,
      count: filtered.length,
      time: Date.now() - startTime,
    };
  }

  /**
   * Handle combined search and filter mode
   */
  private async handleSearchAndFilter(
    allPosts: Post[],
    searchResults: SearchResults,
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isSearchActive: boolean
  ): Promise<{ 
    posts: Post[]; 
    searchCount: number; 
    filterCount: number; 
    searchTime: number; 
    filterTime: number; 
    combinationTime: number; 
  }> {
    const searchStartTime = Date.now();

    // Step 1: Apply search first
    const searchPostIds = new Set(searchResults.posts.map(p => p.id));
    const searchFiltered = allPosts.filter(post => searchPostIds.has(post.id));
    const searchTime = Date.now() - searchStartTime;
    const searchCount = searchFiltered.length;

    // Step 2: Apply filters to search results
    const filterStartTime = Date.now();
    
    // Combine search filters and dashboard filters intelligently
    const combinedFilters = this.combineFilters(searchFilters, dashboardFilters);
    let finalFiltered = this.applyFilters(searchFiltered, combinedFilters);
    
    const filterTime = Date.now() - filterStartTime;
    const filterCount = finalFiltered.length;

    // Step 3: Final combination and sorting
    const combinationStartTime = Date.now();
    finalFiltered = this.applyCombinedSorting(finalFiltered, searchFilters, dashboardFilters);
    const combinationTime = Date.now() - combinationStartTime;

    return {
      posts: finalFiltered,
      searchCount,
      filterCount,
      searchTime,
      filterTime,
      combinationTime,
    };
  }

  /**
   * Apply search-specific filters
   */
  private applySearchFilters(posts: Post[], searchFilters: SearchFilters): Post[] {
    let filtered = [...posts];

    // Apply post type filter
    if (searchFilters.postType && searchFilters.postType !== 'all' && searchFilters.postType !== 'creators') {
      filtered = filtered.filter(post => post.post_type === searchFilters.postType);
    }

    // Apply time range filter
    if (searchFilters.timeRange && searchFilters.timeRange !== 'all') {
      filtered = this.applyTimeRangeFilter(filtered, searchFilters.timeRange);
    }

    // Apply sorting
    if (searchFilters.sortBy) {
      filtered = this.applySorting(filtered, searchFilters.sortBy);
    }

    return filtered;
  }

  /**
   * Apply general filters
   */
  private applyFilters(posts: Post[], filters: FilterOptions | { postType: string; sortBy: string; timeRange: string }): Post[] {
    let filtered = [...posts];

    // Apply post type filter
    if (filters.postType !== 'all') {
      filtered = filtered.filter(post => post.post_type === filters.postType);
    }

    // Apply time range filter
    if (filters.timeRange !== 'all') {
      filtered = this.applyTimeRangeFilter(filtered, filters.timeRange);
    }

    // Apply sorting
    filtered = this.applySorting(filtered, filters.sortBy);

    return filtered;
  }

  /**
   * Apply time range filtering
   */
  private applyTimeRangeFilter(posts: Post[], timeRange: string): Post[] {
    if (timeRange === 'all') return posts;

    const now = new Date();
    const cutoff = new Date();

    switch (timeRange) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      default:
        return posts;
    }

    return posts.filter(post => new Date(post.created_at) >= cutoff);
  }

  /**
   * Apply sorting logic
   */
  private applySorting(posts: Post[], sortBy: string): Post[] {
    const sorted = [...posts];

    sorted.sort((a, b) => {
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

    return sorted;
  }

  /**
   * Combine search filters and dashboard filters intelligently
   */
  private combineFilters(
    searchFilters: SearchFilters, 
    dashboardFilters: FilterOptions
  ): FilterOptions {
    // Search filters take precedence, but fall back to dashboard filters
    return {
      postType: (searchFilters.postType && searchFilters.postType !== 'all') 
        ? searchFilters.postType as 'text' | 'audio'
        : dashboardFilters.postType,
      sortBy: (searchFilters.sortBy && searchFilters.sortBy !== 'recent')
        ? this.mapSearchSortToDashboardSort(searchFilters.sortBy)
        : dashboardFilters.sortBy,
      timeRange: (searchFilters.timeRange && searchFilters.timeRange !== 'all')
        ? searchFilters.timeRange as 'today' | 'week' | 'month'
        : dashboardFilters.timeRange,
    };
  }

  /**
   * Map search sort options to dashboard sort options
   */
  private mapSearchSortToDashboardSort(searchSort: string): 'newest' | 'oldest' | 'popular' {
    switch (searchSort) {
      case 'recent':
        return 'newest';
      case 'oldest':
        return 'oldest';
      case 'popular':
      case 'likes':
        return 'popular';
      case 'relevance':
        return 'newest'; // Default to newest for relevance
      default:
        return 'newest';
    }
  }

  /**
   * Apply combined sorting that considers both search and filter preferences
   */
  private applyCombinedSorting(
    posts: Post[], 
    searchFilters: SearchFilters, 
    dashboardFilters: FilterOptions
  ): Post[] {
    // Use search sorting if specified, otherwise use dashboard sorting
    const sortBy = (searchFilters.sortBy && searchFilters.sortBy !== 'recent') 
      ? searchFilters.sortBy 
      : this.mapDashboardSortToSearchSort(dashboardFilters.sortBy);

    return this.applySorting(posts, sortBy);
  }

  /**
   * Map dashboard sort options to search sort options
   */
  private mapDashboardSortToSearchSort(dashboardSort: string): string {
    switch (dashboardSort) {
      case 'newest':
        return 'recent';
      case 'oldest':
        return 'oldest';
      case 'popular':
        return 'popular';
      default:
        return 'recent';
    }
  }

  /**
   * Determine pagination strategy based on operation mode and result count
   */
  private determinePaginationStrategy(
    mode: CombinedMode,
    resultCount: number,
    paginationState: PaginationState
  ): { paginationMode: PaginationMode; loadMoreStrategy: LoadMoreStrategy } {
    if (mode === 'none') {
      return {
        paginationMode: 'server',
        loadMoreStrategy: 'server-fetch',
      };
    }

    // For search and filter operations, use client-side pagination
    // unless we have very few results and can fetch more
    if (resultCount < 10 && paginationState.hasMorePosts) {
      return {
        paginationMode: 'server',
        loadMoreStrategy: 'server-fetch', // Will trigger auto-fetch
      };
    }

    return {
      paginationMode: 'client',
      loadMoreStrategy: 'client-paginate',
    };
  }

  /**
   * Get operation history for debugging
   */
  getOperationHistory(): CombinedOperationResult[] {
    return [...this.operationHistory];
  }

  /**
   * Get current operation mode
   */
  getCurrentMode(): CombinedMode {
    return this.currentMode;
  }

  /**
   * Reset internal state
   */
  reset(): void {
    this.currentMode = 'none';
    this.lastSearchFilters = {};
    this.lastDashboardFilters = { postType: 'all', sortBy: 'newest', timeRange: 'all' };
    this.operationHistory = [];
  }
}

/**
 * Factory function to create a combined search and filter pagination manager
 */
export function createCombinedSearchFilterPagination(): CombinedSearchFilterPagination {
  return new CombinedSearchFilterPagination();
}

/**
 * Utility function for quick combined operation
 */
export async function applyCombinedSearchAndFilter(
  allPosts: Post[],
  searchResults: SearchResults,
  searchFilters: SearchFilters,
  dashboardFilters: FilterOptions,
  isSearchActive: boolean,
  paginationState: PaginationState
): Promise<CombinedOperationResult> {
  const manager = createCombinedSearchFilterPagination();
  return await manager.applyCombinedSearchAndFilter(
    allPosts,
    searchResults,
    searchFilters,
    dashboardFilters,
    isSearchActive,
    paginationState
  );
}
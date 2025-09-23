/**
 * Unified Pagination State Management System - FIXED VERSION
 * 
 * This module provides the main state management system for unified pagination
 * that seamlessly handles both server-side and client-side pagination modes.
 * 
 * FIXES:
 * - Added debouncing to prevent infinite notification loops
 * - Added recursive update protection
 * - Simplified state management to prevent circular dependencies
 */

import { 
  PaginationState, 
  PaginationStateUpdate,
  LoadMoreConfig,
  DEFAULT_PAGINATION_CONFIG,
  INITIAL_PAGINATION_STATE,
  FilterOptions,
  SearchFilters,
  SearchResults,
  PaginationMode,
  LoadMoreStrategy
} from '../types/pagination';

import { 
  detectPaginationMode,
  determineLoadMoreStrategy,
  createModeDetectionContext,
  hasActiveSearchFilters,
  hasAppliedFilters
} from './paginationModeDetection';

import {
  validateStateConsistency,
  recoverFromInconsistentState,
  validateStateTransition,
  createStateSnapshot
} from './paginationStateValidation';

import { Post } from '../types';
import { 
  optimizeMemoryUsage, 
  optimizeRequest,
  getPerformanceMetrics 
} from './paginationPerformanceOptimizer';

/**
 * Unified Pagination State Manager Class - FIXED VERSION
 * 
 * Manages all pagination state and provides methods for state updates,
 * mode transitions, and validation.
 */
export class UnifiedPaginationStateManager {
  private state: PaginationState;
  private config: LoadMoreConfig;
  private listeners: Array<(state: PaginationState) => void> = [];
  private notificationTimeoutId: NodeJS.Timeout | null = null;
  private isUpdating: boolean = false; // Prevent recursive updates
  private isNotifying: boolean = false; // Prevent recursive notifications

  constructor(config: Partial<LoadMoreConfig> = {}) {
    this.config = { ...DEFAULT_PAGINATION_CONFIG, ...config };
    this.state = {
      ...INITIAL_PAGINATION_STATE,
      postsPerPage: this.config.postsPerPage,
    };
  }

  /**
   * Gets the current pagination state
   */
  getState(): PaginationState {
    return { ...this.state };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): LoadMoreConfig {
    return { ...this.config };
  }

  /**
   * Subscribes to state changes
   */
  subscribe(listener: (state: PaginationState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifies all listeners of state changes with debouncing to prevent infinite loops
   */
  private notifyListeners(): void {
    // Prevent recursive notifications
    if (this.isNotifying) {
      console.warn('⚠️ Recursive notification blocked');
      return;
    }

    // Debounce notifications to prevent infinite loops
    if (this.notificationTimeoutId) {
      clearTimeout(this.notificationTimeoutId);
    }
    
    this.notificationTimeoutId = setTimeout(() => {
      this.isNotifying = true;
      
      try {
        this.listeners.forEach(listener => {
          try {
            listener(this.getState());
          } catch (error) {
            console.error('Error in pagination state listener:', error);
          }
        });
      } finally {
        this.isNotifying = false;
        this.notificationTimeoutId = null;
      }
    }, 0); // Use setTimeout to defer execution
  }

  /**
   * Updates the pagination state with validation and loop prevention
   */
  private updateState(updates: Partial<PaginationState>): void {
    // Prevent recursive state updates
    if (this.isUpdating) {
      console.warn('⚠️ Recursive state update blocked');
      return;
    }
    
    this.isUpdating = true;
    
    try {
      const newState = { ...this.state, ...updates };
      
      // Critical fix: Prevent conflicting loading states
      if (newState.fetchInProgress && newState.isLoadingMore) {
        console.warn('⚠️ Conflicting loading states detected, fixing automatically');
        // Prioritize the more recent loading state based on updates
        if ('isLoadingMore' in updates && updates.isLoadingMore) {
          newState.fetchInProgress = false;
        } else if ('fetchInProgress' in updates && updates.fetchInProgress) {
          newState.isLoadingMore = false;
        } else {
          // If both are being set simultaneously, clear both
          newState.fetchInProgress = false;
          newState.isLoadingMore = false;
        }
      }
      
      // Validate state transition
      if (!validateStateTransition(this.state, newState)) {
        console.error('❌ Invalid state transition blocked');
        return;
      }
      
      this.state = newState;
      this.notifyListeners();
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Updates posts data and recalculates pagination
   */
  updatePosts(update: PaginationStateUpdate): void {
    const { newPosts, resetPagination, updateMetadata, forceMode } = update;
    
    let updatedState = { ...this.state };
    
    // Update posts if provided
    if (newPosts !== undefined) {
      if (resetPagination) {
        updatedState.allPosts = [...newPosts];
        updatedState.currentPage = 1;
      } else {
        // Append new posts (for Load More)
        const combinedPosts = [...updatedState.allPosts, ...newPosts];
        
        // Apply memory optimization to prevent excessive memory usage
        updatedState.allPosts = optimizeMemoryUsage(combinedPosts);
        
        // Log memory optimization if cleanup occurred
        if (updatedState.allPosts.length < combinedPosts.length) {
          console.log(`🧹 Memory optimization: Reduced posts from ${combinedPosts.length} to ${updatedState.allPosts.length}`);
        }
      }
    }
    
    // Update metadata if provided
    if (updateMetadata) {
      updatedState.metadata = { ...updatedState.metadata, ...updateMetadata };
    }
    
    // Detect and update pagination mode
    const context = createModeDetectionContext({
      isSearchActive: updatedState.isSearchActive,
      searchFilters: updatedState.currentSearchFilters,
      filters: updatedState.filters,
      allPosts: updatedState.allPosts,
      displayPosts: updatedState.displayPosts,
      currentPage: updatedState.currentPage,
    });
    
    const newMode = forceMode || detectPaginationMode(context);
    const newStrategy = determineLoadMoreStrategy(newMode, context);
    
    updatedState.paginationMode = newMode;
    updatedState.loadMoreStrategy = newStrategy;
    
    // Update filter application status
    updatedState.hasFiltersApplied = hasAppliedFilters(updatedState.filters);
    
    // Apply filters and search to get display posts
    updatedState = this.applyFiltersAndSearch(updatedState);
    
    // Update pagination based on mode
    updatedState = this.updatePaginationState(updatedState);
    
    this.updateState(updatedState);
  }

  /**
   * Applies filters and search to determine display posts
   */
  private applyFiltersAndSearch(state: PaginationState): PaginationState {
    let filtered = [...state.allPosts];
    
    // Apply search first if active
    if (state.isSearchActive && state.searchResults.posts.length >= 0) {
      const searchPostIds = new Set(state.searchResults.posts.map(p => p.id));
      filtered = state.allPosts.filter(post => searchPostIds.has(post.id));
    }
    
    // Determine active filters (search filters take precedence)
    const hasSearchFilters = hasActiveSearchFilters(state.currentSearchFilters);
    const activeFilters = hasSearchFilters ? {
      postType: state.currentSearchFilters.postType || 'all',
      sortBy: state.currentSearchFilters.sortBy || 'recent',
      timeRange: state.currentSearchFilters.timeRange || 'all'
    } : state.filters;
    
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
    
    return {
      ...state,
      displayPosts: filtered,
    };
  }

  /**
   * Updates pagination state based on current mode
   */
  private updatePaginationState(state: PaginationState): PaginationState {
    const { paginationMode, currentPage, postsPerPage, displayPosts, totalPostsCount, allPosts } = state;
    
    if (paginationMode === 'client') {
      // Client-side pagination: slice displayPosts by currentPage
      const startIndex = 0;
      const endIndex = currentPage * postsPerPage;
      const paginatedResults = displayPosts.slice(startIndex, endIndex);
      
      return {
        ...state,
        paginatedPosts: paginatedResults,
        hasMorePosts: endIndex < displayPosts.length,
        metadata: {
          ...state.metadata,
          totalFilteredPosts: displayPosts.length,
          visibleFilteredPosts: paginatedResults.length,
        },
      };
    } else {
      // Server-side pagination: show all loaded posts
      const totalPages = Math.ceil(totalPostsCount / postsPerPage);
      const currentServerPage = Math.ceil(allPosts.length / postsPerPage);
      
      return {
        ...state,
        paginatedPosts: displayPosts,
        hasMorePosts: currentServerPage < totalPages,
        metadata: {
          ...state.metadata,
          loadedServerPosts: allPosts.length,
          totalFilteredPosts: displayPosts.length,
          visibleFilteredPosts: displayPosts.length,
        },
      };
    }
  }

  /**
   * Updates search state (simplified to prevent recursive calls)
   */
  updateSearch(searchResults: SearchResults, query: string, searchFilters: SearchFilters): void {
    const isActive = query.length > 0;
    
    this.updateState({
      searchResults,
      currentSearchFilters: searchFilters,
      isSearchActive: isActive,
      currentPage: 1, // Reset pagination on search change
    });
    
    // Trigger posts update to recalculate everything (only if not already updating)
    if (!this.isUpdating) {
      setTimeout(() => this.updatePosts({}), 0);
    }
  }

  /**
   * Updates filter state (simplified to prevent recursive calls)
   */
  updateFilters(filters: FilterOptions): void {
    this.updateState({
      filters,
      currentPage: 1, // Reset pagination on filter change
    });
    
    // Trigger posts update to recalculate everything (only if not already updating)
    if (!this.isUpdating) {
      setTimeout(() => this.updatePosts({}), 0);
    }
  }

  /**
   * Clears search and filters (simplified to prevent recursive calls)
   */
  clearSearch(): void {
    this.updateState({
      searchResults: { posts: [], users: [], totalResults: 0 },
      currentSearchFilters: {},
      isSearchActive: false,
      currentPage: 1,
    });
    
    // Trigger posts update to recalculate everything (only if not already updating)
    if (!this.isUpdating) {
      setTimeout(() => this.updatePosts({}), 0);
    }
  }

  /**
   * Handles Load More operation
   */
  loadMore(): { canLoadMore: boolean; strategy: LoadMoreStrategy } {
    const { hasMorePosts, isLoadingMore, paginationMode, loadMoreStrategy } = this.state;
    
    if (!hasMorePosts || isLoadingMore) {
      return { canLoadMore: false, strategy: loadMoreStrategy };
    }
    
    if (paginationMode === 'client') {
      // Client-side: increment page and recalculate pagination
      const newPage = this.state.currentPage + 1;
      
      // Update state with new page and recalculate pagination in one step
      let updatedState = { ...this.state, currentPage: newPage };
      
      // Apply filters and search to get display posts
      updatedState = this.applyFiltersAndSearch(updatedState);
      
      // Update pagination based on mode
      updatedState = this.updatePaginationState(updatedState);
      
      this.updateState(updatedState);
    }
    // For server-side, the caller needs to fetch more posts and call updatePosts
    
    return { canLoadMore: true, strategy: loadMoreStrategy };
  }

  /**
   * Sets loading state with proper discrimination between fetch types
   */
  setLoadingState(isLoading: boolean, isLoadMore: boolean = false): void {
    if (isLoading && isLoadMore) {
      // Load more operation
      this.updateState({
        isLoadingMore: true,
        fetchInProgress: false, // Only one loading state at a time
        lastFetchTime: Date.now(),
      });
    } else if (isLoading && !isLoadMore) {
      // Initial/fresh fetch operation
      this.updateState({
        isLoadingMore: false, // Only one loading state at a time
        fetchInProgress: true,
        lastFetchTime: Date.now(),
      });
    } else {
      // Clear all loading states
      this.updateState({
        isLoadingMore: false,
        fetchInProgress: false,
        lastFetchTime: this.state.lastFetchTime,
      });
    }
  }

  /**
   * Updates total posts count from server (simplified to prevent recursive calls)
   */
  updateTotalPostsCount(count: number): void {
    this.updateState({
      totalPostsCount: count,
      metadata: {
        ...this.state.metadata,
        totalServerPosts: count,
      },
    });
    
    // Trigger posts update to recalculate pagination (only if not already updating)
    if (!this.isUpdating) {
      setTimeout(() => this.updatePosts({}), 0);
    }
  }

  /**
   * Validates current state and attempts recovery if needed
   */
  validateAndRecover(): boolean {
    const validation = validateStateConsistency(this.state);
    
    if (!validation.isValid) {
      console.warn('❌ Pagination state inconsistency detected:', validation.errors);
      
      const recoveredState = recoverFromInconsistentState(this.state);
      if (recoveredState) {
        this.state = recoveredState;
        this.notifyListeners();
        console.log('✅ Pagination state recovered');
        return true;
      } else {
        console.error('❌ Failed to recover pagination state');
        return false;
      }
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Pagination state warnings:', validation.warnings);
    }
    
    return true;
  }

  /**
   * Gets debug information
   */
  getDebugInfo(): Record<string, any> {
    return {
      state: createStateSnapshot(this.state),
      validation: validateStateConsistency(this.state),
      config: this.config,
    };
  }

  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics() {
    return getPerformanceMetrics();
  }

  /**
   * Optimizes a request with caching and deduplication
   */
  async optimizeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return optimizeRequest(key, requestFn);
  }

  /**
   * Resets pagination state to initial values
   */
  reset(): void {
    this.state = {
      ...INITIAL_PAGINATION_STATE,
      postsPerPage: this.config.postsPerPage,
    };
    this.notifyListeners();
  }

  /**
   * Cleanup method to clear timeouts and prevent memory leaks
   */
  cleanup(): void {
    if (this.notificationTimeoutId) {
      clearTimeout(this.notificationTimeoutId);
      this.notificationTimeoutId = null;
    }
    this.listeners = [];
    this.isUpdating = false;
    this.isNotifying = false;
  }
}

/**
 * Creates a new unified pagination state manager instance
 */
export function createUnifiedPaginationState(config?: Partial<LoadMoreConfig>): UnifiedPaginationStateManager {
  return new UnifiedPaginationStateManager(config);
}

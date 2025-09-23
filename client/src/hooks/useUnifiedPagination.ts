/**
 * React Hook for Unified Pagination State Management
 * 
 * This hook provides a React interface to the unified pagination state manager,
 * handling state synchronization and providing convenient methods for components.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  PaginationState, 
  LoadMoreConfig,
  FilterOptions,
  SearchFilters,
  SearchResults,
  LoadMoreStrategy,
  PaginationStateUpdate
} from '../types/pagination';
import { 
  UnifiedPaginationStateManager, 
  createUnifiedPaginationState 
} from '../utils/unifiedPaginationState';
import { Post } from '../types';

/**
 * Hook options interface
 */
export interface UseUnifiedPaginationOptions {
  config?: Partial<LoadMoreConfig>;
  onStateChange?: (state: PaginationState) => void;
  onLoadMore?: (strategy: LoadMoreStrategy) => Promise<Post[]>;
  enableDebugLogging?: boolean;
}

/**
 * Hook return interface
 */
export interface UseUnifiedPaginationReturn {
  // State
  state: PaginationState;
  
  // Data arrays (convenience accessors)
  allPosts: Post[];
  displayPosts: Post[];
  paginatedPosts: Post[];
  
  // Status flags
  isLoadingMore: boolean;
  hasMorePosts: boolean;
  isSearchActive: boolean;
  hasFiltersApplied: boolean;
  
  // Pagination info
  currentPage: number;
  totalPostsCount: number;
  paginationMode: 'server' | 'client';
  loadMoreStrategy: LoadMoreStrategy;
  
  // Actions
  updatePosts: (update: PaginationStateUpdate) => void;
  updateSearch: (results: SearchResults, query: string, filters: SearchFilters) => void;
  updateFilters: (filters: FilterOptions) => void;
  clearSearch: () => void;
  handleLoadMore: () => Promise<void>;
  setLoadingState: (loading: boolean) => void;
  updateTotalPostsCount: (count: number) => void;
  
  // Utilities
  validateAndRecover: () => boolean;
  getDebugInfo: () => Record<string, any>;
  reset: () => void;
}

/**
 * Unified pagination hook
 */
export function useUnifiedPagination(options: UseUnifiedPaginationOptions = {}): UseUnifiedPaginationReturn {
  const { config, onStateChange, onLoadMore, enableDebugLogging = false } = options;
  
  // Create state manager instance (only once)
  const stateManagerRef = useRef<UnifiedPaginationStateManager | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = createUnifiedPaginationState(config);
  }
  
  const stateManager = stateManagerRef.current;
  
  // Local state for React re-renders
  const [state, setState] = useState<PaginationState>(stateManager.getState());
  
  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
      
      if (enableDebugLogging) {
        console.log('📊 Pagination state updated:', {
          mode: newState.paginationMode,
          strategy: newState.loadMoreStrategy,
          currentPage: newState.currentPage,
          hasMore: newState.hasMorePosts,
          counts: {
            all: newState.allPosts.length,
            display: newState.displayPosts.length,
            paginated: newState.paginatedPosts.length,
          },
        });
      }
      
      // Call external state change handler
      onStateChange?.(newState);
    });
    
    return unsubscribe;
  }, [stateManager, onStateChange, enableDebugLogging]);
  
  // Actions
  const updatePosts = useCallback((update: PaginationStateUpdate) => {
    stateManager.updatePosts(update);
  }, [stateManager]);
  
  const updateSearch = useCallback((results: SearchResults, query: string, filters: SearchFilters) => {
    stateManager.updateSearch(results, query, filters);
  }, [stateManager]);
  
  const updateFilters = useCallback((filters: FilterOptions) => {
    stateManager.updateFilters(filters);
  }, [stateManager]);
  
  const clearSearch = useCallback(() => {
    stateManager.clearSearch();
  }, [stateManager]);
  
  const setLoadingState = useCallback((loading: boolean) => {
    stateManager.setLoadingState(loading);
  }, [stateManager]);
  
  const updateTotalPostsCount = useCallback((count: number) => {
    stateManager.updateTotalPostsCount(count);
  }, [stateManager]);
  
  const validateAndRecover = useCallback(() => {
    return stateManager.validateAndRecover();
  }, [stateManager]);
  
  const getDebugInfo = useCallback(() => {
    return stateManager.getDebugInfo();
  }, [stateManager]);
  
  const reset = useCallback(() => {
    stateManager.reset();
  }, [stateManager]);
  
  // Handle Load More with external data fetching
  const handleLoadMore = useCallback(async () => {
    const { canLoadMore, strategy } = stateManager.loadMore();
    
    if (!canLoadMore) {
      if (enableDebugLogging) {
        console.log('🚫 Load more blocked:', { 
          hasMore: state.hasMorePosts, 
          isLoading: state.isLoadingMore 
        });
      }
      return;
    }
    
    if (enableDebugLogging) {
      console.log('🚀 Load more triggered with strategy:', strategy);
    }
    
    // For client-side pagination, the state manager handles everything
    if (strategy === 'client-paginate') {
      return;
    }
    
    // For server-side pagination, we need to fetch more data
    if (strategy === 'server-fetch' && onLoadMore) {
      try {
        stateManager.setLoadingState(true);
        
        const newPosts = await onLoadMore(strategy);
        
        if (newPosts && newPosts.length > 0) {
          stateManager.updatePosts({
            newPosts,
            resetPagination: false,
          });
        }
        
      } catch (error) {
        console.error('❌ Load more failed:', error);
      } finally {
        stateManager.setLoadingState(false);
      }
    }
  }, [stateManager, onLoadMore, enableDebugLogging, state.hasMorePosts, state.isLoadingMore]);
  
  // Validate state periodically in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const isValid = stateManager.validateAndRecover();
        if (!isValid && enableDebugLogging) {
          console.warn('⚠️ Pagination state validation failed');
        }
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [stateManager, enableDebugLogging]);
  
  return {
    // State
    state,
    
    // Data arrays (convenience accessors)
    allPosts: state.allPosts,
    displayPosts: state.displayPosts,
    paginatedPosts: state.paginatedPosts,
    
    // Status flags
    isLoadingMore: state.isLoadingMore,
    hasMorePosts: state.hasMorePosts,
    isSearchActive: state.isSearchActive,
    hasFiltersApplied: state.hasFiltersApplied,
    
    // Pagination info
    currentPage: state.currentPage,
    totalPostsCount: state.totalPostsCount,
    paginationMode: state.paginationMode,
    loadMoreStrategy: state.loadMoreStrategy,
    
    // Actions
    updatePosts,
    updateSearch,
    updateFilters,
    clearSearch,
    handleLoadMore,
    setLoadingState,
    updateTotalPostsCount,
    
    // Utilities
    validateAndRecover,
    getDebugInfo,
    reset,
  };
}

/**
 * Hook for debugging pagination state
 */
export function usePaginationDebug(paginationHook: UseUnifiedPaginationReturn): void {
  useEffect(() => {
    // Add global debug functions in development
    if (process.env.NODE_ENV === 'development') {
      (window as any).paginationDebug = {
        getState: () => paginationHook.state,
        getDebugInfo: paginationHook.getDebugInfo,
        validateAndRecover: paginationHook.validateAndRecover,
        reset: paginationHook.reset,
      };
      
      console.log('🔧 Pagination debug functions available on window.paginationDebug');
    }
  }, [paginationHook]);
}
/**
 * Pagination State Validation Functions
 * 
 * This module provides functions to validate pagination state consistency
 * and ensure smooth transitions between different pagination modes.
 */

import { 
  PaginationState, 
  StateValidationResult,
  PaginationMode,
  LoadMoreStrategy 
} from '../types/pagination';

/**
 * Validates the consistency of the current pagination state
 * 
 * @param state - Current pagination state
 * @returns Validation result with errors and warnings
 */
export function validateStateConsistency(state: PaginationState): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate basic state consistency
  validateBasicState(state, errors, warnings);
  
  // Validate data consistency
  validateDataConsistency(state, errors, warnings);
  
  // Validate pagination logic consistency
  validatePaginationLogic(state, errors, warnings);
  
  // Validate mode and strategy alignment
  validateModeStrategyAlignment(state, errors, warnings);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates basic state properties
 */
function validateBasicState(
  state: PaginationState, 
  errors: string[], 
  warnings: string[]
): void {
  // Validate currentPage
  if (state.currentPage < 1) {
    errors.push('currentPage must be >= 1');
  }
  
  // Validate postsPerPage
  if (state.postsPerPage < 1) {
    errors.push('postsPerPage must be >= 1');
  }
  
  if (state.postsPerPage > 100) {
    warnings.push('postsPerPage is very high (>100), may impact performance');
  }
  
  // Validate totalPostsCount
  if (state.totalPostsCount < 0) {
    errors.push('totalPostsCount cannot be negative');
  }
  
  // Validate timestamps
  if (state.lastFetchTime < 0) {
    errors.push('lastFetchTime cannot be negative');
  }
  
  if (state.metadata.lastFetchTimestamp < 0) {
    errors.push('metadata.lastFetchTimestamp cannot be negative');
  }
}

/**
 * Validates data array consistency
 */
function validateDataConsistency(
  state: PaginationState, 
  errors: string[], 
  warnings: string[]
): void {
  // Validate array relationships
  if (state.displayPosts.length > state.allPosts.length) {
    errors.push('displayPosts cannot have more items than allPosts');
  }
  
  if (state.paginatedPosts.length > state.displayPosts.length) {
    errors.push('paginatedPosts cannot have more items than displayPosts');
  }
  
  // Validate metadata consistency
  if (state.metadata.loadedServerPosts !== state.allPosts.length) {
    warnings.push('metadata.loadedServerPosts does not match allPosts.length');
  }
  
  if (state.metadata.totalFilteredPosts !== state.displayPosts.length) {
    warnings.push('metadata.totalFilteredPosts does not match displayPosts.length');
  }
  
  if (state.metadata.visibleFilteredPosts !== state.paginatedPosts.length) {
    warnings.push('metadata.visibleFilteredPosts does not match paginatedPosts.length');
  }
  
  // Validate search results consistency
  if (state.isSearchActive && state.searchResults.posts.length === 0) {
    warnings.push('Search is active but no search results found');
  }
  
  if (!state.isSearchActive && state.searchResults.posts.length > 0) {
    warnings.push('Search results exist but search is not active');
  }
}

/**
 * Validates pagination logic consistency
 */
function validatePaginationLogic(
  state: PaginationState, 
  errors: string[], 
  warnings: string[]
): void {
  const { currentPage, postsPerPage, displayPosts, paginatedPosts, hasMorePosts } = state;
  
  // Calculate expected paginated posts count
  const expectedPaginatedCount = Math.min(
    currentPage * postsPerPage,
    displayPosts.length
  );
  
  // For client-side pagination, validate paginated posts count
  if (state.paginationMode === 'client') {
    if (paginatedPosts.length !== expectedPaginatedCount) {
      errors.push(
        `Client pagination: expected ${expectedPaginatedCount} paginated posts, got ${paginatedPosts.length}`
      );
    }
    
    // Validate hasMorePosts for client-side pagination
    const shouldHaveMore = expectedPaginatedCount < displayPosts.length;
    if (hasMorePosts !== shouldHaveMore) {
      errors.push(
        `Client pagination: hasMorePosts should be ${shouldHaveMore} but is ${hasMorePosts}`
      );
    }
  }
  
  // For server-side pagination, validate different logic
  if (state.paginationMode === 'server') {
    // In server mode, paginatedPosts should equal displayPosts (all loaded posts are shown)
    if (paginatedPosts.length !== displayPosts.length) {
      warnings.push(
        `Server pagination: paginatedPosts (${paginatedPosts.length}) should equal displayPosts (${displayPosts.length})`
      );
    }
  }
  
  // Validate loading state consistency - treat conflicting states as errors
  if (state.isLoadingMore && state.fetchInProgress) {
    errors.push('Both isLoadingMore and fetchInProgress are true - conflicting loading states');
  } else if (state.isLoadingMore && !state.fetchInProgress) {
    warnings.push('isLoadingMore is true but fetchInProgress is false');
  } else if (!state.isLoadingMore && state.fetchInProgress) {
    warnings.push('fetchInProgress is true but isLoadingMore is false');
  }
}

/**
 * Validates mode and strategy alignment
 */
function validateModeStrategyAlignment(
  state: PaginationState, 
  errors: string[], 
  warnings: string[]
): void {
  const { paginationMode, loadMoreStrategy, isSearchActive, hasFiltersApplied } = state;
  
  // Validate mode-strategy combinations
  if (paginationMode === 'server' && loadMoreStrategy !== 'server-fetch') {
    errors.push('Server pagination mode must use server-fetch strategy');
  }
  
  if (paginationMode === 'client' && loadMoreStrategy !== 'client-paginate') {
    errors.push('Client pagination mode must use client-paginate strategy');
  }
  
  // Validate mode selection logic
  const shouldUseClientMode = isSearchActive || hasFiltersApplied || 
    Object.keys(state.currentSearchFilters).some(key => {
      const filterKey = key as keyof typeof state.currentSearchFilters;
      const value = state.currentSearchFilters[filterKey];
      return value && value !== 'all' && value !== 'recent' && value !== 'relevance';
    });
  
  if (shouldUseClientMode && paginationMode === 'server') {
    warnings.push('Should use client mode when search/filters are active');
  }
  
  if (!shouldUseClientMode && paginationMode === 'client') {
    warnings.push('Should use server mode when no search/filters are active');
  }
}

/**
 * Attempts to recover from an inconsistent state
 * 
 * @param state - Current inconsistent state
 * @returns Recovered state or null if recovery is not possible
 */
export function recoverFromInconsistentState(state: PaginationState): PaginationState | null {
  try {
    const recoveredState = { ...state };
    
    // Fix basic state issues
    if (recoveredState.currentPage < 1) {
      recoveredState.currentPage = 1;
    }
    
    if (recoveredState.postsPerPage < 1) {
      recoveredState.postsPerPage = 15;
    }
    
    if (recoveredState.totalPostsCount < 0) {
      recoveredState.totalPostsCount = 0;
    }
    
    // Fix data consistency issues
    if (recoveredState.displayPosts.length > recoveredState.allPosts.length) {
      recoveredState.displayPosts = recoveredState.allPosts.slice();
    }
    
    if (recoveredState.paginatedPosts.length > recoveredState.displayPosts.length) {
      recoveredState.paginatedPosts = recoveredState.displayPosts.slice();
    }
    
    // Fix conflicting loading states
    if (recoveredState.isLoadingMore && recoveredState.fetchInProgress) {
      console.warn('⚠️ Recovery: Fixing conflicting loading states');
      // Clear both loading states to prevent conflicts
      recoveredState.isLoadingMore = false;
      recoveredState.fetchInProgress = false;
    }
    
    // Fix metadata consistency
    recoveredState.metadata.loadedServerPosts = recoveredState.allPosts.length;
    recoveredState.metadata.totalFilteredPosts = recoveredState.displayPosts.length;
    recoveredState.metadata.visibleFilteredPosts = recoveredState.paginatedPosts.length;
    
    // Fix mode-strategy alignment
    if (recoveredState.paginationMode === 'server' && recoveredState.loadMoreStrategy !== 'server-fetch') {
      recoveredState.loadMoreStrategy = 'server-fetch';
    }
    
    if (recoveredState.paginationMode === 'client' && recoveredState.loadMoreStrategy !== 'client-paginate') {
      recoveredState.loadMoreStrategy = 'client-paginate';
    }
    
    // Recalculate pagination for client mode
    if (recoveredState.paginationMode === 'client') {
      const expectedCount = Math.min(
        recoveredState.currentPage * recoveredState.postsPerPage,
        recoveredState.displayPosts.length
      );
      
      recoveredState.paginatedPosts = recoveredState.displayPosts.slice(0, expectedCount);
      recoveredState.hasMorePosts = expectedCount < recoveredState.displayPosts.length;
    }
    
    console.log('🔧 Pagination state recovered from inconsistency');
    return recoveredState;
    
  } catch (error) {
    console.error('❌ Failed to recover from inconsistent pagination state:', error);
    return null;
  }
}

/**
 * Creates a state snapshot for debugging purposes
 * 
 * @param state - Current pagination state
 * @returns Serializable state snapshot
 */
export function createStateSnapshot(state: PaginationState): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    currentPage: state.currentPage,
    hasMorePosts: state.hasMorePosts,
    isLoadingMore: state.isLoadingMore,
    
    dataLengths: {
      allPosts: state.allPosts.length,
      displayPosts: state.displayPosts.length,
      paginatedPosts: state.paginatedPosts.length,
    },
    
    context: {
      isSearchActive: state.isSearchActive,
      hasFiltersApplied: state.hasFiltersApplied,
      totalPostsCount: state.totalPostsCount,
    },
    
    mode: {
      paginationMode: state.paginationMode,
      loadMoreStrategy: state.loadMoreStrategy,
    },
    
    metadata: state.metadata,
    
    filters: state.filters,
    searchFilters: state.currentSearchFilters,
  };
}

/**
 * Validates a state transition before applying it
 * 
 * @param currentState - Current state
 * @param newState - Proposed new state
 * @returns True if transition is valid
 */
export function validateStateTransition(
  currentState: PaginationState,
  newState: PaginationState
): boolean {
  // Allow transitions when applying filters after Load More
  const isFilterTransition = (
    currentState.paginationMode === 'server' && 
    newState.paginationMode === 'client'
  ) || (
    !currentState.isSearchActive && newState.isSearchActive
  ) || (
    !currentState.hasFiltersApplied && newState.hasFiltersApplied
  );
  
  if (isFilterTransition) {
    console.log('✅ Allowing filter transition from server to client mode');
    return true;
  }
  
  // Validate that the new state is internally consistent
  const validation = validateStateConsistency(newState);
  
  // Only block transitions for critical errors, not warnings
  const criticalErrors = validation.errors.filter(error => 
    !error.includes('conflicting loading states') && // Allow loading state fixes
    !error.includes('should equal displayPosts') && // Allow display post mismatches during transitions
    !error.includes('expected') && error.includes('paginated posts') // Allow pagination count mismatches during transitions
  );
  
  if (criticalErrors.length > 0) {
    console.warn('❌ Invalid state transition - critical errors:', criticalErrors);
    return false;
  }
  
  // Log warnings but allow transition
  if (validation.warnings.length > 0) {
    console.warn('⚠️ State transition warnings (allowed):', validation.warnings);
  }
  
  // Log non-critical errors but allow transition
  if (validation.errors.length > 0) {
    console.warn('⚠️ State transition non-critical errors (allowed):', validation.errors);
  }
  
  return true;
}
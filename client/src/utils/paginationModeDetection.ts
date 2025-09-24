/**
 * Pagination Mode Detection Logic
 * 
 * This module contains the logic for determining whether to use server-side
 * or client-side pagination based on the current application state.
 */

import { 
  PaginationMode, 
  LoadMoreStrategy, 
  ModeDetectionContext,
  SearchFilters,
  FilterOptions,
  DEFAULT_FILTER_OPTIONS 
} from '../types/pagination';

/**
 * Determines the appropriate pagination mode based on current context
 * 
 * @param context - Current application state context
 * @returns The appropriate pagination mode
 */
export function detectPaginationMode(context: ModeDetectionContext): PaginationMode {
  const { isSearchActive, hasFiltersApplied, searchFiltersActive } = context;
  
  console.log(`🔍 detectPaginationMode:`, {
    isSearchActive,
    hasFiltersApplied,
    searchFiltersActive,
    shouldUseClient: isSearchActive || hasFiltersApplied || searchFiltersActive
  });
  
  // If search is active or filters are applied, use client-side pagination
  // This allows filtering through all loaded posts without additional server requests
  if (isSearchActive || hasFiltersApplied || searchFiltersActive) {
    console.log(`🔍 Using CLIENT mode due to active search/filters`);
    return 'client';
  }
  
  // For unfiltered browsing, use server-side pagination for optimal bandwidth usage
  console.log(`🔍 Using SERVER mode - no active search/filters`);
  return 'server';
}

/**
 * Determines the appropriate Load More strategy based on pagination mode and context
 * 
 * @param mode - Current pagination mode
 * @param context - Current application state context
 * @returns The appropriate Load More strategy
 */
export function determineLoadMoreStrategy(
  mode: PaginationMode, 
  context: ModeDetectionContext
): LoadMoreStrategy {
  if (mode === 'server') {
    return 'server-fetch';
  }
  
  // For client mode, always use client-side pagination
  return 'client-paginate';
}

/**
 * Checks if search filters are currently active (non-default values)
 * 
 * @param searchFilters - Current search filters
 * @returns True if any search filters are active
 */
export function hasActiveSearchFilters(searchFilters: SearchFilters): boolean {
  const result = Object.keys(searchFilters).some(key => {
    const filterKey = key as keyof SearchFilters;
    const value = searchFilters[filterKey];
    
    // Check for non-default values
    switch (filterKey) {
      case 'query':
        return value && value.trim().length > 0;
      case 'postType':
        return value && value !== 'all';
      case 'sortBy':
        return value && value !== 'relevance' && value !== 'recent';
      case 'timeRange':
        return value && value !== 'all';
      default:
        return false;
    }
  });
  
  console.log(`🔍 hasActiveSearchFilters:`, { searchFilters, result });
  return result;
}

/**
 * Checks if dashboard filters are currently applied (non-default values)
 * 
 * @param filters - Current dashboard filters
 * @returns True if any filters are applied
 */
export function hasAppliedFilters(filters: FilterOptions): boolean {
  return JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTER_OPTIONS);
}

/**
 * Creates a mode detection context from current application state
 * 
 * @param params - Current state parameters
 * @returns Mode detection context
 */
export function createModeDetectionContext({
  isSearchActive,
  searchFilters,
  filters,
  allPosts,
  displayPosts,
  currentPage
}: {
  isSearchActive: boolean;
  searchFilters: SearchFilters;
  filters: FilterOptions;
  allPosts: any[];
  displayPosts: unknown[];
  currentPage: number;
}): ModeDetectionContext {
  return {
    isSearchActive,
    hasFiltersApplied: hasAppliedFilters(filters),
    searchFiltersActive: hasActiveSearchFilters(searchFilters),
    totalLoadedPosts: allPosts.length,
    totalFilteredPosts: displayPosts.length,
    currentPage,
  };
}

/**
 * Determines if auto-fetch should be triggered for comprehensive filtering
 * 
 * @param context - Current mode detection context
 * @param minResultsThreshold - Minimum results needed before auto-fetch
 * @returns True if auto-fetch should be triggered
 */
export function shouldAutoFetch(
  context: ModeDetectionContext,
  minResultsThreshold: number = 10
): boolean {
  const { hasFiltersApplied, searchFiltersActive, totalFilteredPosts, totalLoadedPosts } = context;
  
  // Only auto-fetch when filters are applied
  if (!hasFiltersApplied && !searchFiltersActive) {
    return false;
  }
  
  // Auto-fetch if filtered results are below threshold and we have more posts to load
  return totalFilteredPosts < minResultsThreshold && totalLoadedPosts > 0;
}

/**
 * Calculates the optimal number of posts to fetch for auto-fetch operation
 * 
 * @param currentLoaded - Currently loaded posts count
 * @param targetResults - Target number of filtered results
 * @param maxFetch - Maximum posts to fetch in one operation
 * @returns Number of posts to fetch
 */
export function calculateAutoFetchAmount(
  currentLoaded: number,
  targetResults: number = 15,
  maxFetch: number = 50
): number {
  // Estimate we need 2-3x more posts to get enough filtered results
  const estimatedNeeded = Math.max(targetResults * 2, 30);
  const toFetch = Math.min(estimatedNeeded, maxFetch);
  
  return Math.max(toFetch, 15); // Always fetch at least 15 posts
}

/**
 * Validates that a mode transition is allowed
 * 
 * @param currentMode - Current pagination mode
 * @param newMode - Proposed new pagination mode
 * @param context - Current application context
 * @returns True if transition is valid
 */
export function validateModeTransition(
  currentMode: PaginationMode,
  newMode: PaginationMode,
  context: ModeDetectionContext
): boolean {
  // All mode transitions are valid, but log for debugging
  if (currentMode !== newMode) {
    console.log(`🔄 Pagination mode transition: ${currentMode} → ${newMode}`, context);
  }
  
  return true;
}

/**
 * Gets a human-readable description of the current pagination strategy
 * 
 * @param mode - Current pagination mode
 * @param strategy - Current Load More strategy
 * @param context - Current application context
 * @returns Description string
 */
export function getPaginationDescription(
  mode: PaginationMode,
  strategy: LoadMoreStrategy,
  context: ModeDetectionContext
): string {
  const { isSearchActive, hasFiltersApplied, searchFiltersActive } = context;
  
  if (mode === 'server') {
    return 'Server-side pagination: Loading posts from database as needed';
  }
  
  if (isSearchActive) {
    return 'Client-side pagination: Browsing through search results';
  }
  
  if (hasFiltersApplied || searchFiltersActive) {
    return 'Client-side pagination: Browsing through filtered posts';
  }
  
  return 'Client-side pagination: Browsing through loaded posts';
}
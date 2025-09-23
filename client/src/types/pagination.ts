/**
 * Unified Pagination State Management Types
 * 
 * This module defines the TypeScript interfaces and types for the unified
 * pagination system that handles both server-side and client-side pagination
 * modes seamlessly.
 */

import { Post } from './index';

/**
 * Pagination mode determines how posts are loaded and paginated
 */
export type PaginationMode = 'server' | 'client';

/**
 * Load More strategy determines the specific approach for loading more content
 */
export type LoadMoreStrategy = 'server-fetch' | 'client-paginate';

/**
 * Load More state machine states
 */
export type LoadMoreState = 
  | 'idle'
  | 'loading-server'
  | 'loading-client'
  | 'auto-fetching'
  | 'complete'
  | 'error';

/**
 * Filter options interface for dashboard filtering
 */
export interface FilterOptions {
  postType: 'all' | 'text' | 'audio';
  sortBy: 'newest' | 'oldest' | 'popular';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

/**
 * Search filters interface from SearchBar component
 */
export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio' | 'creators';
  sortBy?: 'relevance' | 'recent' | 'oldest' | 'popular' | 'likes';
  timeRange?: 'all' | 'today' | 'week' | 'month';
  type?: string;
  tag?: string;
}

/**
 * Search results interface
 */
export interface SearchResults {
  posts: Post[];
  users: unknown[]; // UserProfile with additional search metadata
  totalResults: number;
}

/**
 * Pagination metadata for tracking fetch batches and performance
 */
export interface PaginationMetadata {
  totalServerPosts: number;
  loadedServerPosts: number;
  currentBatch: number;
  lastFetchTimestamp: number;
  
  // Filter-specific metadata
  totalFilteredPosts: number;
  visibleFilteredPosts: number;
  filterAppliedAt: number;
}

/**
 * Core pagination state interface
 * This is the central state that manages all pagination-related data
 */
export interface PaginationState {
  // Core pagination state
  currentPage: number;
  hasMorePosts: boolean;
  isLoadingMore: boolean;
  
  // Data management
  allPosts: Post[];           // All loaded posts from server
  displayPosts: Post[];       // Filtered/searched posts
  paginatedPosts: Post[];     // Currently visible posts
  
  // Context tracking
  isSearchActive: boolean;
  hasFiltersApplied: boolean;
  totalPostsCount: number;    // Total available on server
  
  // Filter state
  filters: FilterOptions;
  searchResults: SearchResults;
  currentSearchFilters: SearchFilters;
  
  // Pagination configuration
  postsPerPage: number;
  
  // Mode and strategy
  paginationMode: PaginationMode;
  loadMoreStrategy: LoadMoreStrategy;
  
  // Performance tracking
  lastFetchTime: number;
  fetchInProgress: boolean;
  autoFetchTriggered: boolean;
  
  // Metadata
  metadata: PaginationMetadata;
}

/**
 * Load More configuration options
 */
export interface LoadMoreConfig {
  postsPerPage: number;
  minResultsForFilter: number;
  maxAutoFetchPosts: number;
  fetchTimeout: number;
}

/**
 * State transition validation result
 */
export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Pagination state update options
 */
export interface PaginationStateUpdate {
  newPosts?: Post[];
  resetPagination?: boolean;
  updateMetadata?: Partial<PaginationMetadata>;
  forceMode?: PaginationMode;
}

/**
 * Load More operation result
 */
export interface LoadMoreResult {
  success: boolean;
  newPosts: Post[];
  hasMore: boolean;
  error?: string;
  strategy: LoadMoreStrategy;
}

/**
 * Pagination mode detection context
 */
export interface ModeDetectionContext {
  isSearchActive: boolean;
  hasFiltersApplied: boolean;
  searchFiltersActive: boolean;
  totalLoadedPosts: number;
  totalFilteredPosts: number;
  currentPage: number;
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION_CONFIG: LoadMoreConfig = {
  postsPerPage: 15,
  minResultsForFilter: 10,
  maxAutoFetchPosts: 100,
  fetchTimeout: 10000,
};

/**
 * Default filter options
 */
export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  postType: 'all',
  sortBy: 'newest',
  timeRange: 'all',
};

/**
 * Default search filters
 */
export const DEFAULT_SEARCH_FILTERS: SearchFilters = {};

/**
 * Performance metrics for monitoring auto-fetch operations
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkLatency: number;
}

/**
 * Auto-fetch configuration interface
 */
export interface AutoFetchConfig {
  minResultsThreshold: number;
  targetResultsCount: number;
  maxAutoFetchPosts: number;
  maxTotalAutoFetched: number;
  performanceThreshold: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * Auto-fetch operation result
 */
export interface AutoFetchResult {
  success: boolean;
  newPosts: Post[];
  hasMore: boolean;
  error?: string;
  requestId: string;
  performanceMetrics: PerformanceMetrics;
}

/**
 * Initial pagination state
 */
export const INITIAL_PAGINATION_STATE: PaginationState = {
  currentPage: 1,
  hasMorePosts: true,
  isLoadingMore: false,
  
  allPosts: [],
  displayPosts: [],
  paginatedPosts: [],
  
  isSearchActive: false,
  hasFiltersApplied: false,
  totalPostsCount: 0,
  
  filters: DEFAULT_FILTER_OPTIONS,
  searchResults: { posts: [], users: [], totalResults: 0 },
  currentSearchFilters: DEFAULT_SEARCH_FILTERS,
  
  postsPerPage: DEFAULT_PAGINATION_CONFIG.postsPerPage,
  
  paginationMode: 'server',
  loadMoreStrategy: 'server-fetch',
  
  lastFetchTime: 0,
  fetchInProgress: false,
  autoFetchTriggered: false,
  
  metadata: {
    totalServerPosts: 0,
    loadedServerPosts: 0,
    currentBatch: 0,
    lastFetchTimestamp: 0,
    totalFilteredPosts: 0,
    visibleFilteredPosts: 0,
    filterAppliedAt: 0,
  },
};
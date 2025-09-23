/**
 * Unit Tests for Pagination Mode Detection Logic
 * 
 * Tests the core logic for determining pagination modes and Load More strategies
 * based on application state and user interactions.
 */

import {
  detectPaginationMode,
  determineLoadMoreStrategy,
  hasActiveSearchFilters,
  hasAppliedFilters,
  createModeDetectionContext,
  shouldAutoFetch,
  calculateAutoFetchAmount,
  validateModeTransition,
  getPaginationDescription
} from '../paginationModeDetection';

import {
  PaginationMode,
  LoadMoreStrategy,
  ModeDetectionContext,
  SearchFilters,
  FilterOptions,
  DEFAULT_FILTER_OPTIONS
} from '../../types/pagination';

describe('Pagination Mode Detection', () => {
  describe('detectPaginationMode', () => {
    it('should return server mode for unfiltered browsing', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 15,
        totalFilteredPosts: 15,
        currentPage: 1,
      };

      const mode = detectPaginationMode(context);
      expect(mode).toBe('server');
    });

    it('should return client mode when search is active', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 10,
        currentPage: 1,
      };

      const mode = detectPaginationMode(context);
      expect(mode).toBe('client');
    });

    it('should return client mode when filters are applied', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 8,
        currentPage: 1,
      };

      const mode = detectPaginationMode(context);
      expect(mode).toBe('client');
    });

    it('should return client mode when search filters are active', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: true,
        totalLoadedPosts: 30,
        totalFilteredPosts: 12,
        currentPage: 1,
      };

      const mode = detectPaginationMode(context);
      expect(mode).toBe('client');
    });

    it('should return client mode when multiple conditions are active', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: true,
        searchFiltersActive: true,
        totalLoadedPosts: 45,
        totalFilteredPosts: 5,
        currentPage: 2,
      };

      const mode = detectPaginationMode(context);
      expect(mode).toBe('client');
    });
  });

  describe('determineLoadMoreStrategy', () => {
    it('should return server-fetch for server mode', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 15,
        totalFilteredPosts: 15,
        currentPage: 1,
      };

      const strategy = determineLoadMoreStrategy('server', context);
      expect(strategy).toBe('server-fetch');
    });

    it('should return client-paginate for client mode', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 10,
        currentPage: 1,
      };

      const strategy = determineLoadMoreStrategy('client', context);
      expect(strategy).toBe('client-paginate');
    });
  });

  describe('hasActiveSearchFilters', () => {
    it('should return false for empty search filters', () => {
      const searchFilters: SearchFilters = {};
      expect(hasActiveSearchFilters(searchFilters)).toBe(false);
    });

    it('should return false for default search filter values', () => {
      const searchFilters: SearchFilters = {
        postType: 'all',
        sortBy: 'relevance',
        timeRange: 'all',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(false);
    });

    it('should return true when query is present', () => {
      const searchFilters: SearchFilters = {
        query: 'test search',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(true);
    });

    it('should return false for empty query string', () => {
      const searchFilters: SearchFilters = {
        query: '   ',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(false);
    });

    it('should return true when postType is not all', () => {
      const searchFilters: SearchFilters = {
        postType: 'audio',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(true);
    });

    it('should return true when sortBy is not default', () => {
      const searchFilters: SearchFilters = {
        sortBy: 'popular',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(true);
    });

    it('should return true when timeRange is not all', () => {
      const searchFilters: SearchFilters = {
        timeRange: 'week',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(true);
    });

    it('should return true when multiple filters are active', () => {
      const searchFilters: SearchFilters = {
        query: 'music',
        postType: 'audio',
        sortBy: 'popular',
        timeRange: 'month',
      };
      expect(hasActiveSearchFilters(searchFilters)).toBe(true);
    });
  });

  describe('hasAppliedFilters', () => {
    it('should return false for default filter options', () => {
      const filters = DEFAULT_FILTER_OPTIONS;
      expect(hasAppliedFilters(filters)).toBe(false);
    });

    it('should return true when postType is changed', () => {
      const filters: FilterOptions = {
        ...DEFAULT_FILTER_OPTIONS,
        postType: 'audio',
      };
      expect(hasAppliedFilters(filters)).toBe(true);
    });

    it('should return true when sortBy is changed', () => {
      const filters: FilterOptions = {
        ...DEFAULT_FILTER_OPTIONS,
        sortBy: 'popular',
      };
      expect(hasAppliedFilters(filters)).toBe(true);
    });

    it('should return true when timeRange is changed', () => {
      const filters: FilterOptions = {
        ...DEFAULT_FILTER_OPTIONS,
        timeRange: 'week',
      };
      expect(hasAppliedFilters(filters)).toBe(true);
    });

    it('should return true when multiple filters are changed', () => {
      const filters: FilterOptions = {
        postType: 'text',
        sortBy: 'oldest',
        timeRange: 'month',
      };
      expect(hasAppliedFilters(filters)).toBe(true);
    });
  });

  describe('createModeDetectionContext', () => {
    it('should create correct context for unfiltered state', () => {
      const allPosts = Array(30).fill(null).map((_, i) => ({ id: i }));
      const displayPosts = allPosts;
      
      const context = createModeDetectionContext({
        isSearchActive: false,
        searchFilters: {},
        filters: DEFAULT_FILTER_OPTIONS,
        allPosts,
        displayPosts,
        currentPage: 2,
      });

      expect(context).toEqual({
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 30,
        currentPage: 2,
      });
    });

    it('should create correct context for filtered state', () => {
      const allPosts = Array(30).fill(null).map((_, i) => ({ id: i }));
      const displayPosts = allPosts.slice(0, 10); // Filtered results
      
      const context = createModeDetectionContext({
        isSearchActive: true,
        searchFilters: { query: 'test' },
        filters: { ...DEFAULT_FILTER_OPTIONS, postType: 'audio' },
        allPosts,
        displayPosts,
        currentPage: 1,
      });

      expect(context).toEqual({
        isSearchActive: true,
        hasFiltersApplied: true,
        searchFiltersActive: true,
        totalLoadedPosts: 30,
        totalFilteredPosts: 10,
        currentPage: 1,
      });
    });
  });

  describe('shouldAutoFetch', () => {
    it('should return false when no filters are applied', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 30,
        currentPage: 1,
      };

      expect(shouldAutoFetch(context)).toBe(false);
    });

    it('should return true when filtered results are below threshold', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 5, // Below default threshold of 10
        currentPage: 1,
      };

      expect(shouldAutoFetch(context)).toBe(true);
    });

    it('should return false when filtered results meet threshold', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 15, // Above threshold
        currentPage: 1,
      };

      expect(shouldAutoFetch(context)).toBe(false);
    });

    it('should return false when no posts are loaded', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 0,
        totalFilteredPosts: 0,
        currentPage: 1,
      };

      expect(shouldAutoFetch(context)).toBe(false);
    });

    it('should respect custom threshold', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: false,
        searchFiltersActive: true,
        totalLoadedPosts: 30,
        totalFilteredPosts: 8,
        currentPage: 1,
      };

      expect(shouldAutoFetch(context, 5)).toBe(false); // Above custom threshold
      expect(shouldAutoFetch(context, 10)).toBe(true); // Below custom threshold
    });
  });

  describe('calculateAutoFetchAmount', () => {
    it('should return minimum fetch amount for small targets', () => {
      const amount = calculateAutoFetchAmount(15, 10, 50);
      expect(amount).toBeGreaterThanOrEqual(15); // Always at least 15
    });

    it('should calculate appropriate amount for normal targets', () => {
      const amount = calculateAutoFetchAmount(30, 15, 50);
      expect(amount).toBeGreaterThanOrEqual(15);
      expect(amount).toBeLessThanOrEqual(50);
    });

    it('should respect maximum fetch limit', () => {
      const amount = calculateAutoFetchAmount(100, 50, 30);
      expect(amount).toBeLessThanOrEqual(30);
    });

    it('should use default values correctly', () => {
      const amount = calculateAutoFetchAmount(15);
      expect(amount).toBeGreaterThanOrEqual(15);
      expect(amount).toBeLessThanOrEqual(50); // Default max
    });
  });

  describe('validateModeTransition', () => {
    it('should allow all mode transitions', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 15,
        totalFilteredPosts: 15,
        currentPage: 1,
      };

      expect(validateModeTransition('server', 'client', context)).toBe(true);
      expect(validateModeTransition('client', 'server', context)).toBe(true);
      expect(validateModeTransition('server', 'server', context)).toBe(true);
      expect(validateModeTransition('client', 'client', context)).toBe(true);
    });
  });

  describe('getPaginationDescription', () => {
    it('should describe server-side pagination', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 15,
        totalFilteredPosts: 15,
        currentPage: 1,
      };

      const description = getPaginationDescription('server', 'server-fetch', context);
      expect(description).toContain('Server-side pagination');
      expect(description).toContain('database');
    });

    it('should describe search pagination', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 10,
        currentPage: 1,
      };

      const description = getPaginationDescription('client', 'client-paginate', context);
      expect(description).toContain('Client-side pagination');
      expect(description).toContain('search results');
    });

    it('should describe filter pagination', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 8,
        currentPage: 1,
      };

      const description = getPaginationDescription('client', 'client-paginate', context);
      expect(description).toContain('Client-side pagination');
      expect(description).toContain('filtered posts');
    });

    it('should describe search filter pagination', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: true,
        totalLoadedPosts: 30,
        totalFilteredPosts: 12,
        currentPage: 1,
      };

      const description = getPaginationDescription('client', 'client-paginate', context);
      expect(description).toContain('Client-side pagination');
      expect(description).toContain('filtered posts');
    });

    it('should provide generic client description as fallback', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 30,
        currentPage: 1,
      };

      const description = getPaginationDescription('client', 'client-paginate', context);
      expect(description).toContain('Client-side pagination');
      expect(description).toContain('loaded posts');
    });
  });
});
/**
 * Combined Search and Filter Pagination Tests
 * 
 * Tests for the combined search and filter pagination logic
 */

import { 
  CombinedSearchFilterPagination,
  createCombinedSearchFilterPagination,
  applyCombinedSearchAndFilter
} from '../combinedSearchFilterPagination';
import { Post } from '@/types';
import { 
  PaginationState, 
  INITIAL_PAGINATION_STATE, 
  FilterOptions, 
  SearchFilters, 
  SearchResults 
} from '@/types/pagination';

// Mock posts for testing
const createMockPosts = (count: number): Post[] => {
  return Array(count).fill(null).map((_, i) => ({
    id: `post-${i}`,
    content: `Test post content ${i}`,
    user_id: `user-${i % 3}`,
    post_type: i % 2 === 0 ? 'text' : 'audio',
    created_at: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
    like_count: i % 5,
    liked_by_user: false,
    user_profiles: {
      username: `user${i % 3}`,
      user_id: `user-${i % 3}`,
    }
  })) as Post[];
};

describe('CombinedSearchFilterPagination', () => {
  let manager: CombinedSearchFilterPagination;
  let mockPosts: Post[];
  let mockPaginationState: PaginationState;

  beforeEach(() => {
    manager = createCombinedSearchFilterPagination();
    mockPosts = createMockPosts(20);
    mockPaginationState = {
      ...INITIAL_PAGINATION_STATE,
      allPosts: mockPosts,
      hasMorePosts: true,
    };
  });

  describe('Mode Detection', () => {
    it('should detect search-only mode', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 5),
        users: [],
        totalResults: 5,
      };

      const searchFilters: SearchFilters = { query: 'test' };
      const dashboardFilters: FilterOptions = { postType: 'all', sortBy: 'newest', timeRange: 'all' };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        true,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('search-only');
      expect(result.filteredPosts.length).toBe(5);
    });

    it('should detect filter-only mode', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { postType: 'text', sortBy: 'newest', timeRange: 'all' };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('filter-only');
      expect(result.filteredPosts.every(post => post.post_type === 'text')).toBe(true);
    });

    it('should detect search-and-filter mode', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 10),
        users: [],
        totalResults: 10,
      };

      const searchFilters: SearchFilters = { query: 'test', postType: 'text' };
      const dashboardFilters: FilterOptions = { postType: 'all', sortBy: 'popular', timeRange: 'all' };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        true,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('search-and-filter');
      expect(result.filteredPosts.every(post => post.post_type === 'text')).toBe(true);
    });

    it('should detect none mode', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { postType: 'all', sortBy: 'newest', timeRange: 'all' };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('none');
      expect(result.filteredPosts.length).toBe(mockPosts.length);
    });
  });

  describe('State Transitions', () => {
    it('should detect state transition from none to search-only', async () => {
      // First call - none mode
      const searchResults1: SearchResults = { posts: [], users: [], totalResults: 0 };
      await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults1,
        {},
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        false,
        mockPaginationState
      );

      // Second call - search-only mode
      const searchResults2: SearchResults = {
        posts: mockPosts.slice(0, 5),
        users: [],
        totalResults: 5,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults2,
        { query: 'test' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.stateTransition.fromMode).toBe('none');
      expect(result.stateTransition.toMode).toBe('search-only');
      expect(result.stateTransition.requiresPaginationReset).toBe(true);
    });

    it('should detect when pagination reset is required', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 5),
        users: [],
        totalResults: 5,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.stateTransition.requiresPaginationReset).toBe(true);
    });

    it('should detect when cache invalidation is required', async () => {
      // First search
      const searchResults1: SearchResults = {
        posts: mockPosts.slice(0, 5),
        users: [],
        totalResults: 5,
      };

      await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults1,
        { query: 'test1' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      // Different search
      const searchResults2: SearchResults = {
        posts: mockPosts.slice(5, 10),
        users: [],
        totalResults: 5,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults2,
        { query: 'test2' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.stateTransition.requiresCacheInvalidation).toBe(true);
    });
  });

  describe('Filter Application', () => {
    it('should apply time range filters correctly', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { 
        postType: 'all', 
        sortBy: 'newest', 
        timeRange: 'today' 
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      // All filtered posts should be from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      result.filteredPosts.forEach(post => {
        expect(new Date(post.created_at).getTime()).toBeGreaterThanOrEqual(today.getTime());
      });
    });

    it('should apply post type filters correctly', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { 
        postType: 'text', 
        sortBy: 'newest', 
        timeRange: 'all' 
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      expect(result.filteredPosts.every(post => post.post_type === 'text')).toBe(true);
    });

    it('should apply sorting correctly', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { 
        postType: 'all', 
        sortBy: 'popular', 
        timeRange: 'all' 
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      // Check that posts are sorted by like count (descending)
      for (let i = 1; i < result.filteredPosts.length; i++) {
        const prevLikes = result.filteredPosts[i - 1].like_count || 0;
        const currentLikes = result.filteredPosts[i].like_count || 0;
        expect(prevLikes).toBeGreaterThanOrEqual(currentLikes);
      }
    });
  });

  describe('Pagination Strategy', () => {
    it('should use server pagination for none mode', async () => {
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };
      const searchFilters: SearchFilters = {};
      const dashboardFilters: FilterOptions = { postType: 'all', sortBy: 'newest', timeRange: 'all' };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        searchFilters,
        dashboardFilters,
        false,
        mockPaginationState
      );

      expect(result.paginationMode).toBe('server');
      expect(result.loadMoreStrategy).toBe('server-fetch');
    });

    it('should use client pagination for filtered results with sufficient data', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 15), // Sufficient results
        users: [],
        totalResults: 15,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.paginationMode).toBe('client');
      expect(result.loadMoreStrategy).toBe('client-paginate');
    });

    it('should use server pagination for insufficient filtered results', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 3), // Insufficient results
        users: [],
        totalResults: 3,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.paginationMode).toBe('server');
      expect(result.loadMoreStrategy).toBe('server-fetch');
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 10),
        users: [],
        totalResults: 10,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test', postType: 'text' },
        { postType: 'all', sortBy: 'popular', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.performanceMetrics.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.searchTime).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.filterTime).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.combinationTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.performanceMetrics.totalTime).toBe('number');
    });
  });

  describe('Result Counting', () => {
    it('should track result counts correctly for combined mode', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 10),
        users: [],
        totalResults: 10,
      };

      const result = await manager.applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test', postType: 'text' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.resultCount.searchMatches).toBe(10);
      expect(result.resultCount.filterMatches).toBeGreaterThan(0);
      expect(result.resultCount.combinedMatches).toBe(result.filteredPosts.length);
    });
  });

  describe('Utility Functions', () => {
    it('should create manager instance', () => {
      const newManager = createCombinedSearchFilterPagination();
      expect(newManager).toBeInstanceOf(CombinedSearchFilterPagination);
    });

    it('should provide quick combined operation', async () => {
      const searchResults: SearchResults = {
        posts: mockPosts.slice(0, 5),
        users: [],
        totalResults: 5,
      };

      const result = await applyCombinedSearchAndFilter(
        mockPosts,
        searchResults,
        { query: 'test' },
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        true,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('search-only');
      expect(result.filteredPosts.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Simulate error by passing invalid data
      const invalidPosts = null as unknown as Post[];
      const searchResults: SearchResults = { posts: [], users: [], totalResults: 0 };

      const result = await manager.applyCombinedSearchAndFilter(
        invalidPosts,
        searchResults,
        {},
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        false,
        mockPaginationState
      );

      expect(result.appliedMode).toBe('none');
      expect(result.filteredPosts).toEqual([]);
      expect(result.totalResults).toBe(0);
    });
  });
});
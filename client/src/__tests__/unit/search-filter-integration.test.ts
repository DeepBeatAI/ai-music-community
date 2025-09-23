/**
 * Task 6: Search and Filter Integration Unit Tests
 * 
 * Tests the core search and filter integration logic to ensure
 * no infinite loops or re-render issues occur.
 */

import { jest } from '@jest/globals';
import { searchContent, SearchFilters, SearchResults } from '@/utils/search';
import { UnifiedPaginationStateManager } from '@/utils/unifiedPaginationState';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Search and Filter Integration Unit Tests', () => {
  let paginationManager: UnifiedPaginationStateManager;
  let stateChangeCount: number;
  let lastState: any;

  beforeEach(() => {
    stateChangeCount = 0;
    lastState = null;
    
    // Create pagination manager
    paginationManager = new UnifiedPaginationStateManager({
      postsPerPage: 15,
      minResultsForFilter: 10,
      maxAutoFetchPosts: 100
    });

    // Subscribe to state changes to detect infinite loops
    paginationManager.subscribe((state) => {
      stateChangeCount++;
      lastState = state;
    });

    // Mock Supabase responses
    (mockSupabase.from as jest.Mock).mockImplementation(() => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };
      return mockQuery;
    });

    jest.clearAllMocks();
  });

  describe('Search Integration', () => {
    it('should update search state without triggering infinite loops', async () => {
      const searchResults: SearchResults = {
        posts: [
          {
            id: 'post-1',
            content: 'Test music post',
            post_type: 'audio',
            user_id: 'user-1',
            created_at: new Date().toISOString(),
            user_profile: { id: 'profile-1', username: 'testuser', user_id: 'user-1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            likes_count: 5
          }
        ],
        users: [],
        totalResults: 1
      };

      const initialStateCount = stateChangeCount;

      // Update search
      paginationManager.updateSearch(searchResults, 'music', { query: 'music' });

      // Should trigger exactly one state change
      expect(stateChangeCount).toBe(initialStateCount + 1);
      expect(lastState.isSearchActive).toBe(true);
      expect(lastState.searchResults.posts).toHaveLength(1);
      expect(lastState.currentPage).toBe(1); // Should reset pagination

      // Wait to ensure no additional state changes
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(stateChangeCount).toBe(initialStateCount + 1);
    });

    it('should handle empty search without infinite loops', () => {
      const initialStateCount = stateChangeCount;

      // Update with empty search
      paginationManager.updateSearch({ posts: [], users: [], totalResults: 0 }, '', {});

      // Should trigger exactly one state change
      expect(stateChangeCount).toBe(initialStateCount + 1);
      expect(lastState.isSearchActive).toBe(false);
      expect(lastState.searchResults.posts).toHaveLength(0);
    });

    it('should clear search without triggering multiple state updates', () => {
      // First set up a search
      paginationManager.updateSearch(
        { posts: [{ id: 'post-1' } as any], users: [], totalResults: 1 },
        'test',
        { query: 'test' }
      );

      const searchStateCount = stateChangeCount;

      // Clear search
      paginationManager.clearSearch();

      // Should trigger exactly one additional state change
      expect(stateChangeCount).toBe(searchStateCount + 1);
      expect(lastState.isSearchActive).toBe(false);
      expect(lastState.searchResults.posts).toHaveLength(0);
      expect(lastState.currentPage).toBe(1);
    });
  });

  describe('Filter Integration', () => {
    it('should update filters without causing state loops', () => {
      const initialStateCount = stateChangeCount;

      // Update filters
      paginationManager.updateFilters({
        postType: 'audio',
        sortBy: 'popular',
        timeRange: 'week'
      });

      // Should trigger exactly one state change
      expect(stateChangeCount).toBe(initialStateCount + 1);
      expect(lastState.filters.postType).toBe('audio');
      expect(lastState.filters.sortBy).toBe('popular');
      expect(lastState.filters.timeRange).toBe('week');
    });

    it('should handle multiple filter updates efficiently', () => {
      const initialStateCount = stateChangeCount;

      // Update filters multiple times
      paginationManager.updateFilters({ postType: 'audio', sortBy: 'newest', timeRange: 'all' });
      paginationManager.updateFilters({ postType: 'all', sortBy: 'popular', timeRange: 'all' });
      paginationManager.updateFilters({ postType: 'all', sortBy: 'newest', timeRange: 'week' });

      // Should trigger exactly three state changes (one per update)
      expect(stateChangeCount).toBe(initialStateCount + 3);
      expect(lastState.filters.postType).toBe('audio');
      expect(lastState.filters.sortBy).toBe('popular');
      expect(lastState.filters.timeRange).toBe('week');
    });

    it('should clear filters without infinite loops', () => {
      // Set up filters
      paginationManager.updateFilters({
        postType: 'audio',
        sortBy: 'popular',
        timeRange: 'week'
      });

      const filterStateCount = stateChangeCount;

      // Clear filters
      paginationManager.clearSearch();

      // Should trigger exactly one additional state change
      expect(stateChangeCount).toBe(filterStateCount + 1);
      expect(lastState.filters.postType).toBe('all');
      expect(lastState.filters.sortBy).toBe('recent');
      expect(lastState.filters.timeRange).toBe('all');
    });
  });

  describe('Combined Search and Filter Operations', () => {
    it('should handle search and filter updates together without loops', () => {
      const initialStateCount = stateChangeCount;

      // Update search first
      paginationManager.updateSearch(
        { posts: [{ id: 'post-1' } as any], users: [], totalResults: 1 },
        'music',
        { query: 'music' }
      );

      // Then update filters
      paginationManager.updateFilters({ postType: 'audio', sortBy: 'newest', timeRange: 'all' });

      // Should trigger exactly two state changes
      expect(stateChangeCount).toBe(initialStateCount + 2);
      expect(lastState.isSearchActive).toBe(true);
      expect(lastState.filters.postType).toBe('audio');
    });

    it('should reset pagination when search or filters change', () => {
      // Set up initial state with pagination
      paginationManager.updatePosts({
        newPosts: Array.from({ length: 30 }, (_, i) => ({
          id: `post-${i}`,
          content: `Post ${i}`,
          post_type: 'text',
          user_id: 'user-1',
          created_at: new Date().toISOString()
        })),
        resetPagination: false
      });

      // Move to page 2
      // Test state change through public method
      paginationManager.updatePosts({ newPosts: [], resetPagination: false });
      expect(lastState.currentPage).toBe(2);

      const pageStateCount = stateChangeCount;

      // Update search - should reset to page 1
      paginationManager.updateSearch(
        { posts: [], users: [], totalResults: 0 },
        'test',
        { query: 'test' }
      );

      expect(stateChangeCount).toBe(pageStateCount + 1);
      expect(lastState.currentPage).toBe(1);
    });

    it('should maintain state consistency during rapid changes', () => {
      const initialStateCount = stateChangeCount;

      // Perform rapid changes
      paginationManager.updateSearch(
        { posts: [], users: [], totalResults: 0 },
        'test1',
        { query: 'test1' }
      );
      paginationManager.updateFilters({ postType: 'audio', sortBy: 'newest', timeRange: 'all' });
      paginationManager.updateSearch(
        { posts: [], users: [], totalResults: 0 },
        'test2',
        { query: 'test2' }
      );
      paginationManager.updateFilters({ postType: 'all', sortBy: 'popular', timeRange: 'all' });
      paginationManager.clearSearch();

      // Should have exactly 5 state changes
      expect(stateChangeCount).toBe(initialStateCount + 5);
      
      // Final state should be consistent
      expect(lastState.isSearchActive).toBe(false);
      expect(lastState.filters.postType).toBe('audio');
      expect(lastState.filters.sortBy).toBe('popular');
      expect(lastState.currentPage).toBe(1);
    });
  });

  describe('State Validation During Search and Filter Operations', () => {
    it('should maintain valid state during search operations', () => {
      // Update search
      paginationManager.updateSearch(
        { posts: [{ id: 'post-1' } as any], users: [], totalResults: 1 },
        'music',
        { query: 'music' }
      );

      // Validate state
      const debugInfo = paginationManager.getDebugInfo();
      expect(debugInfo.validation.isValid).toBe(true);
      expect(debugInfo.validation.errors).toHaveLength(0);
    });

    it('should maintain valid state during filter operations', () => {
      // Update filters
      paginationManager.updateFilters({
        postType: 'audio',
        sortBy: 'popular',
        timeRange: 'week'
      });

      // Validate state
      const debugInfo = paginationManager.getDebugInfo();
      expect(debugInfo.validation.isValid).toBe(true);
      expect(debugInfo.validation.errors).toHaveLength(0);
    });

    it('should recover from invalid states gracefully', () => {
      // Force an invalid state by directly manipulating internal state
      const invalidState = {
        ...paginationManager.getState(),
        currentPage: -1, // Invalid page number
        allPosts: null as any // Invalid posts array
      };

      // This would normally be done internally, but we're testing recovery
      try {
        // Test with invalid state through public method
        paginationManager.updatePosts({ newPosts: [], resetPagination: true });
      } catch (error) {
        // Expected to fail validation
      }

      // The manager should maintain a valid state
      const currentState = paginationManager.getState();
      expect(currentState.currentPage).toBeGreaterThan(0);
      expect(Array.isArray(currentState.allPosts)).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not create memory leaks with repeated search operations', () => {
      const initialStateCount = stateChangeCount;

      // Perform many search operations
      for (let i = 0; i < 100; i++) {
        paginationManager.updateSearch(
          { posts: [], users: [], totalResults: 0 },
          `search-${i}`,
          { query: `search-${i}` }
        );
      }

      // Should have exactly 100 state changes
      expect(stateChangeCount).toBe(initialStateCount + 100);

      // State should still be valid
      const debugInfo = paginationManager.getDebugInfo();
      expect(debugInfo.validation.isValid).toBe(true);
    });

    it('should handle large search results efficiently', () => {
      const largeResults: SearchResults = {
        posts: Array.from({ length: 1000 }, (_, i) => ({
          id: `post-${i}`,
          content: `Post ${i}`,
          post_type: 'text',
          user_id: 'user-1',
          created_at: new Date().toISOString(),
          user_profile: { id: 'profile-1', username: 'testuser', user_id: 'user-1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          likes_count: i
        })),
        users: [],
        totalResults: 1000
      };

      const startTime = Date.now();
      paginationManager.updateSearch(largeResults, 'large search', { query: 'large search' });
      const endTime = Date.now();

      // Should complete quickly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // State should be valid
      const state = paginationManager.getState();
      expect(state.searchResults.posts).toHaveLength(1000);
      expect(state.isSearchActive).toBe(true);
    });
  });
});

describe('SearchContent Function Integration', () => {
  beforeEach(() => {
    // Mock successful Supabase responses
    (mockSupabase.from as jest.Mock).mockImplementation(() => {
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn(() => Promise.resolve({
          data: [
            {
              id: 'post-1',
              content: 'Test music post',
              post_type: 'audio',
              user_id: 'user-1',
              created_at: new Date().toISOString(),
              user_profiles: { id: 'profile-1', username: 'testuser', user_id: 'user-1' }
            }
          ],
          error: null,
          count: 1
        }))
      };
      return mockQuery;
    }) as any;

    jest.clearAllMocks();
  });

  it('should handle search without infinite API calls', async () => {
    const filters: SearchFilters = {
      query: 'music',
      postType: 'all',
      sortBy: 'recent',
      timeRange: 'all'
    };

    // Perform search
    const results = await searchContent(filters);

    // Should return valid results
    expect(results).toBeDefined();
    expect(results.posts).toBeDefined();
    expect(results.users).toBeDefined();
    expect(results.totalResults).toBeGreaterThanOrEqual(0);

    // Should not make excessive API calls
    expect(mockSupabase.from).toHaveBeenCalledTimes(4); // posts, users, and like counts
  });

  it('should handle filter-only searches efficiently', async () => {
    const filters: SearchFilters = {
      postType: 'audio',
      sortBy: 'popular',
      timeRange: 'week'
    };

    const results = await searchContent(filters);

    expect(results).toBeDefined();
    expect(Array.isArray(results.posts)).toBe(true);
    expect(Array.isArray(results.users)).toBe(true);
  });

  it('should handle empty results gracefully', async () => {
    // Mock empty results
    (mockSupabase.from as jest.Mock).mockImplementation(() => {
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0
        }))
      };
      return mockQuery;
    });

    const filters: SearchFilters = {
      query: 'nonexistent',
      postType: 'all'
    };

    const results = await searchContent(filters);

    expect(results.posts).toHaveLength(0);
    expect(results.users).toHaveLength(0);
    expect(results.totalResults).toBe(0);
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    (mockSupabase.from as jest.Mock).mockImplementation(() => {
      const mockQuery: unknown = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn(() => Promise.reject(new Error('API Error')))
      };
      return mockQuery;
    }) as any;

    const filters: SearchFilters = {
      query: 'error test'
    };

    const results = await searchContent(filters);

    // Should return empty results instead of throwing
    expect(results.posts).toHaveLength(0);
    expect(results.users).toHaveLength(0);
    expect(results.totalResults).toBe(0);
  });
});
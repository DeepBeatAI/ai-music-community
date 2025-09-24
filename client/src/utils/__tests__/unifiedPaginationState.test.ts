/**
 * Unit Tests for Unified Pagination State Manager
 * 
 * Tests the core state management system that handles both server-side and
 * client-side pagination modes with seamless transitions.
 */

import {
  UnifiedPaginationStateManager,
  createUnifiedPaginationState
} from '../unifiedPaginationState';

import {
  PaginationState,
  LoadMoreConfig,
  FilterOptions,
  SearchFilters,
  SearchResults,
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_FILTER_OPTIONS,
  INITIAL_PAGINATION_STATE
} from '../../types/pagination';

import { Post } from '../../types';

// Helper function to create mock posts
const createMockPosts = (count: number, startId: number = 0): Post[] => {
  return Array(count).fill(null).map((_, i) => ({
    id: `post-${startId + i}`,
    content: `Test post ${startId + i}`,
    post_type: (startId + i) % 3 === 0 ? 'audio' : 'text',
    created_at: new Date(Date.now() - (startId + i) * 1000 * 60).toISOString(),
    user_id: `user-${(startId + i) % 3}`,
    like_count: (startId + i) * 2,
    liked_by_user: false,
    user_profiles: {
      username: `user${(startId + i) % 3}`,
      user_id: `user-${(startId + i) % 3}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  })) as Post[];
};

describe('UnifiedPaginationStateManager', () => {
  let manager: UnifiedPaginationStateManager;

  beforeEach(() => {
    manager = new UnifiedPaginationStateManager();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_PAGINATION_CONFIG);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<LoadMoreConfig> = {
        postsPerPage: 20,
        minResultsForFilter: 8,
      };
      
      const customManager = new UnifiedPaginationStateManager(customConfig);
      const config = customManager.getConfig();
      
      expect(config.postsPerPage).toBe(20);
      expect(config.minResultsForFilter).toBe(8);
      expect(config.maxAutoFetchPosts).toBe(DEFAULT_PAGINATION_CONFIG.maxAutoFetchPosts);
    });

    it('should initialize with correct initial state', () => {
      const state = manager.getState();
      
      expect(state.currentPage).toBe(1);
      expect(state.hasMorePosts).toBe(true);
      expect(state.isLoadingMore).toBe(false);
      expect(state.allPosts).toHaveLength(0);
      expect(state.displayPosts).toHaveLength(0);
      expect(state.paginatedPosts).toHaveLength(0);
      expect(state.paginationMode).toBe('server');
      expect(state.loadMoreStrategy).toBe('server-fetch');
    });
  });

  describe('state subscription', () => {
    it('should notify listeners on state changes', () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      
      manager.updatePosts({ newPosts: createMockPosts(5) });
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        allPosts: expect.arrayContaining([expect.objectContaining({ id: 'post-0' })]),
      }));
      
      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      manager.subscribe(errorListener);
      manager.subscribe(goodListener);
      
      // Should not throw despite error in first listener
      expect(() => {
        manager.updatePosts({ newPosts: createMockPosts(3) });
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      
      manager.updatePosts({ newPosts: createMockPosts(2) });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      manager.updatePosts({ newPosts: createMockPosts(2) });
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('updatePosts', () => {
    it('should add new posts to allPosts', () => {
      const newPosts = createMockPosts(5);
      manager.updatePosts({ newPosts });
      
      const state = manager.getState();
      expect(state.allPosts).toHaveLength(5);
      expect(state.allPosts[0].id).toBe('post-0');
    });

    it('should append posts for Load More', () => {
      const firstBatch = createMockPosts(5);
      const secondBatch = createMockPosts(3, 5);
      
      manager.updatePosts({ newPosts: firstBatch });
      manager.updatePosts({ newPosts: secondBatch });
      
      const state = manager.getState();
      expect(state.allPosts).toHaveLength(8);
      expect(state.allPosts[5].id).toBe('post-5');
    });

    it('should reset posts when resetPagination is true', () => {
      manager.updatePosts({ newPosts: createMockPosts(5) });
      manager.updatePosts({ newPosts: createMockPosts(3), resetPagination: true });
      
      const state = manager.getState();
      expect(state.allPosts).toHaveLength(3);
      expect(state.currentPage).toBe(1);
    });

    it('should update metadata', () => {
      const metadata = { totalServerPosts: 100, currentBatch: 2 };
      manager.updatePosts({ 
        newPosts: createMockPosts(5),
        updateMetadata: metadata
      });
      
      const state = manager.getState();
      expect(state.metadata.totalServerPosts).toBe(100);
      expect(state.metadata.currentBatch).toBe(2);
    });

    it('should detect pagination mode correctly', () => {
      // Initially should be server mode
      manager.updatePosts({ newPosts: createMockPosts(10) });
      expect(manager.getState().paginationMode).toBe('server');
      
      // Should switch to client mode when filters are applied
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'audio' });
      expect(manager.getState().paginationMode).toBe('client');
    });

    it('should apply filters correctly', () => {
      const posts = createMockPosts(10); // Mix of audio and text posts
      manager.updatePosts({ newPosts: posts });
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'audio' });
      
      const state = manager.getState();
      const audioPosts = state.displayPosts.filter(p => p.post_type === 'audio');
      expect(state.displayPosts).toHaveLength(audioPosts.length);
      expect(state.displayPosts.every(p => p.post_type === 'audio')).toBe(true);
    });

    it('should handle time range filtering', () => {
      const now = Date.now();
      const posts: Post[] = [
        {
          id: 'recent',
          content: 'Recent post',
          post_type: 'text',
          created_at: new Date(now - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          user_id: 'user1',
          like_count: 0,
          liked_by_user: false,
          user_profiles: { 
            username: 'user1',
            user_id: 'user1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'old',
          content: 'Old post',
          post_type: 'text',
          created_at: new Date(now - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago
          user_id: 'user2',
          like_count: 0,
          liked_by_user: false,
          user_profiles: { 
            username: 'user2',
            user_id: 'user2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ];
      
      manager.updatePosts({ newPosts: posts });
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, timeRange: 'today' });
      
      const state = manager.getState();
      expect(state.displayPosts).toHaveLength(1);
      expect(state.displayPosts[0].id).toBe('recent');
    });

    it('should handle sorting correctly', () => {
      const posts: Post[] = [
        {
          id: 'popular',
          content: 'Popular post',
          post_type: 'text',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          user_id: 'user1',
          like_count: 10,
          liked_by_user: false,
          user_profiles: { 
            username: 'user1',
            user_id: 'user1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'unpopular',
          content: 'Unpopular post',
          post_type: 'text',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user_id: 'user2',
          like_count: 2,
          liked_by_user: false,
          user_profiles: { 
            username: 'user2',
            user_id: 'user2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ];
      
      manager.updatePosts({ newPosts: posts });
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, sortBy: 'popular' });
      
      const state = manager.getState();
      expect(state.displayPosts[0].id).toBe('popular'); // Should be first due to higher likes
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      manager.updatePosts({ newPosts: createMockPosts(20) });
    });

    it('should update search state', () => {
      const searchResults: SearchResults = {
        posts: createMockPosts(5),
        users: [],
        totalResults: 5,
      };
      
      manager.updateSearch(searchResults, 'test query', { query: 'test query' });
      
      const state = manager.getState();
      expect(state.isSearchActive).toBe(true);
      expect(state.searchResults).toEqual(searchResults);
      expect(state.currentSearchFilters.query).toBe('test query');
      expect(state.currentPage).toBe(1); // Should reset pagination
    });

    it('should filter posts based on search results', () => {
      const searchPosts = createMockPosts(3);
      const searchResults: SearchResults = {
        posts: searchPosts,
        users: [],
        totalResults: 3,
      };
      
      manager.updateSearch(searchResults, 'test', { query: 'test' });
      
      const state = manager.getState();
      expect(state.paginationMode).toBe('client');
      expect(state.displayPosts).toHaveLength(3); // Only search results should be displayed
    });

    it('should clear search correctly', () => {
      const searchResults: SearchResults = {
        posts: createMockPosts(5),
        users: [],
        totalResults: 5,
      };
      
      manager.updateSearch(searchResults, 'test', { query: 'test' });
      manager.clearSearch();
      
      const state = manager.getState();
      expect(state.isSearchActive).toBe(false);
      expect(state.searchResults.posts).toHaveLength(0);
      expect(state.currentSearchFilters).toEqual({});
      expect(state.currentPage).toBe(1);
    });

    it('should prioritize search filters over dashboard filters', () => {
      // Set dashboard filters
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'text' });
      
      // Set search with different filters
      const searchResults: SearchResults = {
        posts: createMockPosts(5),
        users: [],
        totalResults: 5,
      };
      
      manager.updateSearch(searchResults, 'test', { 
        query: 'test',
        postType: 'audio' // Different from dashboard filter
      });
      
      const state = manager.getState();
      // Should use search filters (audio) not dashboard filters (text)
      expect(state.displayPosts.every(p => p.post_type === 'audio')).toBe(true);
    });
  });

  describe('pagination logic', () => {
    beforeEach(() => {
      manager.updatePosts({ newPosts: createMockPosts(30) });
    });

    it('should handle server-side pagination correctly', () => {
      // First update posts, then set total count
      const state1 = manager.getState();
      expect(state1.allPosts).toHaveLength(30);
      
      manager.updateTotalPostsCount(100);
      
      const state = manager.getState();
      

      expect(state.paginationMode).toBe('server');
      expect(state.paginatedPosts).toHaveLength(30); // All loaded posts shown
      expect(state.totalPostsCount).toBe(100);
      
      // Calculate if there should be more posts based on server pagination logic
      const totalPages = Math.ceil(state.totalPostsCount / state.postsPerPage); // 100/15 = 7
      const currentServerPage = Math.ceil(state.allPosts.length / state.postsPerPage); // 30/15 = 2
      const expectedHasMore = currentServerPage < totalPages; // 2 < 7 = true
      
      expect(state.hasMorePosts).toBe(expectedHasMore);
    });

    it('should handle client-side pagination correctly', () => {
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'audio' });
      
      const state = manager.getState();
      expect(state.paginationMode).toBe('client');
      expect(state.paginatedPosts.length).toBeLessThanOrEqual(15); // First page only
      expect(state.hasMorePosts).toBe(state.paginatedPosts.length < state.displayPosts.length);
    });

    it('should handle Load More for client-side pagination', () => {
      // Create posts with enough text posts to test pagination
      const mixedPosts = [
        ...createMockPosts(20).map(p => ({ ...p, post_type: 'text' as const })),
        ...createMockPosts(10).map(p => ({ ...p, post_type: 'audio' as const }))
      ];
      
      // Reset and add mixed posts
      manager.updatePosts({ newPosts: mixedPosts, resetPagination: true });
      
      // Apply filter to switch to client mode
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'text' });
      
      const initialState = manager.getState();
      expect(initialState.paginationMode).toBe('client');
      expect(initialState.displayPosts).toHaveLength(20); // Only text posts
      expect(initialState.paginatedPosts.length).toBeLessThanOrEqual(15); // First page
      expect(initialState.hasMorePosts).toBe(true); // Should have more since 20 > 15
      
      const initialCount = initialState.paginatedPosts.length;
      
      const { canLoadMore, strategy } = manager.loadMore();
      
      expect(canLoadMore).toBe(true);
      expect(strategy).toBe('client-paginate');
      
      const newState = manager.getState();
      expect(newState.currentPage).toBe(2);
      expect(newState.paginatedPosts.length).toBeGreaterThan(initialCount);
      expect(newState.paginatedPosts.length).toBeLessThanOrEqual(20); // All text posts
    });

    it('should prevent Load More when no more posts available', () => {
      // Create a small dataset that fits in one page
      manager.updatePosts({ newPosts: createMockPosts(5), resetPagination: true });
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'text' });
      
      const { canLoadMore } = manager.loadMore();
      expect(canLoadMore).toBe(false);
    });

    it('should prevent Load More when already loading', () => {
      manager.setLoadingState(true);
      
      const { canLoadMore } = manager.loadMore();
      expect(canLoadMore).toBe(false);
    });
  });

  describe('loading state management', () => {
    it('should set loading state correctly', () => {
      manager.setLoadingState(true);
      
      let state = manager.getState();
      expect(state.isLoadingMore).toBe(true);
      expect(state.fetchInProgress).toBe(true);
      expect(state.lastFetchTime).toBeGreaterThan(0);
      
      manager.setLoadingState(false);
      
      state = manager.getState();
      expect(state.isLoadingMore).toBe(false);
      expect(state.fetchInProgress).toBe(false);
    });

    it('should update total posts count', () => {
      manager.updateTotalPostsCount(150);
      
      const state = manager.getState();
      expect(state.totalPostsCount).toBe(150);
      expect(state.metadata.totalServerPosts).toBe(150);
    });
  });

  describe('validation and recovery', () => {
    it('should validate consistent state', () => {
      manager.updatePosts({ newPosts: createMockPosts(10) });
      
      const isValid = manager.validateAndRecover();
      expect(isValid).toBe(true);
    });

    it('should recover from inconsistent state', () => {
      // Force an inconsistent state by directly modifying internal state
      const state = manager.getState();
      (manager as any).state = {
        ...state,
        currentPage: -1, // Invalid
      };
      
      const isValid = manager.validateAndRecover();
      expect(isValid).toBe(true);
      
      const recoveredState = manager.getState();
      expect(recoveredState.currentPage).toBe(1); // Should be fixed
    });
  });

  describe('debug functionality', () => {
    it('should provide debug information', () => {
      manager.updatePosts({ newPosts: createMockPosts(5) });
      
      const debugInfo = manager.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('state');
      expect(debugInfo).toHaveProperty('validation');
      expect(debugInfo).toHaveProperty('config');
      expect((debugInfo.validation as any).isValid).toBe(true);
    });

    it('should reset to initial state', () => {
      manager.updatePosts({ newPosts: createMockPosts(10) });
      manager.updateFilters({ ...DEFAULT_FILTER_OPTIONS, postType: 'audio' });
      
      manager.reset();
      
      const state = manager.getState();
      expect(state.allPosts).toHaveLength(0);
      expect(state.currentPage).toBe(1);
      expect(state.filters).toEqual(DEFAULT_FILTER_OPTIONS);
      expect(state.paginationMode).toBe('server');
    });
  });

  describe('createUnifiedPaginationState factory', () => {
    it('should create manager with default config', () => {
      const manager = createUnifiedPaginationState();
      
      expect(manager).toBeInstanceOf(UnifiedPaginationStateManager);
      expect(manager.getConfig()).toEqual(DEFAULT_PAGINATION_CONFIG);
    });

    it('should create manager with custom config', () => {
      const customConfig = { postsPerPage: 25 };
      const manager = createUnifiedPaginationState(customConfig);
      
      expect(manager.getConfig().postsPerPage).toBe(25);
    });
  });
});
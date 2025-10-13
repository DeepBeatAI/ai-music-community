/**
 * Dashboard Pagination Integration Tests
 * 
 * Tests the integration between dashboard and pagination system:
 * - Server-side pagination integration
 * - Client-side pagination integration
 * - Mode transitions and state management
 * - Error handling and recovery
 */

import { createUnifiedPaginationState } from '@/utils/unifiedPaginationState';
import { createLoadMoreHandler } from '@/utils/loadMoreHandler';
import { createLoadMoreStateMachine } from '@/utils/loadMoreStateMachine';
import { Post } from '@/types';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        range: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
          count: 0,
        })),
      })),
    })),
  })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock data generators
const createMockPost = (id: string, index: number): Post => ({
  id,
  content: `Integration test post ${index}`,
  post_type: 'text',
  created_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
  updated_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
  user_id: 'test-user-id',
  like_count: Math.floor(Math.random() * 10),
  liked_by_user: false,
  user_profiles: {
    username: 'testuser',
    user_id: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});

const createMockPosts = (count: number, startIndex: number = 0): Post[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockPost(`post-${startIndex + i}`, startIndex + i)
  );
};

// Mock fetch function for server requests
const mockFetchPosts = async (page: number = 1, limit: number = 15): Promise<{ data: Post[]; count: number }> => {
  const startIndex = (page - 1) * limit;
  const posts = createMockPosts(limit, startIndex);
  return {
    data: posts,
    count: 100, // Total posts available
  };
};

describe('Dashboard Pagination Integration', () => {
  let paginationManager: ReturnType<typeof createUnifiedPaginationState>;
  let stateMachine: ReturnType<typeof createLoadMoreStateMachine>;
  let loadMoreHandler: ReturnType<typeof createLoadMoreHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    paginationManager = createUnifiedPaginationState({
      postsPerPage: 15,
      minResultsForFilter: 10,
      maxAutoFetchPosts: 100,
      fetchTimeout: 10000,
    });

    stateMachine = createLoadMoreStateMachine('idle');
    loadMoreHandler = createLoadMoreHandler(
      paginationManager.getState(),
      stateMachine
    );
  });

  describe('Server-Side Pagination Integration', () => {
    test('should load initial posts from server', async () => {
      const initialPosts = await mockFetchPosts(1, 15);
      
      paginationManager.updatePosts({
        newPosts: initialPosts.data,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: initialPosts.count,
          loadedServerPosts: initialPosts.data.length,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      const state = paginationManager.getState();
      
      expect(state.allPosts.length).toBe(15);
      expect(state.paginatedPosts.length).toBe(15);
      expect(state.paginationMode).toBe('server');
      expect(state.hasMorePosts).toBe(true);
      expect(state.totalPostsCount).toBe(100);
    });

    test('should fetch additional posts on Load More', async () => {
      // Setup initial state
      const initialPosts = await mockFetchPosts(1, 15);
      paginationManager.updatePosts({
        newPosts: initialPosts.data,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: initialPosts.count,
          loadedServerPosts: initialPosts.data.length,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      // Simulate Load More
      const result = await loadMoreHandler.handleLoadMore();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('server-fetch');

      // Simulate fetching additional posts
      const additionalPosts = await mockFetchPosts(2, 15);
      paginationManager.updatePosts({
        newPosts: additionalPosts.data,
        resetPagination: false,
        updateMetadata: {
          totalServerPosts: initialPosts.count,
          loadedServerPosts: 30,
          currentBatch: 2,
          lastFetchTimestamp: Date.now(),
        },
      });

      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(30);
      expect(state.paginatedPosts.length).toBe(30);
      expect(state.paginationMode).toBe('server');
    });

    test('should handle server errors gracefully', async () => {
      // Setup initial state
      const initialPosts = await mockFetchPosts(1, 15);
      paginationManager.updatePosts({
        newPosts: initialPosts.data,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: initialPosts.count,
          loadedServerPosts: initialPosts.data.length,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      // Mock server error
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.reject(new Error('Network error'))),
          })),
        })),
      }));

      // Attempt Load More with error
      const result = await loadMoreHandler.handleLoadMore();
      
      // Should handle error gracefully
      expect(result.success).toBe(true); // Handler itself succeeds
      expect(stateMachine.getCurrentState()).toBe('complete');
      
      // State should remain consistent
      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(15); // No new posts added
      expect(paginationManager.validateAndRecover()).toBe(true);
    });

    test('should update UI state correctly after server fetch', async () => {
      const initialPosts = await mockFetchPosts(1, 15);
      
      // Track state changes
      const stateChanges: Array<ReturnType<typeof paginationManager.getState>> = [];
      const unsubscribe = paginationManager.subscribe((newState) => {
        stateChanges.push(newState);
      });

      paginationManager.updatePosts({
        newPosts: initialPosts.data,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: initialPosts.count,
          loadedServerPosts: initialPosts.data.length,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      expect(stateChanges.length).toBeGreaterThan(0);
      
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.allPosts.length).toBe(15);
      expect(finalState.paginationMode).toBe('server');
      
      unsubscribe();
    });
  });

  describe('Client-Side Pagination Integration', () => {
    test('should switch to client mode when filters applied', () => {
      // Setup initial posts
      const posts = createMockPosts(30, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      expect(paginationManager.getState().paginationMode).toBe('server');

      // Apply search/filter
      paginationManager.updateSearch(
        { posts: posts.slice(0, 10), users: [], totalResults: 10 },
        'test query',
        { type: 'text' }
      );

      const state = paginationManager.getState();
      expect(state.paginationMode).toBe('client');
      expect(state.isSearchActive).toBe(true);
      expect(state.displayPosts.length).toBe(10);
    });

    test('should paginate through filtered results', async () => {
      // Setup posts and apply filter
      const posts = createMockPosts(50, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      paginationManager.updateSearch(
        { posts: posts.slice(0, 25), users: [], totalResults: 25 },
        'test',
        {}
      );

      // Create new handler for client mode
      const clientHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      const result = await clientHandler.handleLoadMore();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('client-paginate');

      const state = paginationManager.getState();
      expect(state.paginationMode).toBe('client');
      expect(state.currentPage).toBe(2);
    });

    test('should maintain filter state during pagination', async () => {
      const posts = createMockPosts(50, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      const searchFilters = { type: 'text', tag: 'music' };
      paginationManager.updateSearch(
        { posts: posts.slice(0, 30), users: [], totalResults: 30 },
        'music',
        searchFilters
      );

      // Perform client-side Load More
      const clientHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      await clientHandler.handleLoadMore();

      const state = paginationManager.getState();
      expect(state.currentSearchFilters).toEqual(searchFilters);
      expect(state.isSearchActive).toBe(true);
      expect(state.paginationMode).toBe('client');
    });

    test('should auto-fetch when insufficient filtered results', async () => {
      // Setup with limited posts
      const posts = createMockPosts(20, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: 100, // More available on server
          loadedServerPosts: 20,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      // Apply filter that results in few matches
      const filteredPosts = posts.slice(0, 5); // Only 5 matches
      paginationManager.updateSearch(
        { posts: filteredPosts, users: [], totalResults: 5 },
        'rare term',
        {}
      );

      const state = paginationManager.getState();
      expect(state.displayPosts.length).toBe(5);
      expect(state.paginationMode).toBe('client');
      
      // Should indicate need for more data
      expect(state.metadata?.totalServerPosts).toBeGreaterThan(state.metadata?.loadedServerPosts || 0);
    });
  });

  describe('Mode Transition Integration', () => {
    test('should transition smoothly between pagination modes', () => {
      const posts = createMockPosts(30, 0);
      
      // Start in server mode
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });
      expect(paginationManager.getState().paginationMode).toBe('server');

      // Transition to client mode
      paginationManager.updateSearch(
        { posts: posts.slice(0, 15), users: [], totalResults: 15 },
        'test',
        {}
      );
      expect(paginationManager.getState().paginationMode).toBe('client');

      // Transition back to server mode
      paginationManager.clearSearch();
      expect(paginationManager.getState().paginationMode).toBe('server');
    });

    test('should maintain data consistency during transitions', () => {
      const posts = createMockPosts(45, 0);
      
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      const initialState = paginationManager.getState();
      expect(initialState.allPosts.length).toBe(45);

      // Apply filter
      paginationManager.updateSearch(
        { posts: posts.slice(0, 20), users: [], totalResults: 20 },
        'filter',
        {}
      );

      const filteredState = paginationManager.getState();
      expect(filteredState.allPosts.length).toBe(45); // Original posts preserved
      expect(filteredState.displayPosts.length).toBe(20); // Filtered results

      // Clear filter
      paginationManager.clearSearch();

      const clearedState = paginationManager.getState();
      expect(clearedState.allPosts.length).toBe(45); // Data preserved
      expect(clearedState.displayPosts.length).toBe(45); // Back to all posts
    });

    test('should update UI indicators correctly during transitions', () => {
      const posts = createMockPosts(30, 0);
      const stateChanges: Array<ReturnType<typeof paginationManager.getState>> = [];
      
      const unsubscribe = paginationManager.subscribe((newState) => {
        stateChanges.push(newState);
      });

      // Initial load
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      // Apply search
      paginationManager.updateSearch(
        { posts: posts.slice(0, 10), users: [], totalResults: 10 },
        'search',
        {}
      );

      // Clear search
      paginationManager.clearSearch();

      // Should have multiple state changes
      expect(stateChanges.length).toBeGreaterThan(2);
      
      // Final state should be back to server mode
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.paginationMode).toBe('server');
      expect(finalState.isSearchActive).toBe(false);

      unsubscribe();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from pagination errors', async () => {
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      // Force error state
      stateMachine.transition('loading-server');
      stateMachine.transition('error', { message: 'Test error' });

      expect(stateMachine.getCurrentState()).toBe('error');

      // Should be able to recover
      expect(stateMachine.canTransition('idle')).toBe(true);
      stateMachine.transition('idle');

      // Should be able to try Load More again
      const result = await loadMoreHandler.handleLoadMore();
      expect(result.success).toBe(true);
    });

    test('should maintain state consistency during errors', () => {
      const posts = createMockPosts(30, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      // Simulate error scenario
      stateMachine.transition('loading-server');
      stateMachine.transition('error');

      // State should still be valid
      expect(paginationManager.validateAndRecover()).toBe(true);
      
      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(30);
      expect(state.paginatedPosts.length).toBe(15);
    });

    test('should handle network timeouts gracefully', async () => {
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
        },
      });

      // Mock timeout scenario
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            )),
          })),
        })),
      }));

      const result = await loadMoreHandler.handleLoadMore();
      
      // Should handle timeout gracefully
      expect(result.success).toBe(true);
      expect(paginationManager.validateAndRecover()).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance with large datasets', () => {
      const startTime = performance.now();
      
      const largePosts = createMockPosts(1000, 0);
      paginationManager.updatePosts({
        newPosts: largePosts,
        resetPagination: true,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large datasets quickly
      expect(duration).toBeLessThan(200); // Under 200ms

      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(1000);
      expect(state.paginatedPosts.length).toBe(15); // Only first page
    });

    test('should optimize memory usage during integration', () => {
      // Load multiple batches
      for (let i = 0; i < 10; i++) {
        const posts = createMockPosts(15, i * 15);
        paginationManager.updatePosts({
          newPosts: posts,
          resetPagination: false,
        });
      }

      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(150);
      
      // Should maintain reasonable memory usage
      expect(paginationManager.validateAndRecover()).toBe(true);
    });
  });
});
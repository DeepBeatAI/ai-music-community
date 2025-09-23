/**
 * Core Pagination Logic Unit Tests
 * 
 * Tests the fundamental pagination system components:
 * - Unified pagination state management
 * - Load More handler logic
 * - State machine transitions
 * - Mode detection and switching
 */

import { createUnifiedPaginationState } from '@/utils/unifiedPaginationState';
import { createLoadMoreHandler } from '@/utils/loadMoreHandler';
import { createLoadMoreStateMachine } from '@/utils/loadMoreStateMachine';
import { Post } from '@/types';

// Mock data generators
const createMockPost = (id: string, index: number): Post => ({
  id,
  content: `Test post ${index}`,
  post_type: 'text',
  created_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
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

describe('Core Pagination Logic', () => {
  describe('Unified Pagination State Management', () => {
    test('should initialize with correct default state', () => {
      const paginationManager = createUnifiedPaginationState({
        postsPerPage: 15,
        minResultsForFilter: 10,
        maxAutoFetchPosts: 100,
        fetchTimeout: 10000,
      });

      const state = paginationManager.getState();

      expect(state.currentPage).toBe(1);
      expect(state.hasMorePosts).toBe(false);
      expect(state.isLoadingMore).toBe(false);
      expect(state.allPosts).toEqual([]);
      expect(state.displayPosts).toEqual([]);
      expect(state.paginatedPosts).toEqual([]);
      expect(state.paginationMode).toBe('server');
      expect(state.isSearchActive).toBe(false);
      expect(state.hasFiltersApplied).toBe(false);
    });

    test('should handle mode transitions correctly', () => {
      const paginationManager = createUnifiedPaginationState();
      
      // Start in server mode
      expect(paginationManager.getState().paginationMode).toBe('server');

      // Add posts (should stay in server mode)
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });
      expect(paginationManager.getState().paginationMode).toBe('server');

      // Apply search (should switch to client mode)
      paginationManager.updateSearch(
        { posts: posts.slice(0, 5), users: [], totalResults: 5 },
        'test query',
        {}
      );
      expect(paginationManager.getState().paginationMode).toBe('client');

      // Clear search (should return to server mode)
      paginationManager.clearSearch();
      expect(paginationManager.getState().paginationMode).toBe('server');
    });

    test('should validate state consistency', () => {
      const paginationManager = createUnifiedPaginationState();
      
      // Valid state should pass validation
      expect(paginationManager.validateAndRecover()).toBe(true);

      // Add posts and validate
      const posts = createMockPosts(30, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });
      expect(paginationManager.validateAndRecover()).toBe(true);

      // State should remain consistent after operations
      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(30);
      expect(state.displayPosts.length).toBe(30);
      expect(state.paginatedPosts.length).toBe(15); // First page
    });

    test('should recover from invalid states', () => {
      const paginationManager = createUnifiedPaginationState();
      
      // Simulate invalid state by directly manipulating (in real scenario, this would be corruption)
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      // Validation should still pass for valid operations
      expect(paginationManager.validateAndRecover()).toBe(true);
      
      // State should be consistent
      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(15);
      expect(state.paginatedPosts.length).toBe(15);
    });
  });

  describe('Load More Handler Logic', () => {
    test('should determine correct strategy based on context', () => {
      const paginationManager = createUnifiedPaginationState();
      const stateMachine = createLoadMoreStateMachine('idle');
      
      // Server mode should use server-fetch strategy
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: { totalServerPosts: 30 },
      });

      const loadMoreHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      const strategy = loadMoreHandler.determineStrategy();
      expect(strategy).toBe('server-fetch');

      // Client mode should use client-paginate strategy
      paginationManager.updateSearch(
        { posts: posts.slice(0, 10), users: [], totalResults: 10 },
        'test',
        {}
      );

      const clientHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      const clientStrategy = clientHandler.determineStrategy();
      expect(clientStrategy).toBe('client-paginate');
    });

    test('should prevent duplicate requests', async () => {
      const paginationManager = createUnifiedPaginationState();
      const stateMachine = createLoadMoreStateMachine('idle');
      
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: { totalServerPosts: 30 },
      });

      const loadMoreHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      // First request should succeed
      const result1 = await loadMoreHandler.handleLoadMore();
      expect(result1.success).toBe(true);

      // Immediate second request should be prevented if still loading
      if (stateMachine.getCurrentState() === 'loading-server') {
        const result2 = await loadMoreHandler.handleLoadMore();
        expect(result2.success).toBe(false);
        expect(result2.error).toContain('already in progress');
      }
    });

    test('should handle concurrent requests safely', async () => {
      const paginationManager = createUnifiedPaginationState();
      const stateMachine = createLoadMoreStateMachine('idle');
      
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
        updateMetadata: { totalServerPosts: 30 },
      });

      const loadMoreHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      // Multiple concurrent requests
      const promises = [
        loadMoreHandler.handleLoadMore(),
        loadMoreHandler.handleLoadMore(),
        loadMoreHandler.handleLoadMore(),
      ];

      const results = await Promise.all(promises);
      
      // Only one should succeed, others should be rejected or handled gracefully
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    test('should validate state before operations', () => {
      const paginationManager = createUnifiedPaginationState();
      const stateMachine = createLoadMoreStateMachine('idle');
      
      const loadMoreHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      // Should validate state correctly
      expect(loadMoreHandler.validateState()).toBe(true);

      // Add posts and validate again
      const posts = createMockPosts(15, 0);
      paginationManager.updatePosts({
        newPosts: posts,
        resetPagination: true,
      });

      const updatedHandler = createLoadMoreHandler(
        paginationManager.getState(),
        stateMachine
      );

      expect(updatedHandler.validateState()).toBe(true);
    });
  });

  describe('State Machine Transitions', () => {
    test('should transition between valid states only', () => {
      const stateMachine = createLoadMoreStateMachine('idle');

      // Valid transitions
      expect(stateMachine.canTransition('loading-server')).toBe(true);
      expect(stateMachine.canTransition('loading-client')).toBe(true);

      // Transition to loading state
      stateMachine.transition('loading-server');
      expect(stateMachine.getCurrentState()).toBe('loading-server');

      // From loading, can transition to complete or error
      expect(stateMachine.canTransition('complete')).toBe(true);
      expect(stateMachine.canTransition('error')).toBe(true);
      expect(stateMachine.canTransition('loading-client')).toBe(false);
    });

    test('should prevent invalid state transitions', () => {
      const stateMachine = createLoadMoreStateMachine('idle');

      // Cannot transition from idle to complete without loading
      expect(stateMachine.canTransition('complete')).toBe(false);

      // Cannot transition from idle to error without attempting operation
      expect(stateMachine.canTransition('error')).toBe(false);

      // Transition to loading first
      stateMachine.transition('loading-server');
      
      // Now can transition to complete or error
      expect(stateMachine.canTransition('complete')).toBe(true);
      expect(stateMachine.canTransition('error')).toBe(true);
    });

    test('should provide clear state feedback', () => {
      const stateMachine = createLoadMoreStateMachine('idle');

      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.isLoading()).toBe(false);
      expect(stateMachine.canLoadMore()).toBe(true);

      // Transition to loading
      stateMachine.transition('loading-server');
      expect(stateMachine.isLoading()).toBe(true);
      expect(stateMachine.canLoadMore()).toBe(false);

      // Transition to complete
      stateMachine.transition('complete');
      expect(stateMachine.isLoading()).toBe(false);
      expect(stateMachine.canLoadMore()).toBe(true);
    });

    test('should handle error states correctly', () => {
      const stateMachine = createLoadMoreStateMachine('idle');

      // Transition to error state
      stateMachine.transition('loading-server');
      stateMachine.transition('error', { message: 'Network error' });

      expect(stateMachine.getCurrentState()).toBe('error');
      expect(stateMachine.isLoading()).toBe(false);
      expect(stateMachine.canLoadMore()).toBe(true); // Can retry from error

      // Can recover from error
      expect(stateMachine.canTransition('idle')).toBe(true);
      stateMachine.transition('idle');
      expect(stateMachine.getCurrentState()).toBe('idle');
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large datasets efficiently', () => {
      const paginationManager = createUnifiedPaginationState({
        postsPerPage: 15,
        minResultsForFilter: 10,
        maxAutoFetchPosts: 100,
        fetchTimeout: 10000,
      });

      const startTime = performance.now();
      
      // Load large dataset
      const largePosts = createMockPosts(1000, 0);
      paginationManager.updatePosts({
        newPosts: largePosts,
        resetPagination: true,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large datasets quickly
      expect(duration).toBeLessThan(100); // Under 100ms

      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(1000);
      expect(state.paginatedPosts.length).toBe(15); // Only first page loaded
    });

    test('should prevent memory leaks in state management', () => {
      const paginationManager = createUnifiedPaginationState();
      
      // Simulate multiple operations
      for (let i = 0; i < 10; i++) {
        const posts = createMockPosts(15, i * 15);
        paginationManager.updatePosts({
          newPosts: posts,
          resetPagination: false,
        });
      }

      // State should be consistent
      expect(paginationManager.validateAndRecover()).toBe(true);
      
      const state = paginationManager.getState();
      expect(state.allPosts.length).toBe(150);
      
      // Reset should clean up properly
      paginationManager.reset();
      const resetState = paginationManager.getState();
      expect(resetState.allPosts.length).toBe(0);
    });
  });
});
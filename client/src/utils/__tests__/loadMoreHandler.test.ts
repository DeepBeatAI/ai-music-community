/**
 * Unified Load More Handler Tests
 * 
 * Comprehensive test suite for the UnifiedLoadMoreHandler class
 * covering strategy selection, request handling, and error scenarios.
 */

import { UnifiedLoadMoreHandler, createLoadMoreHandler, determineLoadMoreStrategy } from '../loadMoreHandler';
import { LoadMoreStateMachine } from '../loadMoreStateMachine';
import { PaginationState, INITIAL_PAGINATION_STATE, ModeDetectionContext } from '@/types/pagination';
import { Post } from '@/types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to suppress output during tests
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'warn').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

describe('UnifiedLoadMoreHandler', () => {
  let handler: UnifiedLoadMoreHandler;
  let stateMachine: LoadMoreStateMachine;
  let paginationState: PaginationState;

  // Sample posts for testing
  const samplePosts: Post[] = [
    {
      id: '1',
      content: 'Test post 1',
      post_type: 'text',
      created_at: '2023-01-01T00:00:00Z',
      user_id: 'user1',
      like_count: 0,
      liked_by_user: false,
      user_profiles: { 
        username: 'user1',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: '2',
      content: 'Test post 2',
      post_type: 'audio',
      created_at: '2023-01-02T00:00:00Z',
      user_id: 'user2',
      audio_url: 'test.mp3',
      like_count: 5,
      liked_by_user: false,
      user_profiles: { 
        username: 'user2',
        user_id: 'user-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
    
    // Create fresh instances
    stateMachine = new LoadMoreStateMachine();
    paginationState = { ...INITIAL_PAGINATION_STATE };
    handler = new UnifiedLoadMoreHandler(paginationState, stateMachine);
  });

  afterEach(() => {
    // Clean up any pending requests
    handler.cancelPendingRequests();
  });

  describe('Initialization', () => {
    it('should initialize with provided state and state machine', () => {
      expect(handler).toBeInstanceOf(UnifiedLoadMoreHandler);
      expect(handler.getRequestStatus().isActive).toBe(false);
    });

    it('should create handler using factory function', () => {
      const factoryHandler = createLoadMoreHandler(paginationState, stateMachine);
      expect(factoryHandler).toBeInstanceOf(UnifiedLoadMoreHandler);
    });
  });

  describe('Strategy Determination', () => {
    it('should determine server-fetch strategy for unfiltered content', () => {
      const strategy = handler.determineStrategy();
      expect(strategy).toBe('server-fetch');
    });

    it('should determine client-paginate strategy for filtered content with sufficient data', () => {
      // Setup filtered state with sufficient data
      paginationState.hasFiltersApplied = true;
      paginationState.displayPosts = [...samplePosts, ...samplePosts]; // 4 posts
      paginationState.paginatedPosts = [samplePosts[0]]; // Only showing first post
      
      const strategy = handler.determineStrategy();
      expect(strategy).toBe('client-paginate');
    });

    it('should determine server-fetch strategy for auto-fetch scenario', () => {
      // Setup scenario where we need more data for filtering
      paginationState.hasFiltersApplied = true;
      paginationState.displayPosts = []; // No filtered results
      paginationState.allPosts = samplePosts.slice(0, 1); // Limited data
      paginationState.hasMorePosts = true;
      
      const strategy = handler.determineStrategy();
      expect(strategy).toBe('server-fetch'); // Should auto-fetch
    });
  });

  describe('State Validation', () => {
    it('should validate healthy state', () => {
      const validation = handler.validateState();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid pagination state', () => {
      // Create invalid state
      paginationState.currentPage = -1;
      paginationState.postsPerPage = 0;
      
      const validation = handler.validateState();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid current page');
      expect(validation.errors).toContain('Invalid posts per page');
    });

    it('should detect logical inconsistencies', () => {
      // Create inconsistent state
      paginationState.displayPosts = samplePosts;
      paginationState.allPosts = [samplePosts[0]]; // Fewer than display posts
      
      const validation = handler.validateState();
      expect(validation.warnings).toContain('Display posts exceed all posts');
    });
  });

  describe('Server Fetch Strategy', () => {
    beforeEach(() => {
      // Mock successful server response
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: samplePosts,
          hasMore: true,
        }),
      });
    });

    it('should successfully fetch posts from server', async () => {
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(true);
      expect(result.newPosts).toEqual(samplePosts);
      expect(result.hasMore).toBe(true);
      expect(result.strategy).toBe('server-fetch');
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/posts?page=2&limit=15',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle server errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Server request failed: 500');
      expect(result.strategy).toBe('server-fetch');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Client Pagination Strategy', () => {
    beforeEach(() => {
      // Setup for client pagination
      paginationState.hasFiltersApplied = true;
      paginationState.displayPosts = [...samplePosts, ...samplePosts]; // 4 posts total
      paginationState.paginatedPosts = samplePosts.slice(0, 1); // Only 1 showing
      paginationState.postsPerPage = 2;
    });

    it('should paginate through filtered posts', async () => {
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(true);
      expect(result.newPosts).toHaveLength(2); // Next 2 posts
      expect(result.hasMore).toBe(true); // More posts available
      expect(result.strategy).toBe('client-paginate');
    });

    it('should detect end of filtered posts', async () => {
      // Setup to be near end
      paginationState.paginatedPosts = [...samplePosts, samplePosts[0]]; // 3 posts showing
      
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(true);
      expect(result.newPosts).toHaveLength(1); // Only 1 post left
      expect(result.hasMore).toBe(false); // No more posts
    });
  });

  describe('Auto-Fetch Strategy', () => {
    beforeEach(() => {
      // Setup for auto-fetch scenario
      paginationState.hasFiltersApplied = true;
      paginationState.displayPosts = []; // No filtered results
      paginationState.allPosts = samplePosts.slice(0, 1); // Limited data
      paginationState.hasMorePosts = true;
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          posts: samplePosts,
          hasMore: true,
        }),
      });
    });

    it('should auto-fetch more posts for comprehensive filtering', async () => {
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(true);
      expect(result.newPosts).toEqual(samplePosts);
      expect(result.strategy).toBe('server-fetch');
      
      // Should fetch from appropriate page
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/posts?page='),
        expect.any(Object)
      );
    });
  });

  describe('Concurrent Request Prevention', () => {
    it('should prevent concurrent requests', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ posts: samplePosts, hasMore: true }),
        }), 100))
      );

      // Start first request
      const firstRequest = handler.handleLoadMore();
      
      // Try to start second request immediately
      const secondRequest = handler.handleLoadMore();
      
      const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);
      
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Request already in progress');
    });

    it('should allow new requests after previous completes', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ posts: samplePosts, hasMore: true }),
      });

      // First request
      const firstResult = await handler.handleLoadMore();
      expect(firstResult.success).toBe(true);
      
      // Second request after first completes
      const secondResult = await handler.handleLoadMore();
      expect(secondResult.success).toBe(true);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel pending requests', async () => {
      let abortSignal: AbortSignal | undefined;
      
      (fetch as jest.Mock).mockImplementation((url, options) => {
        abortSignal = options?.signal;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (abortSignal?.aborted) {
              reject(new Error('AbortError'));
            } else {
              resolve({
                ok: true,
                json: async () => ({ posts: samplePosts, hasMore: true }),
              });
            }
          }, 100);
        });
      });

      // Start request
      const requestPromise = handler.handleLoadMore();
      
      // Cancel immediately
      handler.cancelPendingRequests();
      
      const result = await requestPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Request cancelled');
    });

    it('should reset request status after cancellation', () => {
      handler.cancelPendingRequests();
      
      const status = handler.getRequestStatus();
      expect(status.isActive).toBe(false);
      expect(status.requestId).toBeNull();
    });
  });

  describe('State Updates', () => {
    it('should update pagination state with new posts', () => {
      const newPosts = [samplePosts[0]];
      
      handler.updatePaginationState({ newPosts });
      
      // Note: We can't directly access the internal state, but we can verify through behavior
      expect(handler.validateState().isValid).toBe(true);
    });

    it('should reset pagination when requested', () => {
      handler.updatePaginationState({ resetPagination: true });
      
      expect(handler.validateState().isValid).toBe(true);
    });

    it('should update metadata', () => {
      const metadata = { totalServerPosts: 100 };
      
      handler.updatePaginationState({ updateMetadata: metadata });
      
      expect(handler.validateState().isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid state gracefully', async () => {
      // Create invalid state
      paginationState.currentPage = -1;
      
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid state');
    });

    it('should handle state machine transition failures', async () => {
      // Create a spy on the transition method to make it fail
      const transitionSpy = jest.spyOn(stateMachine, 'transition').mockReturnValue(false);
      
      const result = await handler.handleLoadMore();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to transition to loading state');
      
      // Restore the spy
      transitionSpy.mockRestore();
    });
  });

  describe('Request Status Tracking', () => {
    it('should track request status during execution', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ posts: samplePosts, hasMore: true }),
        }), 50))
      );

      const requestPromise = handler.handleLoadMore();
      
      // Check status during request
      const statusDuringRequest = handler.getRequestStatus();
      expect(statusDuringRequest.isActive).toBe(true);
      expect(statusDuringRequest.requestId).toBeTruthy();
      expect(statusDuringRequest.strategy).toBe('server-fetch');
      
      await requestPromise;
      
      // Check status after request
      const statusAfterRequest = handler.getRequestStatus();
      expect(statusAfterRequest.isActive).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('determineLoadMoreStrategy', () => {
    it('should determine server-fetch for auto-fetch scenario', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 10,
        totalFilteredPosts: 5, // Less than 15
        currentPage: 1,
      };
      
      const strategy = determineLoadMoreStrategy(context);
      expect(strategy).toBe('server-fetch');
    });

    it('should determine client-paginate for sufficient filtered results', () => {
      const context: ModeDetectionContext = {
        isSearchActive: true,
        hasFiltersApplied: false,
        searchFiltersActive: true,
        totalLoadedPosts: 50,
        totalFilteredPosts: 30, // More than 15
        currentPage: 1,
      };
      
      const strategy = determineLoadMoreStrategy(context);
      expect(strategy).toBe('client-paginate');
    });

    it('should default to server-fetch for unfiltered content', () => {
      const context: ModeDetectionContext = {
        isSearchActive: false,
        hasFiltersApplied: false,
        searchFiltersActive: false,
        totalLoadedPosts: 15,
        totalFilteredPosts: 15,
        currentPage: 1,
      };
      
      const strategy = determineLoadMoreStrategy(context);
      expect(strategy).toBe('server-fetch');
    });
  });
});
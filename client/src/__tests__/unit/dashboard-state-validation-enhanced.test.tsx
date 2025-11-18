/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import DashboardPage from '@/app/dashboard/page';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        }))
      }))
    }))
  }
}));

// Mock unified pagination system
jest.mock('@/utils/unifiedPaginationState', () => ({
  createUnifiedPaginationState: jest.fn(() => ({
    getState: jest.fn(() => ({
      allPosts: [],
      displayPosts: [],
      paginatedPosts: [],
      currentPage: 1,
      totalPages: 1,
      hasMorePosts: false,
      isLoading: false,
      isLoadingMore: false,
      isSearchActive: false,
      searchResults: null,
      searchQuery: '',
      searchFilters: {},
      hasFiltersApplied: false,
      postsPerPage: 15,
      paginationMode: 'server',
      metadata: {
        visibleFilteredPosts: 0,
        lastFetchTimestamp: Date.now()
      }
    })),
    subscribe: jest.fn(),
    updatePosts: jest.fn(),
    setLoadingState: jest.fn(),
    getDebugInfo: jest.fn(() => ({
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    })),
    reset: jest.fn(),
    updateSearch: jest.fn(),
    clearSearch: jest.fn(),
    updateFilters: jest.fn(),
    updateTotalPostsCount: jest.fn()
  }))
}));

jest.mock('@/utils/loadMoreHandler', () => ({
  createLoadMoreHandler: jest.fn(() => ({
    handleLoadMore: jest.fn(() => Promise.resolve({
      success: true,
      strategy: 'client-paginate',
      newPosts: [],
      error: null
    }))
  }))
}));

jest.mock('@/utils/loadMoreStateMachine', () => ({
  createLoadMoreStateMachine: jest.fn(() => ({}))
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Helper to create complete auth context mock
const createMockAuthContext = (overrides: any = {}) => ({
  user: null,
  profile: null,
  loading: false,
  session: null,
  signIn: jest.fn() as any,
  signUp: jest.fn() as any,
  signOut: jest.fn() as any,
  refreshProfile: jest.fn() as any,
  userTypeInfo: null,
  isAdmin: false,
  userTypeLoading: false,
  userTypeError: null,
  ...overrides
});

describe('Dashboard State Validation Effect - Task 2 Implementation', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    
    // Mock console methods to capture validation logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Requirement 2.3: Read-only validation that never triggers data fetching', () => {
    it('should validate state without calling fetchPosts or triggering re-renders', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      // Mock pagination manager with validation warnings
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => ({
          validation: {
            isValid: false,
            errors: ['Test validation error'],
            warnings: ['Test validation warning']
          }
        })),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      // Override the mock to return our test manager
      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for validation effect to run
      await waitFor(() => {
        expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      });

      // Verify that validation runs but never calls data fetching methods
      expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      expect(mockPaginationManager.updatePosts).not.toHaveBeenCalled();
      expect(mockPaginationManager.setLoadingState).not.toHaveBeenCalled();
      expect(mockPaginationManager.reset).not.toHaveBeenCalled();

      // Verify validation warnings are logged
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('State validation warnings:'),
        expect.any(Object)
      );
    });

    it('should handle validation errors without triggering state updates', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      // Mock pagination manager that throws validation error
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => {
          throw new Error('Validation system failure');
        }),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for validation effect to run and handle error
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('State validation process failed:'),
          expect.any(Object)
        );
      });

      // Verify no state-modifying methods were called despite error
      expect(mockPaginationManager.updatePosts).not.toHaveBeenCalled();
      expect(mockPaginationManager.setLoadingState).not.toHaveBeenCalled();
      expect(mockPaginationManager.reset).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 2.4: useEffect should not run unless auth state changes', () => {
    it('should only depend on paginationState and error, not trigger on other state changes', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => ({
          validation: {
            isValid: true,
            errors: [],
            warnings: []
          }
        })),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for initial validation
      await waitFor(() => {
        expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      });

      const initialCallCount = mockPaginationManager.getDebugInfo.mock.calls.length;

      // Simulate pagination state change by calling subscribe callback
      const subscribeCallback = mockPaginationManager.subscribe.mock.calls[0][0] as (state: any) => void;
      subscribeCallback({
        ...mockPaginationManager.getState(),
        currentPage: 2
      });

      // Wait for potential validation re-run
      await waitFor(() => {
        // Validation should run again due to pagination state change
        expect(mockPaginationManager.getDebugInfo.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      // Verify validation runs but doesn't trigger data fetching
      expect(mockPaginationManager.updatePosts).not.toHaveBeenCalled();
      expect(mockPaginationManager.setLoadingState).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 5.1: Eliminate React error messages', () => {
    it('should handle critical validation errors without causing React errors', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      // Mock pagination manager with critical errors
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => ({
          validation: {
            isValid: false,
            errors: ['Maximum update depth exceeded', 'currentPage validation failed'],
            warnings: []
          }
        })),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for validation to handle critical errors
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('CRITICAL state validation errors detected:'),
          expect.any(Object)
        );
      });

      // Verify error is displayed to user
      expect(screen.getByText(/Critical pagination error detected/)).toBeInTheDocument();
    });
  });

  describe('Requirement 5.2: Prevent infinite re-render warnings', () => {
    it('should validate state with timeout to prevent blocking main thread', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      // Mock slow validation that would timeout
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => {
          // Simulate slow validation
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                validation: {
                  isValid: true,
                  errors: [],
                  warnings: []
                }
              });
            }, 1500); // Longer than 1000ms timeout
          });
        }),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for timeout warning
      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('State validation timeout')
        );
      }, { timeout: 2000 });
    });

    it('should clear validation errors when state becomes valid', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser
      }));

      let validationCallCount = 0;
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [],
          displayPosts: [],
          paginatedPosts: [],
          currentPage: 1,
          totalPages: 1,
          hasMorePosts: false,
          isLoading: false,
          isLoadingMore: false,
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 15,
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 0,
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => {
          validationCallCount++;
          // First call returns error, second call returns valid
          if (validationCallCount === 1) {
            return {
              validation: {
                isValid: false,
                errors: ['pagination state error'],
                warnings: []
              }
            };
          } else {
            return {
              validation: {
                isValid: true,
                errors: [],
                warnings: []
              }
            };
          }
        }),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for first validation with error
      await waitFor(() => {
        expect(screen.getByText(/Pagination state error detected/)).toBeInTheDocument();
      });

      // Trigger second validation by calling subscribe callback
      const subscribeCallback = mockPaginationManager.subscribe.mock.calls[0][0] as (state: any) => void;
      subscribeCallback(mockPaginationManager.getState());

      // Wait for error to be cleared
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Clearing validation errors - state is now valid')
        );
      });
    });
  });

  describe('Enhanced Dashboard-Specific Validation', () => {
    it('should detect and categorize critical validation issues', async () => {
      const mockUser = { 
        id: 'test-user', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser,
        signOut: jest.fn() as () => Promise<void>,
        refreshProfile: jest.fn() as () => Promise<void>
      }));

      // Mock state with critical issues
      const mockPaginationManager = {
        getState: jest.fn(() => ({
          allPosts: [{ id: '1' }, { id: '2' }],
          displayPosts: [{ id: '1' }, { id: '2' }],
          paginatedPosts: [],
          currentPage: 0, // Invalid page number
          totalPages: 1,
          hasMorePosts: false,
          isLoading: true, // Loading with existing posts
          isLoadingMore: true, // Both loading states true
          isSearchActive: false,
          searchResults: null,
          searchQuery: '',
          searchFilters: {},
          hasFiltersApplied: false,
          postsPerPage: 10, // Doesn't match POSTS_PER_PAGE constant
          paginationMode: 'server',
          metadata: {
            visibleFilteredPosts: 5, // Doesn't match paginatedPosts.length
            lastFetchTimestamp: Date.now()
          }
        })),
        subscribe: jest.fn(),
        updatePosts: jest.fn(),
        setLoadingState: jest.fn(),
        getDebugInfo: jest.fn(() => ({
          validation: {
            isValid: true,
            errors: [],
            warnings: []
          }
        })),
        reset: jest.fn(),
        updateSearch: jest.fn(),
        clearSearch: jest.fn(),
        updateFilters: jest.fn(),
        updateTotalPostsCount: jest.fn()
      };

      const { createUnifiedPaginationState } = require('@/utils/unifiedPaginationState');
      createUnifiedPaginationState.mockReturnValue(mockPaginationManager);

      render(<DashboardPage />);

      // Wait for dashboard-specific validation to detect issues
      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Dashboard-specific validation results:'),
          expect.objectContaining({
            criticalIssues: expect.any(Array),
            warningIssues: expect.any(Array)
          })
        );
      });

      // Should show error for critical issues
      expect(screen.getByText(/Dashboard state validation failed/)).toBeInTheDocument();
    });
  });
});
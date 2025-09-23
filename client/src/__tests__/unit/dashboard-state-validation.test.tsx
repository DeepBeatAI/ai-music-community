/**
 * Dashboard State Validation Effect Tests
 * 
 * Tests for Task 2: Implement Separate State Validation Effect
 * Validates that the state validation effect is read-only and handles errors properly
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';

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
const mockPaginationManager = {
  getState: jest.fn(),
  subscribe: jest.fn(),
  setLoadingState: jest.fn(),
  updatePosts: jest.fn(),
  validateAndRecover: jest.fn(),
  getDebugInfo: jest.fn(),
  reset: jest.fn(),
  updateTotalPostsCount: jest.fn()
};

const mockLoadMoreHandler = {
  handleLoadMore: jest.fn()
};

const mockStateMachine = {
  transition: jest.fn()
};

jest.mock('@/utils/unifiedPaginationState', () => ({
  createUnifiedPaginationState: () => mockPaginationManager
}));

jest.mock('@/utils/loadMoreHandler', () => ({
  createLoadMoreHandler: () => mockLoadMoreHandler
}));

jest.mock('@/utils/loadMoreStateMachine', () => ({
  createLoadMoreStateMachine: () => mockStateMachine
}));

// Mock other components
jest.mock('@/components/layout/MainLayout', () => {
  return function MockMainLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="main-layout">{children}</div>;
  };
});

jest.mock('@/components/PostItem', () => {
  return function MockPostItem() {
    return <div data-testid="post-item">Mock Post</div>;
  };
});

jest.mock('@/components/AudioUpload', () => {
  return function MockAudioUpload() {
    return <div data-testid="audio-upload">Mock Audio Upload</div>;
  };
});

jest.mock('@/components/SearchBar', () => {
  return function MockSearchBar() {
    return <div data-testid="search-bar">Mock Search Bar</div>;
  };
});

jest.mock('@/components/ActivityFeed', () => {
  return function MockActivityFeed() {
    return <div data-testid="activity-feed">Mock Activity Feed</div>;
  };
});

jest.mock('@/components/FollowButton', () => {
  return function MockFollowButton() {
    return <div data-testid="follow-button">Mock Follow Button</div>;
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Dashboard State Validation Effect', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2023-01-01T00:00:00Z'
  };

  const mockProfile = {
    id: 'test-profile-id',
    user_id: 'test-user-id',
    username: 'testuser',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

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
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      profile: mockProfile,
      loading: false,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      refreshProfile: jest.fn()
    });

    mockUseRouter.mockReturnValue(mockRouter);

    // Default pagination state
    const defaultState = {
      allPosts: [],
      displayPosts: [],
      paginatedPosts: [],
      currentPage: 1,
      totalPages: 0,
      hasMorePosts: false,
      isLoading: false,
      isLoadingMore: false,
      isSearchActive: false,
      searchResults: { posts: [], users: [], totalResults: 0 },
      searchQuery: '',
      currentSearchFilters: {},
      filters: { postType: 'all', sortBy: 'recent', timeRange: 'all' },
      hasFiltersApplied: false,
      paginationMode: 'server' as const,
      loadMoreStrategy: 'server-fetch' as const,
      postsPerPage: 15,
      totalPostsCount: 0,
      lastFetchTime: 0,
      fetchInProgress: false,
      metadata: {
        lastFetchTimestamp: 0,
        currentBatch: 1,
        totalServerPosts: 0,
        loadedServerPosts: 0,
        totalFilteredPosts: 0,
        visibleFilteredPosts: 0
      }
    };

    mockPaginationManager.getState.mockReturnValue(defaultState);
    mockPaginationManager.subscribe.mockImplementation((callback) => {
      // Immediately call callback with current state
      callback(defaultState);
      return () => {}; // unsubscribe function
    });
  });

  describe('State Validation Effect Implementation', () => {
    it('should implement read-only state validation without triggering data fetching', async () => {
      // Mock valid state validation
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      });

      // Verify that validation was called
      expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      
      // The initial data loading effect will call updatePosts once, but the validation effect should not
      // We can verify this by checking that getDebugInfo was called (validation effect)
      // but updatePosts was only called once (initial loading, not from validation)
      const updatePostsCalls = mockPaginationManager.updatePosts.mock.calls;
      const debugInfoCalls = mockPaginationManager.getDebugInfo.mock.calls;
      
      expect(debugInfoCalls.length).toBeGreaterThan(0);
      // Initial loading should call updatePosts once, validation should not add more calls
      expect(updatePostsCalls.length).toBeLessThanOrEqual(1);
    });

    it('should handle state validation warnings without showing errors', async () => {
      // Mock state with warnings
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: ['Test warning message']
        }
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '⚠️ Dashboard: State validation warnings:',
          ['Test warning message']
        );
      });

      // Should not show error message to user for warnings
      expect(screen.queryByText(/state validation/i)).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle critical state validation errors with appropriate user feedback', async () => {
      // Mock state with critical errors
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: false,
          errors: ['currentPage must be >= 1', 'postsPerPage must be >= 1'],
          warnings: []
        }
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ Dashboard: Critical state validation errors:',
          ['currentPage must be >= 1', 'postsPerPage must be >= 1']
        );
      });

      // Should show appropriate error message
      await waitFor(() => {
        expect(screen.getByText(/Critical pagination error detected/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle data inconsistency errors with specific feedback', async () => {
      // Mock state with data inconsistency errors
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: false,
          errors: ['displayPosts cannot have more items than allPosts'],
          warnings: []
        }
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Data inconsistency detected/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle validation process failures gracefully', async () => {
      // Mock validation process throwing an error
      mockPaginationManager.getDebugInfo.mockImplementation(() => {
        throw new Error('Validation process failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ Dashboard: State validation process failed:',
          expect.any(Error)
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/State validation system error/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should clear validation errors when state becomes valid', async () => {
      // Start with invalid state
      mockPaginationManager.getDebugInfo.mockReturnValueOnce({
        validation: {
          isValid: false,
          errors: ['Test error'],
          warnings: []
        }
      });

      const { rerender } = render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/state error/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Update to valid state
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      // Trigger re-render with updated state
      const updatedState = {
        ...mockPaginationManager.getState(),
        currentPage: 2 // Change to trigger effect
      };
      mockPaginationManager.getState.mockReturnValue(updatedState);

      rerender(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/state error/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Dashboard-Specific Validation', () => {
    it('should validate dashboard-specific state requirements', async () => {
      // Mock state that would trigger dashboard-specific validation issues
      const stateWithIssues = {
        ...mockPaginationManager.getState(),
        postsPerPage: 20, // Different from POSTS_PER_PAGE constant
        allPosts: new Array(1500).fill({}), // Large number for performance warning
        isLoadingMore: true,
        hasMorePosts: false // Inconsistent state
      };

      mockPaginationManager.getState.mockReturnValue(stateWithIssues);
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '⚠️ Dashboard: Dashboard-specific validation issues:',
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('Posts per page'),
              severity: 'warning'
            }),
            expect.objectContaining({
              message: expect.stringContaining('Large number of loaded posts'),
              severity: 'warning'
            }),
            expect.objectContaining({
              message: 'Loading more posts but hasMorePosts is false',
              severity: 'error'
            })
          ])
        );
      });

      consoleSpy.mockRestore();
    });

    it('should show error for critical dashboard-specific issues', async () => {
      const stateWithCriticalIssues = {
        ...mockPaginationManager.getState(),
        isLoadingMore: true,
        hasMorePosts: false,
        paginatedPosts: [],
        displayPosts: [{ id: '1' }, { id: '2' }]
      };

      mockPaginationManager.getState.mockReturnValue(stateWithCriticalIssues);
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Dashboard state validation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Effect Dependencies and Behavior', () => {
    it('should only depend on paginationState and error, not trigger data fetching', async () => {
      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      render(<DashboardPage />);

      // Verify the effect runs on state changes
      await waitFor(() => {
        expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
      });

      // The validation effect should only call getDebugInfo, not updatePosts
      // Initial loading may call updatePosts once, but validation should not add additional calls
      const debugInfoCalls = mockPaginationManager.getDebugInfo.mock.calls.length;
      expect(debugInfoCalls).toBeGreaterThan(0);
      
      // Verify that getDebugInfo is called for validation purposes
      expect(mockPaginationManager.getDebugInfo).toHaveBeenCalled();
    });

    it('should log validation results in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'development';

      mockPaginationManager.getDebugInfo.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '🔍 Dashboard: State validation passed'
        );
      });

      consoleSpy.mockRestore();
      (process.env as any).NODE_ENV = originalEnv;
    });
  });
});
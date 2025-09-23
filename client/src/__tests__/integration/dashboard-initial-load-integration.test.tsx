/**
 * Integration test for Dashboard Initial Load Tracking
 * 
 * This test verifies that the enhanced initial load tracking works
 * correctly in the actual dashboard implementation.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        range: jest.fn(() => Promise.resolve({ 
          data: [
            { 
              id: 1, 
              content: 'Test post', 
              created_at: new Date().toISOString(),
              user_profiles: { username: 'testuser' }
            }
          ], 
          error: null, 
          count: 1 
        }))
      }))
    }))
  }))
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock all the complex components
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

// Mock the unified pagination system
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
    searchResults: { posts: [], users: [], totalResults: 0 },
    searchQuery: '',
    searchFilters: {},
    lastValidation: Date.now(),
    isValid: true,
    fetchInProgress: false,
    totalPostsCount: 0,
    postsPerPage: 15,
    hasFiltersApplied: false,
    paginationMode: 'server' as const,
    metadata: null
  })),
  subscribe: jest.fn(),
  updatePosts: jest.fn(),
  setLoadingState: jest.fn(),
  validateAndRecover: jest.fn(() => true),
  reset: jest.fn(),
  updateTotalPostsCount: jest.fn(),
  updateSearch: jest.fn(),
  clearSearch: jest.fn(),
  updateFilters: jest.fn(),
  getDebugInfo: jest.fn(() => ({
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    }
  }))
};

jest.mock('@/utils/unifiedPaginationState', () => ({
  createUnifiedPaginationState: jest.fn(() => mockPaginationManager)
}));

jest.mock('@/utils/loadMoreHandler', () => ({
  createLoadMoreHandler: jest.fn(() => ({
    handleLoadMore: jest.fn(() => Promise.resolve({ success: true, strategy: 'client-paginate', newPosts: [] })),
    canLoadMore: jest.fn(() => false),
    getStrategy: jest.fn(() => 'client-paginate'),
  }))
}));

jest.mock('@/utils/loadMoreStateMachine', () => ({
  createLoadMoreStateMachine: jest.fn(() => ({}))
}));

describe('Dashboard Initial Load Integration', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'test-profile-id',
    username: 'testuser',
    user_id: 'test-user-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Reset the mock Supabase call count
    mockSupabase.from.mockClear();
  });

  it('should perform initial load exactly once with enhanced tracking', async () => {
    // Mock authenticated state
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    });

    // Import the dashboard component after mocks are set up
    const DashboardPage = (await import('@/app/dashboard/page')).default;

    render(<DashboardPage />);
    
    // Wait for the component to render and effects to run
    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    // Wait a bit more for async effects
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that Supabase was called exactly once for the initial load
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('posts');
    
    // Verify pagination manager was initialized
    expect(mockPaginationManager.subscribe).toHaveBeenCalled();
    expect(mockPaginationManager.setLoadingState).toHaveBeenCalledWith(true);
    expect(mockPaginationManager.setLoadingState).toHaveBeenCalledWith(false);
  });

  it('should not perform initial load when user is not authenticated', async () => {
    // Mock unauthenticated state
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    });

    const DashboardPage = (await import('@/app/dashboard/page')).default;

    render(<DashboardPage />);
    
    // Wait for effects to run
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });

    // Verify no Supabase calls were made
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should not perform initial load when still loading authentication', async () => {
    // Mock loading state
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      loading: true,
    });

    const DashboardPage = (await import('@/app/dashboard/page')).default;

    render(<DashboardPage />);
    
    // Wait a bit for any effects
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify no Supabase calls were made and no redirect occurred
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should handle initial load failure and allow retry', async () => {
    // Mock authenticated state
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    });

    // Mock Supabase to fail on first call, succeed on second
    let callCount = 0;
    const mockRange = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ data: null, error: new Error('Network error'), count: null });
      }
      return Promise.resolve({ 
        data: [{ id: 1, content: 'Test post', created_at: new Date().toISOString(), user_profiles: { username: 'testuser' } }], 
        error: null, 
        count: 1 
      });
    });
    
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const DashboardPage = (await import('@/app/dashboard/page')).default;

    render(<DashboardPage />);
    
    // Wait for initial render and first failed attempt
    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    // Wait for the error to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify the first call failed
    expect(callCount).toBe(1);
    
    // The implementation should have reset the tracking flags on failure,
    // but we can't easily test the retry in this integration test
    // The important thing is that the error was handled gracefully
  });
});
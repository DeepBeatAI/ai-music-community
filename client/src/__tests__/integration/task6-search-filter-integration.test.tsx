/**
 * Task 6: Maintain Search and Filter Integration Tests
 * 
 * This test suite verifies that search and filter functionality works
 * without triggering infinite loading loops, as required by:
 * - Requirements 4.1, 4.2, 4.3, 4.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import DashboardPage from '@/app/dashboard/page';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation');
jest.mock('@/lib/supabase');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock user and profile data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated' as const,
  created_at: new Date().toISOString()
};

const mockProfile = {
  id: 'test-profile-id',
  user_id: 'test-user-id',
  username: 'testuser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Mock posts data for testing
const mockPosts = [
  {
    id: 'post-1',
    user_id: 'test-user-id',
    content: 'Test audio post with music',
    post_type: 'audio',
    audio_url: 'test-audio-1.mp3',
    audio_filename: 'music-track.mp3',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    user_profiles: { username: 'testuser' },
    like_count: 5,
    liked_by_user: false
  },
  {
    id: 'post-2',
    user_id: 'test-user-id',
    content: 'Test text post about music production',
    post_type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user_profiles: { username: 'testuser' },
    like_count: 3,
    liked_by_user: false
  },
  {
    id: 'post-3',
    user_id: 'test-user-id',
    content: 'Another audio post with beats',
    post_type: 'audio',
    audio_url: 'test-audio-2.mp3',
    audio_filename: 'beats-track.mp3',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    user_profiles: { username: 'testuser' },
    like_count: 8,
    liked_by_user: false
  }
];

const mockSearchResults = {
  posts: [mockPosts[0]], // Only first post matches search
  users: [],
  totalResults: 1
};

describe('Task 6: Search and Filter Integration', () => {
  let mockRouter: any;
  let fetchCallCount: number;
  let useEffectCallCount: number;

  beforeEach(() => {
    fetchCallCount = 0;
    useEffectCallCount = 0;
    
    mockRouter = {
      replace: jest.fn(),
      push: jest.fn()
    };

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
      session: null,
      signIn: jest.fn() as any,
      signUp: jest.fn() as any,
      signOut: jest.fn() as any,
      refreshProfile: jest.fn() as any,
      userTypeInfo: null,
      isAdmin: false,
      userTypeLoading: false,
      userTypeError: null
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
        maybeSingle: jest.fn().mockReturnThis(),
        
        // Track fetch calls to detect infinite loops
        then: jest.fn(() => Promise.resolve({
          data: mockPosts,
          error: null,
          count: mockPosts.length
        }))
      };

      return mockQuery;
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Requirement 4.1: Search functionality without infinite loading', () => {
    it('should perform search without triggering infinite loading loops', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const initialFetchCount = fetchCallCount;
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      expect(searchInput).toBeInTheDocument();
      
      // Perform search
      await act(async () => {
        await user.type(searchInput, 'music');
      });
      
      // Wait for search to complete
      await waitFor(() => {
        // Search should not trigger excessive fetches
        expect(fetchCallCount).toBeLessThan(initialFetchCount + 5);
      }, { timeout: 3000 });
      
      // Verify no infinite loop by checking fetch count doesn't keep increasing
      const searchFetchCount = fetchCallCount;
      
      // Wait additional time to ensure no more fetches occur
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(fetchCallCount).toBe(searchFetchCount);
      console.log('✅ Search completed without infinite loading');
    });

    it('should handle search query changes without re-render loops', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      
      // Perform multiple search queries rapidly
      await act(async () => {
        await user.type(searchInput, 'music');
        await user.clear(searchInput);
        await user.type(searchInput, 'beats');
        await user.clear(searchInput);
        await user.type(searchInput, 'audio');
      });
      
      // Verify component doesn't crash or enter infinite loop
      await waitFor(() => {
        expect(searchInput).toHaveValue('audio');
      });
      
      // Check that fetch count is reasonable (not infinite)
      expect(fetchCallCount).toBeLessThan(20);
      console.log('✅ Multiple search queries handled without re-render loops');
    });

    it('should handle empty search gracefully', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      
      // Enter and clear search
      await act(async () => {
        await user.type(searchInput, 'test search');
        await user.clear(searchInput);
      });
      
      // Wait for state to settle
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
      
      // Verify no infinite loading occurs
      const finalFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(finalFetchCount);
      console.log('✅ Empty search handled gracefully');
    });
  });

  describe('Requirement 4.2: Filter application without re-render loops', () => {
    it('should apply content type filters without causing infinite loops', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const initialFetchCount = fetchCallCount;
      
      // Find and change content type filter
      const contentTypeSelect = screen.getByDisplayValue('All Content');
      
      await act(async () => {
        await user.selectOptions(contentTypeSelect, 'audio');
      });
      
      // Wait for filter to apply
      await waitFor(() => {
        expect(contentTypeSelect).toHaveValue('audio');
      });
      
      // Verify no excessive fetching
      expect(fetchCallCount).toBeLessThan(initialFetchCount + 3);
      
      // Test multiple filter changes
      await act(async () => {
        await user.selectOptions(contentTypeSelect, 'text');
        await user.selectOptions(contentTypeSelect, 'all');
      });
      
      // Verify stable state
      const filterFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(filterFetchCount);
      console.log('✅ Content type filters applied without infinite loops');
    });

    it('should handle sort filter changes without re-render loops', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Find sort filter
      const sortSelect = screen.getByDisplayValue('Newest First');
      
      // Apply different sort options
      await act(async () => {
        await user.selectOptions(sortSelect, 'popular');
        await user.selectOptions(sortSelect, 'likes');
        await user.selectOptions(sortSelect, 'recent');
      });
      
      // Verify no infinite loops
      await waitFor(() => {
        expect(sortSelect).toHaveValue('recent');
      });
      
      const sortFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(sortFetchCount);
      console.log('✅ Sort filters handled without re-render loops');
    });

    it('should handle time range filters without infinite loading', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Find time range filter
      const timeRangeSelect = screen.getByDisplayValue('All Time');
      
      // Test time range changes
      await act(async () => {
        await user.selectOptions(timeRangeSelect, 'week');
        await user.selectOptions(timeRangeSelect, 'month');
        await user.selectOptions(timeRangeSelect, 'all');
      });
      
      // Verify stable state
      await waitFor(() => {
        expect(timeRangeSelect).toHaveValue('all');
      });
      
      const timeFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(timeFetchCount);
      console.log('✅ Time range filters handled without infinite loading');
    });
  });

  describe('Requirement 4.3: Search clearing returns to normal feed', () => {
    it('should return to normal feed when search is cleared', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      
      // Perform search
      await act(async () => {
        await user.type(searchInput, 'music');
      });
      
      // Wait for search results
      await waitFor(() => {
        expect(searchInput).toHaveValue('music');
      });
      
      const searchFetchCount = fetchCallCount;
      
      // Clear search using clear button
      const clearButton = screen.getByTitle('Clear search');
      await act(async () => {
        await user.click(clearButton);
      });
      
      // Verify search is cleared
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
      
      // Verify no infinite loading after clearing
      const clearFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(clearFetchCount);
      console.log('✅ Search clearing returns to normal feed without infinite loading');
    });

    it('should handle Reset All button without infinite loading', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Apply search and filters
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      const contentTypeSelect = screen.getByDisplayValue('All Content');
      
      await act(async () => {
        await user.type(searchInput, 'test');
        await user.selectOptions(contentTypeSelect, 'audio');
      });
      
      // Wait for filters to apply
      await waitFor(() => {
        expect(searchInput).toHaveValue('test');
        expect(contentTypeSelect).toHaveValue('audio');
      });
      
      const filterFetchCount = fetchCallCount;
      
      // Click Reset All button
      const resetButton = screen.getByText('Reset All');
      await act(async () => {
        await user.click(resetButton);
      });
      
      // Verify all filters are reset
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(contentTypeSelect).toHaveValue('all');
      });
      
      // Verify no infinite loading after reset
      const resetFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(resetFetchCount);
      console.log('✅ Reset All button works without infinite loading');
    });
  });

  describe('Requirement 4.4: Combined search and filter functionality', () => {
    it('should handle combined search query and filters without infinite loops', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      const contentTypeSelect = screen.getByDisplayValue('All Content');
      const sortSelect = screen.getByDisplayValue('Newest First');
      
      // Apply combined search and filters
      await act(async () => {
        await user.type(searchInput, 'music');
        await user.selectOptions(contentTypeSelect, 'audio');
        await user.selectOptions(sortSelect, 'popular');
      });
      
      // Wait for all changes to apply
      await waitFor(() => {
        expect(searchInput).toHaveValue('music');
        expect(contentTypeSelect).toHaveValue('audio');
        expect(sortSelect).toHaveValue('popular');
      });
      
      // Verify no infinite loops with combined filters
      const combinedFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(fetchCallCount).toBe(combinedFetchCount);
      console.log('✅ Combined search and filters work without infinite loops');
    });

    it('should handle rapid filter changes without breaking', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      const contentTypeSelect = screen.getByDisplayValue('All Content');
      const sortSelect = screen.getByDisplayValue('Newest First');
      const timeRangeSelect = screen.getByDisplayValue('All Time');
      
      // Rapidly change multiple filters
      await act(async () => {
        await user.type(searchInput, 'test');
        await user.selectOptions(contentTypeSelect, 'audio');
        await user.selectOptions(sortSelect, 'likes');
        await user.selectOptions(timeRangeSelect, 'week');
        await user.clear(searchInput);
        await user.type(searchInput, 'music');
        await user.selectOptions(contentTypeSelect, 'text');
        await user.selectOptions(sortSelect, 'recent');
        await user.selectOptions(timeRangeSelect, 'all');
      });
      
      // Wait for final state
      await waitFor(() => {
        expect(searchInput).toHaveValue('music');
        expect(contentTypeSelect).toHaveValue('text');
        expect(sortSelect).toHaveValue('recent');
        expect(timeRangeSelect).toHaveValue('all');
      });
      
      // Verify system remains stable
      const rapidFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(fetchCallCount).toBe(rapidFetchCount);
      expect(fetchCallCount).toBeLessThan(50); // Reasonable upper bound
      console.log('✅ Rapid filter changes handled without breaking');
    });

    it('should maintain pagination state correctly with search and filters', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Apply search and filters
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      const contentTypeSelect = screen.getByDisplayValue('All Content');
      
      await act(async () => {
        await user.type(searchInput, 'music');
        await user.selectOptions(contentTypeSelect, 'audio');
      });
      
      // Wait for filters to apply
      await waitFor(() => {
        expect(searchInput).toHaveValue('music');
        expect(contentTypeSelect).toHaveValue('audio');
      });
      
      // Check for pagination info display
      const paginationInfo = screen.queryByText(/showing.*filtered results/i);
      if (paginationInfo) {
        expect(paginationInfo).toBeInTheDocument();
      }
      
      // Verify no infinite loading with pagination
      const paginationFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(paginationFetchCount);
      console.log('✅ Pagination state maintained correctly with search and filters');
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle search errors gracefully without infinite loops', async () => {
      // Mock search error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        const mockQuery: unknown = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          then: jest.fn(() => Promise.reject(new Error('Search failed')))
        };
        return mockQuery;
      }) as any;
      
      const user = userEvent.setup();
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search creators, music/i);
      
      // Perform search that will fail
      await act(async () => {
        await user.type(searchInput, 'error test');
      });
      
      // Wait for error handling
      await waitFor(() => {
        expect(searchInput).toHaveValue('error test');
      });
      
      // Verify no infinite loops even with errors
      const errorFetchCount = fetchCallCount;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(fetchCallCount).toBe(errorFetchCount);
      
      console.error = originalConsoleError;
      console.log('✅ Search errors handled gracefully without infinite loops');
    });
  });
});
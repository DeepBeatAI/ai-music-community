/**
 * Task 5: Preserve Load More Functionality - Integration Test
 * 
 * This test validates that the load more functionality continues to work correctly
 * after the dependency fixes implemented in previous tasks.
 * 
 * Requirements tested:
 * - 3.1: Load more button continues working after dependency fixes
 * - 3.2: Additional posts append correctly without triggering initial reload
 * - 3.3: Load more works with search results
 * - 3.4: Load more works with filter results
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '@/app/dashboard/page';
import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock audio utilities
jest.mock('@/utils/audio', () => ({
  uploadAudioFile: jest.fn(),
  validateAudioFile: jest.fn(),
  getAudioDuration: jest.fn(),
  getBestAudioUrl: jest.fn(),
  formatFileSize: jest.fn(),
  formatDuration: jest.fn(),
}));

// Mock audio cache utilities
jest.mock('@/utils/audioCache', () => ({
  getCachedAudioUrl: jest.fn(),
  isAudioUrlExpired: jest.fn(),
}));

// Mock validation utilities
jest.mock('@/utils/validation', () => ({
  validatePostContent: jest.fn(() => []),
}));

// Mock components
jest.mock('@/components/layout/MainLayout', () => {
  return function MockMainLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="main-layout">{children}</div>;
  };
});

jest.mock('@/components/PostItem', () => {
  return function MockPostItem({ post }: { post: Post }) {
    return (
      <div data-testid={`post-${post.id}`}>
        <p>{post.content}</p>
      </div>
    );
  };
});

jest.mock('@/components/AudioUpload', () => {
  return function MockAudioUpload() {
    return <div data-testid="audio-upload">Audio Upload</div>;
  };
});

jest.mock('@/components/SearchBar', () => {
  return function MockSearchBar({ 
    onSearch,
    onFiltersChange 
  }: { 
    onSearch?: (results: { posts: Post[]; users: UserProfile[]; totalResults: number }, query: string) => void;
    onFiltersChange?: (filters: any) => void;
  }) {
    return (
      <div data-testid="search-bar">
        <input
          data-testid="search-input"
          placeholder="Search posts and creators..."
          onChange={(e) => {
            if (onSearch && e.target.value) {
              // Simulate search results
              const searchResults = {
                posts: [
                  {
                    id: 'search-post-1',
                    content: 'Search result post 1',
                    post_type: 'text' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: 'test-user-id',
                    like_count: 5,
                    liked_by_user: false,
                    user_profiles: {
                      username: 'testuser',
                      user_id: 'test-user-id',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  }
                ],
                users: [],
                totalResults: 1
              };
              onSearch(searchResults, e.target.value);
            }
          }}
        />
        <button
          data-testid="filter-button"
          onClick={() => {
            if (onFiltersChange) {
              onFiltersChange({ postType: 'audio', sortBy: 'popular' });
            }
          }}
        >
          Apply Filters
        </button>
        <button
          data-testid="clear-search"
          onClick={() => {
            if (onSearch) {
              onSearch({ posts: [], users: [], totalResults: 0 }, '');
            }
          }}
        >
          Clear Search
        </button>
      </div>
    );
  };
});

jest.mock('@/components/ActivityFeed', () => {
  return function MockActivityFeed() {
    return <div data-testid="activity-feed">Activity Feed</div>;
  };
});

jest.mock('@/components/FollowButton', () => {
  return function MockFollowButton() {
    return <div data-testid="follow-button">Follow Button</div>;
  };
});

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => {
  return {
    useAuth: () => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      profile: {
        user_id: 'test-user-id',
        username: 'testuser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
      session: null,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Test data generators
const createMockPost = (id: string, index: number): Post => ({
  id,
  content: `Test post content ${index}`,
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

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

describe('Task 5: Preserve Load More Functionality', () => {
  let mockSupabaseFrom: jest.Mock;
  let mockSupabaseSelect: jest.Mock;
  let mockSupabaseOrder: jest.Mock;
  let mockSupabaseRange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock chain
    mockSupabaseRange = jest.fn();
    mockSupabaseOrder = jest.fn(() => ({ range: mockSupabaseRange }));
    mockSupabaseSelect = jest.fn(() => ({ order: mockSupabaseOrder }));
    mockSupabaseFrom = jest.fn(() => ({ select: mockSupabaseSelect }));

    (supabase.from as jest.Mock) = mockSupabaseFrom;
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe('Requirement 3.1: Load more button continues working after dependency fixes', () => {
    test('should render and function correctly after initial load', async () => {
      const user = userEvent.setup();
      
      // Setup initial posts load
      const initialPosts = createMockPosts(15, 0);
      const additionalPosts = createMockPosts(15, 15);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 50, // Total posts available
        })
        .mockResolvedValueOnce({
          data: additionalPosts,
          error: null,
          count: 50,
        });

      render(<DashboardPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify load more button is present and functional
      const loadMoreButton = screen.getByText(/Load More/);
      expect(loadMoreButton).toBeInTheDocument();
      expect(loadMoreButton).not.toBeDisabled();

      // Click load more button
      await user.click(loadMoreButton);

      // Wait for additional posts to load
      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify both initial and additional posts are present
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      expect(screen.getByText('Test post content 15')).toBeInTheDocument();
    });

    test('should handle multiple consecutive load more clicks', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      const secondBatch = createMockPosts(15, 15);
      const thirdBatch = createMockPosts(15, 30);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 100,
        })
        .mockResolvedValueOnce({
          data: secondBatch,
          error: null,
          count: 100,
        })
        .mockResolvedValueOnce({
          data: thirdBatch,
          error: null,
          count: 100,
        });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // First load more
      const loadMoreButton1 = screen.getByText(/Load More/);
      await user.click(loadMoreButton1);

      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      });

      // Second load more
      const loadMoreButton2 = screen.getByText(/Load More/);
      await user.click(loadMoreButton2);

      await waitFor(() => {
        expect(screen.getByText('Test post content 30')).toBeInTheDocument();
      });

      // Verify all posts are present
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      expect(screen.getByText('Test post content 30')).toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Additional posts append correctly without triggering initial reload', () => {
    test('should append new posts without reloading existing ones', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      const additionalPosts = createMockPosts(15, 15);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 30,
        })
        .mockResolvedValueOnce({
          data: additionalPosts,
          error: null,
          count: 30,
        });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Verify initial posts count
      const initialPostElements = screen.getAllByTestId(/^post-/);
      expect(initialPostElements).toHaveLength(15);

      // Load more posts
      const loadMoreButton = screen.getByText(/Load More/);
      await user.click(loadMoreButton);

      // Wait for additional posts
      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      });

      // Verify total posts count increased
      const totalPostElements = screen.getAllByTestId(/^post-/);
      expect(totalPostElements).toHaveLength(30);

      // Verify original posts are still present (not reloaded)
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      expect(screen.getByText('Test post content 14')).toBeInTheDocument();
      
      // Verify new posts are appended
      expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      expect(screen.getByText('Test post content 29')).toBeInTheDocument();

      // Verify only two API calls were made (initial + load more)
      expect(mockSupabaseRange).toHaveBeenCalledTimes(2);
    });

    test('should maintain post order when appending', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(5, 0);
      const additionalPosts = createMockPosts(5, 5);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 10,
        })
        .mockResolvedValueOnce({
          data: additionalPosts,
          error: null,
          count: 10,
        });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Load more posts
      const loadMoreButton = screen.getByText(/Load More/);
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Test post content 5')).toBeInTheDocument();
      });

      // Verify posts are in correct order
      const postElements = screen.getAllByTestId(/^post-/);
      const postIds = postElements.map(el => el.getAttribute('data-testid'));
      
      expect(postIds).toEqual([
        'post-post-0', 'post-post-1', 'post-post-2', 'post-post-3', 'post-post-4',
        'post-post-5', 'post-post-6', 'post-post-7', 'post-post-8', 'post-post-9'
      ]);
    });
  });

  describe('Requirement 3.3: Load more works with search results', () => {
    test('should handle load more with active search', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      
      mockSupabaseRange.mockResolvedValue({
        data: initialPosts,
        error: null,
        count: 15,
      });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'search query');

      // Wait for search to be applied
      await waitFor(() => {
        expect(screen.getByText('Search result post 1')).toBeInTheDocument();
      });

      // Verify client-side pagination mode is active
      expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();

      // Check if load more button is available for search results
      const loadMoreButton = screen.queryByText(/Show More/);
      if (loadMoreButton) {
        expect(loadMoreButton).not.toBeDisabled();
        await user.click(loadMoreButton);
        
        // Verify search results are maintained after load more
        expect(screen.getByText('Search result post 1')).toBeInTheDocument();
      }
    });

    test('should clear search and return to normal load more', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      const additionalPosts = createMockPosts(15, 15);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 30,
        })
        .mockResolvedValueOnce({
          data: additionalPosts,
          error: null,
          count: 30,
        });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'search query');

      await waitFor(() => {
        expect(screen.getByText('Search result post 1')).toBeInTheDocument();
      });

      // Clear search
      const clearButton = screen.getByTestId('clear-search');
      await user.click(clearButton);

      // Wait for search to be cleared
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Verify server-side pagination is restored
      expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();

      // Test load more after clearing search
      const loadMoreButton = screen.getByText(/Load More/);
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.4: Load more works with filter results', () => {
    test('should handle load more with active filters', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      
      mockSupabaseRange.mockResolvedValue({
        data: initialPosts,
        error: null,
        count: 15,
      });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Apply filters
      const filterButton = screen.getByTestId('filter-button');
      await user.click(filterButton);

      // Wait for filters to be applied
      await waitFor(() => {
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      });

      // Check if load more button is available for filtered results
      const loadMoreButton = screen.queryByText(/Show More/);
      if (loadMoreButton) {
        expect(loadMoreButton).not.toBeDisabled();
        await user.click(loadMoreButton);
        
        // Verify filtered results are maintained after load more
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      }
    });

    test('should handle combined search and filter with load more', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      
      mockSupabaseRange.mockResolvedValue({
        data: initialPosts,
        error: null,
        count: 15,
      });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'search query');

      await waitFor(() => {
        expect(screen.getByText('Search result post 1')).toBeInTheDocument();
      });

      // Apply additional filters
      const filterButton = screen.getByTestId('filter-button');
      await user.click(filterButton);

      // Verify client-side pagination is maintained
      await waitFor(() => {
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      });

      // Test load more with combined search and filters
      const loadMoreButton = screen.queryByText(/Show More/);
      if (loadMoreButton) {
        expect(loadMoreButton).not.toBeDisabled();
        await user.click(loadMoreButton);
        
        // Verify combined search and filter state is maintained
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle load more errors gracefully', async () => {
      const user = userEvent.setup();
      
      const initialPosts = createMockPosts(15, 0);
      
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: initialPosts,
          error: null,
          count: 30,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Attempt load more (should fail)
      const loadMoreButton = screen.getByText(/Load More/);
      await user.click(loadMoreButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/Failed to load more posts/)).toBeInTheDocument();
      });

      // Verify original posts are still present
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
    });

    test('should handle end of content correctly', async () => {
      const initialPosts = createMockPosts(10, 0); // Less than full page
      
      mockSupabaseRange.mockResolvedValue({
        data: initialPosts,
        error: null,
        count: 10, // Total equals loaded
      });

      render(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      });

      // Verify end-of-content handling
      await waitFor(() => {
        expect(screen.getByText(/You've reached the end/)).toBeInTheDocument();
      });

      // Verify load more button is not present
      expect(screen.queryByText(/Load More/)).not.toBeInTheDocument();
    });
  });
});
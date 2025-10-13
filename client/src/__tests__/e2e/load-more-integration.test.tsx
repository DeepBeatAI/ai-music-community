/**
 * End-to-End Integration Tests for Load More System
 * 
 * This test suite validates the complete Load More functionality including:
 * - Server-side pagination for unfiltered content
 * - Client-side pagination for filtered content
 * - Search integration with Load More
 * - Error handling and recovery
 * - Performance benchmarks
 * - State consistency across mode transitions
 */

import { render, screen, waitFor } from '@testing-library/react';
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
  return function MockPostItem({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) {
    return (
      <div data-testid={`post-${post.id}`}>
        <p>{post.content}</p>
        {onDelete && (
          <button onClick={() => onDelete(post.id)}>Delete</button>
        )}
      </div>
    );
  };
});

jest.mock('@/components/AudioUpload', () => {
  return function MockAudioUpload({ 
    onFileSelect, 
    onFileRemove 
  }: { 
    onFileSelect?: (file: File, duration: number, metadata: { compressionApplied: boolean }) => void;
    onFileRemove?: () => void;
  }) {
    return (
      <div data-testid="audio-upload">
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onFileSelect) {
              onFileSelect(file, 120, { compressionApplied: true });
            }
          }}
        />
        {onFileRemove && (
          <button onClick={onFileRemove}>Remove</button>
        )}
      </div>
    );
  };
});

jest.mock('@/components/SearchBar', () => {
  return function MockSearchBar({ 
    onSearch 
  }: { 
    onSearch?: (results: { posts: Post[]; users: UserProfile[]; totalResults: number }, query: string) => void;
  }) {
    return (
      <div data-testid="search-bar">
        <input
          placeholder="Search posts and creators..."
          onChange={(e) => {
            if (onSearch) {
              onSearch({ posts: [], users: [], totalResults: 0 }, e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSearch) {
              onSearch({ posts: [], users: [], totalResults: 0 }, e.currentTarget.value);
            }
          }}
        />
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
  return function MockFollowButton({ userId, username }: { userId: string; username: string }) {
    return <button data-testid={`follow-${userId}`}>Follow {username}</button>;
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

// Mock auth context wrapper
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="auth-provider">{children}</div>;
};

describe('Load More Integration Tests', () => {
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

  describe('Task 10.1: End-to-End Testing Scenarios', () => {
    test('should handle complete user journey: load → filter → load more → clear', async () => {
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

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Verify initial posts are loaded
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
      expect(screen.getByText('Load More Posts (15)')).toBeInTheDocument();

      // Step 1: Click Load More (server-side pagination)
      const loadMoreButton = screen.getByText('Load More Posts (15)');
      await user.click(loadMoreButton);

      // Wait for additional posts to load
      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      });

      // Step 2: Apply a filter (should switch to client-side pagination)
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test');
      await user.keyboard('{Enter}');

      // Wait for filter to be applied
      await waitFor(() => {
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      });

      // Step 3: Load more filtered results
      const clientLoadMoreButton = screen.getByText(/Show More/);
      await user.click(clientLoadMoreButton);

      // Verify client-side pagination worked
      await waitFor(() => {
        expect(screen.getByText(/Filtered View:/)).toBeInTheDocument();
      });

      // Step 4: Clear filters
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      // Verify return to server-side pagination
      await waitFor(() => {
        expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();
      });
    });

    test('should handle search + filter + load more combinations', async () => {
      const user = userEvent.setup();
      
      const posts = createMockPosts(30, 0);
      mockSupabaseRange.mockResolvedValue({
        data: posts.slice(0, 15),
        error: null,
        count: 30,
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test content');
      await user.keyboard('{Enter}');

      // Apply additional filters through SearchBar
      // Note: This would require the SearchBar component to be properly mocked
      // For now, we'll simulate the filter state change

      await waitFor(() => {
        expect(screen.getByText(/Search Results:/)).toBeInTheDocument();
      });

      // Verify combined search and filter state
      expect(screen.getByText(/Search: "test content"/)).toBeInTheDocument();
    });

    test('should validate performance benchmarks', async () => {
      const startTime = performance.now();
      
      const posts = createMockPosts(15, 0);
      mockSupabaseRange.mockResolvedValue({
        data: posts,
        error: null,
        count: 100,
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      // Wait for initial load and measure time
      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      
      // Validate load time is under 3 seconds (3000ms)
      expect(loadTime).toBeLessThan(3000);

      // Test Load More response time
      const loadMoreStartTime = performance.now();
      
      const additionalPosts = createMockPosts(15, 15);
      mockSupabaseRange.mockResolvedValueOnce({
        data: additionalPosts,
        error: null,
        count: 100,
      });

      const user = userEvent.setup();
      const loadMoreButton = screen.getByText('Load More Posts (15)');
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Test post content 15')).toBeInTheDocument();
      });

      const loadMoreTime = performance.now() - loadMoreStartTime;
      
      // Validate Load More response time is under 2 seconds
      expect(loadMoreTime).toBeLessThan(2000);
    });

    test('should handle error scenarios and recovery', async () => {
      const user = userEvent.setup();
      
      // Setup initial successful load
      const posts = createMockPosts(15, 0);
      mockSupabaseRange
        .mockResolvedValueOnce({
          data: posts,
          error: null,
          count: 30,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Trigger error scenario
      const loadMoreButton = screen.getByText('Load More Posts (15)');
      await user.click(loadMoreButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/Failed to load more posts/)).toBeInTheDocument();
      });

      // Test recovery - setup successful response
      mockSupabaseRange.mockResolvedValueOnce({
        data: createMockPosts(15, 15),
        error: null,
        count: 30,
      });

      // Retry load more
      const retryButton = screen.getByText('Load More Posts (15)');
      await user.click(retryButton);

      // Verify recovery
      await waitFor(() => {
        expect(screen.queryByText(/Failed to load more posts/)).not.toBeInTheDocument();
      });
    });

    test('should prevent race conditions in concurrent requests', async () => {
      const user = userEvent.setup();
      
      const posts = createMockPosts(15, 0);
      
      // Setup delayed response to simulate slow network
      mockSupabaseRange.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: createMockPosts(15, 15),
            error: null,
            count: 30,
          }), 1000)
        )
      );

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Rapidly click Load More multiple times
      const loadMoreButton = screen.getByText('Load More Posts (15)');
      
      await user.click(loadMoreButton);
      await user.click(loadMoreButton);
      await user.click(loadMoreButton);

      // Verify only one request is processed
      await waitFor(() => {
        expect(mockSupabaseRange).toHaveBeenCalledTimes(1);
      });

      // Verify button is disabled during loading
      expect(loadMoreButton).toBeDisabled();
    });

    test('should maintain state consistency during mode transitions', async () => {
      const user = userEvent.setup();
      
      const posts = createMockPosts(30, 0);
      mockSupabaseRange.mockResolvedValue({
        data: posts.slice(0, 15),
        error: null,
        count: 30,
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Verify initial server-side mode
      expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();

      // Apply filter to switch to client-side mode
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test');
      await user.keyboard('{Enter}');

      // Verify mode transition
      await waitFor(() => {
        expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      });

      // Clear filter to return to server-side mode
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      // Verify state consistency after transition
      await waitFor(() => {
        expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();
      });

      // Verify posts are still displayed correctly
      expect(screen.getByText('Test post content 0')).toBeInTheDocument();
    });
  });

  describe('Memory Management and Performance', () => {
    test('should handle memory cleanup during extended browsing', async () => {
      const user = userEvent.setup();
      
      // Simulate loading many posts
      const largeBatch = createMockPosts(100, 0);
      
      for (let i = 0; i < 7; i++) {
        mockSupabaseRange.mockResolvedValueOnce({
          data: largeBatch.slice(i * 15, (i + 1) * 15),
          error: null,
          count: 100,
        });
      }

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Load multiple batches
      for (let i = 0; i < 6; i++) {
        const loadMoreButton = screen.getByText(/Load More/);
        await user.click(loadMoreButton);
        
        await waitFor(() => {
          expect(screen.getByText(`Test post content ${(i + 1) * 15}`)).toBeInTheDocument();
        });
      }

      // Verify memory management indicators are shown
      expect(screen.getByText(/Bandwidth Optimization Active/)).toBeInTheDocument();
    });

    test('should optimize network requests and caching', async () => {
      const posts = createMockPosts(15, 0);
      mockSupabaseRange.mockResolvedValue({
        data: posts,
        error: null,
        count: 15,
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Verify egress optimization message
      expect(screen.getByText(/Bandwidth optimized/)).toBeInTheDocument();
      expect(screen.getByText(/Audio files load only when played/)).toBeInTheDocument();
    });
  });

  describe('User Experience Validation', () => {
    test('should provide clear visual feedback for all states', async () => {
      const user = userEvent.setup();
      
      const posts = createMockPosts(15, 0);
      mockSupabaseRange.mockResolvedValue({
        data: posts,
        error: null,
        count: 30,
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Verify pagination info is displayed
      expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();
      expect(screen.getByText(/Loading next 15 posts from database/)).toBeInTheDocument();

      // Test loading state
      mockSupabaseRange.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: createMockPosts(15, 15),
            error: null,
            count: 30,
          }), 500)
        )
      );

      const loadMoreButton = screen.getByText('Load More Posts (15)');
      await user.click(loadMoreButton);

      // Verify loading state
      expect(screen.getByText(/Fetching from server.../)).toBeInTheDocument();
      expect(loadMoreButton).toBeDisabled();
    });

    test('should handle end-of-content scenarios gracefully', async () => {
      const posts = createMockPosts(10, 0); // Less than full page
      mockSupabaseRange.mockResolvedValue({
        data: posts,
        error: null,
        count: 10, // Total equals loaded
      });

      render(
        <MockAuthProvider>
          <DashboardPage />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Posts')).toBeInTheDocument();
      });

      // Verify end-of-content message
      expect(screen.getByText(/You've reached the end!/)).toBeInTheDocument();
      expect(screen.getByText(/All 10 posts have been loaded/)).toBeInTheDocument();
      
      // Verify Load More button is not present
      expect(screen.queryByText(/Load More/)).not.toBeInTheDocument();
    });
  });
});
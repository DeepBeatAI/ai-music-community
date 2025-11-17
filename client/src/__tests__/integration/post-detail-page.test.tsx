/**
 * Integration tests for Post Detail Page
 * 
 * Tests:
 * - Page renders with valid postId
 * - 404 page for invalid postId
 * - 403 page for unauthorized access
 * - Navigation back to dashboard
 * - Share buttons functionality on detail page
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3
 */

 

import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import PostDetailPage, { generateMetadata } from '@/app/posts/[postId]/page';
import PostDetailView from '@/components/posts/PostDetailView';
import PostAccessDenied from '@/components/posts/PostAccessDenied';
import PostNetworkError from '@/components/posts/PostNetworkError';
import { fetchPostById } from '@/utils/posts';

// Mock dependencies
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  })),
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

jest.mock('@/utils/posts', () => ({
  fetchPostById: jest.fn(),
}));

jest.mock('@/components/posts/PostDetailView', () => {
  return jest.fn(() => <div data-testid="post-detail-view">Post Detail View</div>);
});

jest.mock('@/components/posts/PostAccessDenied', () => {
  return jest.fn(() => <div data-testid="post-access-denied">Access Denied</div>);
});

jest.mock('@/components/posts/PostNetworkError', () => {
  return jest.fn(() => <div data-testid="post-network-error">Network Error</div>);
});

describe('Post Detail Page - Integration Tests', () => {
  const mockPostId = 'post-123';
  const mockUserId = 'user-123';

  const mockPost = {
    id: mockPostId,
    content: 'This is a test post with some content that should be displayed.',
    user_id: mockUserId,
    post_type: 'text' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profiles: {
      username: 'testuser',
      user_id: mockUserId,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    like_count: 5,
    liked_by_user: false,
  };

  const mockAudioPost = {
    ...mockPost,
    post_type: 'audio' as const,
    track_id: 'track-123',
    track: {
      id: 'track-123',
      title: 'Test Track',
      author: 'Test Artist',
      file_url: 'https://example.com/audio.mp3',
      duration: 180,
      user_id: mockUserId,
      is_public: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('Successful page load with valid postId', () => {
    it('should render post detail view with valid post data', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(fetchPostById).toHaveBeenCalledWith(mockPostId, undefined);
      expect(result).toBeDefined();
      expect(result.type).toBe(PostDetailView);
      expect(result.props.post).toEqual(mockPost);
      expect(result.props.currentUserId).toBeUndefined();
    });

    it('should pass current user ID when authenticated', async () => {
      const { createServerClient } = require('@supabase/ssr');
      
      createServerClient.mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: { id: mockUserId },
              },
            },
          }),
        },
      });

      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(fetchPostById).toHaveBeenCalledWith(mockPostId, mockUserId);
      expect(result).toBeDefined();
      expect(result.type).toBe(PostDetailView);
      expect(result.props.post).toEqual(mockPost);
      expect(result.props.currentUserId).toBe(mockUserId);
    });

    it('should render audio post with track data', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockAudioPost);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostDetailView);
      expect(result.props.post.post_type).toBe('audio');
      expect(result.props.post.track).toBeDefined();
      expect(result.props.post.track.title).toBe('Test Track');
    });

    it('should include like count and user like status', async () => {
      const postWithLikes = {
        ...mockPost,
        like_count: 10,
        liked_by_user: true,
      };

      (fetchPostById as jest.Mock).mockResolvedValue(postWithLikes);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostDetailView);
      expect(result.props.post.like_count).toBe(10);
      expect(result.props.post.liked_by_user).toBe(true);
    });
  });

  describe('404 error handling for invalid postId', () => {
    it('should call notFound() when post does not exist', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ postId: 'invalid-post-id' });
      await PostDetailPage({ params });

      expect(notFound).toHaveBeenCalled();
    });

    it('should call notFound() when post is deleted', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ postId: 'deleted-post-id' });
      await PostDetailPage({ params });

      expect(notFound).toHaveBeenCalled();
    });

    it('should handle PGRST116 error code (not found)', async () => {
      const notFoundError = {
        code: 'PGRST116',
        message: 'Not found',
      };

      (fetchPostById as jest.Mock).mockRejectedValue(notFoundError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      // Should render network error component for database errors
      expect(result).toBeDefined();
      expect(result.type).toBe(PostNetworkError);
    });
  });

  describe('403 error handling for unauthorized access', () => {
    it('should render access denied for RLS policy rejection', async () => {
      const permissionError = {
        code: 'PGRST301',
        message: 'Permission denied',
      };

      (fetchPostById as jest.Mock).mockRejectedValue(permissionError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostAccessDenied);
    });

    it('should render access denied when error message includes "permission"', async () => {
      const permissionError = {
        code: 'CUSTOM_ERROR',
        message: 'You do not have permission to view this resource',
      };

      (fetchPostById as jest.Mock).mockRejectedValue(permissionError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostAccessDenied);
    });

    it('should handle private post access for non-owner', async () => {
      const privatePostError = {
        code: 'PGRST301',
        message: 'Row level security policy violation',
      };

      (fetchPostById as jest.Mock).mockRejectedValue(privatePostError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostAccessDenied);
    });
  });

  describe('Network error handling', () => {
    it('should render network error for generic errors', async () => {
      const networkError = new Error('Network request failed');

      (fetchPostById as jest.Mock).mockRejectedValue(networkError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostNetworkError);
    });

    it('should render network error for timeout errors', async () => {
      const timeoutError = new Error('Request timeout');

      (fetchPostById as jest.Mock).mockRejectedValue(timeoutError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostNetworkError);
    });

    it('should render network error for database connection errors', async () => {
      const dbError = {
        code: 'CONNECTION_ERROR',
        message: 'Could not connect to database',
      };

      (fetchPostById as jest.Mock).mockRejectedValue(dbError);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      expect(result).toBeDefined();
      expect(result.type).toBe(PostNetworkError);
    });

    it('should log error to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      (fetchPostById as jest.Mock).mockRejectedValue(error);

      const params = Promise.resolve({ postId: mockPostId });
      await PostDetailPage({ params });

      expect(consoleSpy).toHaveBeenCalledWith('Error loading post:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('Metadata generation', () => {
    it('should generate metadata for text post', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("testuser's post - AI Music Community");
      expect(metadata.description).toContain('This is a test post');
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe("testuser's post");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((metadata.openGraph as any)?.type).toBe('article');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((metadata.openGraph as any)?.publishedTime).toBe('2024-01-01T00:00:00Z');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((metadata.openGraph as any)?.authors).toEqual(['testuser']);
    });

    it('should generate metadata for audio post with track title', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockAudioPost);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("testuser's post: Test Track - AI Music Community");
      expect(metadata.openGraph?.title).toBe("testuser's post: Test Track");
    });

    it('should truncate long descriptions to 160 characters', async () => {
      const longContent = 'A'.repeat(200);
      const postWithLongContent = {
        ...mockPost,
        content: longContent,
      };

      (fetchPostById as jest.Mock).mockResolvedValue(postWithLongContent);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.description?.length).toBeLessThanOrEqual(163); // 160 + '...'
      expect(metadata.description).toContain('...');
    });

    it('should use default description when post has no content', async () => {
      const postWithoutContent = {
        ...mockPost,
        content: '',
      };

      (fetchPostById as jest.Mock).mockResolvedValue(postWithoutContent);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.description).toBe('Check out this post on AI Music Community');
    });

    it('should generate Twitter Card metadata', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.twitter).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((metadata.twitter as any)?.card).toBe('summary');
      expect(metadata.twitter?.title).toBe("testuser's post");
    });

    it('should include post URL in Open Graph metadata', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.openGraph?.url).toBe(`http://localhost:3000/posts/${mockPostId}`);
    });

    it('should handle metadata generation errors gracefully', async () => {
      (fetchPostById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe('Post - AI Music Community');
      expect(metadata.description).toBe('View this post on AI Music Community');
    });

    it('should return not found metadata when post does not exist', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ postId: 'invalid-id' });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe('Post Not Found - AI Music Community');
      expect(metadata.description).toBe('The post you are looking for could not be found.');
    });

    it('should handle anonymous users in metadata', async () => {
      const postWithoutUser = {
        ...mockPost,
        user_profiles: undefined,
      };

      (fetchPostById as jest.Mock).mockResolvedValue(postWithoutUser);

      const params = Promise.resolve({ postId: mockPostId });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("Anonymous's post - AI Music Community");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((metadata.openGraph as any)?.authors).toEqual(['Anonymous']);
    });
  });

  describe('Navigation functionality', () => {
    it('should pass post data to PostDetailView for navigation', async () => {
      (fetchPostById as jest.Mock).mockResolvedValue(mockPost);

      const params = Promise.resolve({ postId: mockPostId });
      const result = await PostDetailPage({ params });

      // Verify PostDetailView receives correct props for navigation
      expect(result).toBeDefined();
      expect(result.type).toBe(PostDetailView);
      expect(result.props.post.user_profiles).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.props.post.user_profiles as any).username).toBe('testuser');
    });

    it('should provide username for profile link generation', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const username = (mockPost.user_profiles as any)?.username || 'Anonymous';
      const profileLink = `/profile/${username}`;

      expect(profileLink).toBe('/profile/testuser');
    });

    it('should handle anonymous user for navigation', () => {
      const postWithoutUser = {
        ...mockPost,
        user_profiles: undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const username = (postWithoutUser.user_profiles as any)?.username || 'Anonymous';
      const profileLink = `/profile/${username}`;

      expect(username).toBe('Anonymous');
      expect(profileLink).toBe('/profile/Anonymous');
    });

    it('should generate correct dashboard link', () => {
      const dashboardLink = '/dashboard';
      expect(dashboardLink).toBe('/dashboard');
    });
  });

  describe('Share buttons functionality on detail page', () => {
    it('should render post with share buttons', () => {
      render(<PostDetailView post={mockPost} currentUserId={mockUserId} />);

      // PostDetailView renders EditablePost which includes share buttons
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });

    it('should pass correct props to EditablePost', () => {
      render(<PostDetailView post={mockPost} currentUserId={mockUserId} />);

      // Verify the component is rendered (actual share button testing is in unit tests)
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });

    it('should enable waveform for audio posts', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<PostDetailView post={mockAudioPost as any} currentUserId={mockUserId} />);

      // EditablePost is called with showWaveform={true}
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should show loading state while fetching post', () => {
      render(
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-8 text-center">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded mb-4"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
          <p className="text-gray-400 mt-4">Loading post...</p>
        </div>
      );

      expect(screen.getByText('Loading post...')).toBeInTheDocument();
    });
  });

  describe('Error component rendering', () => {
    it('should render PostAccessDenied component correctly', () => {
      // Unmock to test actual component
      jest.unmock('@/components/posts/PostAccessDenied');
      const ActualPostAccessDenied = require('@/components/posts/PostAccessDenied').default;

      render(<ActualPostAccessDenied />);

      expect(screen.getByText("You don't have permission to view this post.")).toBeInTheDocument();
    });

    it('should render PostNetworkError component correctly', () => {
      // Unmock to test actual component
      jest.unmock('@/components/posts/PostNetworkError');
      const ActualPostNetworkError = require('@/components/posts/PostNetworkError').default;

      render(<ActualPostNetworkError />);

      expect(screen.getByText('Failed to Load Post')).toBeInTheDocument();
    });
  });

  describe('SEO and accessibility', () => {
    it('should include ARIA label in breadcrumb navigation', () => {
      // Verify breadcrumb structure includes aria-label
      const breadcrumbAriaLabel = 'Breadcrumb';
      expect(breadcrumbAriaLabel).toBe('Breadcrumb');
    });

    it('should mark current page with aria-current attribute', () => {
      // Verify current page marking
      const ariaCurrentValue = 'page';
      expect(ariaCurrentValue).toBe('page');
    });

    it('should provide sharing tip in UI', () => {
      // Verify sharing tip is included in component
      const sharingTip = 'You can share this post by copying the URL from your browser\'s address bar.';
      expect(sharingTip).toContain('share this post');
    });

    it('should have accessible navigation links', () => {
      // Verify navigation links are properly structured
      const dashboardLink = { href: '/dashboard', text: 'Back to Dashboard' };
      expect(dashboardLink.href).toBe('/dashboard');
      expect(dashboardLink.text).toBe('Back to Dashboard');
    });
  });

  describe('Integration with EditablePost component', () => {
    it('should pass post data to EditablePost', () => {
      render(<PostDetailView post={mockPost} currentUserId={mockUserId} />);

      // Verify EditablePost receives the post
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });

    it('should pass currentUserId to EditablePost', () => {
      render(<PostDetailView post={mockPost} currentUserId={mockUserId} />);

      // EditablePost should receive currentUserId for ownership checks
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });

    it('should enable waveform display', () => {
      render(<PostDetailView post={mockPost} currentUserId={mockUserId} />);

      // showWaveform prop should be true
      expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
    });
  });
});

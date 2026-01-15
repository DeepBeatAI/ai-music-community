/**
 * Property-Based Tests for Like Buttons
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate correctness properties for album and playlist like buttons
 * using property-based testing to ensure behavior holds across all inputs.
 */

import { render, screen } from '@testing-library/react';
import AlbumLikeButton from '@/components/albums/AlbumLikeButton';
import PlaylistLikeButton from '@/components/playlists/PlaylistLikeButton';
import * as albumsLib from '@/lib/albums';
import * as playlistsLib from '@/lib/playlists';

// Mock the libraries
jest.mock('@/lib/albums');
jest.mock('@/lib/playlists');

// Mock the contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock toast function
const mockShowToast = jest.fn();

/**
 * Property 28: Unauthenticated Like Attempt
 * 
 * For any unauthenticated user attempting to like an album or playlist,
 * a sign-in prompt should be displayed and no like should be recorded.
 * 
 * Implementation: The button is disabled for unauthenticated users and shows
 * the sign-in prompt via the title attribute (tooltip). This prevents clicks
 * and provides clear feedback to the user.
 * 
 * Validates: Requirements 1.3, 2.3
 */
describe('Property 28: Unauthenticated Like Attempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks
    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: mockShowToast,
      dismissToast: jest.fn(),
    });
  });

  describe('AlbumLikeButton', () => {
    it('should display sign-in prompt and prevent like for unauthenticated users', async () => {
      // Arrange: Generate random album ID
      const albumId = `album-${Math.random().toString(36).substring(2, 11)}`;
      const initialLikeCount = Math.floor(Math.random() * 100);

      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        profile: null,
        userTypeInfo: null,
        isAdmin: false,
        loading: false,
        userTypeLoading: false,
        userTypeError: null,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // Mock getAlbumLikeStatus to return initial state
      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: initialLikeCount },
        error: null,
      });

      // Render component
      render(<AlbumLikeButton albumId={albumId} initialLikeCount={initialLikeCount} />);

      // Assert: Button should be disabled
      const likeButton = screen.getByRole('button');
      expect(likeButton).toBeDisabled();

      // Assert: Sign-in prompt should be shown via title attribute
      expect(likeButton).toHaveAttribute('title', 'Sign in to like albums');

      // Assert: toggleAlbumLike should NOT be called (button is disabled)
      expect(albumsLib.toggleAlbumLike).not.toHaveBeenCalled();

      // Assert: Like count should remain unchanged
      expect(screen.getByText(initialLikeCount.toString())).toBeInTheDocument();
    });

    it('should work for any random album ID and initial like count', async () => {
      // Property: Test with multiple random inputs
      const testCases = Array.from({ length: 10 }, () => ({
        albumId: `album-${Math.random().toString(36).substring(2, 11)}`,
        initialLikeCount: Math.floor(Math.random() * 1000),
      }));

      for (const { albumId, initialLikeCount } of testCases) {
        jest.clearAllMocks();

        // Mock unauthenticated user
        mockUseAuth.mockReturnValue({
          user: null,
          session: null,
          profile: null,
          userTypeInfo: null,
          isAdmin: false,
          loading: false,
          userTypeLoading: false,
          userTypeError: null,
          signIn: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshProfile: jest.fn(),
        });

        mockUseToast.mockReturnValue({
          toasts: [],
          showToast: mockShowToast,
          dismissToast: jest.fn(),
        });

        (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
          data: { liked: false, likeCount: initialLikeCount },
          error: null,
        });

        const { unmount } = render(
          <AlbumLikeButton albumId={albumId} initialLikeCount={initialLikeCount} />
        );

        const likeButton = screen.getByRole('button');
        
        // Assert: Button should be disabled
        expect(likeButton).toBeDisabled();
        
        // Assert: Sign-in prompt should be shown via title
        expect(likeButton).toHaveAttribute('title', 'Sign in to like albums');

        // Assert: toggleAlbumLike should NOT be called
        expect(albumsLib.toggleAlbumLike).not.toHaveBeenCalled();
        
        // Assert: Like count should remain unchanged
        expect(screen.getByText(initialLikeCount.toString())).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('PlaylistLikeButton', () => {
    it('should display sign-in prompt and prevent like for unauthenticated users', async () => {
      // Arrange: Generate random playlist ID
      const playlistId = `playlist-${Math.random().toString(36).substring(2, 11)}`;
      const initialLikeCount = Math.floor(Math.random() * 100);

      // Mock unauthenticated user
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        profile: null,
        userTypeInfo: null,
        isAdmin: false,
        loading: false,
        userTypeLoading: false,
        userTypeError: null,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // Mock getPlaylistLikeStatus to return initial state
      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: initialLikeCount },
        error: null,
      });

      // Render component
      render(<PlaylistLikeButton playlistId={playlistId} initialLikeCount={initialLikeCount} />);

      // Assert: Button should be disabled
      const likeButton = screen.getByRole('button');
      expect(likeButton).toBeDisabled();

      // Assert: Sign-in prompt should be shown via title attribute
      expect(likeButton).toHaveAttribute('title', 'Sign in to like playlists');

      // Assert: togglePlaylistLike should NOT be called (button is disabled)
      expect(playlistsLib.togglePlaylistLike).not.toHaveBeenCalled();

      // Assert: Like count should remain unchanged
      expect(screen.getByText(initialLikeCount.toString())).toBeInTheDocument();
    });

    it('should work for any random playlist ID and initial like count', async () => {
      // Property: Test with multiple random inputs
      const testCases = Array.from({ length: 10 }, () => ({
        playlistId: `playlist-${Math.random().toString(36).substring(2, 11)}`,
        initialLikeCount: Math.floor(Math.random() * 1000),
      }));

      for (const { playlistId, initialLikeCount } of testCases) {
        jest.clearAllMocks();

        // Mock unauthenticated user
        mockUseAuth.mockReturnValue({
          user: null,
          session: null,
          profile: null,
          userTypeInfo: null,
          isAdmin: false,
          loading: false,
          userTypeLoading: false,
          userTypeError: null,
          signIn: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshProfile: jest.fn(),
        });

        mockUseToast.mockReturnValue({
          toasts: [],
          showToast: mockShowToast,
          dismissToast: jest.fn(),
        });

        (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
          data: { liked: false, likeCount: initialLikeCount },
          error: null,
        });

        const { unmount } = render(
          <PlaylistLikeButton playlistId={playlistId} initialLikeCount={initialLikeCount} />
        );

        const likeButton = screen.getByRole('button');
        
        // Assert: Button should be disabled
        expect(likeButton).toBeDisabled();
        
        // Assert: Sign-in prompt should be shown via title
        expect(likeButton).toHaveAttribute('title', 'Sign in to like playlists');

        // Assert: togglePlaylistLike should NOT be called
        expect(playlistsLib.togglePlaylistLike).not.toHaveBeenCalled();
        
        // Assert: Like count should remain unchanged
        expect(screen.getByText(initialLikeCount.toString())).toBeInTheDocument();

        unmount();
      }
    });
  });
});

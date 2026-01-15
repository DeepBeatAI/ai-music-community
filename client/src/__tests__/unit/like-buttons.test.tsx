/**
 * Unit Tests for Like Buttons
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate specific examples and edge cases for album and playlist like buttons.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const mockShowToast = jest.fn();

describe('AlbumLikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: mockShowToast,
      dismissToast: jest.fn(),
    });
  });

  describe('Rendering with initial state', () => {
    it('should render with initial like count', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 42 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLikeCount={42} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with liked state', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: true, likeCount: 10 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLiked={true} initialLikeCount={10} />);

      await waitFor(() => {
        expect(screen.getByText('❤️')).toBeInTheDocument();
      });
    });

    it('should render with unliked state', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 5 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLiked={false} initialLikeCount={5} />);

      await waitFor(() => {
        expect(screen.getByText('🤍')).toBeInTheDocument();
      });
    });
  });

  describe('Click handling and optimistic updates', () => {
    it('should perform optimistic update on like', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 5 },
        error: null,
      });

      (albumsLib.toggleAlbumLike as jest.Mock).mockResolvedValue({
        data: { liked: true, likeCount: 6 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLikeCount={5} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Optimistic update should show immediately
      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
      });

      // Verify API was called
      expect(albumsLib.toggleAlbumLike).toHaveBeenCalledWith('test-album', 'test-user', false);
    });

    it('should perform optimistic update on unlike', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: true, likeCount: 10 },
        error: null,
      });

      (albumsLib.toggleAlbumLike as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 9 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLiked={true} initialLikeCount={10} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Optimistic update should show immediately
      await waitFor(() => {
        expect(screen.getByText('9')).toBeInTheDocument();
      });

      // Verify API was called
      expect(albumsLib.toggleAlbumLike).toHaveBeenCalledWith('test-album', 'test-user', true);
    });
  });

  describe('Error handling and toast notifications', () => {
    it('should show error toast on API failure', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 5 },
        error: null,
      });

      (albumsLib.toggleAlbumLike as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      render(<AlbumLikeButton albumId="test-album" initialLikeCount={5} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error');
      });

      // Should revert optimistic update
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should revert optimistic update on error', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 5 },
        error: null,
      });

      (albumsLib.toggleAlbumLike as jest.Mock).mockRejectedValue(new Error('Failed'));

      render(<AlbumLikeButton albumId="test-album" initialLikeCount={5} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to update like', 'error');
      });

      // Should revert to original count
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Sign-in prompt for unauthenticated users', () => {
    it('should show disabled button with sign-in title for unauthenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (albumsLib.getAlbumLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 5 },
        error: null,
      });

      render(<AlbumLikeButton albumId="test-album" initialLikeCount={5} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Sign in to like albums');
    });
  });
});

describe('PlaylistLikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: mockShowToast,
      dismissToast: jest.fn(),
    });
  });

  describe('Rendering with initial state', () => {
    it('should render with initial like count', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 15 },
        error: null,
      });

      render(<PlaylistLikeButton playlistId="test-playlist" initialLikeCount={15} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with liked state', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: true, likeCount: 20 },
        error: null,
      });

      render(<PlaylistLikeButton playlistId="test-playlist" initialLiked={true} initialLikeCount={20} />);

      await waitFor(() => {
        expect(screen.getByText('❤️')).toBeInTheDocument();
      });
    });
  });

  describe('Click handling and optimistic updates', () => {
    it('should perform optimistic update on like', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 8 },
        error: null,
      });

      (playlistsLib.togglePlaylistLike as jest.Mock).mockResolvedValue({
        data: { liked: true, likeCount: 9 },
        error: null,
      });

      render(<PlaylistLikeButton playlistId="test-playlist" initialLikeCount={8} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Optimistic update should show immediately
      await waitFor(() => {
        expect(screen.getByText('9')).toBeInTheDocument();
      });

      // Verify API was called
      expect(playlistsLib.togglePlaylistLike).toHaveBeenCalledWith('test-playlist', 'test-user', false);
    });
  });

  describe('Error handling and toast notifications', () => {
    it('should show error toast on API failure', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 12 },
        error: null,
      });

      (playlistsLib.togglePlaylistLike as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Connection failed',
      });

      render(<PlaylistLikeButton playlistId="test-playlist" initialLikeCount={12} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Connection failed', 'error');
      });

      // Should revert optimistic update
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('Sign-in prompt for unauthenticated users', () => {
    it('should show disabled button with sign-in title for unauthenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUserProfile: jest.fn(),
      });

      (playlistsLib.getPlaylistLikeStatus as jest.Mock).mockResolvedValue({
        data: { liked: false, likeCount: 7 },
        error: null,
      });

      render(<PlaylistLikeButton playlistId="test-playlist" initialLikeCount={7} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Sign in to like playlists');
    });
  });
});

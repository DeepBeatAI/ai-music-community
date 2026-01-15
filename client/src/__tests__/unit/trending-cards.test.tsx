/**
 * Unit Tests for Trending Cards Components
 * 
 * Tests for TrendingAlbumCard and TrendingPlaylistCard components
 * Requirements: 5.6, 6.6, 9.4, 9.5, 10.4, 10.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import TrendingAlbumCard from '@/components/discover/TrendingAlbumCard';
import TrendingPlaylistCard from '@/components/discover/TrendingPlaylistCard';
import { TrendingAlbum, TrendingPlaylist } from '@/types/analytics';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AlbumLikeButton
jest.mock('@/components/albums/AlbumLikeButton', () => {
  return function MockAlbumLikeButton({ albumId, initialLikeCount }: { albumId: string; initialLikeCount: number }) {
    return (
      <button data-testid="album-like-button" data-album-id={albumId}>
        Like ({initialLikeCount})
      </button>
    );
  };
});

// Mock PlaylistLikeButton
jest.mock('@/components/playlists/PlaylistLikeButton', () => {
  return function MockPlaylistLikeButton({ playlistId, initialLikeCount }: { playlistId: string; initialLikeCount: number }) {
    return (
      <button data-testid="playlist-like-button" data-playlist-id={playlistId}>
        Like ({initialLikeCount})
      </button>
    );
  };
});

describe('TrendingAlbumCard', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockAlbum: TrendingAlbum = {
    album_id: 'album-123',
    name: 'Test Album',
    creator_username: 'testuser',
    creator_user_id: 'user-123',
    play_count: 1500,
    like_count: 250,
    trending_score: 1125.5,
    created_at: '2024-01-15T10:00:00Z',
    cover_image_url: 'https://example.com/cover.jpg',
    track_count: 12,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Rendering with mock data', () => {
    it('should render album card with all required information', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} />);

      // Check rank badge
      expect(screen.getByText('1')).toBeInTheDocument();

      // Check album name
      expect(screen.getByText('Test Album')).toBeInTheDocument();

      // Check creator username
      expect(screen.getByText(/by testuser/i)).toBeInTheDocument();

      // Check stats
      expect(screen.getByText(/1,500 plays/i)).toBeInTheDocument();
      expect(screen.getByText(/250 likes/i)).toBeInTheDocument();
      expect(screen.getByText(/12 tracks/i)).toBeInTheDocument();
      expect(screen.getByText(/1125.5 score/i)).toBeInTheDocument();
    });

    it('should render album cover image when provided', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} />);

      const image = screen.getByAltText('Test Album');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('should render placeholder when no cover image', () => {
      const albumWithoutCover = { ...mockAlbum, cover_image_url: null };
      const { container } = render(<TrendingAlbumCard album={albumWithoutCover} rank={1} />);

      // Check for music emoji placeholder in the cover area
      const placeholder = container.querySelector('.w-16.h-16.rounded-md.bg-gray-700');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder?.textContent).toContain('🎵');
    });

    it('should apply gold styling to top 3 ranks', () => {
      const { container } = render(<TrendingAlbumCard album={mockAlbum} rank={1} />);
      
      const rankBadge = screen.getByText('1');
      expect(rankBadge).toHaveClass('from-yellow-400');
    });

    it('should apply gray styling to ranks 4 and below', () => {
      const { container } = render(<TrendingAlbumCard album={mockAlbum} rank={4} />);
      
      const rankBadge = screen.getByText('4');
      expect(rankBadge).toHaveClass('bg-gray-700');
    });

    it('should show date when showDate prop is true', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} showDate={true} />);

      // Check for formatted date (Jan 15, 2024)
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
    });

    it('should not show date when showDate prop is false', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} showDate={false} />);

      // Date should not be present
      expect(screen.queryByText(/Jan 15, 2024/i)).not.toBeInTheDocument();
    });

    it('should handle singular track count', () => {
      const albumWithOneTrack = { ...mockAlbum, track_count: 1 };
      render(<TrendingAlbumCard album={albumWithOneTrack} rank={1} />);

      expect(screen.getByText(/1 track/i)).toBeInTheDocument();
      expect(screen.queryByText(/tracks/i)).not.toBeInTheDocument();
    });
  });

  describe('Navigation on click', () => {
    it('should navigate to album detail page when card is clicked', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} />);

      const card = screen.getByText('Test Album').closest('div');
      fireEvent.click(card!);

      expect(mockRouter.push).toHaveBeenCalledWith('/album/album-123');
    });

    it('should not navigate when like button is clicked', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} />);

      const likeButton = screen.getByTestId('album-like-button');
      fireEvent.click(likeButton);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Like button integration', () => {
    it('should render AlbumLikeButton with correct props', () => {
      render(<TrendingAlbumCard album={mockAlbum} rank={1} />);

      const likeButton = screen.getByTestId('album-like-button');
      expect(likeButton).toBeInTheDocument();
      expect(likeButton).toHaveAttribute('data-album-id', 'album-123');
      expect(likeButton).toHaveTextContent('Like (250)');
    });
  });

  describe('Loading and error states', () => {
    it('should handle missing album data gracefully', () => {
      const incompleteAlbum = {
        ...mockAlbum,
        name: '',
        creator_username: '',
      };

      render(<TrendingAlbumCard album={incompleteAlbum} rank={1} />);

      // Component should still render without crashing
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle zero counts', () => {
      const albumWithZeroCounts = {
        ...mockAlbum,
        play_count: 0,
        like_count: 0,
        track_count: 0,
        trending_score: 0,
      };

      render(<TrendingAlbumCard album={albumWithZeroCounts} rank={1} />);

      expect(screen.getByText(/0 plays/i)).toBeInTheDocument();
      expect(screen.getByText(/0 likes/i)).toBeInTheDocument();
      expect(screen.getByText(/0 tracks/i)).toBeInTheDocument();
      expect(screen.getByText(/0.0 score/i)).toBeInTheDocument();
    });
  });
});

describe('TrendingPlaylistCard', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockPlaylist: TrendingPlaylist = {
    playlist_id: 'playlist-123',
    name: 'Test Playlist',
    creator_username: 'testuser',
    creator_user_id: 'user-123',
    play_count: 2000,
    like_count: 300,
    trending_score: 1490.0,
    created_at: '2024-01-20T10:00:00Z',
    cover_image_url: 'https://example.com/playlist-cover.jpg',
    track_count: 25,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Rendering with mock data', () => {
    it('should render playlist card with all required information', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} />);

      // Check rank badge
      expect(screen.getByText('2')).toBeInTheDocument();

      // Check playlist name
      expect(screen.getByText('Test Playlist')).toBeInTheDocument();

      // Check creator username
      expect(screen.getByText(/by testuser/i)).toBeInTheDocument();

      // Check stats
      expect(screen.getByText(/2,000 plays/i)).toBeInTheDocument();
      expect(screen.getByText(/300 likes/i)).toBeInTheDocument();
      expect(screen.getByText(/25 tracks/i)).toBeInTheDocument();
      expect(screen.getByText(/1490.0 score/i)).toBeInTheDocument();
    });

    it('should render playlist cover image when provided', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} />);

      const image = screen.getByAltText('Test Playlist');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/playlist-cover.jpg');
    });

    it('should render placeholder when no cover image', () => {
      const playlistWithoutCover = { ...mockPlaylist, cover_image_url: null };
      render(<TrendingPlaylistCard playlist={playlistWithoutCover} rank={2} />);

      // Check for playlist emoji placeholder
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should apply gold styling to top 3 ranks', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={3} />);
      
      const rankBadge = screen.getByText('3');
      expect(rankBadge).toHaveClass('from-yellow-400');
    });

    it('should apply gray styling to ranks 4 and below', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={5} />);
      
      const rankBadge = screen.getByText('5');
      expect(rankBadge).toHaveClass('bg-gray-700');
    });

    it('should show date when showDate prop is true', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} showDate={true} />);

      // Check for formatted date (Jan 20, 2024)
      expect(screen.getByText(/Jan 20, 2024/i)).toBeInTheDocument();
    });

    it('should not show date when showDate prop is false', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} showDate={false} />);

      // Date should not be present
      expect(screen.queryByText(/Jan 20, 2024/i)).not.toBeInTheDocument();
    });

    it('should handle singular track count', () => {
      const playlistWithOneTrack = { ...mockPlaylist, track_count: 1 };
      render(<TrendingPlaylistCard playlist={playlistWithOneTrack} rank={2} />);

      expect(screen.getByText(/1 track/i)).toBeInTheDocument();
      expect(screen.queryByText(/tracks/i)).not.toBeInTheDocument();
    });
  });

  describe('Navigation on click', () => {
    it('should navigate to playlist detail page when card is clicked', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} />);

      const card = screen.getByText('Test Playlist').closest('div');
      fireEvent.click(card!);

      expect(mockRouter.push).toHaveBeenCalledWith('/playlist/playlist-123');
    });

    it('should not navigate when like button is clicked', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} />);

      const likeButton = screen.getByTestId('playlist-like-button');
      fireEvent.click(likeButton);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Like button integration', () => {
    it('should render PlaylistLikeButton with correct props', () => {
      render(<TrendingPlaylistCard playlist={mockPlaylist} rank={2} />);

      const likeButton = screen.getByTestId('playlist-like-button');
      expect(likeButton).toBeInTheDocument();
      expect(likeButton).toHaveAttribute('data-playlist-id', 'playlist-123');
      expect(likeButton).toHaveTextContent('Like (300)');
    });
  });

  describe('Loading and error states', () => {
    it('should handle missing playlist data gracefully', () => {
      const incompletePlaylist = {
        ...mockPlaylist,
        name: '',
        creator_username: '',
      };

      render(<TrendingPlaylistCard playlist={incompletePlaylist} rank={2} />);

      // Component should still render without crashing
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle zero counts', () => {
      const playlistWithZeroCounts = {
        ...mockPlaylist,
        play_count: 0,
        like_count: 0,
        track_count: 0,
        trending_score: 0,
      };

      render(<TrendingPlaylistCard playlist={playlistWithZeroCounts} rank={2} />);

      expect(screen.getByText(/0 plays/i)).toBeInTheDocument();
      expect(screen.getByText(/0 likes/i)).toBeInTheDocument();
      expect(screen.getByText(/0 tracks/i)).toBeInTheDocument();
      expect(screen.getByText(/0.0 score/i)).toBeInTheDocument();
    });
  });
});

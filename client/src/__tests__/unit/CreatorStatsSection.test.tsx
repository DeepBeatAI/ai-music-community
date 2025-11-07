/**
 * CreatorStatsSection Component Test Suite
 * 
 * Tests the CreatorStatsSection component functionality
 * Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// Mock Supabase BEFORE any imports
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

// Mock the profile service
jest.mock('@/lib/profileService');

// Mock the cache utility
jest.mock('@/utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  CACHE_TTL: {
    STATS: 300000,
  },
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatorStatsSection from '@/components/profile/CreatorStatsSection';
import * as profileService from '@/lib/profileService';
import { cache } from '@/utils/cache';

const mockGetCreatorStats = profileService.getCreatorStats as jest.MockedFunction<typeof profileService.getCreatorStats>;

describe('CreatorStatsSection Component', () => {
  const mockStats = {
    creator_score: 1250,
    follower_count: 150,
    track_count: 25,
    album_count: 5,
    playlist_count: 10,
    total_plays: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cache.get as jest.Mock).mockReturnValue(null);
  });

  describe('Loading State', () => {
    test('should show skeleton loading state initially', () => {
      mockGetCreatorStats.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CreatorStatsSection userId="user-123" />);

      // Should show 6 skeleton cards
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should show 6 skeleton cards during loading', () => {
      mockGetCreatorStats.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<CreatorStatsSection userId="user-123" />);

      const grid = container.querySelector('.grid');
      expect(grid?.children.length).toBe(6);
    });
  });

  describe('Successful Data Loading', () => {
    test('should display all stats when data loads successfully', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Creator Score
        expect(screen.getByText('150')).toBeInTheDocument(); // Followers
        expect(screen.getByText('25')).toBeInTheDocument(); // Tracks
        expect(screen.getByText('5')).toBeInTheDocument(); // Albums
        expect(screen.getByText('10')).toBeInTheDocument(); // Playlists
        expect(screen.getByText('5,000')).toBeInTheDocument(); // Total Plays
      });
    });

    test('should display correct labels for each stat', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('Creator Score')).toBeInTheDocument();
        expect(screen.getByText('Followers')).toBeInTheDocument();
        expect(screen.getByText('Tracks')).toBeInTheDocument();
        expect(screen.getByText('Albums')).toBeInTheDocument();
        expect(screen.getByText('Playlists')).toBeInTheDocument();
        expect(screen.getByText('Total Plays')).toBeInTheDocument();
      });
    });

    test('should display correct icons for each stat', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('⭐')).toBeInTheDocument(); // Creator Score
        expect(screen.getByText('👥')).toBeInTheDocument(); // Followers
        expect(screen.getByText('🎵')).toBeInTheDocument(); // Tracks
        expect(screen.getByText('💿')).toBeInTheDocument(); // Albums
        expect(screen.getByText('📝')).toBeInTheDocument(); // Playlists
        expect(screen.getByText('🎧')).toBeInTheDocument(); // Total Plays
      });
    });

    test('should format numbers with commas', async () => {
      const largeStats = {
        ...mockStats,
        creator_score: 1234567,
        total_plays: 9876543,
      };
      mockGetCreatorStats.mockResolvedValue(largeStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,234,567')).toBeInTheDocument();
        expect(screen.getByText('9,876,543')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should show error message when fetch fails', async () => {
      mockGetCreatorStats.mockRejectedValue(new Error('Network error'));

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load creator statistics')).toBeInTheDocument();
      });
    });

    test('should show error icon when fetch fails', async () => {
      mockGetCreatorStats.mockRejectedValue(new Error('Network error'));

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    test('should show retry button when fetch fails', async () => {
      mockGetCreatorStats.mockRejectedValue(new Error('Network error'));

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    test('should retry fetch when retry button is clicked', async () => {
      mockGetCreatorStats
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load creator statistics')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });
    });

    test('should show error when userId is not provided', async () => {
      render(<CreatorStatsSection userId="" />);

      await waitFor(() => {
        expect(screen.getByText('User ID is required')).toBeInTheDocument();
      });
    });
  });

  describe('Caching', () => {
    test('should use cached data when available', async () => {
      (cache.get as jest.Mock).mockReturnValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      expect(mockGetCreatorStats).not.toHaveBeenCalled();
      expect(cache.get).toHaveBeenCalledWith('creator-stats-user-123');
    });

    test('should cache fetched data', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      expect(cache.set).toHaveBeenCalledWith('creator-stats-user-123', mockStats, 300000);
    });

    test('should fetch data when cache is empty', async () => {
      (cache.get as jest.Mock).mockReturnValue(null);
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(mockGetCreatorStats).toHaveBeenCalledWith('user-123');
      });
    });
  });

  describe('Responsive Layout', () => {
    test('should have responsive grid layout', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      const { container } = render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const grid = container.querySelector('.grid.grid-cols-3.md\\:grid-cols-6');
        expect(grid).toBeInTheDocument();
      });
    });

    test('should have proper gap between cards', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      const { container } = render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const grid = container.querySelector('.gap-4');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Stat Card Styling', () => {
    test('should have correct color classes for each stat', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const creatorScore = screen.getByText('1,250');
        expect(creatorScore).toHaveClass('text-yellow-400');

        const followers = screen.getByText('150');
        expect(followers).toHaveClass('text-blue-400');

        const tracks = screen.getByText('25');
        expect(tracks).toHaveClass('text-green-400');

        const albums = screen.getByText('5');
        expect(albums).toHaveClass('text-purple-400');

        const playlists = screen.getByText('10');
        expect(playlists).toHaveClass('text-pink-400');

        const totalPlays = screen.getByText('5,000');
        expect(totalPlays).toHaveClass('text-orange-400');
      });
    });

    test('should have hover effect on stat cards', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      const { container } = render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const statCards = container.querySelectorAll('.hover\\:border-gray-600');
        expect(statCards.length).toBe(6);
      });
    });
  });

  describe('Zero Values', () => {
    test('should display zero values correctly', async () => {
      const zeroStats = {
        creator_score: 0,
        follower_count: 0,
        track_count: 0,
        album_count: 0,
        playlist_count: 0,
        total_plays: 0,
      };
      mockGetCreatorStats.mockResolvedValue(zeroStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBe(6);
      });
    });

    test('should format zero with commas (as "0")', async () => {
      const zeroStats = {
        creator_score: 0,
        follower_count: 0,
        track_count: 0,
        album_count: 0,
        playlist_count: 0,
        total_plays: 0,
      };
      mockGetCreatorStats.mockResolvedValue(zeroStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        zeros.forEach(zero => {
          expect(zero).toBeInTheDocument();
        });
      });
    });
  });

  describe('Cache Invalidation', () => {
    test('should refetch data when cache is invalidated', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      // Clear the mock to track new calls
      mockGetCreatorStats.mockClear();
      mockGetCreatorStats.mockResolvedValue({ ...mockStats, creator_score: 2000 });

      // Simulate cache invalidation event
      const event = new CustomEvent('cache-invalidated', {
        detail: { key: 'creator-stats-user-123' }
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(mockGetCreatorStats).toHaveBeenCalledWith('user-123');
      });
    });

    test('should not refetch when different cache key is invalidated', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      mockGetCreatorStats.mockClear();

      // Simulate cache invalidation for different key
      const event = new CustomEvent('cache-invalidated', {
        detail: { key: 'creator-stats-different-user' }
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(mockGetCreatorStats).not.toHaveBeenCalled();
      });
    });
  });

  describe('Component Cleanup', () => {
    test('should cleanup event listeners on unmount', async () => {
      mockGetCreatorStats.mockResolvedValue(mockStats);

      const { unmount } = render(<CreatorStatsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('cache-invalidated', expect.any(Function));
    });
  });
});

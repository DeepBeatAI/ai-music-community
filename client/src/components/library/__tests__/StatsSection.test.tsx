/**
 * Component Tests for StatsSection
 * Task 23: Component Tests
 */

// Mock modules BEFORE imports
jest.mock('@/lib/library');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));
jest.mock('@/utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
  CACHE_KEYS: {
    STATS: (userId: string) => `stats-${userId}`,
  },
  CACHE_TTL: {
    STATS: 300000,
  },
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StatsSection from '../StatsSection';
import { getLibraryStats } from '@/lib/library';

describe('StatsSection', () => {
  const mockStats = {
    uploadRemaining: 5,
    totalTracks: 42,
    totalAlbums: 8,
    totalPlaylists: 12,
    playsThisWeek: 156,
    playsAllTime: 2340,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getLibraryStats as jest.Mock).mockResolvedValue(mockStats);
  });

  it('should render all 6 stat cards', async () => {
    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Upload Remaining')).toBeInTheDocument();
      expect(screen.getByText('Total Tracks')).toBeInTheDocument();
      expect(screen.getByText('Total Albums')).toBeInTheDocument();
      expect(screen.getByText('Total Playlists')).toBeInTheDocument();
      expect(screen.getByText('Plays This Week')).toBeInTheDocument();
      expect(screen.getByText('Total Plays')).toBeInTheDocument();
    });
  });

  it('should display correct stat values', async () => {
    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // uploadRemaining
      expect(screen.getByText('42')).toBeInTheDocument(); // totalTracks
      expect(screen.getByText('8')).toBeInTheDocument(); // totalAlbums
      expect(screen.getByText('12')).toBeInTheDocument(); // totalPlaylists
      expect(screen.getByText('156')).toBeInTheDocument(); // playsThisWeek
      expect(screen.getByText('2,340')).toBeInTheDocument(); // playsAllTime formatted
    });
  });

  it('should show loading skeleton initially', () => {
    render(<StatsSection userId="test-user-id" />);
    
    // Check for skeleton elements (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state on fetch failure', async () => {
    (getLibraryStats as jest.Mock).mockRejectedValue(new Error('Failed'));

    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should retry on button click', async () => {
    (getLibraryStats as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(mockStats);

    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('should display infinite symbol for infinite uploads', async () => {
    const statsWithInfinite = {
      ...mockStats,
      uploadRemaining: 'infinite' as const,
    };
    (getLibraryStats as jest.Mock).mockResolvedValue(statsWithInfinite);

    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });

  it('should call getLibraryStats with correct userId', async () => {
    render(<StatsSection userId="test-user-123" />);

    await waitFor(() => {
      expect(getLibraryStats).toHaveBeenCalledWith('test-user-123');
    });
  });
});

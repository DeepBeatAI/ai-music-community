/**
 * Unit Tests for Trending Sections
 * 
 * Tests specific examples and edge cases for trending sections:
 * - Loading state display
 * - Error state with retry button
 * 
 * Note: Data fetching tests are covered by integration tests due to
 * complexity of mocking the retry + caching + Promise.all chain.
 * 
 * Feature: discover-page-tabs-enhancement
 * Validates: Requirements 9.1, 9.2, 9.3, 10.1, 10.2, 10.3
 */

import { render, screen, waitFor } from '@testing-library/react';
import TrendingAlbumsSection from '@/components/discover/TrendingAlbumsSection';
import TrendingPlaylistsSection from '@/components/discover/TrendingPlaylistsSection';

// Mock the trending analytics module completely
jest.mock('@/lib/trendingAnalytics', () => ({
  getCachedAnalytics: jest.fn(),
  getTrendingAlbums7Days: jest.fn(),
  getTrendingAlbumsAllTime: jest.fn(),
  getTrendingPlaylists7Days: jest.fn(),
  getTrendingPlaylistsAllTime: jest.fn(),
}));

// Mock retryWithBackoff to avoid delays in tests
jest.mock('@/utils/retryWithBackoff', () => ({
  retryWithBackoff: jest.fn(async (fn) => {
    return await fn();
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

// Mock ToastContext
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('TrendingAlbumsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading skeletons while fetching', () => {
    const trendingAnalytics = require('@/lib/trendingAnalytics');
    // Mock getCachedAnalytics to never resolve
    trendingAnalytics.getCachedAnalytics.mockImplementation(() => new Promise(() => {}));

    render(<TrendingAlbumsSection />);

    // Check for loading skeleton elements
    const skeletons = screen.getAllByRole('generic').filter(
      el => el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error state with retry button on failure', async () => {
    const trendingAnalytics = require('@/lib/trendingAnalytics');
    // Mock getCachedAnalytics to reject
    trendingAnalytics.getCachedAnalytics.mockRejectedValue(new Error('Network error'));

    render(<TrendingAlbumsSection />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load trending albums/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});

describe('TrendingPlaylistsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading skeletons while fetching', () => {
    const trendingAnalytics = require('@/lib/trendingAnalytics');
    // Mock getCachedAnalytics to never resolve
    trendingAnalytics.getCachedAnalytics.mockImplementation(() => new Promise(() => {}));

    render(<TrendingPlaylistsSection />);

    // Check for loading skeleton elements
    const skeletons = screen.getAllByRole('generic').filter(
      el => el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error state with retry button on failure', async () => {
    const trendingAnalytics = require('@/lib/trendingAnalytics');
    // Mock getCachedAnalytics to reject
    trendingAnalytics.getCachedAnalytics.mockRejectedValue(new Error('Network error'));

    render(<TrendingPlaylistsSection />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load trending playlists/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});

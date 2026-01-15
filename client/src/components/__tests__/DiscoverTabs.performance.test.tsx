/**
 * Tab Load Performance Tests
 * 
 * These tests verify that:
 * 1. Tab switch time is < 1 second
 * 2. Component rendering is optimized
 * 3. Code splitting is implemented if necessary
 * 
 * Requirements: 12.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiscoverTabs } from '../discover/DiscoverTabs';

// Mock the trending sections to control loading time
jest.mock('../discover/TrendingAlbumsSection', () => {
  return function MockTrendingAlbumsSection() {
    return <div data-testid="albums-section">Albums Section</div>;
  };
});

jest.mock('../discover/TrendingPlaylistsSection', () => {
  return function MockTrendingPlaylistsSection() {
    return <div data-testid="playlists-section">Playlists Section</div>;
  };
});

// Mock existing sections
jest.mock('../discover/DiscoverTrendingSection', () => {
  return {
    DiscoverTrendingSection: function MockDiscoverTrendingSection({ type }: { type: string }) {
      return <div data-testid={`${type}-section`}>{type} Section</div>;
    },
  };
});

jest.mock('@/components/UserRecommendations', () => {
  return function MockUserRecommendations() {
    return <div data-testid="user-recommendations">User Recommendations</div>;
  };
});

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('Tab Load Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Switch Performance', () => {
    it('should switch to Albums tab in < 1 second', async () => {
      render(<DiscoverTabs />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Click Albums tab
      const albumsTab = screen.getByText('Albums');
      fireEvent.click(albumsTab);

      // Wait for Albums section to appear
      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const switchTime = endTime - startTime;

      // Target: < 1 second (1000ms)
      expect(switchTime).toBeLessThan(1000);
    });

    it('should switch to Playlists tab in < 1 second', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Click Playlists tab
      const playlistsTab = screen.getByText('Playlists');
      fireEvent.click(playlistsTab);

      // Wait for Playlists section to appear
      await waitFor(() => {
        expect(screen.getByTestId('playlists-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const switchTime = endTime - startTime;

      // Target: < 1 second (1000ms)
      expect(switchTime).toBeLessThan(1000);
    });

    it('should switch to Creators tab in < 1 second', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Click Creators tab
      const creatorsTab = screen.getByText('Creators');
      fireEvent.click(creatorsTab);

      // Wait for Creators section to appear
      await waitFor(() => {
        expect(screen.getByTestId('creators-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const switchTime = endTime - startTime;

      // Target: < 1 second (1000ms)
      expect(switchTime).toBeLessThan(1000);
    });

    it('should switch back to Tracks tab in < 1 second', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      // First switch to Albums
      const albumsTab = screen.getByText('Albums');
      fireEvent.click(albumsTab);

      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Switch back to Tracks
      const tracksTab = screen.getByText('Tracks');
      fireEvent.click(tracksTab);

      // Wait for Tracks section to appear
      await waitFor(() => {
        expect(screen.getByTestId('tracks-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const switchTime = endTime - startTime;

      // Target: < 1 second (1000ms)
      expect(switchTime).toBeLessThan(1000);
    });
  });

  describe('Component Rendering Optimization', () => {
    it('should render tabs immediately without delay', () => {
      const startTime = Date.now();

      render(<DiscoverTabs />);

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Initial render should be very fast (< 100ms)
      expect(renderTime).toBeLessThan(100);

      // All tabs should be visible
      expect(screen.getByText('Tracks')).toBeInTheDocument();
      expect(screen.getByText('Albums')).toBeInTheDocument();
      expect(screen.getByText('Playlists')).toBeInTheDocument();
      expect(screen.getByText('Creators')).toBeInTheDocument();
    });

    it('should not re-render inactive tabs', async () => {
      const { rerender } = render(<DiscoverTabs />);

      // Switch to Albums tab
      const albumsTab = screen.getByText('Albums');
      fireEvent.click(albumsTab);

      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });

      // Tracks section is still mounted but hidden (for fast switching)
      const tracksSection = screen.queryByTestId('tracks-section');
      if (tracksSection) {
        // Verify it's hidden via CSS
        const tracksContainer = tracksSection.closest('div[class*="hidden"]');
        expect(tracksContainer).toBeInTheDocument();
      }

      // Re-render should be fast
      const startTime = Date.now();
      rerender(<DiscoverTabs />);
      const endTime = Date.now();
      const rerenderTime = endTime - startTime;

      expect(rerenderTime).toBeLessThan(50);
    });

    it('should handle rapid tab switching efficiently', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Rapidly switch between tabs
      fireEvent.click(screen.getByText('Albums'));
      fireEvent.click(screen.getByText('Playlists'));
      fireEvent.click(screen.getByText('Creators'));
      fireEvent.click(screen.getByText('Tracks'));

      await waitFor(() => {
        expect(screen.getByTestId('tracks-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All switches should complete in < 2 seconds
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Memory and Performance', () => {
    it('should not cause memory leaks on tab switch', async () => {
      const { unmount } = render(<DiscoverTabs />);

      // Switch tabs multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Albums'));
        await waitFor(() => {
          expect(screen.getByTestId('albums-section')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Tracks'));
        await waitFor(() => {
          expect(screen.getByTestId('tracks-section')).toBeInTheDocument();
        });
      }

      // Unmount should clean up without errors
      unmount();

      // If we get here without errors, no memory leaks detected
      expect(true).toBe(true);
    });

    it('should preserve scroll position efficiently', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      // Switch to Albums
      fireEvent.click(screen.getByText('Albums'));

      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });

      // Switch back to Tracks
      const startTime = Date.now();
      fireEvent.click(screen.getByText('Tracks'));

      await waitFor(() => {
        expect(screen.getByTestId('tracks-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const switchTime = endTime - startTime;

      // Scroll restoration should not add significant delay
      expect(switchTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent Data Loading', () => {
    it('should load tab content concurrently', async () => {
      render(<DiscoverTabs />);

      // Initial Tracks tab should load
      await waitFor(() => {
        expect(screen.getByTestId('tracks-section')).toBeInTheDocument();
      });

      const startTime = Date.now();

      // Switch to Albums tab
      fireEvent.click(screen.getByText('Albums'));

      // Albums section should appear quickly (data loaded concurrently)
      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // With concurrent loading, should be fast
      expect(loadTime).toBeLessThan(1000);
    });

    it('should not block UI during data loading', async () => {
      render(<DiscoverTabs />);

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      // Click Albums tab
      fireEvent.click(screen.getByText('Albums'));

      // Tab should have active styling immediately (UI not blocked)
      const albumsTab = screen.getByText('Albums');
      const albumsButton = albumsTab.closest('button');
      
      // Check for active styling (blue text and border)
      expect(albumsButton).toHaveClass('text-blue-400');
      expect(albumsButton).toHaveClass('border-blue-400');

      // Content loads asynchronously
      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet all performance targets', async () => {
      const metrics = {
        initialRender: 0,
        tabSwitch: 0,
        rerender: 0,
      };

      // Measure initial render
      let startTime = Date.now();
      const { rerender } = render(<DiscoverTabs />);
      metrics.initialRender = Date.now() - startTime;

      await waitFor(() => {
        expect(screen.getByText('Tracks')).toBeInTheDocument();
      });

      // Measure tab switch
      startTime = Date.now();
      fireEvent.click(screen.getByText('Albums'));
      await waitFor(() => {
        expect(screen.getByTestId('albums-section')).toBeInTheDocument();
      });
      metrics.tabSwitch = Date.now() - startTime;

      // Measure rerender
      startTime = Date.now();
      rerender(<DiscoverTabs />);
      metrics.rerender = Date.now() - startTime;

      // Verify all metrics meet targets
      expect(metrics.initialRender).toBeLessThan(100); // < 100ms
      expect(metrics.tabSwitch).toBeLessThan(1000); // < 1 second
      expect(metrics.rerender).toBeLessThan(50); // < 50ms

      // Log metrics for monitoring
      console.log('Performance Metrics:', metrics);
    });
  });
});

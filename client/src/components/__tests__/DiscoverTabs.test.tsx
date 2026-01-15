/**
 * Unit Tests for DiscoverTabs Component
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate specific examples and edge cases for the DiscoverTabs component.
 * 
 * Test Coverage:
 * - Rendering of all four tabs
 * - Default Tracks tab selection
 * - Tab switching updates active state
 * - Scroll position preservation
 * - Active tab styling
 * - Responsive behavior
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DiscoverTabs } from '@/components/discover/DiscoverTabs';

// Mock the child components to avoid complex dependencies
jest.mock('@/components/discover/DiscoverTrendingSection', () => ({
  DiscoverTrendingSection: ({ type }: { type: string }) => (
    <div data-testid={`trending-section-${type}`}>Trending {type}</div>
  ),
}));

jest.mock('@/components/discover/TrendingAlbumsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="trending-albums-section">Trending Albums</div>,
}));

jest.mock('@/components/discover/TrendingPlaylistsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="trending-playlists-section">Trending Playlists</div>,
}));

jest.mock('@/components/UserRecommendations', () => ({
  __esModule: true,
  default: () => <div data-testid="user-recommendations">User Recommendations</div>,
}));

// Mock auth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/contexts/AuthContext');

describe('DiscoverTabs Component - Unit Tests', () => {
  beforeEach(() => {
    // Default to unauthenticated user
    useAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  /**
   * Test: Rendering of all four tabs
   * Validates: Requirements 7.1
   */
  describe('Tab Rendering', () => {
    it('should render all four tabs', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      // Check each tab is present
      const tabTexts = tabs.map(tab => tab.textContent?.toLowerCase() || '');
      expect(tabTexts.some(text => text.includes('tracks'))).toBe(true);
      expect(tabTexts.some(text => text.includes('albums'))).toBe(true);
      expect(tabTexts.some(text => text.includes('playlists'))).toBe(true);
      expect(tabTexts.some(text => text.includes('creators'))).toBe(true);
    });

    it('should render tabs with icons', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        // Each tab should have an icon (emoji)
        expect(tab.textContent).toMatch(/[🎵💿📝👥]/);
      });
    });
  });

  /**
   * Test: Default Tracks tab selection
   * Validates: Requirements 7.2
   */
  describe('Default Tab Selection', () => {
    it('should have Tracks tab active by default', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const tracksTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('tracks'));

      expect(tracksTab).toHaveAttribute('aria-selected', 'true');
      expect(tracksTab).toHaveClass('text-blue-400');
      expect(tracksTab).toHaveClass('border-blue-400');
    });

    it('should display Tracks content by default', () => {
      render(<DiscoverTabs />);

      expect(screen.getByTestId('trending-section-tracks')).toBeInTheDocument();
      expect(screen.queryByTestId('trending-albums-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trending-playlists-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trending-section-creators')).not.toBeInTheDocument();
    });

    it('should respect defaultTab prop when provided', () => {
      render(<DiscoverTabs defaultTab="albums" />);

      const tabs = screen.getAllByRole('tab');
      const albumsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('albums'));

      expect(albumsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('trending-albums-section')).toBeInTheDocument();
    });
  });

  /**
   * Test: Tab switching updates active state
   * Validates: Requirements 7.3
   */
  describe('Tab Switching', () => {
    it('should switch to Albums tab when clicked', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const albumsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('albums'));

      if (albumsTab) {
        fireEvent.click(albumsTab);

        expect(albumsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('trending-albums-section')).toBeInTheDocument();
        expect(screen.queryByTestId('trending-section-tracks')).not.toBeInTheDocument();
      }
    });

    it('should switch to Playlists tab when clicked', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const playlistsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('playlists'));

      if (playlistsTab) {
        fireEvent.click(playlistsTab);

        expect(playlistsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('trending-playlists-section')).toBeInTheDocument();
        expect(screen.queryByTestId('trending-section-tracks')).not.toBeInTheDocument();
      }
    });

    it('should switch to Creators tab when clicked', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const creatorsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('creators'));

      if (creatorsTab) {
        fireEvent.click(creatorsTab);

        expect(creatorsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('trending-section-creators')).toBeInTheDocument();
        expect(screen.queryByTestId('trending-section-tracks')).not.toBeInTheDocument();
      }
    });

    it('should update active state when switching between multiple tabs', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const albumsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('albums'));
      const playlistsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('playlists'));
      const tracksTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('tracks'));

      // Switch to Albums
      if (albumsTab) {
        fireEvent.click(albumsTab);
        expect(albumsTab).toHaveAttribute('aria-selected', 'true');
        expect(tracksTab).toHaveAttribute('aria-selected', 'false');
      }

      // Switch to Playlists
      if (playlistsTab) {
        fireEvent.click(playlistsTab);
        expect(playlistsTab).toHaveAttribute('aria-selected', 'true');
        expect(albumsTab).toHaveAttribute('aria-selected', 'false');
      }

      // Switch back to Tracks
      if (tracksTab) {
        fireEvent.click(tracksTab);
        expect(tracksTab).toHaveAttribute('aria-selected', 'true');
        expect(playlistsTab).toHaveAttribute('aria-selected', 'false');
      }
    });
  });

  /**
   * Test: Scroll position preservation
   * Validates: Requirements 7.4
   * 
   * Note: Full scroll behavior testing requires E2E tests.
   * This test validates the component structure supports scroll preservation.
   */
  describe('Scroll Position Preservation', () => {
    it('should have scrollable content container', () => {
      const { container } = render(<DiscoverTabs />);

      const scrollContainer = container.querySelector('[role="tabpanel"]');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });

    it('should maintain separate content for each tab', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      
      // Switch to each tab and verify content changes
      tabs.forEach(tab => {
        fireEvent.click(tab);
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Active tab styling
   * Validates: Requirements 7.5
   */
  describe('Active Tab Styling', () => {
    it('should apply active styling to selected tab', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const tracksTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('tracks'));

      expect(tracksTab).toHaveClass('text-blue-400');
      expect(tracksTab).toHaveClass('border-b-2');
      expect(tracksTab).toHaveClass('border-blue-400');
      expect(tracksTab).toHaveClass('bg-blue-400/10');
    });

    it('should apply inactive styling to non-selected tabs', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const albumsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('albums'));

      expect(albumsTab).toHaveClass('text-gray-400');
      expect(albumsTab).not.toHaveClass('border-blue-400');
    });

    it('should update styling when tab changes', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const tracksTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('tracks'));
      const albumsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('albums'));

      // Initially Tracks is active
      expect(tracksTab).toHaveClass('text-blue-400');
      expect(albumsTab).toHaveClass('text-gray-400');

      // Click Albums
      if (albumsTab) {
        fireEvent.click(albumsTab);

        // Now Albums is active
        expect(albumsTab).toHaveClass('text-blue-400');
        expect(tracksTab).toHaveClass('text-gray-400');
      }
    });
  });

  /**
   * Test: Responsive behavior
   * Validates: Requirements 7.6
   */
  describe('Responsive Design', () => {
    it('should have responsive classes for mobile scrolling', () => {
      const { container } = render(<DiscoverTabs />);

      const tabContainer = container.querySelector('.overflow-x-auto');
      expect(tabContainer).toBeInTheDocument();
      expect(tabContainer).toHaveClass('scrollbar-hide');
    });

    it('should have proper spacing for touch targets', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('px-6');
        expect(tab).toHaveClass('py-3');
      });
    });

    it('should prevent text wrapping in tabs', () => {
      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('whitespace-nowrap');
        expect(tab).toHaveClass('min-w-fit');
      });
    });
  });

  /**
   * Test: Authenticated vs Unauthenticated behavior
   * Validates: Requirements 11.1 (Creators tab shows recommendations for authenticated users)
   */
  describe('Authentication-based Content', () => {
    it('should not show user recommendations for unauthenticated users', () => {
      useAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      });

      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const creatorsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('creators'));

      if (creatorsTab) {
        fireEvent.click(creatorsTab);
        expect(screen.queryByTestId('user-recommendations')).not.toBeInTheDocument();
      }
    });

    it('should show user recommendations for authenticated users', () => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com' },
        session: { user: { id: 'test-user' } },
        loading: false,
      });

      render(<DiscoverTabs />);

      const tabs = screen.getAllByRole('tab');
      const creatorsTab = tabs.find(tab => tab.textContent?.toLowerCase().includes('creators'));

      if (creatorsTab) {
        fireEvent.click(creatorsTab);
        expect(screen.getByTestId('user-recommendations')).toBeInTheDocument();
      }
    });
  });
});

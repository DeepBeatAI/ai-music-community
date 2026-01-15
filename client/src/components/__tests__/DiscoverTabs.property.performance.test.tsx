/**
 * Property-Based Test for Tab Load Performance
 * 
 * Property 27: Tab Load Performance
 * For any tab switch, the content should load and display within 1 second.
 * 
 * Validates: Requirements 12.5
 * 
 * Feature: discover-page-tabs-enhancement, Property 27: Tab Load Performance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

type TabType = 'tracks' | 'albums' | 'playlists' | 'creators';

describe('Feature: discover-page-tabs-enhancement, Property 27: Tab Load Performance', () => {
  /**
   * Property 27: Tab Load Performance
   * 
   * For any tab switch, the content should load and display within 1 second.
   * 
   * This property tests that regardless of which tab is clicked, the tab content
   * loads within the 1-second performance target.
   * 
   * Validates: Requirements 12.5
   */
  it('Property 27: For any tab switch, content should load within 1 second', async () => {
    // Generator for tab types
    const tabArbitrary = fc.constantFrom<TabType>('tracks', 'albums', 'playlists', 'creators');

    // Generator for tab switch sequences (2-5 switches)
    const tabSequenceArbitrary = fc.array(tabArbitrary, { minLength: 2, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(tabSequenceArbitrary, async (tabSequence) => {
        // Render the component
        const { unmount } = render(<DiscoverTabs />);

        try {
          // Wait for initial render
          await waitFor(() => {
            expect(screen.getByText('Tracks')).toBeInTheDocument();
          }, { timeout: 2000 });

          // Test each tab switch in the sequence
          for (const tab of tabSequence) {
            const startTime = Date.now();

            // Click the tab
            const tabButton = screen.getByText(
              tab.charAt(0).toUpperCase() + tab.slice(1)
            );
            fireEvent.click(tabButton);

            // Wait for the tab content to appear
            const testId = `${tab}-section`;
            await waitFor(() => {
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 2000 });

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            // Verify load time is within 1 second (1000ms)
            expect(loadTime).toBeLessThan(1000);
          }
        } finally {
          // Clean up
          unmount();
        }
      }),
      {
        numRuns: 100, // Run 100 iterations as specified in design
        timeout: 30000, // 30 second timeout for all runs
      }
    );
  });

  /**
   * Additional Property: Tab Switch Performance Consistency
   * 
   * For any sequence of tab switches, each switch should consistently
   * meet the 1-second performance target.
   * 
   * This tests that performance doesn't degrade with multiple switches.
   */
  it('should maintain consistent performance across multiple tab switches', async () => {
    const tabArbitrary = fc.constantFrom<TabType>('tracks', 'albums', 'playlists', 'creators');
    const tabSequenceArbitrary = fc.array(tabArbitrary, { minLength: 3, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(tabSequenceArbitrary, async (tabSequence) => {
        const { unmount } = render(<DiscoverTabs />);

        try {
          await waitFor(() => {
            expect(screen.getByText('Tracks')).toBeInTheDocument();
          }, { timeout: 2000 });

          const loadTimes: number[] = [];

          for (const tab of tabSequence) {
            const startTime = Date.now();

            const tabButton = screen.getByText(
              tab.charAt(0).toUpperCase() + tab.slice(1)
            );
            fireEvent.click(tabButton);

            const testId = `${tab}-section`;
            await waitFor(() => {
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 2000 });

            const endTime = Date.now();
            const loadTime = endTime - startTime;
            loadTimes.push(loadTime);

            // Each individual switch should be < 1 second
            expect(loadTime).toBeLessThan(1000);
          }

          // Average load time should also be well under 1 second
          const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
          expect(avgLoadTime).toBeLessThan(1000);

          // No single load time should be significantly worse than others
          // (no more than 2x the average)
          const maxLoadTime = Math.max(...loadTimes);
          expect(maxLoadTime).toBeLessThan(avgLoadTime * 2);
        } finally {
          unmount();
        }
      }),
      {
        numRuns: 50, // Fewer runs since this tests longer sequences
        timeout: 60000, // 60 second timeout
      }
    );
  });

  /**
   * Additional Property: Default Tab Performance
   * 
   * For any default tab selection, the initial load should be within 1 second.
   */
  it('should load any default tab within 1 second', async () => {
    const defaultTabArbitrary = fc.constantFrom<TabType>('tracks', 'albums', 'playlists', 'creators');

    await fc.assert(
      fc.asyncProperty(defaultTabArbitrary, async (defaultTab) => {
        const startTime = Date.now();

        const { unmount } = render(<DiscoverTabs defaultTab={defaultTab} />);

        try {
          // Wait for the default tab content to appear
          const testId = `${defaultTab}-section`;
          await waitFor(() => {
            expect(screen.getByTestId(testId)).toBeInTheDocument();
          }, { timeout: 2000 });

          const endTime = Date.now();
          const loadTime = endTime - startTime;

          // Initial load should be within 1 second
          expect(loadTime).toBeLessThan(1000);
        } finally {
          unmount();
        }
      }),
      {
        numRuns: 100,
        timeout: 30000,
      }
    );
  });

  /**
   * Additional Property: Rapid Tab Switching Performance
   * 
   * For any rapid sequence of tab switches (no delay between clicks),
   * the final tab should still load within 1 second of the last click.
   */
  it('should handle rapid tab switching without performance degradation', async () => {
    const tabArbitrary = fc.constantFrom<TabType>('tracks', 'albums', 'playlists', 'creators');
    const rapidSequenceArbitrary = fc.array(tabArbitrary, { minLength: 3, maxLength: 6 });

    await fc.assert(
      fc.asyncProperty(rapidSequenceArbitrary, async (tabSequence) => {
        const { unmount } = render(<DiscoverTabs />);

        try {
          await waitFor(() => {
            expect(screen.getByText('Tracks')).toBeInTheDocument();
          }, { timeout: 2000 });

          // Click all tabs rapidly (no waiting between clicks)
          for (const tab of tabSequence) {
            const tabButton = screen.getByText(
              tab.charAt(0).toUpperCase() + tab.slice(1)
            );
            fireEvent.click(tabButton);
          }

          // Measure time for final tab to load
          const finalTab = tabSequence[tabSequence.length - 1];
          const startTime = Date.now();

          const testId = `${finalTab}-section`;
          await waitFor(() => {
            expect(screen.getByTestId(testId)).toBeInTheDocument();
          }, { timeout: 2000 });

          const endTime = Date.now();
          const loadTime = endTime - startTime;

          // Final tab should load within 1 second
          expect(loadTime).toBeLessThan(1000);
        } finally {
          unmount();
        }
      }),
      {
        numRuns: 50,
        timeout: 60000,
      }
    );
  });
});

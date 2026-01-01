/**
 * Property-Based Tests for Album Metrics Calculation Accuracy
 * Feature: Album Flagging System, Property 17: Metrics Calculation Accuracy
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6
 * 
 * These tests verify that album-specific metrics are calculated correctly
 * based on the underlying data, including report counts, percentages,
 * averages, and cascading action statistics.
 */

import fc from 'fast-check';
import { calculateModerationMetrics } from '@/lib/moderationService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const { supabase } = require('@/lib/supabase');

describe('Property 17: Album Metrics Calculation Accuracy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to create comprehensive mocks for calculateModerationMetrics
   * This mocks ALL database queries that the function makes
   */
  function setupCompleteMocks(albumCount: number, trackCount: number, albumActions: any[] = []) {
    // Mock authenticated moderator
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'mod-id' } },
      error: null,
    });

    // Track which query we're on for moderation_reports table
    let reportQueryCount = 0;

    // Mock from() to return complete chainable methods for all queries
    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        };
      } else if (table === 'moderation_reports') {
        reportQueryCount++;
        const currentQuery = reportQueryCount;
        
        return {
          select: jest.fn().mockImplementation((fields: string, options?: any) => {
            // Handle count queries with head: true
            if (options?.count === 'exact' && options?.head === true) {
              return {
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                eq: jest.fn().mockImplementation((field: string, value: string) => {
                  // Album/track count queries
                  if (field === 'report_type' && value === 'album') {
                    return {
                      gte: jest.fn().mockReturnThis(),
                      lte: jest.fn().mockResolvedValue({ count: albumCount, error: null }),
                    };
                  } else if (field === 'report_type' && value === 'track') {
                    return {
                      gte: jest.fn().mockReturnThis(),
                      lte: jest.fn().mockResolvedValue({ count: trackCount, error: null }),
                    };
                  }
                  // Default count queries (today/week/month reports)
                  return {
                    gte: jest.fn().mockReturnThis(),
                    lte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                  };
                }),
              };
            }
            // Handle data queries (not count) - for album reasons and target_ids
            return {
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              lte: jest.fn().mockResolvedValue({ data: [], error: null }),
              in: jest.fn().mockReturnThis(),
              not: jest.fn().mockReturnThis(),
            };
          }),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
      } else if (table === 'moderation_actions') {
        return {
          select: jest.fn().mockImplementation((fields: string) => {
            // Check if this is the album actions query (has 'metadata' in select)
            if (fields.includes('metadata')) {
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lte: jest.fn().mockResolvedValue({
                        data: albumActions,
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            // Default actions query (for action_type counts)
            return {
              gte: jest.fn().mockReturnThis(),
              lte: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      } else if (table === 'album_tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      // Default mock for any other table
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        in: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });
  }

  /**
   * Property 17.1: Album vs Track Percentage Calculation
   * For any number of album reports and track reports, the percentage should be
   * calculated correctly as (album_reports / (album_reports + track_reports)) * 100
   */
  test('Property 17.1: Album vs track percentage is calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        async (albumCount, trackCount) => {
          setupCompleteMocks(albumCount, trackCount);

          // Execute
          const metrics = await calculateModerationMetrics();

          // Calculate expected percentage
          const total = albumCount + trackCount;
          const expected = total > 0
            ? Math.round(((albumCount / total) * 100) * 10) / 10
            : 0;

          // Assert
          expect(metrics.albumMetrics).toBeDefined();
          expect(metrics.albumMetrics!.albumVsTrackPercentage).toBe(expected);
        }
      ),
      { numRuns: 50 } // Reduced from 100 for faster execution
    );
  });

  /**
   * Property 17.2: Cascading Action Percentage Calculation
   * For any number of cascading and selective actions, the percentage should be correct
   */
  test('Property 17.2: Cascading action percentage is calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        async (cascadingCount, selectiveCount) => {
          // Generate mock actions
          const cascadingActions = Array.from({ length: cascadingCount }, (_, i) => ({
            metadata: {
              cascading_action: true,
              affected_tracks: [`track-${i}`],
            },
          }));

          const selectiveActions = Array.from({ length: selectiveCount }, () => ({
            metadata: {
              cascading_action: false,
            },
          }));

          const allActions = [...cascadingActions, ...selectiveActions];

          setupCompleteMocks(0, 0, allActions);

          // Execute
          const metrics = await calculateModerationMetrics();

          // Calculate expected percentage
          const total = cascadingCount + selectiveCount;
          const expected = total > 0
            ? Math.round(((cascadingCount / total) * 100) * 10) / 10
            : 0;

          // Assert
          expect(metrics.albumMetrics).toBeDefined();
          expect(metrics.albumMetrics!.cascadingActionStats.totalCascadingActions).toBe(total);
          expect(metrics.albumMetrics!.cascadingActionStats.albumAndTracksRemoved).toBe(cascadingCount);
          expect(metrics.albumMetrics!.cascadingActionStats.albumOnlyRemoved).toBe(selectiveCount);
          expect(metrics.albumMetrics!.cascadingActionStats.cascadingPercentage).toBe(expected);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 17.3: Total Album Reports Count Accuracy
   * For any number of album reports, the count should match exactly
   */
  test('Property 17.3: Total album reports count is accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 200 }),
        async (reportCount) => {
          setupCompleteMocks(reportCount, 0);

          // Execute
          const metrics = await calculateModerationMetrics();

          // Assert
          expect(metrics.albumMetrics).toBeDefined();
          expect(metrics.albumMetrics!.totalAlbumReports).toBe(reportCount);
        }
      ),
      { numRuns: 50 }
    );
  });
});

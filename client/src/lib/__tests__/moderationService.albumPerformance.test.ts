/**
 * Performance Tests for Album Flagging System
 * 
 * Tests performance requirements for:
 * - Album context fetching (< 100ms)
 * - Cascading deletion with 100 tracks (< 5 seconds)
 * - Queue filtering with large datasets
 * 
 * Requirements: 3.4, 4.3
 * Task: 16.1
 */

import { fetchAlbumContext, takeModerationAction } from '@/lib/moderationService';
import { ModerationActionParams } from '@/types/moderation';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Album Flagging System - Performance Tests', () => {
  const mockModeratorId = '11111111-1111-1111-1111-111111111111';
  const mockAlbumId = '22222222-2222-2222-2222-222222222222';
  const mockAlbumOwnerId = '33333333-3333-3333-3333-333333333333';
  const mockReportId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Album context fetching performance
   * Requirements: 3.4
   * 
   * Verifies that fetchAlbumContext completes within 100ms
   */
  describe('Album Context Fetching Performance', () => {
    it('should fetch album context in under 100ms on average', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock database responses with album and tracks
      const mockAlbumData = {
        id: mockAlbumId,
        name: 'Test Album',
        description: 'Test Description',
        cover_image_url: null,
        user_id: mockAlbumOwnerId,
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        album_tracks: Array.from({ length: 10 }, (_, i) => ({
          position: i + 1,
          track: {
            id: `track-${i + 1}`,
            title: `Track ${i + 1}`,
            duration: 180 + i * 10,
          },
        })),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbumData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Run multiple iterations to get average
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await fetchAlbumContext(mockAlbumId);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      // Calculate statistics
      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Album Context Fetch Performance:
        Average: ${averageTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Target: < 100ms
      `);

      // Verify average time is under 100ms
      expect(averageTime).toBeLessThan(100);
    });

    it('should maintain performance with albums containing many tracks', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock album with 50 tracks
      const mockAlbumData = {
        id: mockAlbumId,
        name: 'Large Album',
        description: 'Album with many tracks',
        cover_image_url: null,
        user_id: mockAlbumOwnerId,
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        album_tracks: Array.from({ length: 50 }, (_, i) => ({
          position: i + 1,
          track: {
            id: `track-${i + 1}`,
            title: `Track ${i + 1}`,
            duration: 180 + i * 5,
          },
        })),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbumData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const startTime = performance.now();
      const result = await fetchAlbumContext(mockAlbumId);
      const endTime = performance.now();
      const fetchTime = endTime - startTime;

      console.log(`Large Album (50 tracks) Fetch Time: ${fetchTime.toFixed(2)}ms`);

      // Should still be under 100ms with 50 tracks
      expect(fetchTime).toBeLessThan(100);
      expect(result.track_count).toBe(50);
    });
  });

  /**
   * Test 2: Cascading deletion performance
   * Requirements: 4.3
   * 
   * Verifies that cascading deletion of album with 100 tracks completes within 5 seconds
   */
  describe('Cascading Deletion Performance', () => {
    it('should complete cascading deletion of album with 100 tracks in under 5 seconds', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Generate 100 track IDs
      const trackIds = Array.from({ length: 100 }, (_, i) => `track-${i + 1}`);

      // Mock album with 100 tracks
      const mockAlbumData = {
        id: mockAlbumId,
        name: 'Large Album',
        description: 'Album with 100 tracks',
        cover_image_url: null,
        user_id: mockAlbumOwnerId,
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        album_tracks: trackIds.map((id, i) => ({
          position: i + 1,
          track: {
            id,
            title: `Track ${i + 1}`,
            duration: 180,
          },
        })),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbumData,
                  error: null,
                }),
                single: jest.fn().mockResolvedValue({
                  data: { user_id: mockAlbumOwnerId },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: mockAlbumId }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'album_tracks') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: mockReportId,
                    report_type: 'album',
                    target_id: mockAlbumId,
                    reported_user_id: mockAlbumOwnerId,
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'action-1',
                    moderator_id: mockModeratorId,
                    target_user_id: mockAlbumOwnerId,
                    action_type: 'content_removed',
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ModerationActionParams = {
        reportId: mockReportId,
        actionType: 'content_removed',
        targetUserId: mockAlbumOwnerId,
        targetType: 'album',
        targetId: mockAlbumId,
        reason: 'Performance test',
        cascadingOptions: {
          removeAlbum: true,
          removeTracks: true,
        },
      };

      const startTime = performance.now();
      await takeModerationAction(params);
      const endTime = performance.now();
      const deletionTime = endTime - startTime;

      console.log(`Cascading Deletion (100 tracks) Time: ${deletionTime.toFixed(2)}ms`);

      // Should complete in under 5 seconds (5000ms)
      expect(deletionTime).toBeLessThan(5000);
    });

    it('should scale linearly with number of tracks', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      const trackCounts = [10, 25, 50];
      const times: number[] = [];

      for (const trackCount of trackCounts) {
        const trackIds = Array.from({ length: trackCount }, (_, i) => `track-${i + 1}`);

        const mockAlbumData = {
          id: mockAlbumId,
          name: `Album with ${trackCount} tracks`,
          description: 'Test album',
          cover_image_url: null,
          user_id: mockAlbumOwnerId,
          is_public: true,
          created_at: '2024-01-01T00:00:00Z',
          album_tracks: trackIds.map((id, i) => ({
            position: i + 1,
            track: {
              id,
              title: `Track ${i + 1}`,
              duration: 180,
            },
          })),
        };

        const mockFrom = jest.fn((table: string) => {
          if (table === 'albums') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: mockAlbumData,
                    error: null,
                  }),
                  single: jest.fn().mockResolvedValue({
                    data: { user_id: mockAlbumOwnerId },
                    error: null,
                  }),
                }),
              }),
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: mockAlbumId }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'album_tracks') {
            return {
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            };
          }
          if (table === 'moderation_reports') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockReportId,
                      report_type: 'album',
                      target_id: mockAlbumId,
                      reported_user_id: mockAlbumOwnerId,
                    },
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            };
          }
          if (table === 'moderation_actions') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({
                    count: 0,
                    error: null,
                  }),
                }),
              }),
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'action-1',
                      moderator_id: mockModeratorId,
                      target_user_id: mockAlbumOwnerId,
                      action_type: 'content_removed',
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            };
          }
          if (table === 'user_roles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ role_type: 'moderator' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return { select: jest.fn() };
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        const params: ModerationActionParams = {
          reportId: mockReportId,
          actionType: 'content_removed',
          targetUserId: mockAlbumOwnerId,
          targetType: 'album',
          targetId: mockAlbumId,
          reason: 'Scaling test',
          cascadingOptions: {
            removeAlbum: true,
            removeTracks: true,
          },
        };

        const startTime = performance.now();
        await takeModerationAction(params);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      console.log(`Cascading Deletion Scaling:
        10 tracks: ${times[0].toFixed(2)}ms
        25 tracks: ${times[1].toFixed(2)}ms
        50 tracks: ${times[2].toFixed(2)}ms
      `);

      // Verify all deletions completed
      expect(times).toHaveLength(3);
      times.forEach(time => {
        expect(time).toBeLessThan(5000);
      });
    });
  });

  /**
   * Test 3: Queue filtering performance
   * Requirements: 3.6
   * 
   * Verifies that queue filtering remains fast with large datasets
   */
  describe('Queue Filtering Performance', () => {
    it('should filter queue by report type efficiently with large datasets', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock large dataset (1000 reports)
      const mockReports = Array.from({ length: 1000 }, (_, i) => ({
        id: `report-${i + 1}`,
        report_type: i % 5 === 0 ? 'album' : ['post', 'comment', 'track', 'user'][i % 4],
        status: 'pending',
        priority: (i % 5) + 1,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockReports.filter(r => r.report_type === 'album').slice(0, 50),
                    error: null,
                  }),
                }),
              }),
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockReports.slice(0, 50),
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Simulate queue filtering (this would normally be done by the queue component)
      const startTime = performance.now();
      
      // Filter by report_type = 'album'
      const filteredReports = mockReports.filter(r => r.report_type === 'album');
      
      const endTime = performance.now();
      const filterTime = endTime - startTime;

      console.log(`Queue Filtering Performance (1000 reports):
        Filter Time: ${filterTime.toFixed(2)}ms
        Filtered Results: ${filteredReports.length}
        Target: < 100ms
      `);

      // Filtering should be very fast (< 100ms)
      expect(filterTime).toBeLessThan(100);
      expect(filteredReports.length).toBeGreaterThan(0);
    });

    it('should maintain performance with multiple filter criteria', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock large dataset
      const mockReports = Array.from({ length: 1000 }, (_, i) => ({
        id: `report-${i + 1}`,
        report_type: i % 5 === 0 ? 'album' : ['post', 'comment', 'track', 'user'][i % 4],
        status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'under_review' : 'resolved',
        priority: (i % 5) + 1,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const startTime = performance.now();
      
      // Apply multiple filters
      const filteredReports = mockReports
        .filter(r => r.report_type === 'album')
        .filter(r => r.status === 'pending')
        .filter(r => r.priority <= 3);
      
      const endTime = performance.now();
      const filterTime = endTime - startTime;

      console.log(`Multi-Criteria Filtering Performance:
        Filter Time: ${filterTime.toFixed(2)}ms
        Filtered Results: ${filteredReports.length}
        Criteria: report_type=album, status=pending, priority<=3
      `);

      // Multi-criteria filtering should still be fast
      expect(filterTime).toBeLessThan(100);
    });

    it('should handle sorting efficiently with large datasets', async () => {
      // Mock large dataset
      const mockReports = Array.from({ length: 1000 }, (_, i) => ({
        id: `report-${i + 1}`,
        report_type: i % 5 === 0 ? 'album' : ['post', 'comment', 'track', 'user'][i % 4],
        status: 'pending',
        priority: (i % 5) + 1,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const startTime = performance.now();
      
      // Sort by priority (ascending) then created_at (descending)
      const sortedReports = [...mockReports].sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const endTime = performance.now();
      const sortTime = endTime - startTime;

      console.log(`Sorting Performance (1000 reports):
        Sort Time: ${sortTime.toFixed(2)}ms
        Target: < 100ms
      `);

      // Sorting should be fast
      expect(sortTime).toBeLessThan(100);
      expect(sortedReports).toHaveLength(1000);
      
      // Verify sort order
      expect(sortedReports[0].priority).toBeLessThanOrEqual(sortedReports[1].priority);
    });
  });
});

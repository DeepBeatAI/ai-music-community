/**
 * Property-Based Tests for Report Quality Metrics
 * Feature: enhanced-report-evidence, Property 16
 * 
 * These tests validate report quality metric calculations using property-based testing.
 * Tests metric calculations with various data scenarios and edge cases.
 * 
 * Validates: Requirements 11.1
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ModerationMetrics } from '@/components/moderation/ModerationMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import * as moderationService from '@/lib/moderationService';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/moderationService');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('ModerationMetrics - Report Quality Property Tests', () => {
  const mockUser = { id: 'admin-123', email: 'admin@example.com' };
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
    
    // Mock isAdmin
    (moderationService.isAdmin as jest.Mock).mockResolvedValue(false);
    
    // Mock calculateModerationMetrics with default data
    (moderationService.calculateModerationMetrics as jest.Mock).mockResolvedValue({
      reportsReceived: { today: 0, week: 0, month: 0 },
      reportsResolved: { today: 0, week: 0, month: 0 },
      averageResolutionTime: { hours: 0, minutes: 0 },
      actionsByType: {},
      topReasons: [],
      moderatorPerformance: [],
      albumMetrics: {
        totalAlbumReports: 0,
        albumVsTrackPercentage: 0,
        topAlbumReasons: [],
        averageTracksPerReportedAlbum: 0,
        cascadingActionStats: {
          totalCascadingActions: 0,
          albumAndTracksRemoved: 0,
          albumOnlyRemoved: 0,
          cascadingPercentage: 0,
        },
      },
    });
    
    // Mock Supabase RPC for reversal metrics
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        overallReversalRate: 0,
        totalReversals: 0,
        totalActions: 0,
        timeToReversalStats: { averageHours: 0 },
      },
      error: null,
    });
  });

  /**
   * Property 16: Report Quality Metrics
   * Feature: enhanced-report-evidence, Property 16
   * 
   * For any time period, the metrics dashboard should accurately calculate and display
   * the percentage of reports with evidence, average description length, and percentage
   * meeting minimum character requirements.
   * 
   * Validates: Requirements 11.1
   */
  describe('Property 16: Report Quality Metrics', () => {
    it('should correctly calculate percentage of reports with evidence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // total reports
          fc.integer({ min: 0, max: 100 }), // percentage with evidence
          async (totalReports, evidencePercentage) => {
            const reportsWithEvidence = Math.floor((totalReports * evidencePercentage) / 100);
            const reportsWithoutEvidence = totalReports - reportsWithEvidence;

            // Generate mock reports
            const mockReports = [
              ...Array(reportsWithEvidence).fill(null).map((_, i) => ({
                description: 'Test description with sufficient length',
                metadata: {
                  originalWorkLink: `https://example.com/${i}`,
                },
              })),
              ...Array(reportsWithoutEvidence).fill(null).map(() => ({
                description: 'Test description without evidence',
                metadata: null,
              })),
            ];

            // Mock Supabase query
            const mockFrom = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: mockReports,
                    error: null,
                  }),
                }),
              }),
            });
            (supabase.from as jest.Mock).mockImplementation(mockFrom);

            // Mock other required queries
            (supabase.rpc as jest.Mock).mockResolvedValue({
              data: {
                overallReversalRate: 0,
                totalReversals: 0,
                totalActions: 0,
                timeToReversalStats: { averageHours: 0 },
              },
              error: null,
            });

            const { unmount } = render(<ModerationMetrics />);

            // Wait for metrics to load
            await waitFor(() => {
              expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Calculate expected percentage
            const expectedPercentage = Math.round((reportsWithEvidence / totalReports) * 100);

            // Verify the percentage is displayed
            await waitFor(() => {
              const percentageElements = screen.queryAllByText(new RegExp(`${expectedPercentage}%`));
              expect(percentageElements.length).toBeGreaterThan(0);
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate average description length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 10, max: 500 }), { minLength: 1, maxLength: 20 }),
          async (descriptionLengths) => {
            // Generate mock reports with specific description lengths
            const mockReports = descriptionLengths.map(length => ({
              description: 'a'.repeat(length),
              metadata: null,
            }));

            // Mock Supabase query
            const mockFrom = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: mockReports,
                    error: null,
                  }),
                }),
              }),
            });
            (supabase.from as jest.Mock).mockImplementation(mockFrom);

            // Mock other required queries
            (supabase.rpc as jest.Mock).mockResolvedValue({
              data: {
                overallReversalRate: 0,
                totalReversals: 0,
                totalActions: 0,
                timeToReversalStats: { averageHours: 0 },
              },
              error: null,
            });

            const { unmount } = render(<ModerationMetrics />);

            // Wait for metrics to load
            await waitFor(() => {
              expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Calculate expected average
            const totalLength = descriptionLengths.reduce((sum, len) => sum + len, 0);
            const expectedAverage = Math.round(totalLength / descriptionLengths.length);

            // Verify the average is displayed
            await waitFor(() => {
              const avgElements = screen.queryAllByText(new RegExp(`${expectedAverage}`));
              expect(avgElements.length).toBeGreaterThan(0);
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate percentage meeting minimum character requirement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // total reports
          fc.integer({ min: 0, max: 100 }), // percentage meeting minimum
          async (totalReports, meetingMinimumPercentage) => {
            const reportsMeetingMinimum = Math.floor((totalReports * meetingMinimumPercentage) / 100);
            const reportsNotMeetingMinimum = totalReports - reportsMeetingMinimum;

            // Generate mock reports
            const mockReports = [
              ...Array(reportsMeetingMinimum).fill(null).map(() => ({
                description: 'This description has more than 20 characters',
                metadata: null,
              })),
              ...Array(reportsNotMeetingMinimum).fill(null).map(() => ({
                description: 'Short',
                metadata: null,
              })),
            ];

            // Mock Supabase query
            const mockFrom = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: mockReports,
                    error: null,
                  }),
                }),
              }),
            });
            (supabase.from as jest.Mock).mockImplementation(mockFrom);

            // Mock other required queries
            (supabase.rpc as jest.Mock).mockResolvedValue({
              data: {
                overallReversalRate: 0,
                totalReversals: 0,
                totalActions: 0,
                timeToReversalStats: { averageHours: 0 },
              },
              error: null,
            });

            const { unmount } = render(<ModerationMetrics />);

            // Wait for metrics to load
            await waitFor(() => {
              expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Calculate expected percentage
            const expectedPercentage = Math.round((reportsMeetingMinimum / totalReports) * 100);

            // Verify the percentage is displayed
            await waitFor(() => {
              const percentageElements = screen.queryAllByText(new RegExp(`${expectedPercentage}%`));
              expect(percentageElements.length).toBeGreaterThan(0);
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case: no reports', async () => {
      // Mock Supabase query with no reports
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Mock other required queries
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          overallReversalRate: 0,
          totalReversals: 0,
          totalActions: 0,
          timeToReversalStats: { averageHours: 0 },
        },
        error: null,
      });

      const { unmount } = render(<ModerationMetrics />);

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show 0 for all metrics - check the specific report quality section
      await waitFor(() => {
        expect(screen.getByText(/Based on 0 reports/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should handle edge case: all reports with evidence', async () => {
      const totalReports = 20;

      // Generate mock reports all with evidence
      const mockReports = Array(totalReports).fill(null).map((_, i) => ({
        description: 'Test description with sufficient length',
        metadata: {
          originalWorkLink: `https://example.com/${i}`,
          proofOfOwnership: 'Proof text',
          audioTimestamp: '2:35',
        },
      }));

      // Mock Supabase query
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockReports,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Mock other required queries
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          overallReversalRate: 0,
          totalReversals: 0,
          totalActions: 0,
          timeToReversalStats: { averageHours: 0 },
        },
        error: null,
      });

      const { unmount } = render(<ModerationMetrics />);

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show 100% for evidence provision
      await waitFor(() => {
        const percentageElements = screen.queryAllByText(/100%/);
        expect(percentageElements.length).toBeGreaterThan(0);
      });

      unmount();
    });

    it('should handle edge case: no reports with evidence', async () => {
      const totalReports = 20;

      // Generate mock reports without evidence
      const mockReports = Array(totalReports).fill(null).map(() => ({
        description: 'Test description without evidence',
        metadata: null,
      }));

      // Mock Supabase query
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockReports,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Mock other required queries
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          overallReversalRate: 0,
          totalReversals: 0,
          totalActions: 0,
          timeToReversalStats: { averageHours: 0 },
        },
        error: null,
      });

      const { unmount } = render(<ModerationMetrics />);

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show 0% for evidence provision and the insight message
      await waitFor(() => {
        expect(screen.getByText(/Low Evidence Provision Rate/i)).toBeInTheDocument();
        expect(screen.getByText(/Only 0% of reports include evidence/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should display quality insights based on metrics', async () => {
      // Generate mock reports with low evidence provision
      const mockReports = Array(20).fill(null).map(() => ({
        description: 'Short desc',
        metadata: null,
      }));

      // Mock Supabase query
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockReports,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Mock other required queries
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          overallReversalRate: 0,
          totalReversals: 0,
          totalActions: 0,
          timeToReversalStats: { averageHours: 0 },
        },
        error: null,
      });

      const { unmount } = render(<ModerationMetrics />);

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show insights about low evidence provision
      await waitFor(() => {
        expect(screen.getByText(/Low Evidence Provision Rate/i)).toBeInTheDocument();
      });

      unmount();
    });
  });
});

/**
 * Tests for ModeratorReversalStats component
 * Requirements: 14.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeratorReversalStats } from '../ModeratorReversalStats';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

describe('ModeratorReversalStats', () => {
  const mockShowToast = jest.fn();
  const mockStartDate = '2024-01-01T00:00:00.000Z';
  const mockEndDate = '2024-01-31T23:59:59.999Z';

  const mockPerModeratorStats = [
    {
      moderatorId: 'mod-1',
      totalActions: 100,
      reversedActions: 5,
      reversalRate: 5.0,
    },
    {
      moderatorId: 'mod-2',
      totalActions: 50,
      reversedActions: 15,
      reversalRate: 30.0,
    },
    {
      moderatorId: 'mod-3',
      totalActions: 75,
      reversedActions: 10,
      reversalRate: 13.33,
    },
  ];

  const mockProfiles = [
    { user_id: 'mod-1', username: 'moderator_one' },
    { user_id: 'mod-2', username: 'moderator_two' },
    { user_id: 'mod-3', username: 'moderator_three' },
  ];

  const mockReversals = [
    {
      id: 'action-1',
      action_type: 'user_suspended',
      target_type: 'user',
      target_id: 'user-123',
      reason: 'Spam posting',
      created_at: '2024-01-15T10:00:00.000Z',
      revoked_at: '2024-01-15T12:00:00.000Z',
      revoked_by: 'admin-1',
      metadata: { reversal_reason: 'False positive - user was framed' },
    },
    {
      id: 'action-2',
      action_type: 'content_removed',
      target_type: 'post',
      target_id: 'post-456',
      reason: 'Inappropriate content',
      created_at: '2024-01-20T14:00:00.000Z',
      revoked_at: '2024-01-21T10:00:00.000Z',
      revoked_by: 'admin-1',
      metadata: { reversal_reason: 'Content was actually appropriate' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      // Check for loading skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should render empty state when no stats provided', async () => {
      render(
        <ModeratorReversalStats
          perModeratorStats={[]}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No moderator activity in the selected period')).toBeInTheDocument();
      });
    });

    it('should render moderator stats table with usernames', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
        expect(screen.getAllByText('moderator_two').length).toBeGreaterThan(0);
        expect(screen.getAllByText('moderator_three').length).toBeGreaterThan(0);
      });
    });

    it('should display truncated IDs when username fetch fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/mod-1\.\.\./).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Reversal Rate Categories', () => {
    it('should display "Excellent" for rates < 10%', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={[mockPerModeratorStats[0]]}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Excellent')).toBeInTheDocument();
      });
    });

    it('should display "Critical" for rates >= 30%', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={[mockPerModeratorStats[1]]}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });

    it('should highlight moderators with high reversal rates', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        const highRateBadges = screen.getAllByText('⚠️ High Rate');
        expect(highRateBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate and display average reversal rate', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Average Reversal Rate')).toBeInTheDocument();
        // Average of 5.0, 30.0, 13.33 = 16.11
        expect(screen.getByText(/16\.1%/)).toBeInTheDocument();
      });
    });

    it('should display count of moderators with high rates', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderators with High Rate')).toBeInTheDocument();
        // Only mod-2 has rate >= 20%
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should display best performer', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Best Performer')).toBeInTheDocument();
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Drill-Down Functionality', () => {
    it('should fetch and display reversal details when clicking View Details', async () => {
      let callCount = 0;
      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        } else if (table === 'moderation_actions') {
          callCount++;
          if (callCount === 1) {
            // First call for reversals
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  not: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lte: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                          data: mockReversals,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
      });

      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Reversal Details for/)).toBeInTheDocument();
        expect(screen.getByText('User Suspended')).toBeInTheDocument();
        expect(screen.getByText('Content Removed')).toBeInTheDocument();
      });
    });

    it('should hide details when clicking Hide Details', async () => {
      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: mockReversals,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
      });

      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Reversal Details for/)).toBeInTheDocument();
      });

      const hideButton = screen.getByText('Hide Details');
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText(/Reversal Details for/)).not.toBeInTheDocument();
      });
    });

    it('should display reversal reasons from metadata', async () => {
      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: mockReversals,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
      });

      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('False positive - user was framed')).toBeInTheDocument();
        expect(screen.getByText('Content was actually appropriate')).toBeInTheDocument();
      });
    });
  });

  describe('Recommendations', () => {
    it('should display recommendations when high reversal rates detected', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recommendations for Improvement')).toBeInTheDocument();
        expect(
          screen.getByText(/Review moderation guidelines with moderators/)
        ).toBeInTheDocument();
      });
    });

    it('should not display recommendations when all rates are low', async () => {
      const lowRateStats = [
        {
          moderatorId: 'mod-1',
          totalActions: 100,
          reversedActions: 5,
          reversalRate: 5.0,
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [mockProfiles[0]],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={lowRateStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Recommendations for Improvement')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show toast when reversal fetch fails', async () => {
      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: null,
                      error: new Error('Database error'),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      render(
        <ModeratorReversalStats
          perModeratorStats={mockPerModeratorStats}
          startDate={mockStartDate}
          endDate={mockEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('moderator_one').length).toBeGreaterThan(0);
      });

      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Failed to load reversal details',
          'error'
        );
      });
    });
  });
});

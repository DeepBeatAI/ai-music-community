/**
 * Integration Tests for Reporter Accuracy Flow
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the complete reporter accuracy flow including:
 * - Accuracy calculation integration
 * - Accuracy display in report cards
 * - Accuracy display in violation history
 * - Conditional display logic
 * 
 * Requirements: 5.1, 5.2, 6.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ReportCard } from '@/components/moderation/ReportCard';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { Report } from '@/types/moderation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as moderationService from '@/lib/moderationService';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/moderationService');

describe('Reporter Accuracy - Integration Tests', () => {
  const mockUser = { id: 'moderator-123', email: 'mod@example.com' };
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

    // Default Supabase mocks
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { username: 'testuser', user_type: 'user' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'moderation_reports') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
              neq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'moderation_actions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    (moderationService.checkPreviousReversals as jest.Mock).mockResolvedValue({
      hasPreviousReversals: false,
      reversalCount: 0,
      mostRecentReversal: null,
    });
  });

  /**
   * Test: Accuracy calculation integration
   * 
   * Verify that calculateReporterAccuracy is called and returns correct data.
   */
  test('Accuracy calculation integration', async () => {
    const mockReports = [
      { id: '1', status: 'resolved', action_taken: 'content_removed' },
      { id: '2', status: 'resolved', action_taken: 'user_warned' },
      { id: '3', status: 'dismissed', action_taken: null },
      { id: '4', status: 'resolved', action_taken: null },
      { id: '5', status: 'resolved', action_taken: 'user_suspended' },
    ];

    // Mock Supabase to return reports
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockReports,
          error: null,
        }),
      }),
    });

    // Call the actual function (not mocked)
    const { calculateReporterAccuracy: actualCalculate } = jest.requireActual('@/lib/moderationService');
    const result = await actualCalculate('reporter-123');

    // Verify calculation
    expect(result).not.toBeNull();
    expect(result?.totalReports).toBe(5);
    expect(result?.accurateReports).toBe(3); // 3 resolved with action_taken
    expect(result?.accuracyRate).toBe(60); // 3/5 = 60%
  });

  /**
   * Test: Accuracy display in report cards
   * 
   * Verify that accuracy badge appears in report cards with correct data.
   */
  test('Accuracy display in report cards', async () => {
    const report: Report = {
      id: 'test-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report description',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false,
      metadata: {
        reporterAccuracy: {
          totalReports: 50,
          accurateReports: 40,
          accuracyRate: 80,
        },
      },
    };

    render(<ReportCard report={report} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Reporter: 80% accurate')).toBeInTheDocument();
    });

    // Verify green color for high accuracy
    const badge = screen.getByText('Reporter: 80% accurate');
    const badgeElement = badge.closest('span');
    expect(badgeElement).toHaveClass('bg-green-900/30');
    expect(badgeElement).toHaveClass('text-green-400');
  });

  /**
   * Test: Accuracy display in violation history
   * 
   * Verify that accuracy appears in the User Violation History section.
   */
  test('Accuracy display in violation history', async () => {
    const report: Report = {
      id: 'test-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false,
      metadata: null,
    };

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
      total_reports: 10,
      total_actions: 5,
      recent_actions: [],
    });

    (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue({
      totalReports: 50,
      accurateReports: 40,
      accuracyRate: 80,
    });

    render(
      <ModerationActionPanel
        report={report}
        
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('40 accurate out of 50 reports')).toBeInTheDocument();
    });
  });

  /**
   * Test: Conditional display logic - user reports
   * 
   * Verify that accuracy displays for user reports but not moderator flags.
   */
  test('Conditional display - user reports show accuracy', async () => {
    const userReport: Report = {
      id: 'user-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false, // User report
      metadata: null,
    };

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
      total_reports: 10,
      total_actions: 5,
      recent_actions: [],
    });

    (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue({
      totalReports: 50,
      accurateReports: 40,
      accuracyRate: 80,
    });

    render(
      <ModerationActionPanel
        report={userReport}
        
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
    });
  });

  /**
   * Test: Conditional display logic - moderator flags
   * 
   * Verify that accuracy does NOT display for moderator flags.
   */
  test('Conditional display - moderator flags hide accuracy', async () => {
    const moderatorFlag: Report = {
      id: 'mod-flag',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'moderator-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: true, // Moderator flag
      metadata: null,
    };

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
      total_reports: 10,
      total_actions: 5,
      recent_actions: [],
    });

    render(
      <ModerationActionPanel
        report={moderatorFlag}
        
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('User Violation History')).toBeInTheDocument();
    });

    // Verify accuracy is NOT displayed
    expect(screen.queryByText('Reporter Accuracy:')).not.toBeInTheDocument();
  });

  /**
   * Test: Color coding in report cards
   * 
   * Verify that badge colors change based on accuracy rate.
   */
  test('Color coding in report cards', async () => {
    const testCases = [
      { rate: 85, color: 'green', description: 'High accuracy' },
      { rate: 65, color: 'yellow', description: 'Medium accuracy' },
      { rate: 30, color: 'red', description: 'Low accuracy' },
    ];

    for (const { rate, color, description } of testCases) {
      const report: Report = {
        id: `test-${rate}`,
        report_type: 'track',
        target_id: 'target-123',
        reporter_id: 'reporter-123',
        reported_user_id: 'user-123',
        reason: 'spam',
        description: 'Test report',
        status: 'pending',
        priority: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        moderator_flagged: false,
        metadata: {
          reporterAccuracy: {
            totalReports: 100,
            accurateReports: rate,
            accuracyRate: rate,
          },
        },
      };

      const { unmount } = render(<ReportCard report={report} onSelect={mockOnSelect} />);

      await waitFor(() => {
        const badge = screen.getByText(`Reporter: ${rate}% accurate`);
        const badgeElement = badge.closest('span');
        expect(badgeElement).toHaveClass(`bg-${color}-900/30`);
        expect(badgeElement).toHaveClass(`text-${color}-400`);
      });

      unmount();
    }
  });

  /**
   * Test: No accuracy badge when metadata is missing
   * 
   * Verify that badge does not appear when reporterAccuracy is not in metadata.
   */
  test('No accuracy badge when metadata is missing', async () => {
    const report: Report = {
      id: 'test-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false,
      metadata: null, // No metadata
    };

    render(<ReportCard report={report} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Test report')).toBeInTheDocument();
    });

    // Verify no accuracy badge
    expect(screen.queryByText(/Reporter:.*accurate/i)).not.toBeInTheDocument();
  });

  /**
   * Test: Accuracy calculation with null reporter
   * 
   * Verify that null reporter ID returns null.
   */
  test('Accuracy calculation with null reporter', async () => {
    const { calculateReporterAccuracy: actualCalculate } = jest.requireActual('@/lib/moderationService');
    
    const result1 = await actualCalculate('');
    expect(result1).toBeNull();

    const result2 = await actualCalculate(null as any);
    expect(result2).toBeNull();
  });

  /**
   * Test: Accuracy formatting in violation history
   * 
   * Verify that percentage and fraction are formatted correctly.
   */
  test('Accuracy formatting in violation history', async () => {
    const report: Report = {
      id: 'test-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false,
      metadata: null,
    };

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
      total_reports: 10,
      total_actions: 5,
      recent_actions: [],
    });

    (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue({
      totalReports: 25,
      accurateReports: 20,
      accuracyRate: 80,
    });

    render(
      <ModerationActionPanel
        report={report}
        
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      // Verify large percentage display
      const percentageElement = screen.getByText('80%');
      expect(percentageElement).toHaveClass('text-2xl');
      expect(percentageElement).toHaveClass('font-bold');

      // Verify fraction display
      expect(screen.getByText('20 accurate out of 25 reports')).toBeInTheDocument();
    });
  });

  /**
   * Test: Complete accuracy flow
   * 
   * Test the complete flow from calculation to display in both card and panel.
   */
  test('Complete accuracy flow', async () => {
    // Step 1: Calculate accuracy
    const mockReports = [
      { id: '1', status: 'resolved', action_taken: 'content_removed' },
      { id: '2', status: 'resolved', action_taken: 'user_warned' },
      { id: '3', status: 'dismissed', action_taken: null },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockReports,
          error: null,
        }),
      }),
    });

    const { calculateReporterAccuracy: actualCalculate } = jest.requireActual('@/lib/moderationService');
    const accuracy = await actualCalculate('reporter-123');

    expect(accuracy).toEqual({
      totalReports: 3,
      accurateReports: 2,
      accuracyRate: 67,
    });

    // Step 2: Display in report card
    const reportWithAccuracy: Report = {
      id: 'test-report',
      report_type: 'track',
      target_id: 'target-123',
      reporter_id: 'reporter-123',
      reported_user_id: 'user-123',
      reason: 'spam',
      description: 'Test report',
      status: 'pending',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      moderator_flagged: false,
      metadata: {
        reporterAccuracy: accuracy,
      },
    };

    const { unmount: unmountCard } = render(
      <ReportCard report={reportWithAccuracy} onSelect={mockOnSelect} />
    );

    await waitFor(() => {
      expect(screen.getByText('Reporter: 67% accurate')).toBeInTheDocument();
    });

    unmountCard();

    // Step 3: Display in action panel
    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
      total_reports: 10,
      total_actions: 5,
      recent_actions: [],
    });

    (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue(accuracy);

    render(
      <ModerationActionPanel
        report={reportWithAccuracy}
        
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
      expect(screen.getByText('2 accurate out of 3 reports')).toBeInTheDocument();
    });
  });
});

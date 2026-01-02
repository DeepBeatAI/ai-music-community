/**
 * Property-Based Tests for ModerationActionPanel Accuracy Display
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the correctness properties for reporter accuracy display
 * in the User Violation History section using property-based testing.
 * 
 * Each test runs 100 iterations with randomly generated inputs to ensure
 * universal properties hold across all valid inputs.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { Report } from '@/types/moderation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as moderationService from '@/lib/moderationService';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/moderationService');

describe('ModerationActionPanel - Accuracy Display Property Tests', () => {
  const mockUser = { id: 'moderator-123', email: 'mod@example.com' };
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    
    // Mock Supabase queries
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
  });

  /**
   * Property 9: User Violation History Display
   * Feature: enhanced-report-evidence, Property 9
   * 
   * For any report in the action panel, the user violation history section should display
   * total reports count and past actions count for the reported user.
   * 
   * Validates: Requirements 6.1
   */
  test('Property 9: User violation history displays total reports and actions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        fc.constantFrom('track', 'post', 'comment', 'user', 'album'),
        async (reportId, totalReports, totalActions, reportType) => {
          // Create a report
          const report: Report = {
            id: reportId,
            report_type: reportType as any,
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
            metadata: null,
          };

          // Mock getUserModerationHistory
          (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
            total_reports: totalReports,
            total_actions: totalActions,
            recent_actions: [],
          });

          // Render the panel
          const { unmount } = render(
            <ModerationActionPanel
              report={report}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for the user history to load
          await waitFor(() => {
            expect(screen.getByText('User Violation History')).toBeInTheDocument();
          });

          // Verify total reports is displayed
          expect(screen.getByText('Total Reports:')).toBeInTheDocument();
          expect(screen.getByText(totalReports.toString())).toBeInTheDocument();

          // Verify past actions is displayed
          expect(screen.getByText('Past Actions (total):')).toBeInTheDocument();
          expect(screen.getByText(totalActions.toString())).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Conditional Reporter Accuracy in History
   * Feature: enhanced-report-evidence, Property 10
   * 
   * For any user-submitted report (not moderator flag), the user violation history section
   * should display the reporter's accuracy if available.
   * 
   * Validates: Requirements 6.2
   */
  test('Property 10: Reporter accuracy displays for user reports', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom('track', 'post', 'comment', 'user'),
        async (reportId, accuracyRate, totalReports, reportType) => {
          const accurateReports = Math.round((accuracyRate / 100) * totalReports);

          // Create a USER report (not moderator flagged)
          const report: Report = {
            id: reportId,
            report_type: reportType as any,
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
            moderator_flagged: false, // NOT a moderator flag
            metadata: null,
          };

          // Mock getUserModerationHistory
          (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
            total_reports: 10,
            total_actions: 5,
            recent_actions: [],
          });

          // Mock calculateReporterAccuracy
          (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue({
            totalReports,
            accurateReports,
            accuracyRate,
          });

          // Render the panel
          const { unmount } = render(
            <ModerationActionPanel
              report={report}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for the accuracy to load
          await waitFor(() => {
            expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
          });

          // Verify accuracy percentage is displayed
          expect(screen.getByText(`${accuracyRate}%`)).toBeInTheDocument();

          // Verify accuracy fraction is displayed
          const fractionText = `${accurateReports} accurate out of ${totalReports} reports`;
          expect(screen.getByText(fractionText)).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Reporter accuracy does NOT display for moderator flags
   * 
   * For any moderator-flagged report, the reporter accuracy section should not be displayed.
   */
  test('Property: No reporter accuracy for moderator flags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('track', 'post', 'comment', 'user'),
        async (reportId, reportType) => {
          // Create a MODERATOR FLAG
          const report: Report = {
            id: reportId,
            report_type: reportType as any,
            target_id: 'target-123',
            reporter_id: 'moderator-123',
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
            moderator_flagged: true, // IS a moderator flag
            metadata: null,
          };

          // Mock getUserModerationHistory
          (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue({
            total_reports: 10,
            total_actions: 5,
            recent_actions: [],
          });

          // Mock calculateReporterAccuracy (should not be called, but mock anyway)
          (moderationService.calculateReporterAccuracy as jest.Mock).mockResolvedValue({
            totalReports: 50,
            accurateReports: 40,
            accuracyRate: 80,
          });

          // Render the panel
          const { unmount } = render(
            <ModerationActionPanel
              report={report}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for the user history to load
          await waitFor(() => {
            expect(screen.getByText('User Violation History')).toBeInTheDocument();
          });

          // Verify reporter accuracy is NOT displayed
          expect(screen.queryByText('Reporter Accuracy:')).not.toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Accuracy formatting is correct
   * 
   * For any accuracy data, the display should show percentage and fraction correctly.
   */
  test('Property: Accuracy formatting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        async (totalReports, accuracyRate) => {
          const accurateReports = Math.round((accuracyRate / 100) * totalReports);

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
            totalReports,
            accurateReports,
            accuracyRate,
          });

          const { unmount } = render(
            <ModerationActionPanel
              report={report}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          await waitFor(() => {
            expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
          });

          // Verify percentage format (large, bold)
          expect(screen.getByText(`${accuracyRate}%`)).toBeInTheDocument();

          // Verify fraction format
          const fractionText = `${accurateReports} accurate out of ${totalReports} reports`;
          expect(screen.getByText(fractionText)).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Accuracy section has correct styling
   * 
   * The reporter accuracy section should be in a gray background box.
   */
  test('Property: Accuracy section styling', async () => {
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

    const { unmount } = render(
      <ModerationActionPanel
        report={report}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Reporter Accuracy:')).toBeInTheDocument();
    });

    // Find the accuracy section container
    const accuracyLabel = screen.getByText('Reporter Accuracy:');
    const accuracyContainer = accuracyLabel.closest('.bg-gray-800');
    
    expect(accuracyContainer).not.toBeNull();
    expect(accuracyContainer).toHaveClass('bg-gray-800');
    expect(accuracyContainer).toHaveClass('rounded');

    unmount();
  });
});

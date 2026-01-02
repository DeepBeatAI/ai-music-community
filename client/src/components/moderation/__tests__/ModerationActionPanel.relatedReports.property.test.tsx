/**
 * Property-Based Tests for ModerationActionPanel Related Reports
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the correctness properties defined in the design document
 * using property-based testing with fast-check library.
 * 
 * Each test runs 100 iterations with randomly generated inputs to ensure
 * universal properties hold across all valid inputs.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { Report } from '@/types/moderation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as moderationService from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/supabase');

describe('ModerationActionPanel - Related Reports Property Tests', () => {
  const mockUser = { id: 'moderator-123', email: 'moderator@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
    (moderationService.isAdmin as jest.Mock).mockResolvedValue(true);
  });

  /**
   * Property 11: Related Reports Same Content
   * Feature: enhanced-report-evidence, Property 11
   * 
   * For any report viewed in the action panel, the system should display up to 5 other
   * reports targeting the same content, ordered by most recent first.
   * 
   * Validates: Requirements 7.1
   */
  test('Property 11: Related reports same content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // target_id
        fc.string({ minLength: 1, maxLength: 50 }), // reported_user_id
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            reason: fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
            status: fc.constantFrom('pending', 'under_review', 'resolved', 'dismissed'),
            created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
          }),
          { minLength: 1, maxLength: 10 } // Generate 1-10 related reports
        ),
        async (targetId, reportedUserId, relatedReports) => {
          // Create the main report
          const mainReport: Report = {
            id: 'main-report-id',
            report_type: 'track',
            target_id: targetId,
            reported_user_id: reportedUserId,
            reporter_id: 'reporter-456',
            reason: 'spam',
            description: 'Main report',
            status: 'pending',
            priority: 1,
            moderator_flagged: false,
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: null,
          };

          // Sort related reports by created_at descending (most recent first)
          const sortedReports = [...relatedReports].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // Take only the first 5 (as per requirement)
          const expectedReports = sortedReports.slice(0, 5);

          // Mock the Supabase query for same content reports
          const mockFrom = jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: expectedReports,
                      error: null,
                    })),
                  })),
                })),
                single: jest.fn(() => Promise.resolve({
                  data: null,
                  error: null,
                })),
              })),
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          }));

          (supabase.from as jest.Mock) = mockFrom;

          // Render the action panel
          const { unmount } = render(
            <ModerationActionPanel
              report={mainReport}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for related reports to load
          await waitFor(() => {
            if (expectedReports.length > 0) {
              // Verify "Related Reports" section is displayed
              expect(screen.getByText('Related Reports:')).toBeInTheDocument();
              
              // Verify "Same content" label with count
              expect(screen.getByText(`Same content (${expectedReports.length}):`)).toBeInTheDocument();
              
              // Verify each related report is displayed (up to 5)
              expectedReports.forEach((report) => {
                // The reason label should be displayed
                const reasonLabels = {
                  spam: 'Spam or Misleading Content',
                  harassment: 'Harassment or Bullying',
                  hate_speech: 'Hate Speech',
                  inappropriate_content: 'Inappropriate Content',
                  copyright_violation: 'Copyright Violation',
                  other: 'Other',
                };
                expect(screen.getByText(reasonLabels[report.reason as keyof typeof reasonLabels])).toBeInTheDocument();
              });
            }
          }, { timeout: 3000 });

          // Verify the query was called correctly
          expect(mockFrom).toHaveBeenCalledWith('moderation_reports');

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Related Reports Same User
   * Feature: enhanced-report-evidence, Property 12
   * 
   * For any report viewed in the action panel, the system should display up to 5 other
   * reports against the same user, ordered by most recent first.
   * 
   * Validates: Requirements 7.2
   */
  test('Property 12: Related reports same user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // target_id
        fc.string({ minLength: 1, maxLength: 50 }), // reported_user_id
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            report_type: fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
            reason: fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
            status: fc.constantFrom('pending', 'under_review', 'resolved', 'dismissed'),
            created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
          }),
          { minLength: 1, maxLength: 10 } // Generate 1-10 related reports
        ),
        async (targetId, reportedUserId, relatedReports) => {
          // Create the main report
          const mainReport: Report = {
            id: 'main-report-id-2',
            report_type: 'track',
            target_id: targetId,
            reported_user_id: reportedUserId,
            reporter_id: 'reporter-456',
            reason: 'spam',
            description: 'Main report',
            status: 'pending',
            priority: 1,
            moderator_flagged: false,
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: null,
          };

          // Sort related reports by created_at descending (most recent first)
          const sortedReports = [...relatedReports].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // Take only the first 5 (as per requirement)
          const expectedReports = sortedReports.slice(0, 5);

          // Mock the Supabase query - need to handle both same content and same user queries
          let callCount = 0;
          const mockFrom = jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => {
                      callCount++;
                      // First call is for same content (return empty)
                      // Second call is for same user (return our data)
                      if (callCount === 1) {
                        return Promise.resolve({ data: [], error: null });
                      } else {
                        return Promise.resolve({ data: expectedReports, error: null });
                      }
                    }),
                  })),
                })),
                single: jest.fn(() => Promise.resolve({
                  data: null,
                  error: null,
                })),
              })),
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          }));

          (supabase.from as jest.Mock) = mockFrom;

          // Render the action panel
          const { unmount } = render(
            <ModerationActionPanel
              report={mainReport}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for related reports to load
          await waitFor(() => {
            if (expectedReports.length > 0) {
              // Verify "Related Reports" section is displayed
              expect(screen.getByText('Related Reports:')).toBeInTheDocument();
              
              // Verify "Same user" label with count
              expect(screen.getByText(`Same user (${expectedReports.length}):`)).toBeInTheDocument();
              
              // Verify each related report is displayed (up to 5)
              expectedReports.forEach((report) => {
                // The report type should be displayed
                expect(screen.getByText(report.report_type)).toBeInTheDocument();
              });
            }
          }, { timeout: 3000 });

          // Verify the query was called correctly (twice - once for same content, once for same user)
          expect(mockFrom).toHaveBeenCalledWith('moderation_reports');
          expect(mockFrom).toHaveBeenCalledTimes(2);

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12b: No Related Reports Section When No Matches
   * Feature: enhanced-report-evidence, Property 12b
   * 
   * For any report with no related reports (neither same content nor same user),
   * the related reports section should not be displayed.
   * 
   * Validates: Requirements 7.1, 7.2
   */
  test('Property 12b: No related reports section when no matches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // target_id
        fc.string({ minLength: 1, maxLength: 50 }), // reported_user_id
        async (targetId, reportedUserId) => {
          // Create the main report
          const mainReport: Report = {
            id: 'main-report-id-3',
            report_type: 'track',
            target_id: targetId,
            reported_user_id: reportedUserId,
            reporter_id: 'reporter-456',
            reason: 'spam',
            description: 'Main report',
            status: 'pending',
            priority: 1,
            moderator_flagged: false,
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: null,
          };

          // Mock the Supabase query to return empty arrays
          const mockFrom = jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: [],
                      error: null,
                    })),
                  })),
                })),
                single: jest.fn(() => Promise.resolve({
                  data: null,
                  error: null,
                })),
              })),
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          }));

          (supabase.from as jest.Mock) = mockFrom;

          // Render the action panel
          const { unmount } = render(
            <ModerationActionPanel
              report={mainReport}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            // Verify "Related Reports" section is NOT displayed
            expect(screen.queryByText('Related Reports:')).not.toBeInTheDocument();
            expect(screen.queryByText(/Same content/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Same user/)).not.toBeInTheDocument();
          }, { timeout: 3000 });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

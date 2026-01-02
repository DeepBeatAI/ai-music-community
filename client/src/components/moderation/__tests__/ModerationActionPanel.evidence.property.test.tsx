/**
 * Property-Based Tests for ModerationActionPanel Evidence Display
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
import { Report, ReportMetadata } from '@/types/moderation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as moderationService from '@/lib/moderationService';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

describe('ModerationActionPanel - Evidence Display Property Tests', () => {
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
   * Property 13: Evidence Display in Action Panel
   * Feature: enhanced-report-evidence, Property 13
   * 
   * For any report with evidence metadata, the action panel should display a prominent
   * blue-bordered evidence section showing all provided evidence fields.
   * 
   * Validates: Requirements 8.1
   */
  test('Property 13: Evidence display in action panel', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random evidence data
        fc.record({
          originalWorkLink: fc.option(fc.webUrl(), { nil: undefined }),
          proofOfOwnership: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          audioTimestamp: fc.option(
            fc.oneof(
              fc.tuple(fc.integer({ min: 0, max: 59 }), fc.integer({ min: 0, max: 59 }))
                .map(([m, s]) => `${m}:${s.toString().padStart(2, '0')}`),
              fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }), fc.integer({ min: 0, max: 59 }))
                .map(([h, m, s]) => `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
            ),
            { nil: undefined }
          ),
        }).filter(evidence => 
          // Ensure at least one evidence field is present
          evidence.originalWorkLink !== undefined || 
          evidence.proofOfOwnership !== undefined || 
          evidence.audioTimestamp !== undefined
        ),
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (evidence, reportType, targetId) => {
          // Create a mock report with evidence
          const mockReport: Report = {
            id: `report-${Math.random()}`,
            report_type: reportType as any,
            target_id: targetId,
            reported_user_id: 'user-123',
            reporter_id: 'reporter-456',
            reason: 'copyright_violation',
            description: 'Test report with evidence',
            status: 'pending',
            priority: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            moderator_flagged: false,
            metadata: evidence as ReportMetadata,
          };

          // Render the action panel
          const { unmount } = render(
            <ModerationActionPanel
              report={mockReport}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            // Verify the evidence section is displayed with blue border
            const evidenceSection = screen.getByText('Evidence Provided').closest('div');
            expect(evidenceSection).toBeInTheDocument();
            expect(evidenceSection).toHaveClass('bg-blue-900/20');
            expect(evidenceSection).toHaveClass('border-blue-500');
          });

          // Verify each evidence field is displayed if present
          if (evidence.originalWorkLink) {
            await waitFor(() => {
              expect(screen.getByText('Link to original work:')).toBeInTheDocument();
              const link = screen.getByText(evidence.originalWorkLink!);
              expect(link).toBeInTheDocument();
              expect(link.tagName).toBe('A');
              expect(link).toHaveAttribute('href', evidence.originalWorkLink);
              expect(link).toHaveAttribute('target', '_blank');
              expect(link).toHaveAttribute('rel', 'noopener noreferrer');
            });
          }

          if (evidence.proofOfOwnership) {
            await waitFor(() => {
              expect(screen.getByText('Proof of ownership:')).toBeInTheDocument();
              expect(screen.getByText(evidence.proofOfOwnership!)).toBeInTheDocument();
            });
          }

          if (evidence.audioTimestamp) {
            await waitFor(() => {
              expect(screen.getByText('Timestamp in audio:')).toBeInTheDocument();
              expect(screen.getByText(evidence.audioTimestamp!)).toBeInTheDocument();
            });
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13b: No Evidence Section When No Evidence
   * Feature: enhanced-report-evidence, Property 13b
   * 
   * For any report without evidence metadata, the action panel should NOT display
   * the evidence section.
   * 
   * Validates: Requirements 8.1
   */
  test('Property 13b: No evidence section when no evidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (reportType, targetId) => {
          // Create a mock report without evidence
          const mockReport: Report = {
            id: `report-${Math.random()}`,
            report_type: reportType as any,
            target_id: targetId,
            reported_user_id: 'user-123',
            reporter_id: 'reporter-456',
            reason: 'spam',
            description: 'Test report without evidence',
            status: 'pending',
            priority: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            moderator_flagged: false,
            metadata: null,
          };

          // Render the action panel
          const { unmount } = render(
            <ModerationActionPanel
              report={mockReport}
              onClose={mockOnClose}
              onActionComplete={mockOnActionComplete}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            // Verify the evidence section is NOT displayed
            expect(screen.queryByText('Evidence Provided')).not.toBeInTheDocument();
          });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

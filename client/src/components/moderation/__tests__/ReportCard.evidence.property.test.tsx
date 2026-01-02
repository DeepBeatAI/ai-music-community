/**
 * Property-Based Tests for ReportCard Evidence Badge
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the correctness properties defined in the design document
 * using property-based testing with fast-check library.
 * 
 * Each test runs 100 iterations with randomly generated inputs to ensure
 * universal properties hold across all valid inputs.
 */

import { render, screen } from '@testing-library/react';
import { ReportCard } from '@/components/moderation/ReportCard';
import { Report, ReportMetadata } from '@/types/moderation';
import * as fc from 'fast-check';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('ReportCard - Evidence Badge Property Tests', () => {
  /**
   * Property 14: Evidence Indicator Badge
   * Feature: enhanced-report-evidence, Property 14
   * 
   * For any report card, an evidence indicator badge should appear if and only if
   * the report contains at least one evidence field in its metadata.
   * 
   * Validates: Requirements 9.1
   */
  test('Property 14: Evidence indicator badge appears when evidence exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random evidence data with at least one field
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
        fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
        async (evidence, reportType, targetId, reason) => {
          // Create a mock report with evidence
          const mockReport: Report = {
            id: `report-${Math.random()}`,
            report_type: reportType as any,
            target_id: targetId,
            reported_user_id: 'user-123',
            reporter_id: 'reporter-456',
            reason: reason as any,
            description: 'Test report with evidence',
            status: 'pending',
            priority: 1,
            moderator_flagged: false,
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: evidence as ReportMetadata,
          };

          // Render the report card
          const { unmount } = render(
            <ReportCard
              report={mockReport}
              onSelect={() => {}}
            />
          );

          // Verify the evidence badge is displayed
          const evidenceBadge = screen.getByText('📎 Evidence Provided');
          expect(evidenceBadge).toBeInTheDocument();
          
          // Verify the badge has the correct styling
          expect(evidenceBadge).toHaveClass('bg-blue-900/30');
          expect(evidenceBadge).toHaveClass('text-blue-400');
          expect(evidenceBadge).toHaveClass('border-blue-500');

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14b: No Evidence Badge When No Evidence
   * Feature: enhanced-report-evidence, Property 14b
   * 
   * For any report card without evidence metadata, the evidence indicator badge
   * should NOT appear.
   * 
   * Validates: Requirements 9.1
   */
  test('Property 14b: No evidence badge when no evidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
        async (reportType, targetId, reason) => {
          // Create a mock report without evidence
          const mockReport: Report = {
            id: `report-${Math.random()}`,
            report_type: reportType as any,
            target_id: targetId,
            reported_user_id: 'user-123',
            reporter_id: 'reporter-456',
            reason: reason as any,
            description: 'Test report without evidence',
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

          // Render the report card
          const { unmount } = render(
            <ReportCard
              report={mockReport}
              onSelect={() => {}}
            />
          );

          // Verify the evidence badge is NOT displayed
          expect(screen.queryByText('📎 Evidence Provided')).not.toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14c: Evidence Badge with Empty Metadata Object
   * Feature: enhanced-report-evidence, Property 14c
   * 
   * For any report card with an empty metadata object (all fields undefined),
   * the evidence indicator badge should NOT appear.
   * 
   * Validates: Requirements 9.1
   */
  test('Property 14c: No evidence badge with empty metadata object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (reportType, targetId) => {
          // Create a mock report with empty metadata object
          const mockReport: Report = {
            id: `report-${Math.random()}`,
            report_type: reportType as any,
            target_id: targetId,
            reported_user_id: 'user-123',
            reporter_id: 'reporter-456',
            reason: 'spam',
            description: 'Test report with empty metadata',
            status: 'pending',
            priority: 1,
            moderator_flagged: false,
            reviewed_by: null,
            reviewed_at: null,
            resolution_notes: null,
            action_taken: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {} as ReportMetadata,
          };

          // Render the report card
          const { unmount } = render(
            <ReportCard
              report={mockReport}
              onSelect={() => {}}
            />
          );

          // Verify the evidence badge is NOT displayed
          expect(screen.queryByText('📎 Evidence Provided')).not.toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

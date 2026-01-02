/**
 * Property-Based Tests for ReportCard Accuracy Badge Display
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the correctness properties for reporter accuracy badge display
 * using property-based testing with fast-check library.
 * 
 * Each test runs 100 iterations with randomly generated inputs to ensure
 * universal properties hold across all valid inputs.
 */

import { render, screen } from '@testing-library/react';
import { ReportCard } from '@/components/moderation/ReportCard';
import { Report } from '@/types/moderation';
import { supabase } from '@/lib/supabase';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { username: 'testuser' }, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/lib/moderationService', () => ({
  checkPreviousReversals: jest.fn(() => Promise.resolve({
    hasPreviousReversals: false,
    reversalCount: 0,
    mostRecentReversal: null,
  })),
}));

describe('ReportCard - Accuracy Badge Display Property Tests', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7: Reporter Accuracy Display in Cards
   * Feature: enhanced-report-evidence, Property 7
   * 
   * For any report card where reporter accuracy metadata exists, the card should display
   * an accuracy badge with color coding (green ≥80%, yellow ≥50%, red <50%).
   * 
   * Validates: Requirements 5.1
   */
  test('Property 7: Reporter accuracy badge display with color coding', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random accuracy rate (0-100)
        fc.integer({ min: 0, max: 100 }),
        // Generate random total and accurate reports
        fc.integer({ min: 1, max: 100 }),
        fc.uuid(),
        fc.constantFrom('track', 'post', 'comment', 'user', 'album'),
        fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
        async (accuracyRate, totalReports, reportId, reportType, reason) => {
          // Calculate accurate reports based on accuracy rate
          const accurateReports = Math.round((accuracyRate / 100) * totalReports);

          // Create a report with reporter accuracy metadata
          const report: Report = {
            id: reportId,
            report_type: reportType as any,
            target_id: 'target-123',
            reporter_id: 'reporter-123',
            reported_user_id: 'user-123',
            reason: reason as any,
            description: 'Test report description with sufficient length',
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
                totalReports,
                accurateReports,
                accuracyRate,
              },
            },
          };

          // Render the report card
          const { unmount } = render(
            <ReportCard report={report} onSelect={mockOnSelect} />
          );

          // Wait for async operations to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify the accuracy badge is displayed
          const badgeText = `Reporter: ${accuracyRate}% accurate`;
          const badge = screen.getByText(badgeText);
          expect(badge).toBeInTheDocument();

          // Verify color coding based on accuracy rate
          const badgeElement = badge.closest('span');
          expect(badgeElement).not.toBeNull();

          if (badgeElement) {
            if (accuracyRate >= 80) {
              // Green for high accuracy (≥80%)
              expect(badgeElement.className).toContain('bg-green-900/30');
              expect(badgeElement.className).toContain('text-green-400');
              expect(badgeElement.className).toContain('border-green-500');
            } else if (accuracyRate >= 50) {
              // Yellow for medium accuracy (50-79%)
              expect(badgeElement.className).toContain('bg-yellow-900/30');
              expect(badgeElement.className).toContain('text-yellow-400');
              expect(badgeElement.className).toContain('border-yellow-500');
            } else {
              // Red for low accuracy (<50%)
              expect(badgeElement.className).toContain('bg-red-900/30');
              expect(badgeElement.className).toContain('text-red-400');
              expect(badgeElement.className).toContain('border-red-500');
            }
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Badge does not appear when no accuracy metadata
   * 
   * For any report card without reporter accuracy metadata, the accuracy badge
   * should not be displayed.
   */
  test('Property: No badge when accuracy metadata is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('track', 'post', 'comment', 'user', 'album'),
        fc.constantFrom('spam', 'harassment', 'hate_speech'),
        async (reportId, reportType, reason) => {
          // Create a report WITHOUT reporter accuracy metadata
          const report: Report = {
            id: reportId,
            report_type: reportType as any,
            target_id: 'target-123',
            reporter_id: 'reporter-123',
            reported_user_id: 'user-123',
            reason: reason as any,
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
            metadata: null, // No metadata
          };

          // Render the report card
          const { unmount } = render(
            <ReportCard report={report} onSelect={mockOnSelect} />
          );

          // Wait for async operations
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify the accuracy badge is NOT displayed
          const badgePattern = /Reporter:.*accurate/i;
          expect(screen.queryByText(badgePattern)).not.toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Badge color boundaries are correct
   * 
   * Test the exact boundary values for color coding:
   * - 80% should be green
   * - 79% should be yellow
   * - 50% should be yellow
   * - 49% should be red
   */
  test('Property: Badge color boundaries', async () => {
    const boundaryTests = [
      { rate: 80, expectedColor: 'green', description: '80% is green' },
      { rate: 79, expectedColor: 'yellow', description: '79% is yellow' },
      { rate: 50, expectedColor: 'yellow', description: '50% is yellow' },
      { rate: 49, expectedColor: 'red', description: '49% is red' },
      { rate: 100, expectedColor: 'green', description: '100% is green' },
      { rate: 0, expectedColor: 'red', description: '0% is red' },
    ];

    for (const { rate, expectedColor, description } of boundaryTests) {
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
        metadata: {
          reporterAccuracy: {
            totalReports: 100,
            accurateReports: rate,
            accuracyRate: rate,
          },
        },
      };

      const { unmount } = render(
        <ReportCard report={report} onSelect={mockOnSelect} />
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const badgeText = `Reporter: ${rate}% accurate`;
      const badge = screen.getByText(badgeText);
      const badgeElement = badge.closest('span');

      expect(badgeElement).not.toBeNull();
      if (badgeElement) {
        expect(badgeElement.className).toContain(`bg-${expectedColor}-900/30`);
        expect(badgeElement.className).toContain(`text-${expectedColor}-400`);
        expect(badgeElement.className).toContain(`border-${expectedColor}-500`);
      }

      unmount();
    }
  });

  /**
   * Property: Badge displays correct percentage format
   * 
   * For any accuracy rate, the badge should display the percentage with the % symbol.
   */
  test('Property: Badge displays percentage format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        async (accuracyRate) => {
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
            metadata: {
              reporterAccuracy: {
                totalReports: 100,
                accurateReports: accuracyRate,
                accuracyRate,
              },
            },
          };

          const { unmount } = render(
            <ReportCard report={report} onSelect={mockOnSelect} />
          );

          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify the badge displays the correct format
          const expectedText = `Reporter: ${accuracyRate}% accurate`;
          expect(screen.getByText(expectedText)).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

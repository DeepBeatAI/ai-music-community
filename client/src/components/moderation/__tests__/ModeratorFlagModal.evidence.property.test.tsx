/**
 * Property-Based Tests for ModeratorFlagModal Evidence Fields
 * Feature: enhanced-report-evidence
 * 
 * These tests validate that the moderator flag modal has the same evidence
 * collection capabilities as the user report modal.
 * 
 * Each test runs 100 iterations with randomly generated inputs.
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ModeratorFlagModal } from '@/components/moderation/ModeratorFlagModal';
import * as moderationService from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('ModeratorFlagModal - Evidence Fields Property Tests', () => {
  const mockUser = { id: 'moderator-123', email: 'mod@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 6: Moderator Evidence Field Parity
   * Feature: enhanced-report-evidence, Property 6
   * 
   * For any violation reason, the moderator flag modal should provide
   * the same evidence fields as the user report modal.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  test('Property 6: Moderator evidence field parity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('copyright_violation', 'hate_speech', 'harassment', 'inappropriate_content', 'spam', 'other'),
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (reason, reportType, targetId) => {
          // Render the moderator flag modal
          const { unmount } = render(
            <ModeratorFlagModal
              isOpen={true}
              onClose={mockOnClose}
              reportType={reportType as any}
              targetId={targetId}
            />
          );

          // Select the reason
          const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Wait for conditional fields to render
          await waitFor(() => {
            // Check for copyright evidence fields
            if (reason === 'copyright_violation') {
              expect(screen.getByLabelText(/Link to original work/i)).toBeInTheDocument();
              expect(screen.getByLabelText(/Proof of ownership/i)).toBeInTheDocument();
              
              // Verify helper text
              expect(screen.getByText(/Providing evidence helps with faster resolution/i)).toBeInTheDocument();
            }

            // Check for audio timestamp field
            if ((reason === 'hate_speech' || reason === 'harassment' || reason === 'inappropriate_content') && reportType === 'track') {
              expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
              
              // Verify helper text
              expect(screen.getByText(/Specify where the violation occurs in the audio/i)).toBeInTheDocument();
              expect(screen.getByText(/Format: MM:SS or HH:MM:SS/i)).toBeInTheDocument();
            }
          });

          // Verify all evidence fields are optional (not required)
          if (reason === 'copyright_violation') {
            const linkInput = screen.getByLabelText(/Link to original work/i);
            const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
            
            expect(linkInput).not.toBeRequired();
            expect(proofTextarea).not.toBeRequired();
          }

          if ((reason === 'hate_speech' || reason === 'harassment' || reason === 'inappropriate_content') && reportType === 'track') {
            const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
            expect(timestampInput).not.toBeRequired();
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6b: Moderator Evidence Metadata Storage
   * Feature: enhanced-report-evidence, Property 6
   * 
   * For any moderator flag with evidence, the evidence should be stored
   * in the same metadata structure as user reports.
   * 
   * Validates: Requirements 4.2
   */
  test('Property 6b: Moderator evidence metadata storage', async () => {
    const mockModeratorFlagContent = moderationService.moderatorFlagContent as jest.MockedFunction<typeof moderationService.moderatorFlagContent>;
    mockModeratorFlagContent.mockResolvedValue(undefined as any);

    await fc.assert(
      fc.asyncProperty(
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
        }),
        fc.constantFrom('copyright_violation', 'hate_speech', 'harassment'),
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10), // Valid internal notes with non-whitespace content
        async (evidence, reason, internalNotes) => {
          // Render the modal
          const { unmount } = render(
            <ModeratorFlagModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="track"
              targetId="track-456"
            />
          );

          // Select reason
          const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Fill in internal notes (required for moderator flags)
          const notesTextarea = screen.getByLabelText(/Additional details/i);
          fireEvent.change(notesTextarea, { target: { value: internalNotes } });

          // Fill in evidence fields based on reason
          if (reason === 'copyright_violation' && evidence.originalWorkLink) {
            const linkInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(linkInput, { target: { value: evidence.originalWorkLink } });
          }

          if (reason === 'copyright_violation' && evidence.proofOfOwnership) {
            const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
            fireEvent.change(proofTextarea, { target: { value: evidence.proofOfOwnership } });
          }

          if ((reason === 'hate_speech' || reason === 'harassment') && evidence.audioTimestamp) {
            const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
            fireEvent.change(timestampInput, { target: { value: evidence.audioTimestamp } });
          }

          // Submit the form
          const submitButtons = screen.getAllByRole('button', { name: /Flag Content/i });
          fireEvent.click(submitButtons[0]);

          // Wait for submission
          await waitFor(() => {
            expect(mockModeratorFlagContent).toHaveBeenCalled();
          });

          // Verify the metadata was passed correctly
          const callArgs = mockModeratorFlagContent.mock.calls[0][0];
          
          // Build expected metadata based on reason (matching component's trim behavior)
          const expectedMetadata: any = {};
          if (reason === 'copyright_violation') {
            const trimmedLink = evidence.originalWorkLink?.trim();
            const trimmedProof = evidence.proofOfOwnership?.trim();
            
            if (trimmedLink) {
              expectedMetadata.originalWorkLink = trimmedLink;
            }
            if (trimmedProof) {
              expectedMetadata.proofOfOwnership = trimmedProof;
            }
          }
          if (reason === 'hate_speech' || reason === 'harassment') {
            const trimmedTimestamp = evidence.audioTimestamp?.trim();
            if (trimmedTimestamp) {
              expectedMetadata.audioTimestamp = trimmedTimestamp;
            }
          }

          // Verify metadata matches expected
          if (Object.keys(expectedMetadata).length > 0) {
            expect(callArgs.metadata).toBeDefined();
            if (callArgs.metadata) {
              Object.keys(expectedMetadata).forEach(key => {
                expect(callArgs.metadata![key as keyof typeof callArgs.metadata]).toEqual(expectedMetadata[key]);
              });
            }
          }

          // Clean up for next iteration
          mockModeratorFlagContent.mockClear();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6c: Moderator Internal Notes Minimum Length
   * Feature: enhanced-report-evidence, Property 6
   * 
   * For any moderator flag, the internal notes field should maintain
   * the existing 10-character minimum (not the 20-character minimum for user reports).
   * This property verifies that submissions with 10+ characters succeed.
   * 
   * Validates: Requirements 4.1
   */
  test('Property 6c: Moderator internal notes minimum length', async () => {
    const mockModeratorFlagContent = moderationService.moderatorFlagContent as jest.MockedFunction<typeof moderationService.moderatorFlagContent>;
    mockModeratorFlagContent.mockResolvedValue(undefined as any);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10), // Valid notes with 10+ characters
        fc.constantFrom('spam', 'harassment', 'hate_speech'),
        async (validNotes, reason) => {
          // Render the modal
          const { unmount } = render(
            <ModeratorFlagModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="post"
              targetId="post-789"
            />
          );

          // Select reason
          const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Fill in valid internal notes (10+ characters)
          const notesTextarea = screen.getByLabelText(/Additional details/i);
          fireEvent.change(notesTextarea, { target: { value: validNotes } });

          // Submit the form
          const submitButtons = screen.getAllByRole('button', { name: /Flag Content/i });
          fireEvent.click(submitButtons[0]);

          // Verify moderatorFlagContent WAS called (10+ characters should be valid)
          await waitFor(() => {
            expect(mockModeratorFlagContent).toHaveBeenCalled();
          });

          // Verify the internal notes were passed correctly
          const callArgs = mockModeratorFlagContent.mock.calls[0][0];
          expect(callArgs.internalNotes).toBe(validNotes.trim());

          // Clean up
          mockModeratorFlagContent.mockClear();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

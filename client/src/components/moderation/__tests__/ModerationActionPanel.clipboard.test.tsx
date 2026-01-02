/**
 * Unit Tests for Copy-to-Clipboard Functionality
 * Feature: enhanced-report-evidence
 * 
 * These tests validate clipboard API integration, success feedback, and error handling
 * for the copy timestamp functionality in the ModerationActionPanel.
 * 
 * Validates: Requirements 8.1
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { Report } from '@/types/moderation';
import * as moderationService from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('ModerationActionPanel - Clipboard Functionality', () => {
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  // Mock clipboard API
  const mockWriteText = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    // Mock Supabase auth
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'mod-123' } },
      error: null,
    });

    // Mock isAdmin
    (moderationService.isAdmin as jest.Mock).mockResolvedValue(false);

    // Mock Supabase queries
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { username: 'testuser' },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { content: 'Test content' },
            error: null,
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        head: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            error: null,
          }),
        }),
      }),
    });
    (supabase.from as jest.Mock).mockImplementation(mockFrom);
  });

  describe('Clipboard API Integration', () => {
    it('should call clipboard API when copy button is clicked', async () => {
      mockWriteText.mockResolvedValue(undefined);

      const reportWithTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          audioTimestamp: '2:35',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('2:35')).toBeInTheDocument();
      });

      // Find and click the copy button
      const copyButton = screen.getByTitle('Copy timestamp');
      fireEvent.click(copyButton);

      // Verify clipboard API was called with correct timestamp
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('2:35');
      });
    });

    it('should copy timestamp with different formats', async () => {
      mockWriteText.mockResolvedValue(undefined);

      const timestamps = ['1:23', '12:34', '1:23:45'];

      for (const timestamp of timestamps) {
        mockWriteText.mockClear();

        const reportWithTimestamp: Report = {
          id: `report-${timestamp}`,
          reporter_id: 'user-456',
          reported_user_id: 'user-789',
          report_type: 'track',
          target_id: 'track-abc',
          reason: 'hate_speech',
          description: 'Contains hate speech',
          status: 'pending',
          priority: 3,
          moderator_flagged: false,
          reviewed_by: null,
          reviewed_at: null,
          resolution_notes: null,
          action_taken: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            audioTimestamp: timestamp,
          },
        };

        const { unmount } = render(
          <ModerationActionPanel
            report={reportWithTimestamp}
            onClose={mockOnClose}
            onActionComplete={mockOnActionComplete}
          />
        );

        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(timestamp)).toBeInTheDocument();
        });

        // Find and click the copy button
        const copyButton = screen.getByTitle('Copy timestamp');
        fireEvent.click(copyButton);

        // Verify clipboard API was called with correct timestamp
        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalledWith(timestamp);
        });

        unmount();
      }
    });
  });

  describe('Success Feedback', () => {
    it('should show "Copied!" feedback after successful copy', async () => {
      mockWriteText.mockResolvedValue(undefined);

      const reportWithTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          audioTimestamp: '2:35',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('2:35')).toBeInTheDocument();
      });

      // Initially should show "Copy" text
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

      // Click the copy button
      const copyButton = screen.getByTitle('Copy timestamp');
      fireEvent.click(copyButton);

      // Should show "Copied!" feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
        expect(screen.queryByText('Copy')).not.toBeInTheDocument();
      });
    });

    it('should reset feedback to "Copy" after 2 seconds', async () => {
      jest.useFakeTimers();
      mockWriteText.mockResolvedValue(undefined);

      const reportWithTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          audioTimestamp: '2:35',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('2:35')).toBeInTheDocument();
      });

      // Click the copy button
      const copyButton = screen.getByTitle('Copy timestamp');
      fireEvent.click(copyButton);

      // Should show "Copied!" feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      // Should reset to "Copy"
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle clipboard API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

      const reportWithTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          audioTimestamp: '2:35',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('2:35')).toBeInTheDocument();
      });

      // Click the copy button
      const copyButton = screen.getByTitle('Copy timestamp');
      fireEvent.click(copyButton);

      // Should log error to console
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to copy timestamp:',
          expect.any(Error)
        );
      });

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText('Failed to copy timestamp to clipboard')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not show "Copied!" feedback when copy fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

      const reportWithTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          audioTimestamp: '2:35',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('2:35')).toBeInTheDocument();
      });

      // Click the copy button
      const copyButton = screen.getByTitle('Copy timestamp');
      fireEvent.click(copyButton);

      // Should not show "Copied!" feedback
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      });

      // Should still show "Copy" button
      expect(screen.getByText('Copy')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render copy button when no timestamp is provided', async () => {
      const reportWithoutTimestamp: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'hate_speech',
        description: 'Contains hate speech',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: null,
      };

      render(
        <ModerationActionPanel
          report={reportWithoutTimestamp}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByTitle('Copy timestamp')).not.toBeInTheDocument();
      });
    });

    it('should render copy button only when audioTimestamp exists in metadata', async () => {
      const reportWithOtherMetadata: Report = {
        id: 'report-123',
        reporter_id: 'user-456',
        reported_user_id: 'user-789',
        report_type: 'track',
        target_id: 'track-abc',
        reason: 'copyright_violation',
        description: 'Copyright violation',
        status: 'pending',
        priority: 3,
        moderator_flagged: false,
        reviewed_by: null,
        reviewed_at: null,
        resolution_notes: null,
        action_taken: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          originalWorkLink: 'https://example.com/original',
          proofOfOwnership: 'I own this',
        },
      };

      render(
        <ModerationActionPanel
          report={reportWithOtherMetadata}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByTitle('Copy timestamp')).not.toBeInTheDocument();
      });
    });
  });
});

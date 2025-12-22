import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationActionPanel } from '../ModerationActionPanel';
import { Report } from '@/types/moderation';
import * as moderationService from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock the moderation service
jest.mock('@/lib/moderationService');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockReport: Report = {
  id: 'report-123',
  reporter_id: 'user-456',
  reported_user_id: 'user-789',
  report_type: 'post',
  target_id: 'post-abc',
  reason: 'spam',
  description: 'This is a spam post',
  status: 'pending',
  priority: 3,
  moderator_flagged: false,
  reviewed_by: null,
  reviewed_at: null,
  resolution_notes: null,
  action_taken: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockModeratorFlaggedReport: Report = {
  ...mockReport,
  id: 'report-456',
  moderator_flagged: true,
  status: 'under_review',
  priority: 2,
  reason: 'hate_speech',
};

describe('ModerationActionPanel', () => {
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('Rendering', () => {
    it('should render action panel with report details', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderation Action Panel')).toBeInTheDocument();
        expect(screen.getByText('Report Details')).toBeInTheDocument();
        expect(screen.getByText('Reported Content')).toBeInTheDocument();
        expect(screen.getByText('Take Action')).toBeInTheDocument();
      });
    });

    it('should display moderator flag badge for moderator-flagged reports', async () => {
      render(
        <ModerationActionPanel
          report={mockModeratorFlaggedReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Moderator Flagged/)).toBeInTheDocument();
      });
    });

    it('should display report description when present', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('This is a spam post')).toBeInTheDocument();
      });
    });

    it('should display user violation history section', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('User Violation History')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons Display', () => {
    it('should display all action options for moderators', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      const actionSelect = screen.getByLabelText('Action Type *') as HTMLSelectElement;
      expect(actionSelect.options.length).toBeGreaterThan(1);
      
      // Check for standard moderator actions
      const optionTexts = Array.from(actionSelect.options).map(opt => opt.text);
      expect(optionTexts).toContain('Dismiss Report (Approve Content)');
      expect(optionTexts).toContain('Remove Content');
      expect(optionTexts).toContain('Warn User');
      expect(optionTexts).toContain('Suspend User');
      expect(optionTexts).toContain('Apply Restriction');
    });

    it('should hide ban option for non-admin moderators', async () => {
      (moderationService.isAdmin as jest.Mock).mockResolvedValue(false);

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      const actionSelect = screen.getByLabelText('Action Type *') as HTMLSelectElement;
      const optionTexts = Array.from(actionSelect.options).map(opt => opt.text);
      expect(optionTexts).not.toContain('Suspend User Permanently (Admin Only)');
    });

    it('should show ban option for admin users', async () => {
      (moderationService.isAdmin as jest.Mock).mockResolvedValue(true);

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for admin status to be checked and component to update
      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *') as HTMLSelectElement;
        const optionTexts = Array.from(actionSelect.options).map(opt => opt.text);
        expect(optionTexts).toContain('Suspend User Permanently (Admin Only)');
      }, { timeout: 3000 });
    });
  });

  describe('Suspension Duration Picker', () => {
    it('should show duration picker when suspension is selected', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select suspension action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_suspended' } });

      await waitFor(() => {
        expect(screen.getByLabelText('Suspension Duration')).toBeInTheDocument();
      });

      const durationSelect = screen.getByLabelText('Suspension Duration') as HTMLSelectElement;
      expect(durationSelect.options.length).toBe(3);
      expect(durationSelect.options[0].text).toBe('1 Day');
      expect(durationSelect.options[1].text).toBe('7 Days');
      expect(durationSelect.options[2].text).toBe('30 Days');
    });

    it('should not show duration picker for other actions', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select non-suspension action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_warned' } });

      await waitFor(() => {
        expect(screen.queryByLabelText('Suspension Duration')).not.toBeInTheDocument();
      });
    });
  });

  describe('Restriction Type Selector', () => {
    it('should show restriction type selector when restriction is selected', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select restriction action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'restriction_applied' } });

      await waitFor(() => {
        expect(screen.getByLabelText('Restriction Type')).toBeInTheDocument();
        expect(screen.getByLabelText(/Restriction Duration/)).toBeInTheDocument();
      });

      const restrictionSelect = screen.getByLabelText('Restriction Type') as HTMLSelectElement;
      expect(restrictionSelect.options.length).toBe(3);
      expect(restrictionSelect.options[0].text).toBe('Disable Posting');
      expect(restrictionSelect.options[1].text).toBe('Disable Commenting');
      expect(restrictionSelect.options[2].text).toBe('Disable Uploads');
    });

    it('should not show restriction selector for other actions', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select non-restriction action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'content_removed' } });

      await waitFor(() => {
        expect(screen.queryByLabelText('Restriction Type')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require action selection', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Submit Action')).toBeInTheDocument();
      });

      // Submit button should be disabled when no action is selected
      const submitButton = screen.getByText('Submit Action');
      expect(submitButton).toBeDisabled();
    });

    it('should require internal notes', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select an action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_warned' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Internal notes are required')).toBeInTheDocument();
      });
    });

    it('should allow submission with valid data', async () => {
      (moderationService.takeModerationAction as jest.Mock).mockResolvedValue({
        id: 'action-123',
      });

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select an action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_warned' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'User violated spam policy' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(moderationService.takeModerationAction).toHaveBeenCalled();
      });
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation dialog for content removal', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select content removal
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'content_removed' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Removing spam content' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to/)).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog for user suspension', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select suspension
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_suspended' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Suspending for violations' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog for user ban', async () => {
      (moderationService.isAdmin as jest.Mock).mockResolvedValue(true);

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for admin status to be checked and ban option to appear
      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *') as HTMLSelectElement;
        const optionTexts = Array.from(actionSelect.options).map(opt => opt.text);
        expect(optionTexts).toContain('Ban User (Admin Only)');
      }, { timeout: 3000 });

      // Select ban
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_banned' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Permanent ban for severe violations' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      });
    });

    it('should not show confirmation dialog for non-destructive actions', async () => {
      (moderationService.takeModerationAction as jest.Mock).mockResolvedValue({
        id: 'action-123',
      });

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select warning (non-destructive)
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_warned' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Warning user' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
        expect(moderationService.takeModerationAction).toHaveBeenCalled();
      });
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', async () => {
      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onActionComplete after successful action', async () => {
      (moderationService.takeModerationAction as jest.Mock).mockResolvedValue({
        id: 'action-123',
      });

      render(
        <ModerationActionPanel
          report={mockReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const actionSelect = screen.getByLabelText('Action Type *');
        expect(actionSelect).toBeInTheDocument();
      });

      // Select an action
      const actionSelect = screen.getByLabelText('Action Type *');
      fireEvent.change(actionSelect, { target: { value: 'user_warned' } });

      // Fill in internal notes
      const notesTextarea = screen.getByLabelText(/Internal Notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Warning issued' } });

      const submitButton = screen.getByText('Submit Action');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Action completed successfully!')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for the timeout that calls onActionComplete and onClose
      await waitFor(() => {
        expect(mockOnActionComplete).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Profile Context for User Reports', () => {
    const mockUserReport: Report = {
      ...mockReport,
      report_type: 'user',
      target_id: 'user-target-123',
    };

    const mockProfileContext = {
      username: 'reporteduser',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'This is my bio',
      joinDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      accountAgeDays: 15,
      recentReportCount: 3,
      moderationHistory: [
        {
          actionType: 'user_warned' as const,
          reason: 'Spam',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
        },
        {
          actionType: 'user_suspended' as const,
          reason: 'Harassment',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    beforeEach(() => {
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(mockProfileContext);
    });

    it('should load profile context for user reports', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(moderationService.getProfileContext).toHaveBeenCalledWith('user-target-123');
      });
    });

    it('should display profile context section for user reports', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Profile Context')).toBeInTheDocument();
        expect(screen.getByText('reporteduser')).toBeInTheDocument();
        expect(screen.getByText(/Member for/)).toBeInTheDocument();
      });
    });

    it('should display user avatar in profile context', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('reporteduser') as HTMLImageElement;
        expect(avatar).toBeInTheDocument();
        expect(avatar.src).toContain('avatar.jpg');
      });
    });

    it('should display bio in profile context', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('This is my bio')).toBeInTheDocument();
      });
    });

    it('should display recent report count badge', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/3 reports in last 30 days/)).toBeInTheDocument();
      });
    });

    it('should display new account badge for accounts less than 7 days old', async () => {
      const newAccountContext = {
        ...mockProfileContext,
        accountAgeDays: 5,
      };
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(newAccountContext);

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('New account')).toBeInTheDocument();
      });
    });

    it('should not display new account badge for accounts 7 days or older', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('New account')).not.toBeInTheDocument();
      });
    });

    it('should display collapsible moderation history', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Moderation History \(2\)/)).toBeInTheDocument();
      });
    });

    it('should expand moderation history when clicked', async () => {
      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Moderation History \(2\)/)).toBeInTheDocument();
      });

      const historyToggle = screen.getByText(/Moderation History \(2\)/);
      fireEvent.click(historyToggle);

      await waitFor(() => {
        expect(screen.getByText('Warn User')).toBeInTheDocument();
        expect(screen.getByText('Suspend User')).toBeInTheDocument();
        expect(screen.getByText('Spam')).toBeInTheDocument();
        expect(screen.getByText('Harassment')).toBeInTheDocument();
      });
    });

    it('should not display profile context for non-user reports', async () => {
      render(
        <ModerationActionPanel
          report={mockReport} // post report
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Reported Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Profile Context')).not.toBeInTheDocument();
      expect(moderationService.getProfileContext).not.toHaveBeenCalled();
    });

    it('should show loading state while fetching profile context', async () => {
      // Delay the resolution to see loading state
      (moderationService.getProfileContext as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockProfileContext), 100))
      );

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Should show loading state initially
      expect(screen.getByText('Loading profile context...')).toBeInTheDocument();

      // Wait for profile context to load
      await waitFor(() => {
        expect(screen.getByText('Profile Context')).toBeInTheDocument();
      });

      // Loading state should be gone
      expect(screen.queryByText('Loading profile context...')).not.toBeInTheDocument();
    });

    it('should handle profile context loading errors gracefully', async () => {
      (moderationService.getProfileContext as jest.Mock).mockRejectedValue(
        new Error('Failed to load profile')
      );

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Panel should still render without profile context
      await waitFor(() => {
        expect(screen.getByText('Reported Content')).toBeInTheDocument();
      });

      // Profile context should not be displayed
      expect(screen.queryByText('Profile Context')).not.toBeInTheDocument();
    });

    it('should format account age correctly for days', async () => {
      const context = { ...mockProfileContext, accountAgeDays: 5 };
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(context);

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Member for 5 days/)).toBeInTheDocument();
      });
    });

    it('should format account age correctly for weeks', async () => {
      const context = { ...mockProfileContext, accountAgeDays: 14 };
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(context);

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Member for 2 weeks/)).toBeInTheDocument();
      });
    });

    it('should format account age correctly for months', async () => {
      const context = { ...mockProfileContext, accountAgeDays: 60 };
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(context);

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Member for 2 months/)).toBeInTheDocument();
      });
    });

    it('should format account age correctly for years', async () => {
      const context = { ...mockProfileContext, accountAgeDays: 400 };
      (moderationService.getProfileContext as jest.Mock).mockResolvedValue(context);

      render(
        <ModerationActionPanel
          report={mockUserReport}
          onClose={mockOnClose}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Member for 1 year/)).toBeInTheDocument();
      });
    });
  });
});

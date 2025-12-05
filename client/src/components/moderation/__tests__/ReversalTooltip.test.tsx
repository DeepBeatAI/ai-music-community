import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReversalTooltip, hasReversalInfo } from '../ReversalTooltip';
import { ModerationAction } from '@/types/moderation';

/**
 * Test suite for ReversalTooltip component
 * Requirements: 15.5
 */

describe('ReversalTooltip', () => {
  // Mock moderation action with reversal
  const reversedAction: ModerationAction = {
    id: 'action-1',
    moderator_id: 'mod-123',
    target_user_id: 'user-456',
    action_type: 'user_suspended',
    target_type: 'user',
    target_id: 'user-456',
    reason: 'Spam posting',
    duration_days: 7,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    related_report_id: 'report-789',
    internal_notes: 'Multiple spam reports',
    notification_sent: true,
    notification_message: 'Your account has been suspended',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    revoked_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    revoked_by: 'mod-789',
    metadata: {
      reversal_reason: 'False positive - user was framed',
      revoked_by_username: 'moderator_jane',
    },
  };

  // Mock moderation action without reversal
  const activeAction: ModerationAction = {
    ...reversedAction,
    revoked_at: null,
    revoked_by: null,
    metadata: null,
  };

  // Mock self-reversal action
  const selfReversedAction: ModerationAction = {
    ...reversedAction,
    revoked_by: 'mod-123', // Same as moderator_id
    metadata: {
      reversal_reason: 'Mistake in original decision',
      revoked_by_username: 'moderator_john',
    },
  };

  describe('Rendering', () => {
    it('should render children without tooltip for non-reversed action', () => {
      render(
        <ReversalTooltip action={activeAction}>
          <div data-testid="trigger">Action Content</div>
        </ReversalTooltip>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      expect(screen.getByText('Action Content')).toBeInTheDocument();
    });

    it('should render children for reversed action', () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Reversed Action</div>
        </ReversalTooltip>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      expect(screen.getByText('Reversed Action')).toBeInTheDocument();
    });

    it('should not show tooltip initially', () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div>Trigger</div>
        </ReversalTooltip>
      );

      expect(screen.queryByText('Action Reversed')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip Display', () => {
    it('should show tooltip on mouse enter', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('Action Reversed')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      const trigger = screen.getByTestId('trigger');
      
      // Show tooltip
      fireEvent.mouseEnter(trigger);
      await waitFor(() => {
        expect(screen.getByText('Action Reversed')).toBeInTheDocument();
      });

      // Hide tooltip
      fireEvent.mouseLeave(trigger);
      await waitFor(() => {
        expect(screen.queryByText('Action Reversed')).not.toBeInTheDocument();
      });
    });

    it('should display moderator username', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('moderator_jane')).toBeInTheDocument();
      });
    });

    it('should display reversal reason', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('False positive - user was framed')).toBeInTheDocument();
      });
    });

    it('should display "No reason provided" when reason is missing', async () => {
      const actionWithoutReason: ModerationAction = {
        ...reversedAction,
        metadata: {
          revoked_by_username: 'moderator_jane',
        },
      };

      render(
        <ReversalTooltip action={actionWithoutReason}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('No reason provided')).toBeInTheDocument();
      });
    });

    it('should display relative timestamp for recent reversals', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        // Should show "1 hour ago" or similar
        expect(screen.getByText(/hour.*ago/i)).toBeInTheDocument();
      });
    });
  });

  describe('Self-Reversal Indicator', () => {
    it('should show self-reversal badge when moderator reversed their own action', async () => {
      render(
        <ReversalTooltip action={selfReversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Self-Reversal')).toBeInTheDocument();
      });
    });

    it('should not show self-reversal badge for different moderator', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.queryByText('Self-Reversal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Position Prop', () => {
    it('should accept top position', () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction} position="top">
          <div>Trigger</div>
        </ReversalTooltip>
      );

      expect(container).toBeInTheDocument();
    });

    it('should accept bottom position', () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction} position="bottom">
          <div>Trigger</div>
        </ReversalTooltip>
      );

      expect(container).toBeInTheDocument();
    });

    it('should accept left position', () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction} position="left">
          <div>Trigger</div>
        </ReversalTooltip>
      );

      expect(container).toBeInTheDocument();
    });

    it('should accept right position', () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction} position="right">
          <div>Trigger</div>
        </ReversalTooltip>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to trigger wrapper', () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction} className="custom-class">
          <div>Trigger</div>
        </ReversalTooltip>
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('hasReversalInfo Utility', () => {
    it('should return true for reversed action', () => {
      expect(hasReversalInfo(reversedAction)).toBe(true);
    });

    it('should return false for active action', () => {
      expect(hasReversalInfo(activeAction)).toBe(false);
    });

    it('should return false when revoked_at is null', () => {
      const action: ModerationAction = {
        ...reversedAction,
        revoked_at: null,
      };
      expect(hasReversalInfo(action)).toBe(false);
    });

    it('should return false when revoked_by is null', () => {
      const action: ModerationAction = {
        ...reversedAction,
        revoked_by: null,
      };
      expect(hasReversalInfo(action)).toBe(false);
    });
  });

  describe('Tooltip Content Structure', () => {
    it('should display all required sections', async () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        // Header
        expect(screen.getByText('Action Reversed')).toBeInTheDocument();
        
        // Reversed by section
        expect(screen.getByText('Reversed by:')).toBeInTheDocument();
        
        // Reversed on section
        expect(screen.getByText('Reversed on:')).toBeInTheDocument();
        
        // Reason section
        expect(screen.getByText('Reason:')).toBeInTheDocument();
      });
    });

    it('should display checkmark icon in header', async () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing metadata gracefully', async () => {
      const actionWithoutMetadata: ModerationAction = {
        ...reversedAction,
        metadata: null,
      };

      render(
        <ReversalTooltip action={actionWithoutMetadata}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Action Reversed')).toBeInTheDocument();
        expect(screen.getByText('No reason provided')).toBeInTheDocument();
      });
    });

    it('should handle very long reversal reasons', async () => {
      const longReason = 'A'.repeat(500);
      const actionWithLongReason: ModerationAction = {
        ...reversedAction,
        metadata: {
          reversal_reason: longReason,
          revoked_by_username: 'moderator_jane',
        },
      };

      render(
        <ReversalTooltip action={actionWithLongReason}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText(longReason)).toBeInTheDocument();
      });
    });

    it('should handle reversal timestamp in various formats', async () => {
      // Test with different time differences
      const timestamps = [
        new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
        new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      ];

      for (const timestamp of timestamps) {
        const action: ModerationAction = {
          ...reversedAction,
          revoked_at: timestamp,
        };

        const { unmount } = render(
          <ReversalTooltip action={action}>
            <div data-testid="trigger">Hover me</div>
          </ReversalTooltip>
        );

        fireEvent.mouseEnter(screen.getByTestId('trigger'));

        await waitFor(() => {
          expect(screen.getByText('Reversed on:')).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <ReversalTooltip action={reversedAction}>
          <button data-testid="trigger">Hover me</button>
        </ReversalTooltip>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toBeInTheDocument();
      
      // Trigger should be focusable
      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it('should have high contrast colors', async () => {
      const { container } = render(
        <ReversalTooltip action={reversedAction}>
          <div data-testid="trigger">Hover me</div>
        </ReversalTooltip>
      );

      fireEvent.mouseEnter(screen.getByTestId('trigger'));

      await waitFor(() => {
        const tooltip = container.querySelector('.bg-gray-900');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveClass('text-white');
      });
    });
  });
});

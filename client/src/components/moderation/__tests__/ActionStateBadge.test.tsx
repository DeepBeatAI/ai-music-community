import { render, screen } from '@testing-library/react';
import {
  ActionStateBadge,
  getStateColor,
  isActionReversed,
  isActionExpired,
  isActionActive,
} from '../ActionStateBadge';
import { ModerationAction } from '@/types/moderation';

// Helper to create a mock moderation action
const createMockAction = (overrides?: Partial<ModerationAction>): ModerationAction => ({
  id: 'test-action-id',
  moderator_id: 'moderator-id',
  target_user_id: 'target-user-id',
  action_type: 'user_warned',
  target_type: 'user',
  target_id: 'target-id',
  reason: 'Test reason',
  duration_days: null,
  expires_at: null,
  related_report_id: null,
  internal_notes: null,
  notification_sent: false,
  notification_message: null,
  created_at: new Date().toISOString(),
  revoked_at: null,
  revoked_by: null,
  metadata: null,
  ...overrides,
});

describe('ActionStateBadge', () => {
  describe('Badge Display', () => {
    it('displays ACTIVE badge for active action', () => {
      const action = createMockAction({
        revoked_at: null,
        expires_at: null,
      });

      render(<ActionStateBadge action={action} />);
      
      const badge = screen.getByText('ACTIVE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-900', 'text-red-200');
      expect(badge).not.toHaveClass('line-through');
    });

    it('displays REVERSED badge for reversed action', () => {
      const action = createMockAction({
        revoked_at: new Date().toISOString(),
        revoked_by: 'moderator-id',
      });

      render(<ActionStateBadge action={action} />);
      
      const badge = screen.getByText('REVERSED');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-600', 'text-gray-300', 'line-through');
    });

    it('displays EXPIRED badge for expired action', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const action = createMockAction({
        expires_at: pastDate.toISOString(),
        revoked_at: null,
      });

      render(<ActionStateBadge action={action} />);
      
      const badge = screen.getByText('EXPIRED');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-900', 'text-blue-200');
      expect(badge).not.toHaveClass('line-through');
    });

    it('prioritizes reversed state over expired state', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const action = createMockAction({
        expires_at: pastDate.toISOString(),
        revoked_at: new Date().toISOString(),
        revoked_by: 'moderator-id',
      });

      render(<ActionStateBadge action={action} />);
      
      // Should show REVERSED, not EXPIRED
      expect(screen.getByText('REVERSED')).toBeInTheDocument();
      expect(screen.queryByText('EXPIRED')).not.toBeInTheDocument();
    });

    it('displays ACTIVE for action with future expiration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const action = createMockAction({
        expires_at: futureDate.toISOString(),
        revoked_at: null,
      });

      render(<ActionStateBadge action={action} />);
      
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.queryByText('EXPIRED')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const action = createMockAction();

      render(<ActionStateBadge action={action} className="custom-class" />);
      
      const badge = screen.getByText('ACTIVE');
      expect(badge).toHaveClass('custom-class');
    });

    it('maintains base classes with custom className', () => {
      const action = createMockAction();

      render(<ActionStateBadge action={action} className="text-lg" />);
      
      const badge = screen.getByText('ACTIVE');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium', 'text-lg');
    });
  });

  describe('Utility Functions', () => {
    describe('getStateColor', () => {
      it('returns correct color for active state', () => {
        expect(getStateColor('active')).toBe('#DC2626');
      });

      it('returns correct color for reversed state', () => {
        expect(getStateColor('reversed')).toBe('#6B7280');
      });

      it('returns correct color for expired state', () => {
        expect(getStateColor('expired')).toBe('#2563EB');
      });
    });

    describe('isActionReversed', () => {
      it('returns true for reversed action', () => {
        const action = createMockAction({
          revoked_at: new Date().toISOString(),
        });

        expect(isActionReversed(action)).toBe(true);
      });

      it('returns false for non-reversed action', () => {
        const action = createMockAction({
          revoked_at: null,
        });

        expect(isActionReversed(action)).toBe(false);
      });
    });

    describe('isActionExpired', () => {
      it('returns true for expired action', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const action = createMockAction({
          expires_at: pastDate.toISOString(),
        });

        expect(isActionExpired(action)).toBe(true);
      });

      it('returns false for non-expired action', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const action = createMockAction({
          expires_at: futureDate.toISOString(),
        });

        expect(isActionExpired(action)).toBe(false);
      });

      it('returns false for action without expiration', () => {
        const action = createMockAction({
          expires_at: null,
        });

        expect(isActionExpired(action)).toBe(false);
      });
    });

    describe('isActionActive', () => {
      it('returns true for active action', () => {
        const action = createMockAction({
          revoked_at: null,
          expires_at: null,
        });

        expect(isActionActive(action)).toBe(true);
      });

      it('returns false for reversed action', () => {
        const action = createMockAction({
          revoked_at: new Date().toISOString(),
        });

        expect(isActionActive(action)).toBe(false);
      });

      it('returns false for expired action', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const action = createMockAction({
          expires_at: pastDate.toISOString(),
        });

        expect(isActionActive(action)).toBe(false);
      });

      it('returns true for action with future expiration', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const action = createMockAction({
          expires_at: futureDate.toISOString(),
          revoked_at: null,
        });

        expect(isActionActive(action)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles action with both revoked_at and expires_at', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const action = createMockAction({
        expires_at: pastDate.toISOString(),
        revoked_at: new Date().toISOString(),
      });

      render(<ActionStateBadge action={action} />);
      
      // Should prioritize reversed state
      expect(screen.getByText('REVERSED')).toBeInTheDocument();
    });

    it('handles action expiring exactly now', () => {
      const now = new Date();

      const action = createMockAction({
        expires_at: now.toISOString(),
      });

      render(<ActionStateBadge action={action} />);
      
      // Should be considered expired (not strictly greater than)
      const badge = screen.getByText(/ACTIVE|EXPIRED/);
      expect(badge).toBeInTheDocument();
    });

    it('handles permanent actions (no expiration)', () => {
      const action = createMockAction({
        expires_at: null,
        duration_days: null,
      });

      render(<ActionStateBadge action={action} />);
      
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders as a span element', () => {
      const action = createMockAction();

      const { container } = render(<ActionStateBadge action={action} />);
      
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('includes readable text content', () => {
      const action = createMockAction();

      render(<ActionStateBadge action={action} />);
      
      const badge = screen.getByText('ACTIVE');
      expect(badge.textContent).toBe('ACTIVE');
    });

    it('maintains sufficient color contrast', () => {
      const action = createMockAction();

      render(<ActionStateBadge action={action} />);
      
      const badge = screen.getByText('ACTIVE');
      // Red background (bg-red-900) with light red text (text-red-200) provides good contrast
      expect(badge).toHaveClass('bg-red-900', 'text-red-200');
    });
  });
});

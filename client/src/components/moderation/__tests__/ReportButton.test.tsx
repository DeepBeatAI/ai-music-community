/**
 * ReportButton Component Tests
 * 
 * Tests for the ReportButton component that opens the report modal
 * Requirements: 1.1
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ReportButton } from '../ReportButton';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('../ReportModal', () => ({
  ReportModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="report-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ReportButton', () => {
  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      session: null,
      profile: null,
      userTypeInfo: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      userTypeLoading: false,
      userTypeError: null,
      refreshProfile: jest.fn()
    });
  });

  describe('Button Visibility', () => {
    it('should render button when user is authenticated', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByRole('button', { name: /Report post/i })).toBeInTheDocument();
    });

    it('should not render when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ 
        user: null, 
        loading: false,
        session: null,
        profile: null,
        userTypeInfo: null,
        isAdmin: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        userTypeLoading: false,
        userTypeError: null,
        refreshProfile: jest.fn()
      });

      const { container } = render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Button Display Modes', () => {
    it('should display icon and text by default', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Report')).toBeInTheDocument();
      expect(screen.getByRole('button')).toContainHTML('svg');
    });

    it('should display only icon when iconOnly is true', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
          iconOnly={true}
        />
      );

      expect(screen.queryByText('Report')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toContainHTML('svg');
    });

    it('should apply custom className', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
          className="custom-class"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when button is clicked', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('report-modal')).toBeInTheDocument();
    });

    it('should close modal when close is triggered', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('report-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('report-modal')).not.toBeInTheDocument();
    });

    it('should pass correct reportType to modal', () => {
      render(
        <ReportButton
          reportType="comment"
          targetId="comment-123"
        />
      );

      const button = screen.getByRole('button', { name: /Report comment/i });
      expect(button).toBeInTheDocument();
    });

    it('should pass correct targetId to modal', () => {
      render(
        <ReportButton
          reportType="track"
          targetId="track-456"
        />
      );

      const button = screen.getByRole('button', { name: /Report track/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for post', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByRole('button', { name: 'Report post' })).toBeInTheDocument();
    });

    it('should have proper aria-label for comment', () => {
      render(
        <ReportButton
          reportType="comment"
          targetId="comment-123"
        />
      );

      expect(screen.getByRole('button', { name: 'Report comment' })).toBeInTheDocument();
    });

    it('should have proper aria-label for track', () => {
      render(
        <ReportButton
          reportType="track"
          targetId="track-123"
        />
      );

      expect(screen.getByRole('button', { name: 'Report track' })).toBeInTheDocument();
    });

    it('should have proper aria-label for user', () => {
      render(
        <ReportButton
          reportType="user"
          targetId="user-123"
        />
      );

      expect(screen.getByRole('button', { name: 'Report user' })).toBeInTheDocument();
    });

    it('should have title attribute for tooltip', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Report this content');
    });
  });

  describe('Button Styling', () => {
    it('should have hover styles', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:text-red-600');
      expect(button).toHaveClass('hover:bg-red-50');
    });

    it('should have transition classes', () => {
      render(
        <ReportButton
          reportType="post"
          targetId="post-123"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-colors');
    });
  });
});

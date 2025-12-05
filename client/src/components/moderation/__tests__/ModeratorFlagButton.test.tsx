/**
 * ModeratorFlagButton Component Tests
 * 
 * Tests for the ModeratorFlagButton component that opens the moderator flag modal
 * Requirements: 2.1, 2.2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeratorFlagButton } from '../ModeratorFlagButton';
import { isModeratorOrAdmin } from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');

const mockIsModeratorOrAdmin = isModeratorOrAdmin as jest.MockedFunction<typeof isModeratorOrAdmin>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('ModeratorFlagButton', () => {
  const mockUser = { 
    id: 'moderator-123', 
    email: 'moderator@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  };

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

  describe('Visibility Based on Role', () => {
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

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      // Button should not be visible when user is not authenticated
      expect(screen.queryByText('Flag')).not.toBeInTheDocument();
    });

    it('should not render while loading role check', async () => {
      mockIsModeratorOrAdmin.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      // Should not render while loading
      expect(screen.queryByText('Flag')).not.toBeInTheDocument();
    });

    it('should not render when user is not a moderator or admin', async () => {
      mockIsModeratorOrAdmin.mockResolvedValue(false);

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(mockIsModeratorOrAdmin).toHaveBeenCalledWith('moderator-123');
      });

      expect(screen.queryByText('Flag')).not.toBeInTheDocument();
    });

    it('should render when user is a moderator', async () => {
      mockIsModeratorOrAdmin.mockResolvedValue(true);

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Flag')).toBeInTheDocument();
      });
    });

    it('should render when user is an admin', async () => {
      mockIsModeratorOrAdmin.mockResolvedValue(true);

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Flag')).toBeInTheDocument();
      });
    });
  });

  describe('Button Display', () => {
    beforeEach(() => {
      mockIsModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should display warning icon', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        const button = screen.getByLabelText('Flag post for review');
        expect(button).toBeInTheDocument();
      });
    });

    it('should display text label by default', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Flag')).toBeInTheDocument();
      });
    });

    it('should hide text label when iconOnly is true', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
          iconOnly={true}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Flag')).not.toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
          className="custom-class"
        />
      );

      await waitFor(() => {
        const button = screen.getByLabelText('Flag post for review');
        expect(button).toHaveClass('custom-class');
      });
    });
  });

  describe('Modal Interaction', () => {
    beforeEach(() => {
      mockIsModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should open modal when button is clicked', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Flag')).toBeInTheDocument();
      });

      const button = screen.getByLabelText('Flag post for review');
      fireEvent.click(button);

      // Modal should be rendered
      await waitFor(() => {
        expect(screen.getByText('Flag Post')).toBeInTheDocument();
      });
    });

    it('should close modal when modal onClose is called', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Flag')).toBeInTheDocument();
      });

      // Open modal
      const button = screen.getByLabelText('Flag post for review');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Flag Post')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Flag Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Content Type Labels', () => {
    beforeEach(() => {
      mockIsModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should have correct aria-label for post', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Flag post for review')).toBeInTheDocument();
      });
    });

    it('should have correct aria-label for comment', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="comment"
          targetId="comment-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Flag comment for review')).toBeInTheDocument();
      });
    });

    it('should have correct aria-label for track', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="track"
          targetId="track-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Flag track for review')).toBeInTheDocument();
      });
    });

    it('should have correct aria-label for user', async () => {
      renderWithProviders(
        <ModeratorFlagButton
          reportType="user"
          targetId="user-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Flag user for review')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle role check error gracefully', async () => {
      mockIsModeratorOrAdmin.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(
        <ModeratorFlagButton
          reportType="post"
          targetId="post-123"
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to check moderator role:', expect.any(Error));
      });

      // Should not render on error
      expect(screen.queryByText('Flag')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});

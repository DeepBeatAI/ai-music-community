/**
 * Moderation Page Tests
 * 
 * Tests for the moderation page access control and basic functionality
 * Requirements: 3.1, 3.2, 3.3
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ModerationPage from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { isUserModeratorOrAdmin } from '@/lib/userTypeService';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/userTypeService');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockIsUserModeratorOrAdmin = isUserModeratorOrAdmin as jest.MockedFunction<typeof isUserModeratorOrAdmin>;

describe('ModerationPage', () => {
  const mockPush = jest.fn();
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const defaultAuthContext = {
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
    refreshProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
    mockUseAuth.mockReturnValue(defaultAuthContext);
    mockIsUserModeratorOrAdmin.mockResolvedValue(false);
  });

  describe('Access Control', () => {
    it('should redirect non-authenticated users to login', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: null,
      });

      render(<ModerationPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect non-moderators to home with error', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(false);

      render(<ModerationPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/?error=unauthorized');
      });
    });

    it('should allow moderators to access the page', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);

      render(<ModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow admins to access the page', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);

      render(<ModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should show loading state while checking authorization', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        loading: true,
      });

      render(<ModerationPage />);

      expect(screen.getByText('Verifying access...')).toBeInTheDocument();
    });
  });

  describe('Page Layout', () => {
    beforeEach(() => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should display page header with title and description', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
        expect(screen.getByText(/Review reports, take moderation actions/i)).toBeInTheDocument();
      });
    });

    it('should display shield emoji icon in header', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const header = screen.getByText('Moderation Dashboard').parentElement;
        expect(header?.textContent).toContain('🛡️');
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should display all four tabs', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Queue/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Action Logs/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Metrics/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });
    });

    it('should have Queue tab active by default', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const queueTab = screen.getByRole('button', { name: /Queue/i });
        expect(queueTab).toHaveClass('border-blue-500');
        expect(queueTab).toHaveClass('text-blue-400');
      });
    });

    it('should switch to Action Logs tab when clicked', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const logsTab = screen.getByRole('button', { name: /Action Logs/i });
        logsTab.click();
      });

      await waitFor(() => {
        const logsTab = screen.getByRole('button', { name: /Action Logs/i });
        expect(logsTab).toHaveClass('border-blue-500');
      });
    });

    it('should switch to Metrics tab when clicked', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const metricsTab = screen.getByRole('button', { name: /Metrics/i });
        metricsTab.click();
      });

      await waitFor(() => {
        const metricsTab = screen.getByRole('button', { name: /Metrics/i });
        expect(metricsTab).toHaveClass('border-blue-500');
      });
    });

    it('should switch to Settings tab when clicked', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const settingsTab = screen.getByRole('button', { name: /Settings/i });
        settingsTab.click();
      });

      await waitFor(() => {
        const settingsTab = screen.getByRole('button', { name: /Settings/i });
        expect(settingsTab).toHaveClass('border-blue-500');
      });
    });
  });

  describe('Tab Content', () => {
    beforeEach(() => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should display Queue content by default', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
        expect(screen.getByText(/Queue component will be implemented/i)).toBeInTheDocument();
      });
    });

    it('should display Action Logs content when tab is active', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const logsTab = screen.getByRole('button', { name: /Action Logs/i });
        logsTab.click();
      });

      await waitFor(() => {
        expect(screen.getByText(/Action logs component will be implemented/i)).toBeInTheDocument();
      });
    });

    it('should display Metrics content when tab is active', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const metricsTab = screen.getByRole('button', { name: /Metrics/i });
        metricsTab.click();
      });

      await waitFor(() => {
        expect(screen.getByText(/Metrics component will be implemented/i)).toBeInTheDocument();
      });
    });

    it('should display Settings content when tab is active', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const settingsTab = screen.getByRole('button', { name: /Settings/i });
        settingsTab.click();
      });

      await waitFor(() => {
        expect(screen.getByText(/Settings component will be implemented/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
    });

    it('should have proper aria-label for tab navigation', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const tabNav = screen.getByRole('navigation', { name: /Moderation tabs/i });
        expect(tabNav).toBeInTheDocument();
      });
    });

    it('should set aria-current on active tab', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const queueTab = screen.getByRole('button', { name: /Queue/i });
        expect(queueTab).toHaveAttribute('aria-current', 'page');
      });
    });

    it('should update aria-current when switching tabs', async () => {
      render(<ModerationPage />);

      await waitFor(() => {
        const logsTab = screen.getByRole('button', { name: /Action Logs/i });
        logsTab.click();
      });

      await waitFor(() => {
        const logsTab = screen.getByRole('button', { name: /Action Logs/i });
        expect(logsTab).toHaveAttribute('aria-current', 'page');
        
        const queueTab = screen.getByRole('button', { name: /Queue/i });
        expect(queueTab).not.toHaveAttribute('aria-current', 'page');
      });
    });
  });
});

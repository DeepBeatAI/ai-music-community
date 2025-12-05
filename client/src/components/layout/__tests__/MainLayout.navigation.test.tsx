/**
 * MainLayout Navigation Tests
 * 
 * Tests for the navigation links in MainLayout, specifically:
 * - Moderation link visibility (moderators and admins only)
 * - Admin Dashboard link visibility (admins only)
 * 
 * Requirements: 3.2, 3.4, 3.5
 */

import { render, screen, waitFor } from '@testing-library/react';
import MainLayout from '../MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { isUserModeratorOrAdmin } from '@/lib/userTypeService';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/AdminContext');
jest.mock('@/lib/userTypeService');
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('../../NotificationCenter', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-center">Notifications</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdmin = useAdmin as jest.MockedFunction<typeof useAdmin>;
const mockIsUserModeratorOrAdmin = isUserModeratorOrAdmin as jest.MockedFunction<typeof isUserModeratorOrAdmin>;

describe('MainLayout Navigation', () => {
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

  const defaultAdminContext = {
    isAdmin: false,
    loading: false,
    error: null,
    refreshAdminStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthContext);
    mockUseAdmin.mockReturnValue(defaultAdminContext);
    mockIsUserModeratorOrAdmin.mockResolvedValue(false);
  });

  describe('Moderation Link Visibility', () => {
    it('should show Moderation link for moderators', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for moderation link to appear
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Moderation/i })).toBeInTheDocument();
      });
    });

    it('should show Moderation link for admins', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: true,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for moderation link to appear
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Moderation/i })).toBeInTheDocument();
      });
    });

    it('should NOT show Moderation link for regular users', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(false);

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for dropdown to render
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /My Creator Profile/i })).toBeInTheDocument();
      });

      // Moderation link should not be present
      expect(screen.queryByRole('menuitem', { name: /Moderation/i })).not.toBeInTheDocument();
    });

    it('should NOT show Moderation link when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: null,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Avatar dropdown should not be present for unauthenticated users
      expect(screen.queryByRole('button', { name: /User menu/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Moderation/i })).not.toBeInTheDocument();
    });
  });

  describe('Admin Dashboard Link Visibility', () => {
    it('should show Admin Dashboard link for admins', async () => {
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: true,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for admin link to appear
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Admin Dashboard/i })).toBeInTheDocument();
      });
    });

    it('should NOT show Admin Dashboard link for moderators', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: false,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for dropdown to render
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /My Creator Profile/i })).toBeInTheDocument();
      });

      // Admin link should not be present
      expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
    });

    it('should NOT show Admin Dashboard link for regular users', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(false);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: false,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for dropdown to render
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /My Creator Profile/i })).toBeInTheDocument();
      });

      // Admin link should not be present
      expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
    });
  });

  describe('Combined Visibility Scenarios', () => {
    it('should show both Moderation and Admin links for admins', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: true,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for both links to appear
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Moderation/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Admin Dashboard/i })).toBeInTheDocument();
      });
    });

    it('should show only Moderation link for moderators (not admins)', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: false,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for moderation link to appear
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Moderation/i })).toBeInTheDocument();
      });

      // Admin link should not be present
      expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
    });

    it('should show neither link for regular users', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(false);
      mockUseAdmin.mockReturnValue({
        ...defaultAdminContext,
        isAdmin: false,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for dropdown to render
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /My Creator Profile/i })).toBeInTheDocument();
      });

      // Neither special link should be present
      expect(screen.queryByRole('menuitem', { name: /Moderation/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
    });
  });

  describe('Moderation Link Icon', () => {
    it('should display shield emoji icon for Moderation link', async () => {
      mockIsUserModeratorOrAdmin.mockResolvedValue(true);

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      avatarButton.click();

      // Wait for moderation link to appear
      await waitFor(() => {
        const moderationLink = screen.getByRole('menuitem', { name: /Moderation/i });
        expect(moderationLink).toBeInTheDocument();
        expect(moderationLink.textContent).toContain('🛡️');
      });
    });
  });
});

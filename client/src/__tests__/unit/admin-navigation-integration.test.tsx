/**
 * Admin Navigation Integration Tests
 * 
 * Tests for admin dashboard link in navigation menu including:
 * - Visibility for admin users
 * - Hidden from non-admin users
 * - Navigation functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import MainLayout from '@/components/layout/MainLayout';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
}));

// Mock contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/AdminContext', () => ({
  useAdmin: jest.fn(),
}));

// Mock NotificationCenter
jest.mock('@/components/NotificationCenter', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-center">Notifications</div>,
}));

describe('Admin Navigation Integration', () => {
  const mockPush = jest.fn();
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Admin Link Visibility', () => {
    it('should show admin link for admin users', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'admin@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Admin Dashboard/i })).toBeInTheDocument();
      });
    });

    it('should hide admin link from non-admin users', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'user@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
      });
    });

    it('should hide admin link while loading admin status', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'user@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: true,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin Link Navigation', () => {
    it('should navigate to /admin when admin link is clicked', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'admin@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Admin Dashboard/i })).toBeInTheDocument();
      });

      // Click admin link
      const adminLink = screen.getByRole('menuitem', { name: /Admin Dashboard/i });
      await user.click(adminLink);

      expect(mockPush).toHaveBeenCalledWith('/admin');
    });

    it('should close dropdown after clicking admin link', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'admin@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Admin Dashboard/i })).toBeInTheDocument();
      });

      // Click admin link
      const adminLink = screen.getByRole('menuitem', { name: /Admin Dashboard/i });
      await user.click(adminLink);

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin Link Styling', () => {
    it('should display shield icon for admin link', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'admin@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        const adminLink = screen.getByRole('menuitem', { name: /Admin Dashboard/i });
        expect(adminLink).toBeInTheDocument();
        // Check for SVG icon
        const svg = adminLink.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should have separator before admin link', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'admin@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        // Check for separator div with border-t class
        const separators = document.querySelectorAll('.border-t');
        expect(separators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Other Navigation Items', () => {
    it('should show profile and account links for all authenticated users', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'user@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Open avatar dropdown
      const avatarButton = screen.getByRole('button', { name: /User menu/i });
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /My Creator Profile/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Manage my Account/i })).toBeInTheDocument();
      });
    });

    it('should show notification center for authenticated users', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'user@example.com' },
        signOut: mockSignOut,
      });
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    });
  });
});

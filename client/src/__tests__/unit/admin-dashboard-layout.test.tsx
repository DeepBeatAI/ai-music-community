/**
 * Admin Dashboard Layout Tests
 * 
 * Tests for the admin dashboard page layout including:
 * - Authorization checks
 * - Tab navigation
 * - Loading states
 * - Error handling
 * - Lazy loading of tab components
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import AdminDashboard from '@/app/admin/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock AdminContext
jest.mock('@/contexts/AdminContext', () => ({
  useAdmin: jest.fn(),
}));

// Mock lazy-loaded tab components
jest.mock('@/components/admin/UserManagementTab', () => ({
  UserManagementTab: () => <div data-testid="user-management-tab">User Management Content</div>,
}));

jest.mock('@/components/admin/PlatformAdminTab', () => ({
  PlatformAdminTab: () => <div data-testid="platform-admin-tab">Platform Admin Content</div>,
}));

jest.mock('@/components/admin/SecurityTab', () => ({
  SecurityTab: () => <div data-testid="security-tab">Security Content</div>,
}));

jest.mock('@/components/admin/PerformanceHealthTab', () => ({
  PerformanceHealthTab: () => <div data-testid="performance-health-tab">Performance Content</div>,
}));

jest.mock('@/components/admin/AnalyticsTab', () => ({
  AnalyticsTab: () => <div data-testid="analytics-tab">Analytics Content</div>,
}));

describe('AdminDashboard Layout', () => {
  const mockPush = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null); // Reset to null by default
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });
  });

  describe('Authorization', () => {
    it('should show loading state while checking admin status', () => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: true,
      });

      render(<AdminDashboard />);

      expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument();
    });

    it('should redirect non-admin users to home page', async () => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(<AdminDashboard />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/?error=unauthorized');
      });
    });

    it('should show access denied message for non-admin users', () => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(<AdminDashboard />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You do not have permission/)).toBeInTheDocument();
    });

    it('should display unauthorized error from URL parameter', () => {
      mockGet.mockReturnValue('unauthorized');
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(<AdminDashboard />);

      expect(screen.getByText(/You do not have permission/)).toBeInTheDocument();
    });

    it('should render dashboard for admin users', async () => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });

      const { container } = render(<AdminDashboard />);

      // Debug: log what's actually rendered
      // console.log(container.innerHTML);

      // Should render dashboard when isAdmin is true
      await waitFor(() => {
        const heading = screen.queryByText('Admin Dashboard');
        if (!heading) {
          // If not found, check what's actually rendered
          const accessDenied = screen.queryByText('Access Denied');
          if (accessDenied) {
            throw new Error('Component rendered Access Denied instead of dashboard');
          }
        }
        expect(heading).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });
    });

    it('should render all tab buttons', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /User Management/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Platform Admin/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Security/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Performance & Health/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Analytics/i })).toBeInTheDocument();
      });
    });

    it('should show User Management tab by default', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('user-management-tab')).toBeInTheDocument();
      });
    });

    it('should switch to Platform Admin tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Platform Admin/i })).toBeInTheDocument();
      });

      const platformTab = screen.getByRole('button', { name: /Platform Admin/i });
      await user.click(platformTab);

      await waitFor(() => {
        expect(screen.getByTestId('platform-admin-tab')).toBeInTheDocument();
      });
    });

    it('should switch to Security tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Security/i })).toBeInTheDocument();
      });

      const securityTab = screen.getByRole('button', { name: /Security/i });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByTestId('security-tab')).toBeInTheDocument();
      });
    });

    it('should switch to Performance & Health tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Performance & Health/i })).toBeInTheDocument();
      });

      const performanceTab = screen.getByRole('button', { name: /Performance & Health/i });
      await user.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-health-tab')).toBeInTheDocument();
      });
    });

    it('should switch to Analytics tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Analytics/i })).toBeInTheDocument();
      });

      const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
      await user.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByTestId('analytics-tab')).toBeInTheDocument();
      });
    });

    it('should highlight active tab', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /User Management/i })).toBeInTheDocument();
      });

      const userTab = screen.getByRole('button', { name: /User Management/i });
      const platformTab = screen.getByRole('button', { name: /Platform Admin/i });

      // User Management should be active by default
      expect(userTab).toHaveClass('border-blue-600');
      expect(platformTab).toHaveClass('border-transparent');

      // Click Platform Admin tab
      await user.click(platformTab);

      await waitFor(() => {
        expect(platformTab).toHaveClass('border-blue-600');
        expect(userTab).toHaveClass('border-transparent');
      });
    });
  });

  describe('Layout Structure', () => {
    beforeEach(() => {
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: true,
        loading: false,
      });
    });

    it('should render header with title and description', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText(/Manage users, platform settings/)).toBeInTheDocument();
      });
    });

    it('should render tab icons', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        const userTab = screen.getByRole('button', { name: /User Management/i });
        expect(within(userTab).getByText('👥')).toBeInTheDocument();
      });
    });

    it('should be responsive on mobile', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        // Tab buttons should have responsive classes
        const userTab = screen.getByRole('button', { name: /User Management/i });
        expect(userTab).toHaveClass('whitespace-nowrap');
      });
    });
  });

  describe('Return to Home Button', () => {
    it('should navigate to home when Return to Home is clicked', async () => {
      const user = userEvent.setup();
      (useAdmin as jest.Mock).mockReturnValue({
        isAdmin: false,
        loading: false,
      });

      render(<AdminDashboard />);

      const returnButton = screen.getByRole('button', { name: /Return to Home/i });
      await user.click(returnButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});

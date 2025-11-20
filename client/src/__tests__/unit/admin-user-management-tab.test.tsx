/**
 * User Management Tab Tests
 * 
 * Tests for the User Management tab component including:
 * - User list display
 * - Search and filtering
 * - User detail modal
 * - Plan tier management
 * - Role management
 * - User suspension
 * - Password reset
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import * as adminService from '@/lib/adminService';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

// Mock admin service
jest.mock('@/lib/adminService');

const mockUsers = [
  {
    id: '1',
    user_id: 'user-1',
    username: 'john_doe',
    email: 'john@example.com',
    plan_tier: 'free',
    roles: [],
    created_at: '2024-01-01T00:00:00Z',
    last_active: '2024-01-15T00:00:00Z',
    is_suspended: false,
    activity_summary: {
      posts_count: 10,
      tracks_count: 5,
      albums_count: 2,
      playlists_count: 3,
      comments_count: 20,
      likes_given: 50,
      likes_received: 100,
      last_active: '2024-01-15T00:00:00Z',
    },
  },
  {
    id: '2',
    user_id: 'user-2',
    username: 'jane_smith',
    email: 'jane@example.com',
    plan_tier: 'creator_pro',
    roles: ['moderator'],
    created_at: '2024-01-02T00:00:00Z',
    last_active: '2024-01-16T00:00:00Z',
    is_suspended: false,
    activity_summary: {
      posts_count: 25,
      tracks_count: 15,
      albums_count: 5,
      playlists_count: 8,
      comments_count: 50,
      likes_given: 150,
      likes_received: 300,
      last_active: '2024-01-16T00:00:00Z',
    },
  },
];

describe('UserManagementTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.alert
    global.alert = jest.fn();
    (adminService.fetchAllUsers as jest.Mock).mockResolvedValue({
      users: mockUsers,
      total: 2,
    });
  });

  describe('User List Display', () => {
    it('should render user list on load', async () => {
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });
    });

    it('should display user emails', async () => {
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display plan tiers', async () => {
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('free')).toBeInTheDocument();
        expect(screen.getByText('creator pro')).toBeInTheDocument();
      });
    });

    it('should display user roles', async () => {
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('moderator')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<UserManagementTab />);

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('should show error message on fetch failure', async () => {
      (adminService.fetchAllUsers as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch users')
      );

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
      });
    });

    it('should show "No users found" when list is empty', async () => {
      (adminService.fetchAllUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 0,
      });

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by username', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by username or email/i);
      await user.type(searchInput, 'john');

      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.queryByText('jane_smith')).not.toBeInTheDocument();
    });

    it('should filter users by email', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by username or email/i);
      await user.type(searchInput, 'jane@example');

      expect(screen.getByText('jane_smith')).toBeInTheDocument();
      expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by username or email/i);
      await user.type(searchInput, 'JOHN');

      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter by plan tier', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      // Get all comboboxes and find the first one (plan tier filter)
      const filters = screen.getAllByRole('combobox');
      const planFilter = filters[0];
      await user.selectOptions(planFilter, 'creator_pro');

      expect(screen.getByText('jane_smith')).toBeInTheDocument();
      expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
    });

    it('should filter by role', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });

      // Get all comboboxes and find the second one (role filter)
      const roleFilters = screen.getAllByRole('combobox');
      const roleFilter = roleFilters[1];
      await user.selectOptions(roleFilter, 'moderator');

      expect(screen.getByText('jane_smith')).toBeInTheDocument();
      expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
    });

    it('should filter users with no roles', async () => {
      const user = userEvent.setup();
      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      // Get all comboboxes and find the second one (role filter)
      const roleFilters = screen.getAllByRole('combobox');
      const roleFilter = roleFilters[1];
      await user.selectOptions(roleFilter, 'none');

      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.queryByText('jane_smith')).not.toBeInTheDocument();
    });
  });

  describe('User Detail Modal', () => {
    it('should open modal when Edit button is clicked', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });
    });

    it('should display user activity summary in modal', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Activity (Last 30 Days)')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // posts_count
        expect(screen.getByText('5')).toBeInTheDocument(); // tracks_count
      });
    });

    it('should close modal when Close button is clicked', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('User: john_doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Plan Tier Management', () => {
    it('should allow changing plan tier', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);
      (adminService.updateUserPlanTier as jest.Mock).mockResolvedValue(undefined);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });

      // Find the select element by looking for all selects and finding the one with 'free' value
      const selects = screen.getAllByRole('combobox');
      const planSelect = selects.find(select => (select as HTMLSelectElement).value === 'free');
      
      if (!planSelect) {
        throw new Error('Could not find plan tier select');
      }

      await user.selectOptions(planSelect, 'creator_pro');

      // Find and click the Save button next to the plan tier select
      const saveButtons = screen.getAllByRole('button', { name: /Save/i });
      await user.click(saveButtons[0]);

      await waitFor(() => {
        expect(adminService.updateUserPlanTier).toHaveBeenCalledWith('user-1', 'creator_pro');
      });
    });
  });

  describe('Role Management', () => {
    it('should allow toggling roles', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);
      (adminService.updateUserRoles as jest.Mock).mockResolvedValue(undefined);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });

      // Find checkboxes - there might be multiple, so get all and find moderator
      const checkboxes = screen.getAllByRole('checkbox');
      const moderatorCheckbox = checkboxes.find(cb => {
        const label = cb.closest('label');
        return label?.textContent?.toLowerCase().includes('moderator');
      });

      if (!moderatorCheckbox) {
        throw new Error('Could not find moderator checkbox');
      }

      await user.click(moderatorCheckbox);

      await waitFor(() => {
        expect(adminService.updateUserRoles).toHaveBeenCalledWith('user-1', ['moderator'], []);
      });
    });
  });

  describe('User Suspension', () => {
    it('should allow suspending a user', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);
      (adminService.suspendUser as jest.Mock).mockResolvedValue(undefined);

      // Mock window.confirm and window.prompt
      global.confirm = jest.fn(() => true);
      global.prompt = jest.fn(() => 'Violation of terms');

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });

      const suspendButton = screen.getByRole('button', { name: /Suspend Account/i });
      await user.click(suspendButton);

      await waitFor(() => {
        expect(adminService.suspendUser).toHaveBeenCalledWith('user-1', 'Violation of terms');
      });
    });
  });

  describe('Password Reset', () => {
    it('should allow resetting user password', async () => {
      const user = userEvent.setup();
      (adminService.fetchUserDetails as jest.Mock).mockResolvedValue(mockUsers[0]);
      (adminService.resetUserPassword as jest.Mock).mockResolvedValue(undefined);

      global.confirm = jest.fn(() => true);

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User: john_doe')).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset Password/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(adminService.resetUserPassword).toHaveBeenCalledWith('user-1', 'john@example.com');
      });
    });
  });

  describe('Pagination', () => {
    it('should show Load More button when there are more users', async () => {
      (adminService.fetchAllUsers as jest.Mock).mockResolvedValue({
        users: new Array(50).fill(mockUsers[0]),
        total: 100,
      });

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument();
      });
    });

    it('should load more users when Load More is clicked', async () => {
      const user = userEvent.setup();
      (adminService.fetchAllUsers as jest.Mock).mockResolvedValue({
        users: new Array(50).fill(mockUsers[0]),
        total: 100,
      });

      render(<UserManagementTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /Load More/i });
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(adminService.fetchAllUsers).toHaveBeenCalledTimes(2);
      });
    });
  });
});

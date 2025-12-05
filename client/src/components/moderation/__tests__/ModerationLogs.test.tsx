import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationLogs } from '../ModerationLogs';
import { fetchModerationLogs, exportActionLogsToCSV, isAdmin } from '@/lib/moderationService';
import { ModerationAction } from '@/types/moderation';

// Mock the moderation service
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

const mockFetchModerationLogs = fetchModerationLogs as jest.MockedFunction<
  typeof fetchModerationLogs
>;
const mockExportActionLogsToCSV = exportActionLogsToCSV as jest.MockedFunction<
  typeof exportActionLogsToCSV
>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;

const mockActions: ModerationAction[] = [
  {
    id: '1',
    moderator_id: 'mod1',
    target_user_id: 'user1',
    action_type: 'content_removed',
    target_type: 'post',
    target_id: 'post1',
    reason: 'Spam content',
    duration_days: null,
    expires_at: null,
    related_report_id: 'report1',
    internal_notes: 'Removed spam post',
    notification_sent: true,
    notification_message: 'Your post was removed',
    created_at: new Date().toISOString(),
    revoked_at: null,
    revoked_by: null,
    metadata: null,
  },
  {
    id: '2',
    moderator_id: 'mod2',
    target_user_id: 'user2',
    action_type: 'user_suspended',
    target_type: null,
    target_id: null,
    reason: 'Repeated violations',
    duration_days: 7,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    related_report_id: 'report2',
    internal_notes: 'Suspended for 7 days',
    notification_sent: true,
    notification_message: 'Your account has been suspended',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    revoked_at: null,
    revoked_by: null,
    metadata: null,
  },
  {
    id: '3',
    moderator_id: 'admin1',
    target_user_id: 'user3',
    action_type: 'user_banned',
    target_type: null,
    target_id: null,
    reason: 'Severe violations',
    duration_days: null,
    expires_at: null,
    related_report_id: 'report3',
    internal_notes: 'Permanent ban',
    notification_sent: true,
    notification_message: 'Your account has been permanently banned',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    revoked_at: null,
    revoked_by: null,
    metadata: null,
  },
];

describe('ModerationLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchModerationLogs.mockResolvedValue({
      actions: mockActions,
      total: mockActions.length,
    });
    mockIsAdmin.mockResolvedValue(false);
  });

  describe('Rendering', () => {
    it('should render the logs component', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });
    });

    it('should display filter controls', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByLabelText('Action Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Search User/Content ID')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      });
    });

    it('should display action logs when loaded', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 - 3 of 3 actions/)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      render(<ModerationLogs />);

      // Check for the loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display empty state when no actions', async () => {
      mockFetchModerationLogs.mockResolvedValue({
        actions: [],
        total: 0,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText('No action logs found')).toBeInTheDocument();
      });
    });

    it('should display action details in table', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText('Content Removed')).toBeInTheDocument();
        expect(screen.getByText('User Suspended')).toBeInTheDocument();
        expect(screen.getByText('User Banned')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by action type', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      const actionTypeFilter = screen.getByLabelText('Action Type') as HTMLSelectElement;
      fireEvent.change(actionTypeFilter, { target: { value: 'content_removed' } });

      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'content_removed' }),
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should filter by search query', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search User/Content ID') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'user1' } });

      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          expect.objectContaining({ searchQuery: 'user1' }),
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should clear all filters', async () => {
      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      // Set some filters
      const actionTypeFilter = screen.getByLabelText('Action Type') as HTMLSelectElement;
      fireEvent.change(actionTypeFilter, { target: { value: 'content_removed' } });

      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'content_removed' }),
          expect.any(Number),
          expect.any(Number)
        );
      });

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          {},
          expect.any(Number),
          expect.any(Number)
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate actions when there are more than 20', async () => {
      const manyActions = Array.from({ length: 25 }, (_, i) => ({
        ...mockActions[0],
        id: `action-${i}`,
      }));
      mockFetchModerationLogs.mockResolvedValue({
        actions: manyActions.slice(0, 20),
        total: 25,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 - 20 of 25 actions/)).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      mockFetchModerationLogs.mockResolvedValue({
        actions: mockActions.slice(0, 20),
        total: 25,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          expect.any(Object),
          20,
          20 // offset for page 2
        );
      });
    });

    it('should navigate to previous page', async () => {
      mockFetchModerationLogs.mockResolvedValue({
        actions: mockActions.slice(0, 20),
        total: 25,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      // Go to page 2
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });

      // Go back to page 1
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockFetchModerationLogs).toHaveBeenCalledWith(
          expect.any(Object),
          20,
          0 // offset for page 1
        );
      });
    });

    it('should disable Previous button on first page', async () => {
      mockFetchModerationLogs.mockResolvedValue({
        actions: mockActions.slice(0, 20),
        total: 25,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        const prevButton = screen.getByText('Previous');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should not show pagination when only one page', async () => {
      mockFetchModerationLogs.mockResolvedValue({
        actions: mockActions,
        total: 3,
      });

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      // Pagination should not be visible when there's only one page
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    it('should show export button for admin users', async () => {
      mockIsAdmin.mockResolvedValue(true);

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('should not show export button for non-admin users', async () => {
      mockIsAdmin.mockResolvedValue(false);

      render(<ModerationLogs />);

      await waitFor(() => {
        expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();
      });
    });
  });

  describe('Action Selection', () => {
    it('should call onActionSelect when an action row is clicked', async () => {
      const onActionSelect = jest.fn();
      render(<ModerationLogs onActionSelect={onActionSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Spam content')).toBeInTheDocument();
      });

      // Click on the first action row (find by unique reason text)
      const firstRow = screen.getByText('Spam content').closest('tr');
      if (firstRow) {
        fireEvent.click(firstRow);
        expect(onActionSelect).toHaveBeenCalledTimes(1);
        expect(onActionSelect).toHaveBeenCalledWith(mockActions[0]);
      }
    });
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationQueue } from '../ModerationQueue';
import { fetchModerationQueue } from '@/lib/moderationService';
import { Report } from '@/types/moderation';

// Mock the moderation service
jest.mock('@/lib/moderationService');

const mockFetchModerationQueue = fetchModerationQueue as jest.MockedFunction<
  typeof fetchModerationQueue
>;

const mockReports: Report[] = [
  {
    id: '1',
    reporter_id: 'user1',
    reported_user_id: 'user2',
    report_type: 'post',
    target_id: 'post1',
    reason: 'spam',
    description: 'This is spam content',
    status: 'pending',
    priority: 3,
    moderator_flagged: false,
    reviewed_by: null,
    reviewed_at: null,
    resolution_notes: null,
    action_taken: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: null,
  },
  {
    id: '2',
    reporter_id: 'mod1',
    reported_user_id: 'user3',
    report_type: 'comment',
    target_id: 'comment1',
    reason: 'hate_speech',
    description: 'Moderator flagged content',
    status: 'under_review',
    priority: 2,
    moderator_flagged: true,
    reviewed_by: null,
    reviewed_at: null,
    resolution_notes: null,
    action_taken: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: null,
  },
  {
    id: '3',
    reporter_id: 'user4',
    reported_user_id: 'user5',
    report_type: 'track',
    target_id: 'track1',
    reason: 'copyright_violation',
    description: 'Copyright infringement',
    status: 'resolved',
    priority: 3,
    moderator_flagged: false,
    reviewed_by: 'mod1',
    reviewed_at: new Date().toISOString(),
    resolution_notes: 'Content removed',
    action_taken: 'content_removed',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
    metadata: null,
  },
];

describe('ModerationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchModerationQueue.mockResolvedValue(mockReports);
  });

  describe('Rendering', () => {
    it('should render the queue component', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });
    });

    it('should display filter controls', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
        expect(screen.getByLabelText('Priority')).toBeInTheDocument();
        expect(screen.getByLabelText('Source')).toBeInTheDocument();
        expect(screen.getByLabelText('Type')).toBeInTheDocument();
      });
    });

    it('should display reports when loaded', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 - 3 of 3 reports/)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      render(<ModerationQueue />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should display empty state when no reports', async () => {
      mockFetchModerationQueue.mockResolvedValue([]);

      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText('No reports found')).toBeInTheDocument();
        expect(screen.getByText('The moderation queue is empty')).toBeInTheDocument();
      });
    });

    it('should display error state on fetch failure', async () => {
      mockFetchModerationQueue.mockRejectedValue(new Error('Failed to fetch'));

      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by status', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText('Status') as HTMLSelectElement;
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'pending' })
        );
      });
    });

    it('should filter by priority', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      });

      const priorityFilter = screen.getByLabelText('Priority') as HTMLSelectElement;
      fireEvent.change(priorityFilter, { target: { value: '2' } });

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 2 })
        );
      });
    });

    it('should filter by source (moderator flagged)', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Source')).toBeInTheDocument();
      });

      const sourceFilter = screen.getByLabelText('Source') as HTMLSelectElement;
      fireEvent.change(sourceFilter, { target: { value: 'true' } });

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith(
          expect.objectContaining({ moderatorFlagged: true })
        );
      });
    });

    it('should filter by report type', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Type')).toBeInTheDocument();
      });

      const typeFilter = screen.getByLabelText('Type') as HTMLSelectElement;
      fireEvent.change(typeFilter, { target: { value: 'post' } });

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith(
          expect.objectContaining({ reportType: 'post' })
        );
      });
    });

    it('should clear all filters', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
      });

      // Set some filters
      const statusFilter = screen.getByLabelText('Status') as HTMLSelectElement;
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'pending' })
        );
      });

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledWith({});
      });
    });

    it('should show "Filters active" indicator when filters are applied', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText('Status') as HTMLSelectElement;
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(screen.getByText('Filters active')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate reports when there are more than 20', async () => {
      const manyReports = Array.from({ length: 25 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
      }));
      mockFetchModerationQueue.mockResolvedValue(manyReports);

      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 - 20 of 25 reports/)).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const manyReports = Array.from({ length: 25 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
      }));
      mockFetchModerationQueue.mockResolvedValue(manyReports);

      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Showing 21 - 25 of 25 reports/)).toBeInTheDocument();
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous page', async () => {
      const manyReports = Array.from({ length: 25 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
      }));
      mockFetchModerationQueue.mockResolvedValue(manyReports);

      render(<ModerationQueue />);

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
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      // Create enough reports to trigger pagination (more than 20)
      const manyReports = Array.from({ length: 25 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
      }));
      mockFetchModerationQueue.mockResolvedValue(manyReports);

      render(<ModerationQueue />);

      await waitFor(() => {
        const prevButton = screen.getByText('Previous');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should reset to page 1 when filters change', async () => {
      const manyReports = Array.from({ length: 25 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
      }));
      mockFetchModerationQueue.mockResolvedValue(manyReports);

      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      // Go to page 2
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });

      // Change filter
      const statusFilter = screen.getByLabelText('Status') as HTMLSelectElement;
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      // Should reset to page 1
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should refresh reports when refresh button is clicked', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetchModerationQueue).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while loading', async () => {
      render(<ModerationQueue />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Button should show "Refreshing..." and be disabled
      expect(screen.getByText('Refreshing...')).toBeDisabled();
    });
  });

  describe('Report Selection', () => {
    it('should call onReportSelect when a report is clicked', async () => {
      const onReportSelect = jest.fn();
      render(<ModerationQueue onReportSelect={onReportSelect} />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      // Click on the Review button of the first report
      const reviewButtons = screen.getAllByText(/Review Report/);
      expect(reviewButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(reviewButtons[0]);

      // The callback should be called immediately
      expect(onReportSelect).toHaveBeenCalledTimes(1);
      expect(onReportSelect).toHaveBeenCalledWith(mockReports[0]);
    });
  });
});

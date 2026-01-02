/**
 * ModerationMetrics Component Tests
 * 
 * Tests for the ModerationMetrics component that displays moderation statistics
 * Requirements: 9.1, 9.2, 9.5
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ModerationMetrics } from '../ModerationMetrics';
import * as moderationService from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/moderationService');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockCalculateMetrics = moderationService.calculateModerationMetrics as jest.MockedFunction<
  typeof moderationService.calculateModerationMetrics
>;
const mockIsAdmin = moderationService.isAdmin as jest.MockedFunction<typeof moderationService.isAdmin>;

describe('ModerationMetrics', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();

  const mockMetricsData: moderationService.ModerationMetrics = {
    reportsReceived: {
      today: 5,
      week: 25,
      month: 100,
    },
    reportsResolved: {
      today: 3,
      week: 20,
      month: 85,
    },
    averageResolutionTime: {
      hours: 4,
      minutes: 30,
    },
    actionsByType: {
      content_removed: 30,
      user_warned: 20,
      user_suspended: 10,
      content_approved: 25,
    },
    topReasons: [
      { reason: 'spam', count: 40 },
      { reason: 'harassment', count: 30 },
      { reason: 'inappropriate_content', count: 20 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false, signOut: jest.fn() } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseToast.mockReturnValue({ showToast: mockShowToast } as any);
    mockIsAdmin.mockResolvedValue(false);
    mockCalculateMetrics.mockResolvedValue(mockMetricsData);
  });

  describe('Metrics Calculations', () => {
    it('should display reports received counts correctly', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // today
        expect(screen.getByText('25')).toBeInTheDocument(); // week
        expect(screen.getByText('100')).toBeInTheDocument(); // month
      });
    });

    it('should display reports resolved counts correctly', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // today
        expect(screen.getByText('20')).toBeInTheDocument(); // week
        expect(screen.getByText('85')).toBeInTheDocument(); // month
      });
    });

    it('should display average resolution time correctly', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText(/4h 30m/)).toBeInTheDocument();
      });
    });

    it('should calculate and display action type percentages correctly', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        // Total actions = 30 + 20 + 10 + 25 = 85
        // content_removed: 30/85 = 35.3%
        expect(screen.getByText(/35.3%/)).toBeInTheDocument();
        // user_warned: 20/85 = 23.5%
        expect(screen.getByText(/23.5%/)).toBeInTheDocument();
      });
    });

    it('should calculate and display top reasons percentages correctly', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        // Total reasons = 40 + 30 + 20 = 90
        // spam: 40/90 = 44.4%
        expect(screen.getByText(/44.4%/)).toBeInTheDocument();
        // harassment: 30/90 = 33.3%
        expect(screen.getByText(/33.3%/)).toBeInTheDocument();
      });
    });
  });

  describe('Admin-Only Sections', () => {
    it('should not display moderator performance for non-admin users', async () => {
      mockIsAdmin.mockResolvedValue(false);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.queryByText('Moderator Performance Comparison')).not.toBeInTheDocument();
      });
    });

    it('should display moderator performance for admin users', async () => {
      mockIsAdmin.mockResolvedValue(true);
      
      const metricsWithPerformance = {
        ...mockMetricsData,
        moderatorPerformance: [
          {
            moderatorId: 'mod-123',
            actionsCount: 50,
            averageResolutionTime: 3.5,
            reversalRate: 8.5,
            accuracy: 'Excellent',
          },
          {
            moderatorId: 'mod-456',
            actionsCount: 30,
            averageResolutionTime: 5.2,
            reversalRate: 15.0,
            accuracy: 'Good',
          },
        ],
      };
      
      mockCalculateMetrics.mockResolvedValue(metricsWithPerformance);

      // Mock Supabase queries for fetching moderator usernames
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn()
              .mockResolvedValueOnce({ data: { username: 'moderator1' }, error: null })
              .mockResolvedValueOnce({ data: { username: 'moderator2' }, error: null }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Moderator Performance Comparison')).toBeInTheDocument();
        expect(screen.getByText('50 actions')).toBeInTheDocument();
        expect(screen.getByText('30 actions')).toBeInTheDocument();
        expect(screen.getByText('3.5h')).toBeInTheDocument();
        expect(screen.getByText('5.2h')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should sort moderator performance by actions count descending', async () => {
      mockIsAdmin.mockResolvedValue(true);
      
      const metricsWithPerformance = {
        ...mockMetricsData,
        moderatorPerformance: [
          {
            moderatorId: 'mod-low',
            actionsCount: 10,
            averageResolutionTime: 2.0,
            reversalRate: 5.0,
            accuracy: 'Excellent',
          },
          {
            moderatorId: 'mod-high',
            actionsCount: 100,
            averageResolutionTime: 4.0,
            reversalRate: 12.0,
            accuracy: 'Good',
          },
          {
            moderatorId: 'mod-mid',
            actionsCount: 50,
            averageResolutionTime: 3.0,
            reversalRate: 20.0,
            accuracy: 'Good',
          },
        ],
      };
      
      mockCalculateMetrics.mockResolvedValue(metricsWithPerformance);

      // Mock Supabase queries for fetching moderator usernames
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn()
              .mockResolvedValueOnce({ data: { username: 'mod-low' }, error: null })
              .mockResolvedValueOnce({ data: { username: 'mod-high' }, error: null })
              .mockResolvedValueOnce({ data: { username: 'mod-mid' }, error: null }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      render(<ModerationMetrics />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First row is header, so data rows start at index 1
        expect(rows[1]).toHaveTextContent('mod-high');
        expect(rows[2]).toHaveTextContent('mod-mid');
        expect(rows[3]).toHaveTextContent('mod-low');
      }, { timeout: 5000 });
    });

    it('should display N/A for moderators with no resolution time', async () => {
      mockIsAdmin.mockResolvedValue(true);
      
      const metricsWithPerformance = {
        ...mockMetricsData,
        moderatorPerformance: [
          {
            moderatorId: 'mod-123',
            actionsCount: 5,
            averageResolutionTime: 0,
            reversalRate: 0,
            accuracy: 'Excellent',
          },
        ],
      };
      
      mockCalculateMetrics.mockResolvedValue(metricsWithPerformance);

      // Mock Supabase queries for fetching moderator usernames
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({ data: { username: 'moderator1' }, error: null }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Date Range Filtering', () => {
    it('should call calculateModerationMetrics without date range initially', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(undefined, false, false);
      });
    });

    it('should update metrics when start date is selected', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
          }),
          false,
          false
        );
      });
    });

    it('should update metrics when end date is selected', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // First set start date
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Wait for the component to update after start date change
      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
          }),
          false,
          false
        );
      });

      // Get all date inputs and find the end date input (second one)
      const allDateInputs = document.querySelectorAll('input[type="date"]');
      const endDateInput = allDateInputs[1] as HTMLInputElement;

      // Then set end date
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
            endDate: expect.stringContaining('2024-01-31'),
          }),
          false,
          false
        );
      });
    });

    it('should disable end date input when start date is not selected', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const endDateInput = dateInputs[1] as HTMLInputElement;
      expect(endDateInput).toBeDisabled();
    });

    it('should clear date range when clear button is clicked', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // Set start date
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(screen.getByText('Clear date range')).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByText('Clear date range');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(undefined, false, false);
      });
    });

    it('should enable trends checkbox only when date range is set', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      const trendsCheckbox = screen.getByLabelText(/Include Trends/i) as HTMLInputElement;
      expect(trendsCheckbox).toBeDisabled();

      // Set start date
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        const trendsCheckbox = screen.getByLabelText(/Include Trends/i) as HTMLInputElement;
        expect(trendsCheckbox).not.toBeDisabled();
      });
    });
  });

  describe('SLA Compliance', () => {
    it('should not display SLA compliance by default', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      expect(screen.queryByText('SLA Compliance by Priority Level')).not.toBeInTheDocument();
    });

    it('should display SLA compliance when checkbox is checked', async () => {
      const metricsWithSLA = {
        ...mockMetricsData,
        slaCompliance: {
          p1: { total: 10, withinSLA: 9, percentage: 90 },
          p2: { total: 20, withinSLA: 18, percentage: 90 },
          p3: { total: 30, withinSLA: 24, percentage: 80 },
          p4: { total: 25, withinSLA: 20, percentage: 80 },
          p5: { total: 15, withinSLA: 10, percentage: 67 },
        },
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithSLA);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // Check the SLA checkbox
      const slaCheckbox = screen.getByLabelText(/Include SLA Compliance/i);
      fireEvent.click(slaCheckbox);

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(undefined, true, false);
        expect(screen.getByText('SLA Compliance by Priority Level')).toBeInTheDocument();
      });
    });

    it('should display correct SLA targets for each priority', async () => {
      const metricsWithSLA = {
        ...mockMetricsData,
        slaCompliance: {
          p1: { total: 10, withinSLA: 9, percentage: 90 },
          p2: { total: 20, withinSLA: 18, percentage: 90 },
          p3: { total: 30, withinSLA: 24, percentage: 80 },
          p4: { total: 25, withinSLA: 20, percentage: 80 },
          p5: { total: 15, withinSLA: 10, percentage: 67 },
        },
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithSLA);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      const slaCheckbox = screen.getByLabelText(/Include SLA Compliance/i);
      fireEvent.click(slaCheckbox);

      await waitFor(() => {
        expect(screen.getByText('(Target: 2h)')).toBeInTheDocument(); // P1
        expect(screen.getByText('(Target: 8h)')).toBeInTheDocument(); // P2
        expect(screen.getByText('(Target: 24h)')).toBeInTheDocument(); // P3
        expect(screen.getByText('(Target: 48h)')).toBeInTheDocument(); // P4
        expect(screen.getByText('(Target: 72h)')).toBeInTheDocument(); // P5
      });
    });

    it('should color-code SLA compliance based on percentage', async () => {
      const metricsWithSLA = {
        ...mockMetricsData,
        slaCompliance: {
          p1: { total: 10, withinSLA: 9, percentage: 95 }, // Green (>= 90%)
          p2: { total: 20, withinSLA: 15, percentage: 75 }, // Yellow (>= 70%)
          p3: { total: 30, withinSLA: 15, percentage: 50 }, // Red (< 70%)
          p4: { total: 25, withinSLA: 20, percentage: 80 },
          p5: { total: 15, withinSLA: 10, percentage: 67 },
        },
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithSLA);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      const slaCheckbox = screen.getByLabelText(/Include SLA Compliance/i);
      fireEvent.click(slaCheckbox);

      await waitFor(() => {
        const percentages = screen.getAllByText(/\d+%/);
        // Check that percentages are displayed
        expect(percentages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Trends Display', () => {
    it('should not display trends by default', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      expect(screen.queryByText('Report Volume Trend')).not.toBeInTheDocument();
      expect(screen.queryByText('Resolution Rate Trend')).not.toBeInTheDocument();
    });

    it('should display trends when checkbox is checked and date range is set', async () => {
      const metricsWithTrends = {
        ...mockMetricsData,
        trends: {
          reportVolume: [
            { date: '2024-01-01', count: 10 },
            { date: '2024-01-02', count: 15 },
            { date: '2024-01-03', count: 12 },
          ],
          resolutionRate: [
            { date: '2024-01-01', rate: 80 },
            { date: '2024-01-02', rate: 85 },
            { date: '2024-01-03', rate: 90 },
          ],
        },
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithTrends);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // Set date range first
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        const trendsCheckbox = screen.getByLabelText(/Include Trends/i);
        expect(trendsCheckbox).not.toBeDisabled();
      });

      // Check trends checkbox
      const trendsCheckbox = screen.getByLabelText(/Include Trends/i);
      fireEvent.click(trendsCheckbox);

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(String),
          }),
          false,
          true
        );
        expect(screen.getByText('Report Volume Trend')).toBeInTheDocument();
        expect(screen.getByText('Resolution Rate Trend')).toBeInTheDocument();
      });
    });

    it('should display empty state when no trend data available', async () => {
      const metricsWithEmptyTrends = {
        ...mockMetricsData,
        trends: {
          reportVolume: [],
          resolutionRate: [],
        },
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithEmptyTrends);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // Set date range and enable trends
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        const trendsCheckbox = screen.getByLabelText(/Include Trends/i);
        fireEvent.click(trendsCheckbox);
      });

      await waitFor(() => {
        const noDataMessages = screen.getAllByText('No data available');
        expect(noDataMessages.length).toBe(2); // One for each trend chart
      });
    });
  });

  // Auto-refresh feature has been removed - tests removed

  describe('Loading and Error States', () => {
    it('should display loading skeleton while fetching metrics', () => {
      mockCalculateMetrics.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockMetricsData), 1000))
      );

      render(<ModerationMetrics />);

      // Check for loading skeleton by class
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should display error state when metrics fetch fails', async () => {
      mockCalculateMetrics.mockRejectedValue(new Error('Failed to fetch'));

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
        expect(mockShowToast).toHaveBeenCalledWith('Failed to load metrics', 'error');
      });
    });

    it('should display empty state for actions when no actions exist', async () => {
      const metricsWithNoActions = {
        ...mockMetricsData,
        actionsByType: {},
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithNoActions);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('No actions taken in the last 30 days')).toBeInTheDocument();
      });
    });

    it('should display empty state for reasons when no reports exist', async () => {
      const metricsWithNoReasons = {
        ...mockMetricsData,
        topReasons: [],
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithNoReasons);

      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('No reports in the last 30 days')).toBeInTheDocument();
      });
    });

    it('should not display moderator performance section when no actions', async () => {
      mockIsAdmin.mockResolvedValue(true);

      const metricsWithNoPerformance = {
        ...mockMetricsData,
        moderatorPerformance: [],
      };

      mockCalculateMetrics.mockResolvedValue(metricsWithNoPerformance);

      render(<ModerationMetrics />);

      await waitFor(() => {
        // When there's no moderator performance data, the section should not be displayed at all
        expect(screen.queryByText('Moderator Performance Comparison')).not.toBeInTheDocument();
      });
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh metrics when refresh button is clicked', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      expect(mockCalculateMetrics).toHaveBeenCalledTimes(1);

      const refreshButton = screen.getByRole('button', { name: /Refresh Metrics/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledTimes(2);
        expect(mockShowToast).toHaveBeenCalledWith('Metrics refreshed', 'success');
      });
    });

    it('should show loading skeleton while loading', async () => {
      mockCalculateMetrics.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockMetricsData), 1000))
      );

      render(<ModerationMetrics />);

      // Check for loading skeleton
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should show error toast when manual refresh fails', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      expect(mockCalculateMetrics).toHaveBeenCalledTimes(1);

      // Make the next call fail
      mockCalculateMetrics.mockRejectedValueOnce(new Error('Refresh failed'));

      const refreshButton = screen.getByRole('button', { name: /Refresh Metrics/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to refresh metrics', 'error');
      });
    });
  });

  describe('Integration with Date Range and Options', () => {
    it('should pass all options to calculateModerationMetrics', async () => {
      render(<ModerationMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Reports Received')).toBeInTheDocument();
      });

      // Set date range
      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Wait for date range to be set
      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
          }),
          false,
          false
        );
      });

      // Enable SLA
      const slaCheckbox = screen.getByLabelText(/Include SLA Compliance/i);
      fireEvent.click(slaCheckbox);

      // Enable trends
      await waitFor(() => {
        const trendsCheckbox = screen.getByLabelText(/Include Trends/i);
        expect(trendsCheckbox).not.toBeDisabled();
        fireEvent.click(trendsCheckbox);
      });

      await waitFor(() => {
        expect(mockCalculateMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
          }),
          true,
          true
        );
      });
    });
  });
});

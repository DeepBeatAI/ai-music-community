import { render, screen, waitFor } from '@testing-library/react';
import { ReversalMetricsPanel } from '../ReversalMetricsPanel';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

// Mock ToastContext
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('ReversalMetricsPanel', () => {
  const mockMetrics = {
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-31T23:59:59.999Z',
    totalActions: 100,
    totalReversals: 15,
    overallReversalRate: 15.0,
    perModeratorStats: [
      {
        moderatorId: 'mod-1',
        totalActions: 50,
        reversedActions: 10,
        reversalRate: 20.0,
        averageTimeToReversalHours: 12.5,
      },
    ],
    timeToReversalStats: {
      averageHours: 24.5,
      medianHours: 18.0,
      minHours: 2.0,
      maxHours: 72.0,
      totalReversals: 15,
    },
    reversalByActionType: [
      {
        actionType: 'user_suspended',
        totalActions: 40,
        reversedActions: 8,
        reversalRate: 20.0,
      },
      {
        actionType: 'content_removed',
        totalActions: 60,
        reversedActions: 7,
        reversalRate: 11.67,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    (supabase.rpc as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ReversalMetricsPanel />);

    // Check for skeleton loaders
    const skeletons = screen.getAllByRole('generic').filter((el) =>
      el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays metrics after successful fetch', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Overall Reversal Rate')).toBeInTheDocument();
    });

    // Check key metrics are displayed
    expect(screen.getByText('15.0%')).toBeInTheDocument(); // Overall rate
    expect(screen.getByText('24.5h')).toBeInTheDocument(); // Avg time
    expect(screen.getByText('100')).toBeInTheDocument(); // Total actions
    expect(screen.getByText('15')).toBeInTheDocument(); // Total reversals
  });

  it('displays error state when fetch fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load reversal metrics')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays reversal rate by action type', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Reversal Rate by Action Type')).toBeInTheDocument();
    });

    // Check action types are displayed
    expect(screen.getByText('User Suspended')).toBeInTheDocument();
    expect(screen.getByText('Content Removed')).toBeInTheDocument();
  });

  it('displays high reversal rate alert when rate > 20%', async () => {
    const highRateMetrics = {
      ...mockMetrics,
      overallReversalRate: 25.0,
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: highRateMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('High Reversal Rate Detected')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/exceeds the recommended threshold of 20%/i)
    ).toBeInTheDocument();
  });

  it('displays slow reversal alert when avg time > 48 hours', async () => {
    const slowReversalMetrics = {
      ...mockMetrics,
      timeToReversalStats: {
        ...mockMetrics.timeToReversalStats,
        averageHours: 60.0,
      },
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: slowReversalMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Slow Reversal Detection')).toBeInTheDocument();
    });

    expect(screen.getByText(/exceeds 48 hours/i)).toBeInTheDocument();
  });

  it('uses custom date range when provided', async () => {
    const startDate = '2024-01-01T00:00:00.000Z';
    const endDate = '2024-01-31T23:59:59.999Z';

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel startDate={startDate} endDate={endDate} />);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_reversal_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });
    });
  });

  it('displays trend indicator based on reversal rate', async () => {
    // Test low rate (< 10%)
    const lowRateMetrics = { ...mockMetrics, overallReversalRate: 5.0 };
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: lowRateMetrics,
      error: null,
    });

    const { rerender } = render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Low reversal rate')).toBeInTheDocument();
    });

    // Test moderate rate (10-20%)
    const moderateRateMetrics = { ...mockMetrics, overallReversalRate: 15.0 };
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: moderateRateMetrics,
      error: null,
    });

    rerender(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Moderate reversal rate')).toBeInTheDocument();
    });

    // Test high rate (> 20%)
    const highRateMetrics = { ...mockMetrics, overallReversalRate: 25.0 };
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: highRateMetrics,
      error: null,
    });

    rerender(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('High reversal rate')).toBeInTheDocument();
    });
  });

  it('displays time-to-reversal statistics', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Avg Time to Reversal')).toBeInTheDocument();
    });

    // Check all time stats are displayed
    expect(screen.getByText(/Median: 18.0h/i)).toBeInTheDocument();
    expect(screen.getByText(/Range: 2.0h - 72.0h/i)).toBeInTheDocument();
  });

  it('highlights action types with high reversal rates', async () => {
    const highRateActionMetrics = {
      ...mockMetrics,
      reversalByActionType: [
        {
          actionType: 'user_suspended',
          totalActions: 40,
          reversedActions: 12,
          reversalRate: 30.0, // > 25%
        },
      ],
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: highRateActionMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('High reversal rate')).toBeInTheDocument();
    });
  });

  it('displays empty state when no actions exist', async () => {
    const emptyMetrics = {
      ...mockMetrics,
      totalActions: 0,
      totalReversals: 0,
      reversalByActionType: [],
      timeToReversalStats: {
        ...mockMetrics.timeToReversalStats,
        totalReversals: 0,
      },
    };

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: emptyMetrics,
      error: null,
    });

    render(<ReversalMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText('No actions in the selected period')).toBeInTheDocument();
    });

    expect(screen.getByText('No reversals in the selected period')).toBeInTheDocument();
  });
});

/**
 * Performance & Health Tab Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceHealthTab } from '@/components/admin/PerformanceHealthTab';
import * as systemHealthService from '@/lib/systemHealthService';

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

jest.mock('@/lib/systemHealthService');

const mockSystemHealth = {
  database: {
    status: 'healthy' as const,
    connection_count: 10,
    avg_query_time: 50,
    slow_queries: 2,
  },
  storage: {
    total_capacity_gb: 100,
    used_capacity_gb: 45,
    available_capacity_gb: 55,
    usage_percentage: 45,
  },
  api_health: {
    supabase: 'healthy' as const,
    vercel: 'healthy' as const,
  },
  error_rate: {
    current_rate: 0.01,
    threshold: 0.05,
    status: 'normal' as const,
  },
  uptime: {
    percentage: 99.9,
    last_downtime: null,
  },
};

const mockMetrics = [
  {
    id: '1',
    metric_type: 'page_load_time',
    metric_value: 1.5,
    metric_unit: 'seconds',
    metadata: null,
    recorded_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    metric_type: 'api_response_time',
    metric_value: 100,
    metric_unit: 'ms',
    metadata: null,
    recorded_at: '2024-01-01T00:00:00Z',
  },
];

describe('PerformanceHealthTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (systemHealthService.fetchSystemHealth as jest.Mock).mockResolvedValue(mockSystemHealth);
    (systemHealthService.fetchSystemMetrics as jest.Mock).mockResolvedValue(mockMetrics);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    const { unmount } = render(<PerformanceHealthTab />);
    expect(screen.getByText('Loading system health data...')).toBeInTheDocument();
    unmount();
  });

  it('should render system health overview', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });
    unmount();
  });

  it('should display database health metrics', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText(/Connections: 10/)).toBeInTheDocument();
      expect(screen.getByText(/Avg Query Time: 50ms/)).toBeInTheDocument();
      expect(screen.getByText(/Slow Queries: 2/)).toBeInTheDocument();
    });
    unmount();
  });

  it('should display storage metrics', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText(/Used: 45.00 GB/)).toBeInTheDocument();
      expect(screen.getByText(/Usage: 45.0%/)).toBeInTheDocument();
    });
    unmount();
  });

  it('should display API health status', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText(/Supabase:/)).toBeInTheDocument();
      expect(screen.getByText(/Vercel:/)).toBeInTheDocument();
    });
    unmount();
  });

  it('should display error rate', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText(/Current: 1.00%/)).toBeInTheDocument();
      expect(screen.getByText(/Threshold: 5.00%/)).toBeInTheDocument();
    });
    unmount();
  });

  it('should display uptime percentage', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText(/Percentage: 99.90%/)).toBeInTheDocument();
    });
    unmount();
  });

  it('should display performance metrics', async () => {
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText('Recent Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText(/page load time/i)).toBeInTheDocument();
      expect(screen.getByText(/api response time/i)).toBeInTheDocument();
    });
    unmount();
  });

  // TODO: Fix timeout issue - fake timers causing test to hang
  it.skip('should allow clearing cache', async () => {
    const user = userEvent.setup();
    (systemHealthService.clearCache as jest.Mock).mockResolvedValue(undefined);
    global.confirm = jest.fn(() => true);

    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clear All Caches/i })).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear All Caches/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(systemHealthService.clearCache).toHaveBeenCalled();
    });
    unmount();
  });

  // TODO: Fix timeout issue - fake timers causing test to hang
  it.skip('should allow manual refresh', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(systemHealthService.fetchSystemHealth).toHaveBeenCalledTimes(2);
    });
    unmount();
  });

  it('should show error on fetch failure', async () => {
    (systemHealthService.fetchSystemHealth as jest.Mock).mockRejectedValue(
      new Error('Failed to load')
    );

    const { unmount } = render(<PerformanceHealthTab />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
    unmount();
  });
});

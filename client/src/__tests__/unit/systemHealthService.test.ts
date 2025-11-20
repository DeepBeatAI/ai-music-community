/**
 * Minimal System Health Service Test
 */

import { supabase } from '@/lib/supabase';
import { fetchSystemMetrics } from '@/lib/systemHealthService';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/utils/adminCache', () => ({
  ADMIN_CACHE_KEYS: {
    SYSTEM_METRICS: jest.fn((type) => `metrics_${type || 'all'}`),
  },
  ADMIN_CACHE_TTL: {
    SYSTEM_METRICS: 60000,
  },
  cachedFetch: jest.fn((key, ttl, fn) => fn()),
}));

describe('System Health Service - Minimal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should fetch system metrics', async () => {
    const mockMetrics = [
      {
        id: '1',
        metric_type: 'page_load_time',
        metric_value: 1500,
        metric_unit: 'ms',
        recorded_at: '2024-01-01T00:00:00Z',
      },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockMetrics,
        error: null,
      }),
    });

    const result = await fetchSystemMetrics();

    expect(result).toEqual(mockMetrics);
    expect(supabase.from).toHaveBeenCalledWith('system_metrics');
  });
});

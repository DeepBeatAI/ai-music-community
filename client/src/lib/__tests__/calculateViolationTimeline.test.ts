/**
 * Unit Tests for Violation Timeline Calculation
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the calculateViolationTimeline function which calculates
 * the number of violations a user has received in different timeframes:
 * last 7 days, last 30 days, and last 90 days.
 * 
 * Requirements: 6.4
 */

import { calculateViolationTimeline } from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('calculateViolationTimeline - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test with violations in different timeframes
   * Should return correct counts for each timeframe
   */
  test('should return correct counts for violations in different timeframes', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const actions = [
      // 2 violations in last 7 days
      { id: '1', created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
      // 1 violation between 7-30 days
      { id: '3', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
      // 1 violation between 30-90 days
      { id: '4', created_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(2);
    expect(result?.last30Days).toBe(3); // 2 + 1
    expect(result?.last90Days).toBe(4); // 2 + 1 + 1
    expect(result?.message).toBe('2 violations in last 7 days');
  });

  /**
   * Test with no violations
   * Should return all zeros and null message
   */
  test('should return zeros and null message when user has no violations', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return no actions
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(0);
    expect(result?.last30Days).toBe(0);
    expect(result?.last90Days).toBe(0);
    expect(result?.message).toBeNull();
  });

  /**
   * Test with violations only in 90-day window
   * Should show message for 90 days
   */
  test('should show 90-day message when violations only in 90-day window', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const actions = [
      // 2 violations between 30-90 days
      { id: '1', created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 75 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(0);
    expect(result?.last30Days).toBe(0);
    expect(result?.last90Days).toBe(2);
    expect(result?.message).toBe('2 violations in last 90 days');
  });

  /**
   * Test edge case: exactly 7 days ago
   * Should be included in 7-day count
   */
  test('should include violation exactly 7 days ago in 7-day count', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const exactlySevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const actions = [
      { id: '1', created_at: exactlySevenDaysAgo },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(1);
    expect(result?.last30Days).toBe(1);
    expect(result?.last90Days).toBe(1);
    expect(result?.message).toBe('1 violation in last 7 days');
  });

  /**
   * Test edge case: exactly 30 days ago
   * Should be included in 30-day count but not 7-day count
   */
  test('should include violation exactly 30 days ago in 30-day count', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const exactlyThirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const actions = [
      { id: '1', created_at: exactlyThirtyDaysAgo },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(0);
    expect(result?.last30Days).toBe(1);
    expect(result?.last90Days).toBe(1);
    expect(result?.message).toBe('1 violation in last 30 days');
  });

  /**
   * Test edge case: exactly 90 days ago
   * Should be included in 90-day count
   */
  test('should include violation exactly 90 days ago in 90-day count', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const exactlyNinetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    const actions = [
      { id: '1', created_at: exactlyNinetyDaysAgo },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(0);
    expect(result?.last30Days).toBe(0);
    expect(result?.last90Days).toBe(1);
    expect(result?.message).toBe('1 violation in last 90 days');
  });

  /**
   * Test message priority: 7 days > 30 days > 90 days
   * Should show 30-day message when no 7-day violations
   */
  test('should show 30-day message when no 7-day violations but has 30-day violations', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const actions = [
      // 2 violations between 7-30 days
      { id: '1', created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.last7Days).toBe(0);
    expect(result?.last30Days).toBe(2);
    expect(result?.last90Days).toBe(2);
    expect(result?.message).toBe('2 violations in last 30 days');
  });

  /**
   * Test singular vs plural message formatting
   * Should use "violation" (singular) for 1 violation
   */
  test('should use singular "violation" for 1 violation', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const now = Date.now();
    const actions = [
      { id: '1', created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    // Mock the Supabase query
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: actions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await calculateViolationTimeline(userId);

    expect(result).not.toBeNull();
    expect(result?.message).toBe('1 violation in last 7 days');
  });

  /**
   * Test with null user ID
   * Should return null
   */
  test('should return null when user ID is null', async () => {
    const result = await calculateViolationTimeline(null as any);

    expect(result).toBeNull();
  });

  /**
   * Test with empty string user ID
   * Should return null
   */
  test('should return null when user ID is empty string', async () => {
    const result = await calculateViolationTimeline('');

    expect(result).toBeNull();
  });

  /**
   * Test with invalid UUID format
   * Should throw ModerationError
   */
  test('should throw ModerationError when user ID is invalid UUID format', async () => {
    const invalidUserId = 'not-a-valid-uuid';

    await expect(calculateViolationTimeline(invalidUserId)).rejects.toThrow('Invalid user ID format');
  });

  /**
   * Test database error handling
   * Should throw ModerationError with database error code
   */
  test('should throw ModerationError when database query fails', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return an error
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      }),
    } as any);

    await expect(calculateViolationTimeline(userId)).rejects.toThrow('Failed to calculate violation timeline');
  });

  /**
   * Test that the function queries the correct date range
   * Should query for actions >= 90 days ago
   */
  test('should query for actions within the last 90 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockGte = jest.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: mockGte,
        }),
      }),
    } as any);

    await calculateViolationTimeline(userId);

    // Verify that gte was called with a date parameter
    expect(mockGte).toHaveBeenCalled();
    const gteCall = mockGte.mock.calls[0];
    expect(gteCall[0]).toBe('created_at');
    
    // Verify the date is approximately 90 days ago (within 1 minute tolerance)
    const providedDate = new Date(gteCall[1]);
    const expectedDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(providedDate.getTime() - expectedDate.getTime());
    expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute
  });

  /**
   * Test that results are ordered by created_at descending
   * Should call order with correct parameters
   */
  test('should order results by created_at descending', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      }),
    } as any);

    await calculateViolationTimeline(userId);

    // Verify that order was called with correct parameters
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

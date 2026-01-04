/**
 * Integration Tests for Repeat Offender Detection Functions
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the integration of repeat offender detection and
 * violation timeline calculation functions.
 * 
 * Requirements: 6.2, 6.4
 */

import { detectRepeatOffender, calculateViolationTimeline } from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Repeat Offender Detection - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: detectRepeatOffender and calculateViolationTimeline work together
   * Should correctly identify repeat offenders and provide timeline context
   */
  test('should identify repeat offender with timeline context', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const now = Date.now();

    // Mock 5 violations in last 30 days (3 in last 7 days)
    const mockActions = [
      { id: '1', created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '3', created_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '4', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '5', created_at: new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    
    // First call: detectRepeatOffender (no order method)
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: mockActions,
            error: null,
          }),
        }),
      }),
    } as any);
    
    // Second call: calculateViolationTimeline (has order method)
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockActions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    // Call both functions
    const isRepeatOffender = await detectRepeatOffender(userId);
    const timeline = await calculateViolationTimeline(userId);

    // Verify repeat offender detection
    expect(isRepeatOffender).toBe(true); // 5 violations >= 3

    // Verify timeline calculation
    expect(timeline).not.toBeNull();
    expect(timeline?.last7Days).toBe(3);
    expect(timeline?.last30Days).toBe(5);
    expect(timeline?.last90Days).toBe(5);
    expect(timeline?.message).toBe('3 violations in last 7 days');
  });

  /**
   * Test: Non-repeat offender with timeline
   * Should correctly identify non-repeat offender with accurate timeline
   */
  test('should identify non-repeat offender with timeline context', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const now = Date.now();

    // Mock 2 violations in last 30 days (not a repeat offender)
    const mockActions = [
      { id: '1', created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockActions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    // Call both functions
    const isRepeatOffender = await detectRepeatOffender(userId);
    const timeline = await calculateViolationTimeline(userId);

    // Verify not a repeat offender
    expect(isRepeatOffender).toBe(false); // 2 violations < 3

    // Verify timeline calculation
    expect(timeline).not.toBeNull();
    expect(timeline?.last7Days).toBe(0);
    expect(timeline?.last30Days).toBe(2);
    expect(timeline?.last90Days).toBe(2);
    expect(timeline?.message).toBe('2 violations in last 30 days');
  });

  /**
   * Test: Edge case - exactly 3 violations (threshold)
   * Should identify as repeat offender at threshold
   */
  test('should identify repeat offender at exactly 3 violations', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const now = Date.now();

    // Mock exactly 3 violations in last 30 days
    const mockActions = [
      { id: '1', created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '3', created_at: new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    
    // First call: detectRepeatOffender (no order method)
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: mockActions,
            error: null,
          }),
        }),
      }),
    } as any);
    
    // Second call: calculateViolationTimeline (has order method)
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockActions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    // Call both functions
    const isRepeatOffender = await detectRepeatOffender(userId);
    const timeline = await calculateViolationTimeline(userId);

    // Verify repeat offender at threshold
    expect(isRepeatOffender).toBe(true); // 3 violations >= 3

    // Verify timeline calculation
    expect(timeline).not.toBeNull();
    expect(timeline?.last7Days).toBe(1);
    expect(timeline?.last30Days).toBe(3);
    expect(timeline?.last90Days).toBe(3);
    expect(timeline?.message).toBe('1 violation in last 7 days');
  });

  /**
   * Test: No violations
   * Should handle users with no violation history
   */
  test('should handle users with no violations', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

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

    // Call both functions
    const isRepeatOffender = await detectRepeatOffender(userId);
    const timeline = await calculateViolationTimeline(userId);

    // Verify not a repeat offender
    expect(isRepeatOffender).toBe(false);

    // Verify timeline calculation
    expect(timeline).not.toBeNull();
    expect(timeline?.last7Days).toBe(0);
    expect(timeline?.last30Days).toBe(0);
    expect(timeline?.last90Days).toBe(0);
    expect(timeline?.message).toBeNull();
  });

  /**
   * Test: Timeline message priority
   * Should display most relevant timeframe message
   */
  test('should prioritize 7-day message over 30-day and 90-day', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const now = Date.now();

    // Mock violations across all timeframes
    const mockActions = [
      { id: '1', created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() }, // 7 days
      { id: '2', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() }, // 30 days
      { id: '3', created_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString() }, // 90 days
    ];

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockActions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const timeline = await calculateViolationTimeline(userId);

    // Verify 7-day message is prioritized
    expect(timeline?.message).toBe('1 violation in last 7 days');
  });

  /**
   * Test: Error handling consistency
   * Both functions should handle errors consistently
   */
  test('should handle database errors consistently', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    
    // First call for detectRepeatOffender
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    } as any);
    
    // Second call for calculateViolationTimeline
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    } as any);

    // Both functions should throw errors
    await expect(detectRepeatOffender(userId)).rejects.toThrow();
    await expect(calculateViolationTimeline(userId)).rejects.toThrow();
  });

  /**
   * Test: Invalid input handling
   * Both functions should handle invalid inputs consistently
   */
  test('should handle invalid inputs consistently', async () => {
    // Test with invalid UUID
    await expect(detectRepeatOffender('invalid-uuid')).rejects.toThrow('Invalid user ID format');
    await expect(calculateViolationTimeline('invalid-uuid')).rejects.toThrow('Invalid user ID format');

    // Test with null/empty
    expect(await detectRepeatOffender(null as any)).toBe(false);
    expect(await calculateViolationTimeline(null as any)).toBeNull();

    expect(await detectRepeatOffender('')).toBe(false);
    expect(await calculateViolationTimeline('')).toBeNull();
  });
});

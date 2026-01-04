/**
 * Unit Tests for Repeat Offender Detection
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the detectRepeatOffender function which checks if a user
 * has 3 or more violations (moderation actions) in the last 30 days.
 * 
 * Requirements: 6.2
 */

import { detectRepeatOffender } from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('detectRepeatOffender - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test with 0 violations in 30 days
   * Should return false (not a repeat offender)
   */
  test('should return false when user has 0 violations in 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return no actions
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith('moderation_actions');
  });

  /**
   * Test with 1 violation in 30 days
   * Should return false (not a repeat offender)
   */
  test('should return false when user has 1 violation in 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return 1 action
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [{ id: '1' }],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(false);
  });

  /**
   * Test with 2 violations in 30 days
   * Should return false (not a repeat offender)
   */
  test('should return false when user has 2 violations in 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return 2 actions
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [{ id: '1' }, { id: '2' }],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(false);
  });

  /**
   * Test with 3 violations in 30 days
   * Should return true (is a repeat offender)
   */
  test('should return true when user has 3 violations in 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return 3 actions
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [{ id: '1' }, { id: '2' }, { id: '3' }],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(true);
  });

  /**
   * Test with 5 violations in 30 days
   * Should return true (is a repeat offender)
   */
  test('should return true when user has 5 violations in 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return 5 actions
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [
              { id: '1' },
              { id: '2' },
              { id: '3' },
              { id: '4' },
              { id: '5' },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(true);
  });

  /**
   * Test with violations outside 30-day window
   * Should return false (violations are too old)
   */
  test('should return false when violations are outside 30-day window', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock the Supabase query to return no actions (because they're filtered by date)
    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [], // No actions within 30 days
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await detectRepeatOffender(userId);

    expect(result).toBe(false);
  });

  /**
   * Test with null user ID
   * Should return false (invalid input)
   */
  test('should return false when user ID is null', async () => {
    const result = await detectRepeatOffender(null as any);

    expect(result).toBe(false);
  });

  /**
   * Test with empty string user ID
   * Should return false (invalid input)
   */
  test('should return false when user ID is empty string', async () => {
    const result = await detectRepeatOffender('');

    expect(result).toBe(false);
  });

  /**
   * Test with invalid UUID format
   * Should throw ModerationError
   */
  test('should throw ModerationError when user ID is invalid UUID format', async () => {
    const invalidUserId = 'not-a-valid-uuid';

    await expect(detectRepeatOffender(invalidUserId)).rejects.toThrow('Invalid user ID format');
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
          gte: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      }),
    } as any);

    await expect(detectRepeatOffender(userId)).rejects.toThrow('Failed to check repeat offender status');
  });

  /**
   * Test that the function queries the correct date range
   * Should query for actions >= 30 days ago
   */
  test('should query for actions within the last 30 days', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockGte = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: mockGte,
        }),
      }),
    } as any);

    await detectRepeatOffender(userId);

    // Verify that gte was called with a date parameter
    expect(mockGte).toHaveBeenCalled();
    const gteCall = mockGte.mock.calls[0];
    expect(gteCall[0]).toBe('created_at');
    
    // Verify the date is approximately 30 days ago (within 1 minute tolerance)
    const providedDate = new Date(gteCall[1]);
    const expectedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(providedDate.getTime() - expectedDate.getTime());
    expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute
  });
});

/**
 * Tests for getUserSuspensionStatus helper function
 * Requirements: 13.1, 13.3
 */

import { getUserSuspensionStatus } from '../moderationService';
import { supabase } from '../supabase';
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('getUserSuspensionStatus', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return not suspended when user has no suspension', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              suspended_until: null,
              suspension_reason: null,
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserSuspensionStatus(mockUserId);

    expect(result).toEqual({
      isSuspended: false,
      suspendedUntil: null,
      suspensionReason: null,
      isPermanent: false,
      daysRemaining: null,
    });
  });

  it('should return suspended with days remaining for temporary suspension', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              suspended_until: futureDate.toISOString(),
              suspension_reason: 'Spam posting',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserSuspensionStatus(mockUserId);

    expect(result.isSuspended).toBe(true);
    expect(result.suspendedUntil).toBe(futureDate.toISOString());
    expect(result.suspensionReason).toBe('Spam posting');
    expect(result.isPermanent).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(7);
  });

  it('should return permanent ban for far future suspension date', async () => {
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 100); // 100 years from now

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              suspended_until: farFutureDate.toISOString(),
              suspension_reason: 'Permanent ban for severe violations',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserSuspensionStatus(mockUserId);

    expect(result.isSuspended).toBe(true);
    expect(result.suspendedUntil).toBe(farFutureDate.toISOString());
    expect(result.suspensionReason).toBe('Permanent ban for severe violations');
    expect(result.isPermanent).toBe(true);
    expect(result.daysRemaining).toBeNull();
  });

  it('should return not suspended for expired suspension', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              suspended_until: pastDate.toISOString(),
              suspension_reason: 'Previous violation',
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const result = await getUserSuspensionStatus(mockUserId);

    expect(result.isSuspended).toBe(false);
    expect(result.suspendedUntil).toBe(pastDate.toISOString());
    expect(result.suspensionReason).toBe('Previous violation');
    expect(result.isPermanent).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  it('should throw validation error for invalid user ID', async () => {
    await expect(getUserSuspensionStatus('invalid-uuid')).rejects.toThrow(ModerationError);
    await expect(getUserSuspensionStatus('invalid-uuid')).rejects.toMatchObject({
      code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
    });
  });

  it('should handle database errors gracefully', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: 'PGRST000' },
          }),
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    await expect(getUserSuspensionStatus(mockUserId)).rejects.toThrow(ModerationError);
    await expect(getUserSuspensionStatus(mockUserId)).rejects.toMatchObject({
      code: MODERATION_ERROR_CODES.DATABASE_ERROR,
    });
  });
});

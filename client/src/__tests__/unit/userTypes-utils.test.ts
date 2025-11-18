/**
 * User Types Utility Functions Test Suite
 * 
 * Tests the utility functions for user types, plan tiers, and roles
 * Requirements: 6.1, 6.4, 6.5
 */

import {
  getUserTypeInfo,
  hasRole,
  hasPlanTier,
  isAdmin,
  formatUserTypesForDisplay,
} from '@/utils/userTypes';
import {
  PlanTier,
  RoleType,
  UserTypeError,
  USER_TYPE_ERROR_CODES,
  PLAN_TIER_DISPLAY_NAMES,
  ROLE_TYPE_DISPLAY_NAMES,
  PLAN_TIER_BADGE_STYLES,
  ROLE_TYPE_BADGE_STYLES,
} from '@/types/userTypes';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('User Types Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserTypeInfo()', () => {
    const mockUserId = 'test-user-123';

    test('should fetch user with free tier and no roles', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'free_user' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        planTier: PlanTier.FREE_USER,
        roles: [],
        isAdmin: false,
        displayTypes: ['Free User'],
      });
    });


    test('should fetch user with creator pro tier and moderator role', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'creator_pro' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        planTier: PlanTier.CREATOR_PRO,
        roles: [RoleType.MODERATOR],
        isAdmin: false,
        displayTypes: ['Creator Pro', 'Moderator'],
      });
    });

    test('should fetch user with creator premium tier and multiple roles', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'creator_premium' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { role_type: 'moderator' },
                    { role_type: 'tester' },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        planTier: PlanTier.CREATOR_PREMIUM,
        roles: [RoleType.MODERATOR, RoleType.TESTER],
        isAdmin: false,
        displayTypes: ['Creator Premium', 'Moderator', 'Tester'],
      });
    });


    test('should identify admin users correctly', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'free_user' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'admin' }],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result.isAdmin).toBe(true);
      expect(result.roles).toContain(RoleType.ADMIN);
      expect(result.displayTypes).toContain('Admin');
    });

    test('should default to free_user when no plan tier found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }, // No rows returned
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result.planTier).toBe(PlanTier.FREE_USER);
      expect(result.displayTypes).toContain('Free User');
    });


    test('should throw UserTypeError when plan tier fetch fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom());

      await expect(getUserTypeInfo(mockUserId)).rejects.toThrow(UserTypeError);
      await expect(getUserTypeInfo(mockUserId)).rejects.toThrow('Failed to fetch user plan tier');
    });

    test('should throw UserTypeError when roles fetch fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'free_user' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
                }),
              }),
            }),
          };
        }
      });

      await expect(getUserTypeInfo(mockUserId)).rejects.toThrow(UserTypeError);
      await expect(getUserTypeInfo(mockUserId)).rejects.toThrow('Failed to fetch user roles');
    });

    test('should handle empty roles array', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_tier: 'creator_premium' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_plan_tiers') {
          return mockFrom();
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await getUserTypeInfo(mockUserId);

      expect(result.roles).toEqual([]);
      expect(result.isAdmin).toBe(false);
    });
  });


  describe('hasRole()', () => {
    const mockUserId = 'test-user-123';

    test('should return true when user has the specified role', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'role-id-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasRole(mockUserId, RoleType.MODERATOR);

      expect(result).toBe(true);
    });

    test('should return false when user does not have the specified role', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasRole(mockUserId, RoleType.ADMIN);

      expect(result).toBe(false);
    });

    test('should throw UserTypeError when database query fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(hasRole(mockUserId, RoleType.TESTER)).rejects.toThrow(UserTypeError);
      await expect(hasRole(mockUserId, RoleType.TESTER)).rejects.toThrow(
        'Failed to check if user has role: tester'
      );
    });

    test('should check for admin role correctly', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'admin-role-id' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasRole(mockUserId, RoleType.ADMIN);

      expect(result).toBe(true);
    });
  });


  describe('hasPlanTier()', () => {
    const mockUserId = 'test-user-123';

    test('should return true when user has the specified plan tier', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'plan-id-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasPlanTier(mockUserId, PlanTier.CREATOR_PRO);

      expect(result).toBe(true);
    });

    test('should return false when user does not have the specified plan tier', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasPlanTier(mockUserId, PlanTier.CREATOR_PREMIUM);

      expect(result).toBe(false);
    });

    test('should throw UserTypeError when database query fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(hasPlanTier(mockUserId, PlanTier.FREE_USER)).rejects.toThrow(UserTypeError);
      await expect(hasPlanTier(mockUserId, PlanTier.FREE_USER)).rejects.toThrow(
        'Failed to check if user has plan tier: free_user'
      );
    });

    test('should check for free user tier correctly', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'free-tier-id' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await hasPlanTier(mockUserId, PlanTier.FREE_USER);

      expect(result).toBe(true);
    });
  });


  describe('isAdmin()', () => {
    const mockUserId = 'test-user-123';

    test('should return true when user has admin role', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'admin-role-id' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await isAdmin(mockUserId);

      expect(result).toBe(true);
    });

    test('should return false when user does not have admin role', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await isAdmin(mockUserId);

      expect(result).toBe(false);
    });

    test('should throw UserTypeError when check fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(isAdmin(mockUserId)).rejects.toThrow(UserTypeError);
    });
  });


  describe('formatUserTypesForDisplay()', () => {
    test('should format free user with no roles', () => {
      const result = formatUserTypesForDisplay(PlanTier.FREE_USER);

      expect(result).toEqual(['Free User']);
    });

    test('should format creator pro with no roles', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PRO);

      expect(result).toEqual(['Creator Pro']);
    });

    test('should format creator premium with no roles', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PREMIUM);

      expect(result).toEqual(['Creator Premium']);
    });

    test('should format free user with admin role', () => {
      const result = formatUserTypesForDisplay(PlanTier.FREE_USER, [RoleType.ADMIN]);

      expect(result).toEqual(['Free User', 'Admin']);
    });

    test('should format creator pro with moderator role', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PRO, [RoleType.MODERATOR]);

      expect(result).toEqual(['Creator Pro', 'Moderator']);
    });

    test('should format creator premium with tester role', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PREMIUM, [RoleType.TESTER]);

      expect(result).toEqual(['Creator Premium', 'Tester']);
    });

    test('should format user with multiple roles', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PRO, [
        RoleType.MODERATOR,
        RoleType.TESTER,
      ]);

      expect(result).toEqual(['Creator Pro', 'Moderator', 'Tester']);
    });

    test('should format user with all roles', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PREMIUM, [
        RoleType.ADMIN,
        RoleType.MODERATOR,
        RoleType.TESTER,
      ]);

      expect(result).toEqual(['Creator Premium', 'Admin', 'Moderator', 'Tester']);
    });

    test('should handle empty roles array', () => {
      const result = formatUserTypesForDisplay(PlanTier.FREE_USER, []);

      expect(result).toEqual(['Free User']);
    });

    test('should maintain order with plan tier first', () => {
      const result = formatUserTypesForDisplay(PlanTier.CREATOR_PRO, [
        RoleType.TESTER,
        RoleType.ADMIN,
      ]);

      expect(result[0]).toBe('Creator Pro');
      expect(result).toContain('Admin');
      expect(result).toContain('Tester');
    });
  });


  describe('Badge Style Selection', () => {
    test('should have correct badge styles for free user', () => {
      const style = PLAN_TIER_BADGE_STYLES[PlanTier.FREE_USER];

      expect(style).toBe('bg-gray-700 text-gray-300 border-gray-600');
    });

    test('should have correct badge styles for creator pro', () => {
      const style = PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PRO];

      expect(style).toBe('bg-yellow-700 text-yellow-200 border-yellow-600');
    });

    test('should have correct badge styles for creator premium', () => {
      const style = PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PREMIUM];

      expect(style).toBe('bg-blue-700 text-blue-200 border-blue-600');
    });

    test('should have correct badge styles for admin role', () => {
      const style = ROLE_TYPE_BADGE_STYLES[RoleType.ADMIN];

      expect(style).toBe('bg-red-700 text-red-200 border-red-600');
    });

    test('should have correct badge styles for moderator role', () => {
      const style = ROLE_TYPE_BADGE_STYLES[RoleType.MODERATOR];

      expect(style).toBe('bg-purple-700 text-purple-200 border-purple-600');
    });

    test('should have correct badge styles for tester role', () => {
      const style = ROLE_TYPE_BADGE_STYLES[RoleType.TESTER];

      expect(style).toBe('bg-green-700 text-green-200 border-green-600');
    });

    test('should have all plan tier badge styles defined', () => {
      expect(PLAN_TIER_BADGE_STYLES[PlanTier.FREE_USER]).toBeDefined();
      expect(PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PRO]).toBeDefined();
      expect(PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PREMIUM]).toBeDefined();
    });

    test('should have all role badge styles defined', () => {
      expect(ROLE_TYPE_BADGE_STYLES[RoleType.ADMIN]).toBeDefined();
      expect(ROLE_TYPE_BADGE_STYLES[RoleType.MODERATOR]).toBeDefined();
      expect(ROLE_TYPE_BADGE_STYLES[RoleType.TESTER]).toBeDefined();
    });

    test('should have distinct colors for each plan tier', () => {
      const freeStyle = PLAN_TIER_BADGE_STYLES[PlanTier.FREE_USER];
      const proStyle = PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PRO];
      const premiumStyle = PLAN_TIER_BADGE_STYLES[PlanTier.CREATOR_PREMIUM];

      expect(freeStyle).not.toBe(proStyle);
      expect(freeStyle).not.toBe(premiumStyle);
      expect(proStyle).not.toBe(premiumStyle);
    });

    test('should have distinct colors for each role', () => {
      const adminStyle = ROLE_TYPE_BADGE_STYLES[RoleType.ADMIN];
      const modStyle = ROLE_TYPE_BADGE_STYLES[RoleType.MODERATOR];
      const testerStyle = ROLE_TYPE_BADGE_STYLES[RoleType.TESTER];

      expect(adminStyle).not.toBe(modStyle);
      expect(adminStyle).not.toBe(testerStyle);
      expect(modStyle).not.toBe(testerStyle);
    });
  });


  describe('Display Name Formatting', () => {
    test('should have correct display name for free user', () => {
      const name = PLAN_TIER_DISPLAY_NAMES[PlanTier.FREE_USER];

      expect(name).toBe('Free User');
    });

    test('should have correct display name for creator pro', () => {
      const name = PLAN_TIER_DISPLAY_NAMES[PlanTier.CREATOR_PRO];

      expect(name).toBe('Creator Pro');
    });

    test('should have correct display name for creator premium', () => {
      const name = PLAN_TIER_DISPLAY_NAMES[PlanTier.CREATOR_PREMIUM];

      expect(name).toBe('Creator Premium');
    });

    test('should have correct display name for admin role', () => {
      const name = ROLE_TYPE_DISPLAY_NAMES[RoleType.ADMIN];

      expect(name).toBe('Admin');
    });

    test('should have correct display name for moderator role', () => {
      const name = ROLE_TYPE_DISPLAY_NAMES[RoleType.MODERATOR];

      expect(name).toBe('Moderator');
    });

    test('should have correct display name for tester role', () => {
      const name = ROLE_TYPE_DISPLAY_NAMES[RoleType.TESTER];

      expect(name).toBe('Tester');
    });

    test('should have all plan tier display names defined', () => {
      expect(PLAN_TIER_DISPLAY_NAMES[PlanTier.FREE_USER]).toBeDefined();
      expect(PLAN_TIER_DISPLAY_NAMES[PlanTier.CREATOR_PRO]).toBeDefined();
      expect(PLAN_TIER_DISPLAY_NAMES[PlanTier.CREATOR_PREMIUM]).toBeDefined();
    });

    test('should have all role display names defined', () => {
      expect(ROLE_TYPE_DISPLAY_NAMES[RoleType.ADMIN]).toBeDefined();
      expect(ROLE_TYPE_DISPLAY_NAMES[RoleType.MODERATOR]).toBeDefined();
      expect(ROLE_TYPE_DISPLAY_NAMES[RoleType.TESTER]).toBeDefined();
    });

    test('should use proper capitalization for display names', () => {
      Object.values(PLAN_TIER_DISPLAY_NAMES).forEach(name => {
        expect(name[0]).toBe(name[0].toUpperCase());
      });

      Object.values(ROLE_TYPE_DISPLAY_NAMES).forEach(name => {
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });

    test('should not have trailing or leading spaces in display names', () => {
      Object.values(PLAN_TIER_DISPLAY_NAMES).forEach(name => {
        expect(name).toBe(name.trim());
      });

      Object.values(ROLE_TYPE_DISPLAY_NAMES).forEach(name => {
        expect(name).toBe(name.trim());
      });
    });
  });


  describe('Error Handling', () => {
    test('should throw UserTypeError with correct error code for database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
              }),
            }),
          }),
        }),
      });

      try {
        await getUserTypeInfo('test-user');
        fail('Should have thrown UserTypeError');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
        expect((error as UserTypeError).code).toBe(USER_TYPE_ERROR_CODES.DATABASE_ERROR);
      }
    });

    test('should include original error in UserTypeError details', async () => {
      const originalError = { code: 'DATABASE_ERROR', message: 'Connection failed' };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: originalError,
              }),
            }),
          }),
        }),
      });

      try {
        await getUserTypeInfo('test-user');
        fail('Should have thrown UserTypeError');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
        expect((error as UserTypeError).details?.originalError).toEqual(originalError);
      }
    });

    test('should have descriptive error messages', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'ERROR' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(hasRole('user-id', RoleType.ADMIN)).rejects.toThrow(
        'Failed to check if user has role: admin'
      );

      await expect(hasPlanTier('user-id', PlanTier.FREE_USER)).rejects.toThrow(
        'Failed to check if user has plan tier: free_user'
      );
    });

    test('should wrap unexpected errors in UserTypeError', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      try {
        await getUserTypeInfo('test-user');
        fail('Should have thrown UserTypeError');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
        expect((error as UserTypeError).message).toContain('Unexpected error');
      }
    });

    test('should preserve UserTypeError when re-throwing', async () => {
      const customError = new UserTypeError(
        'Custom error',
        USER_TYPE_ERROR_CODES.NOT_FOUND,
        { custom: 'data' }
      );

      (supabase.from as jest.Mock).mockImplementation(() => {
        throw customError;
      });

      try {
        await getUserTypeInfo('test-user');
        fail('Should have thrown UserTypeError');
      } catch (error) {
        expect(error).toBe(customError);
        expect((error as UserTypeError).code).toBe(USER_TYPE_ERROR_CODES.NOT_FOUND);
        expect((error as UserTypeError).details).toEqual({ custom: 'data' });
      }
    });
  });
});

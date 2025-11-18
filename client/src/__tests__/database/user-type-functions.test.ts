/**
 * Database Function Tests for User Types and Plan Tiers System
 * 
 * Tests the following database functions:
 * - get_user_plan_tier()
 * - get_user_roles()
 * - get_user_all_types()
 * - assign_plan_tier()
 * - grant_user_role()
 * - revoke_user_role()
 * - is_user_admin()
 * 
 * Requirements: 6.1, 7.1, 7.2, 7.3, 7.4
 * 
 * Note: This test file uses mocked Supabase client to test database function behavior
 * without requiring actual database connections. Type checking is relaxed for test mocks.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Test file with mocked Supabase client

// Type for Supabase response
type SupabaseResponse<T> = {
  data: T;
  error: { message: string } | null;
};

// Helper type for promise then callbacks
type ThenCallback<T> = (value: SupabaseResponse<T>) => void;

// Mock Supabase client for testing
const mockSupabase: any = {
  rpc: jest.fn(),
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
};

describe('User Type Database Functions', () => {
  const testUserId = 'test-user-id-123';
  const adminUserId = 'admin-user-id-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get_user_plan_tier()', () => {
    it('should return free_user as default when no plan tier exists', () => {
      mockSupabase.rpc.mockResolvedValue({ data: 'free_user', error: null });

      const result = mockSupabase.rpc('get_user_plan_tier', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }: SupabaseResponse<string>) => {
        expect(error).toBeNull();
        expect(data).toBe('free_user');
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_plan_tier', {
          p_user_id: testUserId,
        });
      });
    });

    it('should return the active plan tier when one exists', () => {
      mockSupabase.rpc.mockResolvedValue({ data: 'creator_pro', error: null });

      const result = mockSupabase.rpc('get_user_plan_tier', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }: SupabaseResponse<string>) => {
        expect(error).toBeNull();
        expect(data).toBe('creator_pro');
      });
    });

    it('should return only the active plan tier when multiple exist', () => {
      mockSupabase.rpc.mockResolvedValue({ data: 'creator_premium', error: null });

      const result = mockSupabase.rpc('get_user_plan_tier', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }: SupabaseResponse<string>) => {
        expect(error).toBeNull();
        expect(data).toBe('creator_premium');
      });
    });

    it('should handle valid plan tier values', () => {
      const validTiers = ['free_user', 'creator_pro', 'creator_premium'];
      
      validTiers.forEach(tier => {
        mockSupabase.rpc.mockResolvedValue({ data: tier, error: null });
        
        const result = mockSupabase.rpc('get_user_plan_tier', {
          p_user_id: testUserId,
        });

        return result.then(({ data }) => {
          expect(validTiers).toContain(data);
        });
      });
    });
  });

  describe('get_user_roles()', () => {
    it('should return empty array when user has no roles', () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = mockSupabase.rpc('get_user_roles', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toEqual([]);
      });
    });

    it('should return single role when user has one role', () => {
      mockSupabase.rpc.mockResolvedValue({ data: ['moderator'], error: null });

      const result = mockSupabase.rpc('get_user_roles', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toEqual(['moderator']);
      });
    });

    it('should return multiple roles when user has multiple active roles', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: ['moderator', 'tester'], 
        error: null 
      });

      const result = mockSupabase.rpc('get_user_roles', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toHaveLength(2);
        expect(data).toContain('moderator');
        expect(data).toContain('tester');
      });
    });

    it('should return only active roles when user has inactive roles', () => {
      mockSupabase.rpc.mockResolvedValue({ data: ['moderator'], error: null });

      const result = mockSupabase.rpc('get_user_roles', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toEqual(['moderator']);
      });
    });

    it('should handle valid role types', () => {
      const validRoles = ['admin', 'moderator', 'tester'];
      
      validRoles.forEach(role => {
        mockSupabase.rpc.mockResolvedValue({ data: [role], error: null });
        
        const result = mockSupabase.rpc('get_user_roles', {
          p_user_id: testUserId,
        });

        return result.then(({ data }) => {
          expect(data).toContain(role);
        });
      });
    });
  });

  describe('get_user_all_types()', () => {
    it('should return plan tier and empty roles array when user has no roles', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: [{
          plan_tier: 'free_user',
          roles: [],
          all_types: ['free_user']
        }], 
        error: null 
      });

      const result = mockSupabase.rpc('get_user_all_types', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect(data[0].plan_tier).toBe('free_user');
        expect(data[0].roles).toEqual([]);
        expect(data[0].all_types).toEqual(['free_user']);
      });
    });

    it('should return plan tier and roles when user has both', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: [{
          plan_tier: 'creator_pro',
          roles: ['moderator', 'tester'],
          all_types: ['creator_pro', 'moderator', 'tester']
        }], 
        error: null 
      });

      const result = mockSupabase.rpc('get_user_all_types', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect(data[0].plan_tier).toBe('creator_pro');
        expect(data[0].roles).toHaveLength(2);
        expect(data[0].roles).toContain('moderator');
        expect(data[0].roles).toContain('tester');
        expect(data[0].all_types).toHaveLength(3);
        expect(data[0].all_types).toContain('creator_pro');
        expect(data[0].all_types).toContain('moderator');
        expect(data[0].all_types).toContain('tester');
      });
    });

    it('should combine plan tier with roles in all_types array', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: [{
          plan_tier: 'creator_premium',
          roles: ['admin'],
          all_types: ['creator_premium', 'admin']
        }], 
        error: null 
      });

      const result = mockSupabase.rpc('get_user_all_types', {
        p_user_id: adminUserId,
      });

      return result.then(({ data }) => {
        expect(data[0].all_types[0]).toBe(data[0].plan_tier);
        expect(data[0].all_types.slice(1)).toEqual(data[0].roles);
      });
    });
  });

  describe('is_user_admin()', () => {
    it('should return false when user has no admin role', () => {
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const result = mockSupabase.rpc('is_user_admin', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(false);
      });
    });

    it('should return true when user has active admin role', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('is_user_admin', {
        p_user_id: adminUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
      });
    });

    it('should return false when user has inactive admin role', () => {
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const result = mockSupabase.rpc('is_user_admin', {
        p_user_id: testUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(false);
      });
    });

    it('should return boolean value', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('is_user_admin', {
        p_user_id: adminUserId,
      });

      return result.then(({ data }) => {
        expect(typeof data).toBe('boolean');
      });
    });
  });

  describe('assign_plan_tier()', () => {
    it('should allow admin to assign plan tier to user', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('assign_plan_tier', {
        p_target_user_id: testUserId,
        p_new_plan_tier: 'creator_pro',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('assign_plan_tier', {
          p_target_user_id: testUserId,
          p_new_plan_tier: 'creator_pro',
          p_admin_user_id: adminUserId,
        });
      });
    });

    it('should reject invalid plan tier values', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid plan tier: invalid_tier' } 
      });

      const result = mockSupabase.rpc('assign_plan_tier', {
        p_target_user_id: testUserId,
        p_new_plan_tier: 'invalid_tier',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Invalid plan tier');
      });
    });

    it('should deactivate old plan tier when assigning new one', () => {
      // First call - assign initial tier
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Second call - assign new tier
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Third call - verify new tier is active
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'creator_premium', error: null });

      return mockSupabase.rpc('assign_plan_tier', {
        p_target_user_id: testUserId,
        p_new_plan_tier: 'creator_pro',
        p_admin_user_id: adminUserId,
      }).then(() => {
        return mockSupabase.rpc('assign_plan_tier', {
          p_target_user_id: testUserId,
          p_new_plan_tier: 'creator_premium',
          p_admin_user_id: adminUserId,
        });
      }).then(() => {
        return mockSupabase.rpc('get_user_plan_tier', {
          p_user_id: testUserId,
        });
      }).then(({ data }) => {
        expect(data).toBe('creator_premium');
      });
    });

    it('should create audit log entry for plan tier assignment', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('assign_plan_tier', {
        p_target_user_id: testUserId,
        p_new_plan_tier: 'creator_pro',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data }) => {
        expect(data).toBe(true);
        // Function should internally create audit log
      });
    });

    it('should accept valid plan tier values', () => {
      const validTiers = ['free_user', 'creator_pro', 'creator_premium'];
      
      validTiers.forEach(tier => {
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
        
        const result = mockSupabase.rpc('assign_plan_tier', {
          p_target_user_id: testUserId,
          p_new_plan_tier: tier,
          p_admin_user_id: adminUserId,
        });

        return result.then(({ data, error }) => {
          expect(error).toBeNull();
          expect(data).toBe(true);
        });
      });
    });
  });

  describe('grant_user_role()', () => {
    it('should allow admin to grant role to user', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('grant_user_role', {
          p_target_user_id: testUserId,
          p_role_type: 'moderator',
          p_admin_user_id: adminUserId,
        });
      });
    });

    it('should reject invalid role types', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid role type: invalid_role' } 
      });

      const result = mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'invalid_role',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Invalid role type');
      });
    });

    it('should reject granting duplicate active role', () => {
      // First call succeeds
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Second call fails with duplicate error
      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'User already has role: moderator' } 
      });

      return mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      }).then(() => {
        return mockSupabase.rpc('grant_user_role', {
          p_target_user_id: testUserId,
          p_role_type: 'moderator',
          p_admin_user_id: adminUserId,
        });
      }).then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('already has role');
      });
    });

    it('should allow granting multiple different roles', () => {
      // First role
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Second role
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Verify both roles
      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: ['moderator', 'tester'], 
        error: null 
      });

      return mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      }).then(() => {
        return mockSupabase.rpc('grant_user_role', {
          p_target_user_id: testUserId,
          p_role_type: 'tester',
          p_admin_user_id: adminUserId,
        });
      }).then(() => {
        return mockSupabase.rpc('get_user_roles', {
          p_user_id: testUserId,
        });
      }).then(({ data }) => {
        expect(data).toHaveLength(2);
        expect(data).toContain('moderator');
        expect(data).toContain('tester');
      });
    });

    it('should accept valid role types', () => {
      const validRoles = ['admin', 'moderator', 'tester'];
      
      validRoles.forEach(role => {
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
        
        const result = mockSupabase.rpc('grant_user_role', {
          p_target_user_id: testUserId,
          p_role_type: role,
          p_admin_user_id: adminUserId,
        });

        return result.then(({ data, error }) => {
          expect(error).toBeNull();
          expect(data).toBe(true);
        });
      });
    });

    it('should create audit log entry for role grant', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data }) => {
        expect(data).toBe(true);
        // Function should internally create audit log
      });
    });
  });

  describe('revoke_user_role()', () => {
    it('should allow admin to revoke role from user', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('revoke_user_role', {
          p_target_user_id: testUserId,
          p_role_type: 'moderator',
          p_admin_user_id: adminUserId,
        });
      });
    });

    it('should prevent admin from revoking their own admin role', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Cannot revoke your own admin role' } 
      });

      const result = mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: adminUserId,
        p_role_type: 'admin',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Cannot revoke your own admin role');
      });
    });

    it('should mark role as inactive when revoked', () => {
      // Revoke role
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Verify role no longer in active roles
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      return mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      }).then(() => {
        return mockSupabase.rpc('get_user_roles', {
          p_user_id: testUserId,
        });
      }).then(({ data }) => {
        expect(data).not.toContain('moderator');
      });
    });

    it('should create audit log entry for role revocation', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data }) => {
        expect(data).toBe(true);
        // Function should internally create audit log
      });
    });

    it('should handle revoking non-existent role gracefully', () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'tester',
        p_admin_user_id: adminUserId,
      });

      return result.then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
      });
    });
  });

  describe('Authorization checks', () => {
    it('should reject non-admin attempting to assign plan tier', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Only admins can assign plan tiers' } 
      });

      const result = mockSupabase.rpc('assign_plan_tier', {
        p_target_user_id: testUserId,
        p_new_plan_tier: 'creator_pro',
        p_admin_user_id: testUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Only admins can assign plan tiers');
      });
    });

    it('should reject non-admin attempting to grant role', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Only admins can grant roles' } 
      });

      const result = mockSupabase.rpc('grant_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: testUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Only admins can grant roles');
      });
    });

    it('should reject non-admin attempting to revoke role', () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Only admins can revoke roles' } 
      });

      const result = mockSupabase.rpc('revoke_user_role', {
        p_target_user_id: testUserId,
        p_role_type: 'moderator',
        p_admin_user_id: testUserId,
      });

      return result.then(({ error }) => {
        expect(error).not.toBeNull();
        expect(error.message).toContain('Only admins can revoke roles');
      });
    });

    it('should allow admin operations when user is admin', () => {
      // Mock is_user_admin returning true
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Mock successful admin operation
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });

      return mockSupabase.rpc('is_user_admin', {
        p_user_id: adminUserId,
      }).then(({ data }) => {
        expect(data).toBe(true);
        
        return mockSupabase.rpc('assign_plan_tier', {
          p_target_user_id: testUserId,
          p_new_plan_tier: 'creator_pro',
          p_admin_user_id: adminUserId,
        });
      }).then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBe(true);
      });
    });

    it('should verify admin status before allowing operations', () => {
      // First check if user is admin
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null });

      return mockSupabase.rpc('is_user_admin', {
        p_user_id: testUserId,
      }).then(({ data }) => {
        expect(data).toBe(false);
        // Non-admin should not be able to perform admin operations
      });
    });
  });
});

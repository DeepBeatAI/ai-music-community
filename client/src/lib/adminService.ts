/**
 * Admin Service - User Management
 * 
 * This service provides functions for managing users in the admin dashboard.
 * All functions include proper error handling and audit logging.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { supabase } from '@/lib/supabase';
import { AdminError, ADMIN_ERROR_CODES, AdminUserData, UserActivitySummary } from '@/types/admin';
import { 
  adminCache, 
  ADMIN_CACHE_KEYS, 
  ADMIN_CACHE_TTL,
  cachedFetch 
} from '@/utils/adminCache';

/**
 * Pagination parameters for user list
 */
export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  planTier?: string;
  role?: string;
}

/**
 * Paginated user list response
 */
export interface PaginatedUsers {
  users: AdminUserData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all users with pagination and filtering
 * Requirements: 3.1
 * Caching: 5 minute TTL
 */
export async function fetchAllUsers(params: UserListParams = {}): Promise<PaginatedUsers> {
  try {
    const {
      page = 1,
      pageSize = 50,
      search = '',
      planTier,
      role,
    } = params;

    // Create cache key based on parameters
    const filters = JSON.stringify({ search, planTier, role });
    const cacheKey = ADMIN_CACHE_KEYS.USER_LIST(page, filters);

    // Use cached fetch with 5 minute TTL
    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.USER_LIST,
      async () => {
        // Calculate pagination
        const offset = (page - 1) * pageSize;

        // Use database function to get users with emails (returns JSONB)
        const { data: usersData, error } = await supabase.rpc('get_users_with_emails', {
          p_limit: pageSize,
          p_offset: offset,
          p_search: search || null,
        });

        if (error) {
          throw new AdminError(
            'Failed to fetch users',
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: error }
          );
        }

        // Get total count for pagination
        const { data: countData, error: countError } = await supabase.rpc('get_users_count', {
          p_search: search || null,
        });

        if (countError) {
          throw new AdminError(
            'Failed to fetch user count',
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: countError }
          );
        }

        const totalCount = countData || 0;

        // Parse JSONB response and transform to AdminUserData format
        const usersArray = Array.isArray(usersData) ? usersData : (usersData ? [usersData] : []);
        let users: AdminUserData[] = usersArray.map((user: any) => ({
          id: user.id,
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          plan_tier: user.plan_tier,
          roles: Array.isArray(user.roles) ? user.roles : [],
          created_at: user.created_at,
          last_active: new Date().toISOString(), // Will be populated from user_stats
          is_suspended: user.is_suspended || false,
          activity_summary: {
            posts_count: 0,
            tracks_count: 0,
            albums_count: 0,
            playlists_count: 0,
            comments_count: 0,
            likes_given: 0,
            likes_received: 0,
            last_active: new Date().toISOString(),
          },
        }));

        // Apply client-side filters for plan tier and role
        if (planTier) {
          users = users.filter((u) => u.plan_tier === planTier);
        }

        if (role) {
          if (role === 'none') {
            users = users.filter((u) => u.roles.length === 0);
          } else {
            users = users.filter((u) => u.roles.includes(role));
          }
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        return {
          users,
          total: totalCount,
          page,
          pageSize,
          totalPages,
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching users',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch detailed user information including activity summary
 * Requirements: 3.2
 * Caching: 5 minute TTL
 */
export async function fetchUserDetails(userId: string): Promise<AdminUserData> {
  try {
    const cacheKey = ADMIN_CACHE_KEYS.USER_DETAILS(userId);

    // Use cached fetch with 5 minute TTL
    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.USER_DETAILS,
      async () => {
        // Use database function to get user with email (returns JSONB)
        const { data: usersData, error: profileError } = await supabase.rpc('get_users_with_emails', {
          p_limit: 100,
          p_offset: 0,
          p_search: null,
        });

        if (profileError) {
          throw new AdminError(
            'Failed to fetch user profile',
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: profileError }
          );
        }

        // Parse JSONB response
        const usersArray = Array.isArray(usersData) ? usersData : (usersData ? [usersData] : []);
        
        // Find the specific user by user_id
        const profile = usersArray.find((u: any) => u.user_id === userId);

        if (!profile) {
          throw new AdminError(
            'User not found',
            ADMIN_ERROR_CODES.NOT_FOUND,
            { userId }
          );
        }

        // Fetch activity summary using database function
        const { data: activityData, error: activityError } = await supabase
          .rpc('get_user_activity_summary', {
            p_user_id: userId,
            p_days_back: 30,
          });

        if (activityError) {
          console.error('Failed to fetch activity summary:', activityError);
        }

        // The function returns a TABLE (array), so get the first row
        const activityRow = Array.isArray(activityData) && activityData.length > 0 
          ? activityData[0] 
          : null;

        const activity: UserActivitySummary = activityRow || {
          posts_count: 0,
          tracks_count: 0,
          albums_count: 0,
          playlists_count: 0,
          comments_count: 0,
          likes_given: 0,
          likes_received: 0,
          last_active: new Date().toISOString(),
        };

        return {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username,
          email: profile.email,
          plan_tier: profile.plan_tier,
          roles: profile.roles || [],
          created_at: profile.created_at,
          last_active: activity.last_active,
          is_suspended: profile.is_suspended || false,
          activity_summary: activity,
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching user details',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update user plan tier with audit logging
 * Requirements: 3.3
 */
export async function updateUserPlanTier(
  userId: string,
  newPlanTier: string
): Promise<void> {
  try {
    // Get current active plan tier for audit log
    const { data: currentPlan, error: fetchError } = await supabase
      .from('user_plan_tiers')
      .select('plan_tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      throw new AdminError(
        'Failed to fetch current plan tier',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: fetchError }
      );
    }

    // Update plan tier using database function
    const { error: updateError } = await supabase.rpc('update_user_plan_tier', {
      p_user_id: userId,
      p_new_plan_tier: newPlanTier,
    });

    if (updateError) {
      throw new AdminError(
        'Failed to update user plan tier',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: updateError }
      );
    }

    // Log the action
    await supabase.rpc('log_admin_action', {
      p_action_type: 'user_plan_changed',
      p_target_resource_type: 'user',
      p_target_resource_id: userId,
      p_old_value: { plan_tier: currentPlan?.plan_tier },
      p_new_value: { plan_tier: newPlanTier },
    });

    // Invalidate user caches
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating plan tier',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update user roles with audit logging
 * Requirements: 3.4
 */
export async function updateUserRoles(
  userId: string,
  rolesToAdd: string[],
  rolesToRemove: string[]
): Promise<void> {
  try {
    // Get current roles for audit log
    const { data: currentRoles, error: fetchError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (fetchError) {
      throw new AdminError(
        'Failed to fetch current roles',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: fetchError }
      );
    }

    // Add new roles
    for (const roleType of rolesToAdd) {
      const { error: addError } = await supabase.rpc('assign_user_role', {
        p_user_id: userId,
        p_role_type: roleType,
      });

      if (addError) {
        throw new AdminError(
          `Failed to add role: ${roleType}`,
          ADMIN_ERROR_CODES.DATABASE_ERROR,
          { originalError: addError }
        );
      }
    }

    // Remove roles
    for (const roleType of rolesToRemove) {
      const { error: removeError } = await supabase.rpc('revoke_user_role', {
        p_target_user_id: userId,
        p_role_type: roleType,
      });

      if (removeError) {
        throw new AdminError(
          `Failed to remove role: ${roleType}`,
          ADMIN_ERROR_CODES.DATABASE_ERROR,
          { originalError: removeError }
        );
      }
    }

    // Log the action
    await supabase.rpc('log_admin_action', {
      p_action_type: 'user_role_changed',
      p_target_resource_type: 'user',
      p_target_resource_id: userId,
      p_old_value: { roles: currentRoles?.map((r: { role_type: string }) => r.role_type) || [] },
      p_new_value: {
        added: rolesToAdd,
        removed: rolesToRemove,
      },
    });

    // Invalidate user caches
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating user roles',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Suspend user account with audit logging
 * Requirements: 3.7, 12.1, 12.2, 12.7
 * 
 * This function now integrates with the moderation system by:
 * - Creating a moderation_actions record
 * - Creating a user_restrictions record
 * - Updating user_profiles with suspension details
 * - Logging to admin_audit_log
 */
export async function suspendUser(
  userId: string,
  reason: string,
  durationDays?: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc('suspend_user_account', {
      p_target_user_id: userId,
      p_reason: reason,
      p_duration_days: durationDays || null,
    });

    if (error) {
      throw new AdminError(
        'Failed to suspend user account',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Invalidate user caches
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while suspending user',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Unsuspend user account with audit logging
 * Requirements: 3.7, 12.2, 12.3
 * 
 * This function now integrates with the moderation system by:
 * - Removing suspension from user_profiles
 * - Deactivating user_restrictions records
 * - Logging to admin_audit_log
 */
export async function unsuspendUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('unsuspend_user_account', {
      p_target_user_id: userId,
    });

    if (error) {
      throw new AdminError(
        'Failed to unsuspend user account',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Invalidate user caches
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while unsuspending user',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Reset user password with audit logging
 * Requirements: 3.6
 */
export async function resetUserPassword(userId: string, email: string): Promise<void> {
  try {
    // Use Supabase Auth API to send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new AdminError(
        'Failed to send password reset email',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Log the action
    await supabase.rpc('log_admin_action', {
      p_action_type: 'user_password_reset',
      p_target_resource_type: 'user',
      p_target_resource_id: userId,
      p_old_value: null,
      p_new_value: { email },
    });

    // Invalidate user caches
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while resetting password',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

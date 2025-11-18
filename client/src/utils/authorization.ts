/**
 * Authorization utilities for user type and role verification
 * Provides server-side authorization checks for protected routes and API endpoints
 */

import { createClient } from '@supabase/supabase-js';
import { RoleType, PlanTier } from '@/types/userTypes';
import type { Database } from '@/types/database';

/**
 * Authorization result interface
 */
export interface AuthorizationResult {
  authorized: boolean;
  userId?: string;
  planTier?: PlanTier;
  roles?: RoleType[];
  isAdmin?: boolean;
  error?: string;
}

/**
 * Create a Supabase client for server-side operations
 * Uses service role key for elevated permissions
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verify if a user has admin role
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .rpc('is_user_admin', { p_user_id: userId });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
}

/**
 * Get user's plan tier
 * @param userId - The user ID to check
 * @returns Promise<PlanTier | null> - User's plan tier or null
 */
export async function getUserPlanTier(userId: string): Promise<PlanTier | null> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .rpc('get_user_plan_tier', { p_user_id: userId });

    if (error) {
      console.error('Error getting plan tier:', error);
      return null;
    }

    return data as PlanTier;
  } catch (error) {
    console.error('Exception getting plan tier:', error);
    return null;
  }
}

/**
 * Get user's roles
 * @param userId - The user ID to check
 * @returns Promise<RoleType[]> - Array of user roles
 */
export async function getUserRoles(userId: string): Promise<RoleType[]> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .rpc('get_user_roles', { p_user_id: userId });

    if (error) {
      console.error('Error getting user roles:', error);
      return [];
    }

    return (data || []) as RoleType[];
  } catch (error) {
    console.error('Exception getting user roles:', error);
    return [];
  }
}

/**
 * Verify user has required role
 * @param userId - The user ID to check
 * @param requiredRole - The role to verify
 * @returns Promise<boolean> - True if user has the role
 */
export async function hasRole(userId: string, requiredRole: RoleType): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(requiredRole);
}

/**
 * Verify user has required plan tier or higher
 * @param userId - The user ID to check
 * @param requiredTier - The minimum plan tier required
 * @returns Promise<boolean> - True if user meets tier requirement
 */
export async function hasPlanTier(userId: string, requiredTier: PlanTier): Promise<boolean> {
  const userTier = await getUserPlanTier(userId);
  if (!userTier) return false;

  // Define tier hierarchy
  const tierHierarchy: Record<PlanTier, number> = {
    [PlanTier.FREE_USER]: 1,
    [PlanTier.CREATOR_PRO]: 2,
    [PlanTier.CREATOR_PREMIUM]: 3,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

/**
 * Comprehensive authorization check
 * @param userId - The user ID to check
 * @returns Promise<AuthorizationResult> - Complete authorization information
 */
export async function authorizeUser(userId: string): Promise<AuthorizationResult> {
  try {
    const [planTier, roles, isAdmin] = await Promise.all([
      getUserPlanTier(userId),
      getUserRoles(userId),
      isUserAdmin(userId),
    ]);

    return {
      authorized: true,
      userId,
      planTier: planTier || PlanTier.FREE_USER,
      roles,
      isAdmin,
    };
  } catch (error) {
    console.error('Authorization error:', error);
    return {
      authorized: false,
      error: 'Authorization check failed',
    };
  }
}

/**
 * Verify admin access for protected operations
 * @param userId - The user ID to check
 * @returns Promise<AuthorizationResult> - Authorization result with admin verification
 */
export async function requireAdmin(userId: string): Promise<AuthorizationResult> {
  const result = await authorizeUser(userId);
  
  if (!result.authorized) {
    return result;
  }

  if (!result.isAdmin) {
    return {
      authorized: false,
      error: 'Admin access required',
    };
  }

  return result;
}

/**
 * Verify moderator or admin access
 * @param userId - The user ID to check
 * @returns Promise<AuthorizationResult> - Authorization result with moderator verification
 */
export async function requireModerator(userId: string): Promise<AuthorizationResult> {
  const result = await authorizeUser(userId);
  
  if (!result.authorized) {
    return result;
  }

  const isModerator = result.roles?.includes(RoleType.MODERATOR) || result.isAdmin;
  
  if (!isModerator) {
    return {
      authorized: false,
      error: 'Moderator access required',
    };
  }

  return result;
}

/**
 * Verify tester or admin access
 * @param userId - The user ID to check
 * @returns Promise<AuthorizationResult> - Authorization result with tester verification
 */
export async function requireTester(userId: string): Promise<AuthorizationResult> {
  const result = await authorizeUser(userId);
  
  if (!result.authorized) {
    return result;
  }

  const isTester = result.roles?.includes(RoleType.TESTER) || result.isAdmin;
  
  if (!isTester) {
    return {
      authorized: false,
      error: 'Tester access required',
    };
  }

  return result;
}

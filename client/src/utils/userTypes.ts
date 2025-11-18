/**
 * User Type Utility Functions
 * 
 * This module provides utility functions for working with user types,
 * plan tiers, and roles throughout the application.
 */

import { supabase } from '@/lib/supabase';
import {
  PlanTier,
  RoleType,
  UserTypeInfo,
  UserTypeError,
  USER_TYPE_ERROR_CODES,
  PLAN_TIER_DISPLAY_NAMES,
  ROLE_TYPE_DISPLAY_NAMES,
} from '@/types/userTypes';

/**
 * Fetches complete user type information including plan tier and roles
 * 
 * @param userId - The user ID to fetch type information for
 * @returns UserTypeInfo object with plan tier, roles, and admin status
 * @throws UserTypeError if the fetch fails or user not found
 */
export async function getUserTypeInfo(userId: string): Promise<UserTypeInfo> {
  try {
    // Fetch plan tier
    const { data: planTierData, error: planTierError } = await supabase
      .from('user_plan_tiers')
      .select('plan_tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (planTierError && planTierError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - we'll handle this below
      throw new UserTypeError(
        'Failed to fetch user plan tier',
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: planTierError }
      );
    }

    // Default to free_user if no plan tier found
    const planTier = (planTierData?.plan_tier as PlanTier) || PlanTier.FREE_USER;

    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rolesError) {
      throw new UserTypeError(
        'Failed to fetch user roles',
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: rolesError }
      );
    }

    const roles = (rolesData || []).map(r => r.role_type as RoleType);
    const isAdmin = roles.includes(RoleType.ADMIN);

    // Build display types array (plan tier + roles)
    const displayTypes = [
      PLAN_TIER_DISPLAY_NAMES[planTier],
      ...roles.map(role => ROLE_TYPE_DISPLAY_NAMES[role])
    ];

    return {
      userId,
      planTier,
      roles,
      isAdmin,
      displayTypes,
    };
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error fetching user type information',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Checks if a user has a specific role
 * 
 * @param userId - The user ID to check
 * @param role - The role to check for
 * @returns true if the user has the role, false otherwise
 * @throws UserTypeError if the check fails
 */
export async function hasRole(userId: string, role: RoleType): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_type', role)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new UserTypeError(
        `Failed to check if user has role: ${role}`,
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return data !== null;
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error checking user role',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Checks if a user has a specific plan tier
 * 
 * @param userId - The user ID to check
 * @param planTier - The plan tier to check for
 * @returns true if the user has the plan tier, false otherwise
 * @throws UserTypeError if the check fails
 */
export async function hasPlanTier(userId: string, planTier: PlanTier): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_plan_tiers')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_tier', planTier)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new UserTypeError(
        `Failed to check if user has plan tier: ${planTier}`,
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return data !== null;
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error checking user plan tier',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Checks if a user has admin role
 * 
 * @param userId - The user ID to check
 * @returns true if the user is an admin, false otherwise
 * @throws UserTypeError if the check fails
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, RoleType.ADMIN);
}

/**
 * Formats user types for display in UI components
 * 
 * @param planTier - The user's plan tier
 * @param roles - The user's roles (optional)
 * @returns Array of formatted display strings
 */
export function formatUserTypesForDisplay(
  planTier: PlanTier,
  roles: RoleType[] = []
): string[] {
  const displayTypes = [PLAN_TIER_DISPLAY_NAMES[planTier]];
  
  roles.forEach(role => {
    displayTypes.push(ROLE_TYPE_DISPLAY_NAMES[role]);
  });

  return displayTypes;
}

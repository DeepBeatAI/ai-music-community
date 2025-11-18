/**
 * Admin Service
 * 
 * This service provides functions for admin operations on user types,
 * including assigning plan tiers and managing user roles.
 * All functions include authorization checks and comprehensive error handling.
 */

import { supabase } from '@/lib/supabase';
import {
  PlanTier,
  RoleType,
  UserTypeError,
  USER_TYPE_ERROR_CODES,
} from '@/types/userTypes';
import { clearUserTypeCache } from './userTypeService';
import {
  validatePlanTier as validatePlanTierInput,
  validateRoleType as validateRoleTypeInput,
  validateUserId,
} from '@/utils/validation';
import {
  logPlanTierAssignment,
  logRoleGrant,
  logRoleRevocation,
  logAdminAccessDenied,
} from '@/utils/auditLogger';

/**
 * Validates that a plan tier value is valid
 * 
 * @param planTier - The plan tier to validate
 * @throws UserTypeError if the plan tier is invalid
 */
function validatePlanTier(planTier: string): asserts planTier is PlanTier {
  const result = validatePlanTierInput(planTier);
  if (!result.valid) {
    throw new UserTypeError(
      result.error || 'Invalid plan tier',
      USER_TYPE_ERROR_CODES.INVALID_PLAN_TIER,
      { code: result.code }
    );
  }
}

/**
 * Validates that a role type value is valid
 * 
 * @param roleType - The role type to validate
 * @throws UserTypeError if the role type is invalid
 */
function validateRoleType(roleType: string): asserts roleType is RoleType {
  const result = validateRoleTypeInput(roleType);
  if (!result.valid) {
    throw new UserTypeError(
      result.error || 'Invalid role type',
      USER_TYPE_ERROR_CODES.INVALID_ROLE,
      { code: result.code }
    );
  }
}

/**
 * Validates that a user ID is valid
 * 
 * @param userId - The user ID to validate
 * @throws UserTypeError if the user ID is invalid
 */
function validateUserIdInput(userId: string): asserts userId is string {
  const result = validateUserId(userId);
  if (!result.valid) {
    throw new UserTypeError(
      result.error || 'Invalid user ID',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { code: result.code }
    );
  }
}

/**
 * Checks if the current user has admin privileges
 * 
 * @returns true if the current user is an admin, false otherwise
 * @throws UserTypeError if the check fails
 */
async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role_type', RoleType.ADMIN)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new UserTypeError(
        'Failed to check admin status',
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
      'Unexpected error checking admin status',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Assigns a plan tier to a user (Admin only)
 * 
 * @param targetUserId - The user ID to assign the plan tier to
 * @param newPlanTier - The plan tier to assign
 * @returns true if successful
 * @throws UserTypeError if the operation fails or user is not authorized
 */
export async function assignPlanTier(
  targetUserId: string,
  newPlanTier: PlanTier
): Promise<boolean> {
  let adminUserId: string | undefined;
  
  try {
    // Validate inputs
    validateUserIdInput(targetUserId);
    validatePlanTier(newPlanTier);

    // Check authorization
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      // Log authorization failure
      const { data: { user } } = await supabase.auth.getUser();
      logAdminAccessDenied({
        userId: user?.id,
        action: `Assign plan tier to ${targetUserId}`,
      });
      
      throw new UserTypeError(
        'Only admins can assign plan tiers',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Get current user for audit logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UserTypeError(
        'User not authenticated',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }
    
    adminUserId = user.id;

    // Call the database function
    const { data, error } = await supabase.rpc('assign_plan_tier', {
      p_target_user_id: targetUserId,
      p_new_plan_tier: newPlanTier,
      p_admin_user_id: user.id,
    });

    if (error) {
      // Log failure
      logPlanTierAssignment({
        adminUserId: user.id,
        targetUserId,
        newTier: newPlanTier,
        success: false,
        errorMessage: error.message,
      });
      
      // Check for specific error messages from the database function
      if (error.message.includes('Only admins can assign plan tiers')) {
        throw new UserTypeError(
          'Only admins can assign plan tiers',
          USER_TYPE_ERROR_CODES.UNAUTHORIZED,
          { originalError: error }
        );
      }
      if (error.message.includes('Invalid plan tier')) {
        throw new UserTypeError(
          `Invalid plan tier: ${newPlanTier}`,
          USER_TYPE_ERROR_CODES.INVALID_PLAN_TIER,
          { originalError: error }
        );
      }
      throw new UserTypeError(
        'Failed to assign plan tier',
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Log success
    logPlanTierAssignment({
      adminUserId: user.id,
      targetUserId,
      newTier: newPlanTier,
      success: true,
    });

    // Clear cache for the target user
    clearUserTypeCache(targetUserId);

    return data === true;
  } catch (error) {
    // Log failure if we have admin user ID
    if (adminUserId) {
      logPlanTierAssignment({
        adminUserId,
        targetUserId,
        newTier: newPlanTier,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error assigning plan tier',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Grants a role to a user (Admin only)
 * 
 * @param targetUserId - The user ID to grant the role to
 * @param roleType - The role to grant
 * @returns true if successful
 * @throws UserTypeError if the operation fails or user is not authorized
 */
export async function grantRole(
  targetUserId: string,
  roleType: RoleType
): Promise<boolean> {
  let adminUserId: string | undefined;
  
  try {
    // Validate inputs
    validateUserIdInput(targetUserId);
    validateRoleType(roleType);

    // Check authorization
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      // Log authorization failure
      const { data: { user } } = await supabase.auth.getUser();
      logAdminAccessDenied({
        userId: user?.id,
        action: `Grant role ${roleType} to ${targetUserId}`,
      });
      
      throw new UserTypeError(
        'Only admins can grant roles',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Get current user for audit logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UserTypeError(
        'User not authenticated',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }
    
    adminUserId = user.id;

    // Call the database function
    const { data, error } = await supabase.rpc('grant_user_role', {
      p_target_user_id: targetUserId,
      p_role_type: roleType,
      p_admin_user_id: user.id,
    });

    if (error) {
      // Log failure
      logRoleGrant({
        adminUserId: user.id,
        targetUserId,
        role: roleType,
        success: false,
        errorMessage: error.message,
      });
      
      // Check for specific error messages from the database function
      if (error.message.includes('Only admins can grant roles')) {
        throw new UserTypeError(
          'Only admins can grant roles',
          USER_TYPE_ERROR_CODES.UNAUTHORIZED,
          { originalError: error }
        );
      }
      if (error.message.includes('Invalid role type')) {
        throw new UserTypeError(
          `Invalid role type: ${roleType}`,
          USER_TYPE_ERROR_CODES.INVALID_ROLE,
          { originalError: error }
        );
      }
      if (error.message.includes('User already has role')) {
        throw new UserTypeError(
          `User already has role: ${roleType}`,
          USER_TYPE_ERROR_CODES.ROLE_ALREADY_EXISTS,
          { originalError: error }
        );
      }
      throw new UserTypeError(
        'Failed to grant role',
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Log success
    logRoleGrant({
      adminUserId: user.id,
      targetUserId,
      role: roleType,
      success: true,
    });

    // Clear cache for the target user
    clearUserTypeCache(targetUserId);

    return data === true;
  } catch (error) {
    // Log failure if we have admin user ID
    if (adminUserId) {
      logRoleGrant({
        adminUserId,
        targetUserId,
        role: roleType,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error granting role',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Revokes a role from a user (Admin only)
 * 
 * @param targetUserId - The user ID to revoke the role from
 * @param roleType - The role to revoke
 * @returns true if successful
 * @throws UserTypeError if the operation fails or user is not authorized
 */
export async function revokeRole(
  targetUserId: string,
  roleType: RoleType
): Promise<boolean> {
  let adminUserId: string | undefined;
  
  try {
    // Validate inputs
    validateUserIdInput(targetUserId);
    validateRoleType(roleType);

    // Check authorization
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      // Log authorization failure
      const { data: { user } } = await supabase.auth.getUser();
      logAdminAccessDenied({
        userId: user?.id,
        action: `Revoke role ${roleType} from ${targetUserId}`,
      });
      
      throw new UserTypeError(
        'Only admins can revoke roles',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Get current user for audit logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UserTypeError(
        'User not authenticated',
        USER_TYPE_ERROR_CODES.UNAUTHORIZED
      );
    }
    
    adminUserId = user.id;

    // Prevent revoking own admin role
    if (targetUserId === user.id && roleType === RoleType.ADMIN) {
      // Log attempt
      logRoleRevocation({
        adminUserId: user.id,
        targetUserId,
        role: roleType,
        success: false,
        errorMessage: 'Cannot revoke your own admin role',
      });
      
      throw new UserTypeError(
        'Cannot revoke your own admin role',
        USER_TYPE_ERROR_CODES.CANNOT_REVOKE_OWN_ADMIN
      );
    }

    // Call the database function
    const { data, error } = await supabase.rpc('revoke_user_role', {
      p_target_user_id: targetUserId,
      p_role_type: roleType,
      p_admin_user_id: user.id,
    });

    if (error) {
      // Log failure
      logRoleRevocation({
        adminUserId: user.id,
        targetUserId,
        role: roleType,
        success: false,
        errorMessage: error.message,
      });
      
      // Check for specific error messages from the database function
      if (error.message.includes('Only admins can revoke roles')) {
        throw new UserTypeError(
          'Only admins can revoke roles',
          USER_TYPE_ERROR_CODES.UNAUTHORIZED,
          { originalError: error }
        );
      }
      if (error.message.includes('Cannot revoke your own admin role')) {
        throw new UserTypeError(
          'Cannot revoke your own admin role',
          USER_TYPE_ERROR_CODES.CANNOT_REVOKE_OWN_ADMIN,
          { originalError: error }
        );
      }
      if (error.message.includes('Invalid role type')) {
        throw new UserTypeError(
          `Invalid role type: ${roleType}`,
          USER_TYPE_ERROR_CODES.INVALID_ROLE,
          { originalError: error }
        );
      }
      throw new UserTypeError(
        'Failed to revoke role',
        USER_TYPE_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Log success
    logRoleRevocation({
      adminUserId: user.id,
      targetUserId,
      role: roleType,
      success: true,
    });

    // Clear cache for the target user
    clearUserTypeCache(targetUserId);

    return data === true;
  } catch (error) {
    // Log failure if we have admin user ID
    if (adminUserId) {
      logRoleRevocation({
        adminUserId,
        targetUserId,
        role: roleType,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error revoking role',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * User Types and Plan Tiers System
 * 
 * This module defines all types, enums, and constants for the user type system
 * including plan tiers (subscription levels) and user roles (additional privileges).
 */

/**
 * Plan tier enumeration
 * Represents subscription levels for non-admin users
 */
export enum PlanTier {
  FREE_USER = 'free_user',
  CREATOR_PRO = 'creator_pro',
  CREATOR_PREMIUM = 'creator_premium',
}

/**
 * Role type enumeration
 * Represents additional privileges that can be combined with plan tiers
 */
export enum RoleType {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  TESTER = 'tester',
}

/**
 * Display names for plan tiers
 */
export const PLAN_TIER_DISPLAY_NAMES: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 'Free User',
  [PlanTier.CREATOR_PRO]: 'Creator Pro',
  [PlanTier.CREATOR_PREMIUM]: 'Creator Premium',
};

/**
 * Display names for roles
 */
export const ROLE_TYPE_DISPLAY_NAMES: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'Admin',
  [RoleType.MODERATOR]: 'Moderator',
  [RoleType.TESTER]: 'Tester',
};

/**
 * Plan tier descriptions for account page
 */
export const PLAN_TIER_DESCRIPTIONS: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 
    'Access to basic features including track uploads, playlists, and community interaction.',
  [PlanTier.CREATOR_PRO]: 
    'Enhanced creator features with increased upload limits, advanced analytics, and priority support.',
  [PlanTier.CREATOR_PREMIUM]: 
    'Full platform access with unlimited uploads, premium analytics, collaboration tools, and dedicated support.',
};

/**
 * Badge color schemes for UI display
 */
export const PLAN_TIER_BADGE_STYLES: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 'bg-gray-700 text-gray-300 border-gray-600',
  [PlanTier.CREATOR_PRO]: 'bg-yellow-700 text-yellow-200 border-yellow-600',
  [PlanTier.CREATOR_PREMIUM]: 'bg-blue-700 text-blue-200 border-blue-600',
};

export const ROLE_TYPE_BADGE_STYLES: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'bg-red-700 text-red-200 border-red-600',
  [RoleType.MODERATOR]: 'bg-purple-700 text-purple-200 border-purple-600',
  [RoleType.TESTER]: 'bg-green-700 text-green-200 border-green-600',
};

/**
 * User plan tier record from database
 */
export interface UserPlanTier {
  id: string;
  user_id: string;
  plan_tier: PlanTier;
  is_active: boolean;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User role record from database
 */
export interface UserRole {
  id: string;
  user_id: string;
  role_type: RoleType;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Combined user type information
 */
export interface UserTypeInfo {
  userId: string;
  planTier: PlanTier;
  roles: RoleType[];
  isAdmin: boolean;
  displayTypes: string[]; // Array of display names for badges
}

/**
 * User type audit log entry
 */
export interface UserTypeAuditLog {
  id: string;
  target_user_id: string;
  modified_by: string;
  action_type: 'plan_tier_assigned' | 'plan_tier_changed' | 'role_granted' | 'role_revoked';
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Extended user profile with type information
 */
export interface UserProfileWithTypes {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string | null;
  user_type: string | null; // Deprecated field
  planTier: PlanTier;
  roles: RoleType[];
  isAdmin: boolean;
}

/**
 * User type error codes
 */
export const USER_TYPE_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_PLAN_TIER: 'INVALID_PLAN_TIER',
  INVALID_ROLE: 'INVALID_ROLE',
  ROLE_ALREADY_EXISTS: 'ROLE_ALREADY_EXISTS',
  CANNOT_REVOKE_OWN_ADMIN: 'CANNOT_REVOKE_OWN_ADMIN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

/**
 * User type error class for error handling
 */
export class UserTypeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UserTypeError';
  }
}

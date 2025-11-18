/**
 * User Type Service
 * 
 * This service provides API functions for fetching user type information
 * with caching, error handling, and retry logic.
 */

import { supabase } from '@/lib/supabase';
import {
  PlanTier,
  RoleType,
  UserTypeError,
  USER_TYPE_ERROR_CODES,
} from '@/types/userTypes';

/**
 * Cache for user type data to reduce database queries
 */
interface UserTypeCache {
  planTier: { data: PlanTier; timestamp: number } | null;
  roles: { data: RoleType[]; timestamp: number } | null;
}

const userTypeCache = new Map<string, UserTypeCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the cache for a specific user
 * 
 * @param userId - The user ID to clear cache for
 */
export function clearUserTypeCache(userId: string): void {
  userTypeCache.delete(userId);
}

/**
 * Clears all user type caches
 */
export function clearAllUserTypeCaches(): void {
  userTypeCache.clear();
}

/**
 * Checks if cached data is still valid
 * 
 * @param timestamp - The timestamp when data was cached
 * @returns true if cache is still valid, false otherwise
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Retries a function with exponential backoff
 * 
 * @param fn - The function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns The result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain error types
      if (error instanceof UserTypeError) {
        if (
          error.code === USER_TYPE_ERROR_CODES.UNAUTHORIZED ||
          error.code === USER_TYPE_ERROR_CODES.NOT_FOUND
        ) {
          throw error;
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Fetches the user's plan tier from the database
 * 
 * @param userId - The user ID to fetch plan tier for
 * @param useCache - Whether to use cached data (default: true)
 * @returns The user's plan tier
 * @throws UserTypeError if the fetch fails
 */
export async function fetchUserPlanTier(
  userId: string,
  useCache: boolean = true
): Promise<PlanTier> {
  // Check cache first
  if (useCache) {
    const cached = userTypeCache.get(userId);
    if (cached?.planTier && isCacheValid(cached.planTier.timestamp)) {
      return cached.planTier.data;
    }
  }

  try {
    const planTier = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('user_plan_tiers')
        .select('plan_tier')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw new UserTypeError(
          'Failed to fetch user plan tier',
          USER_TYPE_ERROR_CODES.DATABASE_ERROR,
          { originalError: error }
        );
      }

      // Default to free_user if no plan tier found
      return (data?.plan_tier as PlanTier) || PlanTier.FREE_USER;
    });

    // Update cache
    const cached = userTypeCache.get(userId) || { planTier: null, roles: null };
    cached.planTier = { data: planTier, timestamp: Date.now() };
    userTypeCache.set(userId, cached);

    return planTier;
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error fetching user plan tier',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetches the user's roles from the database
 * 
 * @param userId - The user ID to fetch roles for
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of the user's roles
 * @throws UserTypeError if the fetch fails
 */
export async function fetchUserRoles(
  userId: string,
  useCache: boolean = true
): Promise<RoleType[]> {
  // Check cache first
  if (useCache) {
    const cached = userTypeCache.get(userId);
    if (cached?.roles && isCacheValid(cached.roles.timestamp)) {
      return cached.roles.data;
    }
  }

  try {
    const roles = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new UserTypeError(
          'Failed to fetch user roles',
          USER_TYPE_ERROR_CODES.DATABASE_ERROR,
          { originalError: error }
        );
      }

      return (data || []).map(r => r.role_type as RoleType);
    });

    // Update cache
    const cached = userTypeCache.get(userId) || { planTier: null, roles: null };
    cached.roles = { data: roles, timestamp: Date.now() };
    userTypeCache.set(userId, cached);

    return roles;
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error fetching user roles',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetches all user type information (plan tier and roles) in a single call
 * 
 * @param userId - The user ID to fetch type information for
 * @param useCache - Whether to use cached data (default: true)
 * @returns Object containing plan tier and roles
 * @throws UserTypeError if the fetch fails
 */
export async function fetchUserAllTypes(
  userId: string,
  useCache: boolean = true
): Promise<{ planTier: PlanTier; roles: RoleType[] }> {
  try {
    // Fetch both in parallel for better performance
    const [planTier, roles] = await Promise.all([
      fetchUserPlanTier(userId, useCache),
      fetchUserRoles(userId, useCache),
    ]);

    return { planTier, roles };
  } catch (error) {
    if (error instanceof UserTypeError) {
      throw error;
    }
    throw new UserTypeError(
      'Unexpected error fetching all user types',
      USER_TYPE_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

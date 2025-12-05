import { supabase } from './supabase';
import { PlanTier, RoleType } from '@/types/userTypes';

/**
 * Fetch all user type information (plan tier and roles)
 */
export async function fetchUserAllTypes(
  userId: string,
  forceRefresh: boolean = false
): Promise<{ planTier: PlanTier; roles: RoleType[] }> {
  try {
    // Fetch plan tier
    const { data: planTierData, error: planTierError } = await supabase
      .from('user_plan_tiers')
      .select('plan_tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (planTierError && planTierError.code !== 'PGRST116') {
      console.error('Error fetching plan tier:', planTierError);
    }

    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const planTier = (planTierData?.plan_tier as PlanTier) || PlanTier.FREE_USER;
    const roles = (rolesData?.map((r) => r.role_type as RoleType) || []);

    return { planTier, roles };
  } catch (err) {
    console.error('Exception fetching user types:', err);
    return { planTier: PlanTier.FREE_USER, roles: [] };
  }
}

/**
 * Clear user type cache (placeholder for future caching implementation)
 */
export function clearUserTypeCache(userId: string): void {
  // Placeholder function for future caching implementation
  // Currently does nothing as we don't have caching implemented
  console.log('Clearing user type cache for user:', userId);
}

/**
 * Check if a user has moderator role
 */
export async function isUserModerator(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('role_type', 'moderator')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected when user is not a moderator
      console.error('Error checking moderator status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Exception checking moderator status:', err);
    return false;
  }
}

/**
 * Check if a user has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_user_admin', { p_user_id: userId });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data || false;
  } catch (err) {
    console.error('Exception checking admin status:', err);
    return false;
  }
}

/**
 * Check if a user has moderator OR admin role
 */
export async function isUserModeratorOrAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .in('role_type', ['moderator', 'admin'])
      .eq('is_active', true);

    if (error) {
      console.error('Error checking moderator/admin status:', error);
      return false;
    }

    return (data && data.length > 0) || false;
  } catch (err) {
    console.error('Exception checking moderator/admin status:', err);
    return false;
  }
}

/**
 * Get all active roles for a user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_roles', { p_user_id: userId });

    if (error) {
      console.error('Error getting user roles:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception getting user roles:', err);
    return [];
  }
}

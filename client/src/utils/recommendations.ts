import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export interface RecommendedUser extends UserProfile {
  mutual_follows?: number;
  posts_count?: number;
  followers_count?: number;
  recent_activity?: boolean;
  reason?: string;
}

export async function getRecommendedUsers(
  currentUserId: string,
  limit: number = 8
): Promise<RecommendedUser[]> {
  try {
    // Step 1: Get users the current user is already following
    const { data: followingData, error: followingError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (followingError) {
      console.error('Error fetching following data:', followingError);
      // Continue with empty array if follows table doesn't exist or has issues
    }

    const followingIds = followingData?.map(f => f.following_id) || [];

    // Step 2: Get all user profiles except current user and followed users
    let query = supabase
      .from('user_profiles')
      .select('*')
      .neq('user_id', currentUserId)
      .limit(limit * 3); // Get more than needed for filtering

    // If user follows people, exclude them
    if (followingIds.length > 0) {
      // Use NOT IN with individual conditions to avoid SQL syntax issues
      for (const followingId of followingIds) {
        query = query.neq('user_id', followingId);
      }
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error getting users:', usersError);
      throw usersError;
    }
    
    if (!users || users.length === 0) {
      return [];
    }

    // Step 3: Enhance recommendations with additional data
    const enhancedRecommendations = await Promise.all(
      users.slice(0, limit).map(async (user) => {
        // Check for mutual follows (only if we have following data and no error)
        let mutualCount = 0;
        if (followingIds.length > 0 && !followingError) {
          try {
            const { data: mutualData, error: mutualError } = await supabase
              .from('user_follows')
              .select('following_id')
              .eq('follower_id', user.user_id);

            if (!mutualError && mutualData) {
              const userFollowingIds = mutualData.map(f => f.following_id);
              mutualCount = followingIds.filter(id => userFollowingIds.includes(id)).length;
            }
          } catch (mutualError) {
            console.error('Error checking mutual follows:', mutualError);
            // Continue without mutual follow data
          }
        }

        // Get user stats
        let userStats = { posts_count: 0, followers_count: 0, last_active: null };
        try {
          const { data: statsData, error: statsError } = await supabase
            .from('user_stats')
            .select('posts_count, followers_count, last_active')
            .eq('user_id', user.user_id)
            .single();

          if (!statsError && statsData) {
            userStats = statsData;
          }
        } catch (statsError) {
          console.error('Error fetching user stats:', statsError);
          // Continue with default stats
        }

        // Check recent activity (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentActivity = userStats.last_active && 
          new Date(userStats.last_active) > weekAgo;

        // Determine recommendation reason
        let reason = 'New creator in the community';
        if (mutualCount > 0) {
          reason = `${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`;
        } else if (recentActivity) {
          reason = 'Recently active creator';
        } else if (userStats.followers_count > 10) {
          reason = 'Popular creator';
        }

        return {
          ...user,
          mutual_follows: mutualCount,
          posts_count: userStats.posts_count || 0,
          followers_count: userStats.followers_count || 0,
          recent_activity: recentActivity,
          reason,
        };
      })
    );

    // Step 4: Sort by recommendation quality
    const sortedRecommendations = enhancedRecommendations
      .sort((a, b) => {
        // Prioritize mutual follows
        if (a.mutual_follows !== b.mutual_follows) {
          return (b.mutual_follows || 0) - (a.mutual_follows || 0);
        }
        // Then recent activity
        if (a.recent_activity !== b.recent_activity) {
          return a.recent_activity ? -1 : 1;
        }
        // Finally follower count
        return (b.followers_count || 0) - (a.followers_count || 0);
      })
      .slice(0, limit);

    return sortedRecommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

export async function followUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

export async function checkIfFollowing(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

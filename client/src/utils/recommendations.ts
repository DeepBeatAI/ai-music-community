import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export interface RecommendedUser extends UserProfile {
  mutual_follows?: number;
  posts_count?: number;
  followers_count?: number;
  recent_activity?: boolean;
  reason?: string;
  score?: number;
}

export async function getRecommendedUsers(
  currentUserId: string,
  limit: number = 8
): Promise<RecommendedUser[]> {
  try {
    // Get users the current user is already following
    const { data: followingData } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = followingData?.map(f => f.following_id) || [];

    // Get potential recommendations - simple query first
    const { data: recommendations, error } = await supabase
      .from('user_profiles')
      .select('*')
      .not('user_id', 'in', `(${[currentUserId, ...followingIds].join(',')})`)
      .limit(limit * 2); // Get more to filter and rank

    if (error) throw error;
    if (!recommendations) return [];

    // Enhanced recommendations with simple scoring
    const enhancedRecommendations = recommendations.map(user => {
      let score = Math.random() * 5; // Random baseline score
      let reason = 'Active creator in the community';

      // Simple scoring based on creation date (newer users get bonus)
      const userAge = Date.now() - new Date(user.created_at).getTime();
      const monthInMs = 30 * 24 * 60 * 60 * 1000;
      if (userAge < monthInMs) {
        score += 2;
        reason = 'New creator to welcome';
      }

      return {
        ...user,
        mutual_follows: 0,
        posts_count: 0,
        followers_count: 0,
        recent_activity: false,
        reason,
        score
      };
    });

    // Sort by score and return limited results
    return enhancedRecommendations
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
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

    // Create activity for the follow action
    await supabase
      .from('user_activities')
      .insert({
        user_id: currentUserId,
        activity_type: 'user_followed',
        target_user_id: targetUserId,
        is_public: true
      });

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

// Get trending content for the "Trending This Week" section
export async function getTrendingContent(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles!posts_user_id_fkey(id, username),
        post_likes(count)
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Trending content error:', error);
    return [];
  }
}

// Get featured creators based on activity and engagement
export async function getFeaturedCreators(limit: number = 6) {
  try {
    console.log('getFeaturedCreators');
    
    // First, get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profilesError) {
      console.error('Featured creators error:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get user IDs for stats lookup
    const userIds = profiles.map(p => p.user_id);

    // Get user stats for these profiles
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, posts_count, audio_posts_count, followers_count, likes_received')
      .in('user_id', userIds);

    if (statsError) {
      console.error('User stats error:', statsError);
      // Continue without stats rather than failing completely
    }

    // Merge profiles with stats
    const statsMap = new Map((stats || []).map(s => [s.user_id, s]));
    const result = profiles.map(profile => ({
      ...profile,
      user_stats: statsMap.get(profile.user_id) || {
        posts_count: 0,
        audio_posts_count: 0,
        followers_count: 0,
        likes_received: 0
      }
    }));

    return result;
  } catch (error) {
    console.error('Featured creators error:', error);
    return [];
  }
}

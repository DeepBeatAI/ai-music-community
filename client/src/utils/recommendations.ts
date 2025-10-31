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

    // Get potential recommendations first
    let query = supabase
      .from('user_profiles')
      .select('*')
      .not('user_id', 'eq', currentUserId);
    
    // Exclude users already following
    if (followingIds.length > 0) {
      query = query.not('user_id', 'in', `(${followingIds.join(',')})`);
    }
    
    const { data: recommendations, error } = await query.limit(limit * 3); // Get more to filter and rank

    if (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
    if (!recommendations || recommendations.length === 0) {
      console.log('No recommendations found in initial query, trying fallback');
      // Fallback: get any users except current user
      const { data: fallbackUsers } = await supabase
        .from('user_profiles')
        .select('*')
        .not('user_id', 'eq', currentUserId)
        .limit(limit);
      
      if (!fallbackUsers || fallbackUsers.length === 0) {
        console.log('No users found even in fallback');
        return [];
      }
      
      // Get stats for fallback users
      const fallbackUserIds = fallbackUsers.map(u => u.user_id);
      const { data: fallbackStats } = await supabase
        .from('user_stats')
        .select('user_id, posts_count, audio_posts_count, followers_count, likes_received, last_active')
        .in('user_id', fallbackUserIds);
      
      const fallbackStatsMap = new Map((fallbackStats || []).map(s => [s.user_id, s]));
      
      return fallbackUsers.map(user => {
        const stats = fallbackStatsMap.get(user.user_id) || {
          posts_count: 0,
          audio_posts_count: 0,
          followers_count: 0,
          likes_received: 0,
          last_active: null
        };
        
        // Even in fallback, try to give meaningful reasons
        let reason = 'Community member';
        const audioPostsCount = stats.audio_posts_count || 0;
        const followersCount = stats.followers_count || 0;
        
        if (audioPostsCount > 0) {
          reason = `AI music creator with ${audioPostsCount} audio ${audioPostsCount === 1 ? 'track' : 'tracks'}`;
        } else if (followersCount > 5) {
          reason = `Popular creator with ${followersCount} followers`;
        } else if (stats.posts_count && stats.posts_count > 0) {
          reason = 'Active creator in the community';
        }
        
        return {
          ...user,
          mutual_follows: 0,
          posts_count: stats.posts_count || 0,
          followers_count: followersCount,
          recent_activity: false,
          reason,
          score: Math.random()
        };
      });
    }

    console.log(`Found ${recommendations.length} potential recommendations`);

    // Get user stats for recommendations
    const recommendationIds = recommendations.map(r => r.user_id);
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, posts_count, audio_posts_count, followers_count, likes_received, last_active')
      .in('user_id', recommendationIds);

    if (statsError) {
      console.error('User stats error in recommendations:', statsError);
      // Continue without stats rather than failing
    }

    // Create stats map
    const statsMap = new Map((userStats || []).map(s => [s.user_id, s]));

    // Calculate mutual follows count for each recommendation
    const { data: mutualFollowsData } = await supabase
      .from('user_follows')
      .select('following_id')
      .in('follower_id', followingIds)
      .in('following_id', recommendationIds);

    // Create mutual follows count map
    const mutualFollowsMap = new Map<string, number>();
    mutualFollowsData?.forEach(follow => {
      const current = mutualFollowsMap.get(follow.following_id) || 0;
      mutualFollowsMap.set(follow.following_id, current + 1);
    });

    // Enhanced recommendations with intelligent scoring
    const enhancedRecommendations = recommendations.map(user => {
      let score = Math.random() * 2; // Smaller random baseline
      let reason = 'Active creator in the community';
      const stats = statsMap.get(user.user_id) || {
        posts_count: 0,
        audio_posts_count: 0,
        followers_count: 0,
        likes_received: 0,
        last_active: null
      };

      // Mutual connections scoring (highest priority)
      const mutualFollows = mutualFollowsMap.get(user.user_id) || 0;
      if (mutualFollows > 0) {
        score += mutualFollows * 3; // High weight for mutual connections
        reason = `Followed by ${mutualFollows} ${mutualFollows === 1 ? 'person' : 'people'} you follow`;
      }

      // Activity patterns scoring
      const postsCount = stats.posts_count || 0;
      const audioPostsCount = stats.audio_posts_count || 0;
      if (audioPostsCount > 0) {
        score += audioPostsCount * 0.5;
        if (mutualFollows === 0) {
          reason = `AI music creator with ${audioPostsCount} audio ${audioPostsCount === 1 ? 'track' : 'tracks'}`;
        }
      }
      if (postsCount > 5) {
        score += 2; // Active creators
      }

      // Recent activity scoring
      const lastActive = stats.last_active ? new Date(stats.last_active) : new Date(user.created_at);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceActive <= 7) {
        score += 1.5;
      }

      // Engagement metrics scoring
      const likesReceived = stats.likes_received || 0;
      const followersCount = stats.followers_count || 0;
      
      if (likesReceived > 10) {
        score += Math.min(likesReceived / 10, 3); // Cap at 3 points
      }
      
      if (followersCount > 5 && mutualFollows === 0 && audioPostsCount === 0) {
        score += Math.min(followersCount / 10, 2); // Popular creators
        reason = `Popular creator with ${followersCount} followers`;
      }

      // New creator bonus (lower priority now)
      const userAge = Date.now() - new Date(user.created_at).getTime();
      const monthInMs = 30 * 24 * 60 * 60 * 1000;
      if (userAge < monthInMs && mutualFollows === 0 && audioPostsCount === 0 && followersCount <= 5) {
        score += 1;
        reason = 'New creator to welcome';
      }

      console.log(`User ${user.username}: score=${score.toFixed(2)}, reason="${reason}", mutual=${mutualFollows}, audio=${audioPostsCount}, followers=${followersCount}`);

      return {
        ...user,
        mutual_follows: mutualFollows,
        posts_count: postsCount,
        followers_count: followersCount,
        recent_activity: daysSinceActive <= 7,
        reason,
        score
      };
    });

    // Sort by score and return limited results
    const result = enhancedRecommendations
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
    
    console.log(`Returning ${result.length} recommendations after scoring and sorting`);
    return result;
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

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}



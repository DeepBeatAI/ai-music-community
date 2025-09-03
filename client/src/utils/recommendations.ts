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

    // Get mutual connections - users followed by people I follow
    let mutualConnectionUserIds: string[] = [];
    if (followingIds.length > 0) {
      const { data: mutualData } = await supabase
        .from('user_follows')
        .select('following_id')
        .in('follower_id', followingIds)
        .not('following_id', 'eq', currentUserId);
      
      if (mutualData && mutualData.length > 0) {
        const mutualFollowIds = mutualData.map(f => f.following_id);
        const filteredMutualIds = mutualFollowIds.filter(id => !followingIds.includes(id));
        mutualConnectionUserIds = [...new Set(filteredMutualIds)];
      }
    }

    // Get potential recommendations first
    const { data: recommendations, error } = await supabase
      .from('user_profiles')
      .select('*')
      .not('user_id', 'in', `(${[currentUserId, ...followingIds].join(',')})`)
      .limit(limit * 3); // Get more to filter and rank

    if (error) throw error;
    if (!recommendations) return [];

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
      if (userAge < monthInMs && mutualFollows === 0) {
        score += 1;
        reason = 'New creator to welcome';
      }

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
    
    // If no recommendations found, show some users they're not following as fallback
    if (result.length === 0) {
      const { data: fallbackUsers } = await supabase
        .from('user_profiles')
        .select('*')
        .not('user_id', 'eq', currentUserId)
        .limit(limit);
      
      if (fallbackUsers && fallbackUsers.length > 0) {
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
          
          return {
            ...user,
            mutual_follows: 0,
            posts_count: stats.posts_count || 0,
            followers_count: stats.followers_count || 0,
            recent_activity: false,
            reason: 'Community member',
            score: Math.random()
          };
        });
      }
    }

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
export async function getFeaturedCreators(limit: number = 6, currentUserId?: string) {
  try {
    console.log('getFeaturedCreators');
    
    // Get user profiles first
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('user_id', 'eq', currentUserId || '')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter and rank

    if (profilesError) {
      console.error('Featured creators profiles error:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get user stats for these profiles
    const userIds = profiles.map(p => p.user_id);
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, posts_count, audio_posts_count, followers_count, likes_received, last_active')
      .in('user_id', userIds);

    if (statsError) {
      console.error('User stats error:', statsError);
      // Continue without stats rather than failing
    }

    // Create stats map
    const statsMap = new Map((userStats || []).map(s => [s.user_id, s]));

    // Enhanced featured creators with intelligent scoring
    const scoredCreators = profiles.map(creator => {
      let score = 0;
      let reason = 'Featured creator';
      const stats = statsMap.get(creator.user_id) || {
        posts_count: 0,
        audio_posts_count: 0,
        followers_count: 0,
        likes_received: 0,
        last_active: null
      };

      // Audio content creators get priority
      const audioPostsCount = stats.audio_posts_count || 0;
      if (audioPostsCount > 0) {
        score += audioPostsCount * 2;
        reason = `AI music creator with ${audioPostsCount} audio ${audioPostsCount === 1 ? 'track' : 'tracks'}`;
      }

      // Active creators (more posts = higher score)
      const postsCount = stats.posts_count || 0;
      score += Math.min(postsCount * 0.5, 5); // Cap at 5 points for posts

      // Engagement metrics
      const likesReceived = stats.likes_received || 0;
      const followersCount = stats.followers_count || 0;
      
      if (likesReceived > 5) {
        score += Math.min(likesReceived / 5, 4); // Cap at 4 points for likes
      }
      
      if (followersCount > 3) {
        score += Math.min(followersCount / 3, 3); // Cap at 3 points for followers
        if (audioPostsCount === 0) {
          reason = `Popular creator with ${followersCount} followers`;
        }
      }

      // Recent activity bonus
      const lastActive = stats.last_active ? new Date(stats.last_active) : new Date(creator.created_at);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceActive <= 7) {
        score += 2;
        if (!audioPostsCount && !followersCount) {
          reason = 'Recently active creator';
        }
      }

      // Boost for well-rounded creators
      if (audioPostsCount > 0 && followersCount > 2 && likesReceived > 3) {
        score += 3;
        reason = 'Rising AI music creator';
      }

      // Add some randomness to avoid always showing the same creators
      score += Math.random() * 2;

      return {
        ...creator,
        user_stats: {
          posts_count: postsCount,
          audio_posts_count: audioPostsCount,
          followers_count: followersCount,
          likes_received: likesReceived,
          last_active: stats.last_active
        },
        score,
        reason
      };
    });

    // Sort by score and return limited results
    const result = scoredCreators
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // If no results, and we're excluding current user, show everyone else
    if (result.length === 0 && currentUserId) {
      const { data: allProfiles } = await supabase
        .from('user_profiles')
        .select('*')
        .not('user_id', 'eq', currentUserId)
        .limit(limit);
      
      if (allProfiles && allProfiles.length > 0) {
        const allUserIds = allProfiles.map(p => p.user_id);
        const { data: allStats } = await supabase
          .from('user_stats')
          .select('user_id, posts_count, audio_posts_count, followers_count, likes_received, last_active')
          .in('user_id', allUserIds);
        
        const allStatsMap = new Map((allStats || []).map(s => [s.user_id, s]));
        
        return allProfiles.map(profile => ({
          ...profile,
          user_stats: allStatsMap.get(profile.user_id) || {
            posts_count: 0,
            audio_posts_count: 0,
            followers_count: 0,
            likes_received: 0,
            last_active: null
          },
          reason: 'Community member'
        }));
      }
    }

    return result;
  } catch (error) {
    console.error('Featured creators error:', error);
    return [];
  }
}

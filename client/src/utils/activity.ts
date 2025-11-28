import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/types';

export interface Activity {
  id: string;
  created_at: string;
  user_id: string;
  activity_type: 'post_created' | 'post_liked' | 'user_followed' | 'comment_created' | 'audio_uploaded';
  target_user_id?: string;
  target_post_id?: string;
  metadata?: Record<string, unknown>;
  is_public: boolean;
  // Joined data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  target_user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  posts?: {
    content: string;
    post_type: string;
    track_id?: string;
    track?: {
      id: string;
      title: string;
      file_url: string;
      duration?: number;
    };
    // DEPRECATED: Keep for backward compatibility during transition
    audio_filename?: string;
  };
}

export interface ActivityFeedItem {
  id: string;
  created_at: string;
  seen: boolean;
  relevance_score: number;
  activity: Activity;
}

export interface UserStats {
  id: string;
  user_id: string;
  posts_count: number;
  audio_posts_count: number;
  likes_given: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  total_plays: number;
  last_active: string;
  updated_at: string;
}

/**
 * Get activity feed for a user - SIMPLIFIED VERSION
 */
export const getActivityFeed = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ApiResponse<ActivityFeedItem[]>> => {
  try {
    console.log('Fetching activity feed for user:', userId);
    
    // Step 1: Get activity feed entries
    const { data: feedEntries, error: feedError } = await supabase
      .from('activity_feed')
      .select('id, created_at, seen, relevance_score, activity_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (feedError) {
      console.error('Error fetching activity feed entries:', feedError);
      throw feedError;
    }

    console.log('Feed entries found:', feedEntries?.length || 0);

    if (!feedEntries || feedEntries.length === 0) {
      return { data: [], error: null };
    }

    // Step 2: Get activity IDs
    const activityIds = feedEntries.map(entry => entry.activity_id);
    console.log('Activity IDs to fetch:', activityIds);

    // Step 3: Get activities with user info
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('id, created_at, user_id, activity_type, target_user_id, target_post_id, metadata, is_public')
      .in('id', activityIds);

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      throw activitiesError;
    }

    console.log('Activities found:', activities?.length || 0);

    if (!activities || activities.length === 0) {
      return { data: [], error: null };
    }

    // Step 4: Get user profiles for the activities
    const userIds = [...new Set(activities.map(a => a.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Don't throw, just continue with empty profiles
    }

    console.log('Profiles found:', profiles?.length || 0);

    // Step 5: Create a profiles map
    const profilesMap = new Map();
    (profiles || []).forEach(profile => {
      profilesMap.set(profile.user_id, profile);
    });

    // Step 6: Create activities map
    const activitiesMap = new Map();
    activities.forEach(activity => {
      const userProfile = profilesMap.get(activity.user_id);
      activitiesMap.set(activity.id, {
        ...activity,
        user_profiles: userProfile || { username: 'Unknown User' }
      });
    });

    // Step 7: Combine everything
    const result: ActivityFeedItem[] = feedEntries
      .map(entry => {
        const activity = activitiesMap.get(entry.activity_id);
        if (!activity) {
          console.warn('Activity not found for feed entry:', entry.activity_id);
          return null;
        }

        return {
          id: entry.id,
          created_at: entry.created_at,
          seen: entry.seen,
          relevance_score: entry.relevance_score,
          activity: activity as Activity
        };
      })
      .filter(item => item !== null) as ActivityFeedItem[];

    console.log('Final result:', result.length, 'items');
    return { data: result, error: null };

  } catch (error) {
    console.error('Error in getActivityFeed:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to fetch activity feed' 
    };
  }
};

/**
 * Mark activity feed items as seen
 */
export const markActivitiesAsSeen = async (
  userId: string,
  activityIds: string[]
): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('activity_feed')
      .update({ seen: true })
      .eq('user_id', userId)
      .in('id', activityIds);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error marking activities as seen:', error);
    return { data: null, error: 'Failed to mark activities as seen' };
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (userId: string): Promise<ApiResponse<UserStats>> => {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      const defaultStats: Partial<UserStats> = {
        user_id: userId,
        posts_count: 0,
        audio_posts_count: 0,
        likes_given: 0,
        likes_received: 0,
        followers_count: 0,
        following_count: 0,
        total_plays: 0,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return { data: defaultStats as UserStats, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { data: null, error: 'Failed to fetch user statistics' };
  }
};

/**
 * Format activity for display
 */
export const formatActivityMessage = (activity: Activity): string => {
  const username = activity.user_profiles?.username || 'Someone';
  const targetUsername = activity.target_user_profiles?.username || 'someone';

  switch (activity.activity_type) {
    case 'post_created':
      const postType = activity.metadata?.post_type || 'text';
      return `${username} created a new ${postType} post`;
    
    case 'post_liked':
      return `${username} liked ${targetUsername}'s post`;
    
    case 'user_followed':
      return `${username} followed ${targetUsername}`;
    
    case 'comment_created':
      return `${username} commented on ${targetUsername}'s post`;
    
    case 'audio_uploaded':
      return `${username} uploaded new audio`;
    
    default:
      return `${username} did something`;
  }
};

/**
 * Get activity icon
 */
export const getActivityIcon = (activityType: string): string => {
  switch (activityType) {
    case 'post_created': return '📝';
    case 'post_liked': return '❤️';
    case 'user_followed': return '👥';
    case 'comment_created': return '💬';
    case 'audio_uploaded': return '🎵';
    default: return '📢';
  }
};

/**
 * Real-time activity subscription - simplified
 */
export const subscribeToActivityFeed = (
  userId: string,
  onNewActivity: (activity: ActivityFeedItem) => void
) => {
  console.log('Setting up real-time subscription for user:', userId);
  
  const subscription = supabase
    .channel(`activity-feed-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        try {
          console.log('New activity feed item received:', payload.new);
          
          // For real-time updates, we'll refetch the entire feed
          // This is less efficient but more reliable
          const { data } = await getActivityFeed(userId, 1, 0);
          
          if (data && data.length > 0) {
            onNewActivity(data[0]);
          }
        } catch (error) {
          console.error('Error in real-time activity subscription:', error);
        }
      }
    )
    .subscribe();

  return () => {
    console.log('Unsubscribing from activity feed');
    supabase.removeChannel(subscription);
  };
};

// Additional helper functions
export const getUnreadActivityCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

export const updateLastActive = async (userId: string): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Use upsert to create the record if it doesn't exist
    const { error } = await supabase
      .from('user_stats')
      .upsert(
        { 
          user_id: userId, 
          last_active: now,
          updated_at: now,
          // Provide defaults for other columns when creating new record
          posts_count: 0,
          audio_posts_count: 0,
          likes_given: 0,
          likes_received: 0,
          followers_count: 0,
          following_count: 0,
          total_plays: 0
        },
        { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        }
      );
    
    if (error) {
      console.error('Error updating last active:', error);
    }
  } catch (error) {
    console.error('Error updating last active:', error);
  }
};
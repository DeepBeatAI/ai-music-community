import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export interface ActivityFilters {
  following?: boolean;
  activityTypes?: string[];
  timeRange?: 'today' | 'week' | 'month';
}

export interface ActivityFeedItem {
  id: string;
  created_at: string;
  activity_type: string;
  user_profile: UserProfile;
  target_user_profile?: UserProfile;
  target_post_id?: string;
  target_post?: {
    content: string;
    post_type: string;
    audio_filename?: string;
  };
}

export async function getActivityFeed(
  userId: string,
  filters: ActivityFilters = {},
  page: number = 0,
  limit: number = 10
): Promise<ActivityFeedItem[]> {
  try {
    const offset = page * limit;
    
    // When filtering by activity types, we need to get more results initially
    // because post-processing will filter out many results
    const queryLimit = filters.activityTypes && filters.activityTypes.length > 0 ? limit * 10 : limit;
    
    // Build the base query
    let query = supabase
      .from('user_activities')
      .select(`
        id,
        created_at,
        activity_type,
        user_id,
        target_user_id,
        target_post_id
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Apply following filter
    if (filters.following) {
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        query = query.in('user_id', followingIds);
      } else {
        return []; // User follows no one
      }
    }

    // Apply activity type filters - handle audio mapping at query level
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      // Create expanded filter list that includes related activities for audio filtering
      let expandedFilters = [...filters.activityTypes];
      if (filters.activityTypes.includes('audio_uploaded')) {
        // When filtering for audio, only include post_created to get audio post creations
        if (!expandedFilters.includes('post_created')) {
          expandedFilters.push('post_created');
        }
        // Don't automatically include post_liked for audio filtering
      }
      query = query.in('activity_type', expandedFilters);
    }

    // Apply time range filter - default to month if not specified
    const effectiveTimeRange = filters.timeRange || 'month';
    const timeMap = {
      today: new Date(Date.now() - 24 * 60 * 60 * 1000),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };
    query = query.gte('created_at', timeMap[effectiveTimeRange].toISOString());

    // Apply the query limit
    query = query.limit(queryLimit);

    const { data: activities, error } = await query;
    
    if (error) throw error;
    if (!activities || activities.length === 0) return [];

    // Get unique user IDs for profile lookup
    const userIds = [...new Set([
      ...activities.map(a => a.user_id),
      ...activities.filter(a => a.target_user_id).map(a => a.target_user_id)
    ].filter(Boolean))];

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, id, username, created_at, updated_at')
      .in('user_id', userIds);

    // Get unique post IDs for post lookup
    const postIds = activities
      .filter(a => a.target_post_id)
      .map(a => a.target_post_id);

    let posts: any[] = [];
    if (postIds.length > 0) {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, post_type, audio_filename')
        .in('id', postIds);
      posts = postsData || [];
    }

    // Create lookup maps
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const postMap = new Map(posts.map(p => [p.id, p]));

    // Map activities to ActivityFeedItem format and apply additional filtering
    let result: ActivityFeedItem[] = activities.map(activity => {
      const userProfile = profileMap.get(activity.user_id);
      const targetUserProfile = activity.target_user_id 
        ? profileMap.get(activity.target_user_id) 
        : undefined;
      const targetPost = activity.target_post_id 
        ? postMap.get(activity.target_post_id) 
        : undefined;

      return {
        id: activity.id,
        created_at: activity.created_at,
        activity_type: activity.activity_type,
        user_profile: userProfile || {
          id: activity.user_id,
          user_id: activity.user_id,
          username: 'Unknown User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_user_profile: targetUserProfile,
        target_post_id: activity.target_post_id,
        target_post: targetPost
      };
    });

    // Apply post-processing filters for audio content
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      result = result.filter(activity => {
        const filterTypes = filters.activityTypes!;
        const hasAudioFilter = filterTypes.includes('audio_uploaded');
        const hasPostFilter = filterTypes.includes('post_created');
        const hasLikeFilter = filterTypes.includes('post_liked');
        
        // Handle activities related to audio posts
        if (activity.target_post?.post_type === 'audio') {
          // For audio posts, "New Audio" filter should only show post creations
          if (activity.activity_type === 'post_created') {
            return hasAudioFilter || hasPostFilter;
          }
          // Likes on audio posts should only show if "Likes" filter is selected
          if (activity.activity_type === 'post_liked') {
            return hasLikeFilter; // Don't include in audio filter
          }
        }
        
        // Handle activities related to text posts
        if (activity.activity_type === 'post_created' && activity.target_post?.post_type === 'text') {
          return hasPostFilter;
        }
        
        if (activity.activity_type === 'post_liked' && activity.target_post?.post_type === 'text') {
          return hasLikeFilter;
        }
        
        // Handle other activity types normally (user_followed, etc.)
        if (!activity.target_post) {
          return filterTypes.includes(activity.activity_type);
        }
        
        return false;
      });
    }

    // Apply pagination after post-processing
    const startIndex = offset;
    const endIndex = startIndex + limit;
    result = result.slice(startIndex, endIndex);

    return result;
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}

export function formatActivityMessage(activity: ActivityFeedItem): string {
  const username = activity.user_profile?.username || 'Someone';
  const targetUsername = activity.target_user_profile?.username || 'someone';

  switch (activity.activity_type) {
    case 'post_created':
      // Check if it's an audio post
      if (activity.target_post?.post_type === 'audio') {
        return `uploaded new audio`;
      }
      return `created a new post`;
    case 'audio_uploaded':
      return `uploaded new audio`;
    case 'post_liked':
      return `liked ${targetUsername}'s post`;
    case 'user_followed':
      return `followed ${targetUsername}`;
    default:
      return `performed an action`;
  }
}

export function getActivityIcon(activityType: string): string {
  switch (activityType) {
    case 'post_created': return '📝';
    case 'audio_uploaded': return '♪';
    default: return '📢';
  }
}

export function getActivityIconForPost(activityType: string, postType?: string): string {
  // Audio creation gets blue music note
  if (activityType === 'post_created' && postType === 'audio') {
    return '🎵'; // Use the blue music note for audio post creation
  }
  
  // Likes keep their heart symbol regardless of post type
  if (activityType === 'post_liked') {
    return '❤️'; // Always heart for likes
  }
  
  // Other activity types
  switch (activityType) {
    case 'post_created': return '📝';
    case 'audio_uploaded': return '🎵';
    case 'user_followed': return '👥';
    default: return '📢';
  }
}

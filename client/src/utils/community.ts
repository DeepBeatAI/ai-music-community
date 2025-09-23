import { supabase } from '@/lib/supabase';
import { ApiResponse, PostLike, UserFollow } from '@/types';
import { triggerStatsUpdate } from './userStats';

// Post Likes
export const togglePostLike = async (
  postId: string, 
  userId: string, 
  isCurrentlyLiked: boolean
): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[LIKE-${requestId}] Starting togglePostLike:`, { postId, userId, isCurrentlyLiked });
  
  try {
    // Get post owner to know which users' stats will be affected
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    if (isCurrentlyLiked) {
      console.log(`[LIKE-${requestId}] Attempting DELETE from post_likes`);
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      console.log(`[LIKE-${requestId}] DELETE result:`, { error });
      if (error) throw error;
    } else {
      console.log(`[LIKE-${requestId}] Attempting INSERT into post_likes`);
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      console.log(`[LIKE-${requestId}] INSERT result:`, { error });
      if (error) throw error;
    }

    console.log(`[LIKE-${requestId}] Getting updated count`);
    const { count, error: countError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    console.log(`[LIKE-${requestId}] Count result:`, { count, countError });
    if (countError) throw countError;

    // Trigger stats update for both the liker and post owner
    triggerStatsUpdate([userId, post.user_id]).catch(err => 
      console.error('Failed to update stats after like action:', err)
    );

    console.log(`[LIKE-${requestId}] SUCCESS - Returning result`);
    return { 
      data: { liked: !isCurrentlyLiked, likeCount: count || 0 }, 
      error: null 
    };
  } catch (error) {
    console.error(`[LIKE-${requestId}] ERROR CAUGHT:`, error);
    console.error(`[LIKE-${requestId}] Error object details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    const errorMessage = error instanceof Error ? error.message : 
                        (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    return { 
      data: null, 
      error: `Failed to update like status: ${errorMessage}` 
    };
  }
};

export const getPostLikeStatus = async (
  postId: string, 
  userId: string
): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> => {
  try {
    const [likeStatus, likeCount] = await Promise.all([
      supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
    ]);

    return {
      data: {
        liked: !likeStatus.error,
        likeCount: likeCount.count || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting post like status:', error);
    return { 
      data: { liked: false, likeCount: 0 }, 
      error: null 
    };
  }
};

// User Follows
export const toggleUserFollow = async (
  followingId: string, 
  followerId: string, 
  isCurrentlyFollowing: boolean
): Promise<ApiResponse<{ following: boolean; followerCount: number }>> => {
  try {
    if (isCurrentlyFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('following_id', followingId)
        .eq('follower_id', followerId);

      if (error) throw error;
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({ following_id: followingId, follower_id: followerId });

      if (error) throw error;
    }

    // Get updated follower count
    const { count } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', followingId);

    // Trigger stats update for both the follower and the followed user
    triggerStatsUpdate([followerId, followingId]).catch(err => 
      console.error('Failed to update stats after follow action:', err)
    );

    return { 
      data: { following: !isCurrentlyFollowing, followerCount: count || 0 }, 
      error: null 
    };
  } catch (error) {
    console.error('Error toggling user follow:', error);
    console.error('Error object details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    const errorMessage = error instanceof Error ? error.message : 
                        (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    return { 
      data: null, 
      error: `Failed to update follow status: ${errorMessage}` 
    };
  }
};

export const getUserFollowStatus = async (
  followingId: string, 
  followerId: string
): Promise<ApiResponse<{ following: boolean; followerCount: number; followingCount: number }>> => {
  try {
    const [followStatus, followerCount, followingCount] = await Promise.all([
      supabase
        .from('user_follows')
        .select('id')
        .eq('following_id', followingId)
        .eq('follower_id', followerId)
        .single(),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', followingId),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followingId)
    ]);

    return {
      data: {
        following: !followStatus.error,
        followerCount: followerCount.count || 0,
        followingCount: followingCount.count || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting user follow status:', error);
    return { 
      data: { following: false, followerCount: 0, followingCount: 0 }, 
      error: null 
    };
  }
};

// Notification helpers
export const createNotification = async (
  userId: string,
  type: 'like' | 'follow' | 'comment' | 'post',
  title: string,
  message?: string,
  relatedPostId?: string,
  relatedUserId?: string,
  data?: any
): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_post_id: relatedPostId,
        related_user_id: relatedUserId,
        data
      });

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error: 'Failed to create notification' };
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { data: null, error: 'Failed to mark notification as read' };
  }
};

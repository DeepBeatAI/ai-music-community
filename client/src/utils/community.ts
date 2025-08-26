import { supabase } from '@/lib/supabase';
import { ApiResponse, PostLike, UserFollow } from '@/types';

// Post Likes
export const togglePostLike = async (
  postId: string, 
  userId: string, 
  isCurrentlyLiked: boolean
): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> => {
  try {
    if (isCurrentlyLiked) {
      // Remove like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;

      // Get updated count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return { 
        data: { liked: false, likeCount: count || 0 }, 
        error: null 
      };
    } else {
      // Add like
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) throw error;

      // Get updated count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return { 
        data: { liked: true, likeCount: count || 0 }, 
        error: null 
      };
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    return { 
      data: null, 
      error: 'Failed to update like status' 
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

    return { 
      data: { following: !isCurrentlyFollowing, followerCount: count || 0 }, 
      error: null 
    };
  } catch (error) {
    console.error('Error toggling user follow:', error);
    return { 
      data: null, 
      error: 'Failed to update follow status' 
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
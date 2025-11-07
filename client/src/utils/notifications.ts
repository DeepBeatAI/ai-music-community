import { supabase } from '@/lib/supabase';
import { ApiResponse, Notification } from '@/types';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  likes_enabled: boolean;
  follows_enabled: boolean;
  comments_enabled: boolean;
  mentions_enabled: boolean;
  system_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get notifications for a user
 */
export const getNotifications = async (
  userId: string,
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<ApiResponse<Notification[]>> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Get unique related user IDs
    const relatedUserIds = [...new Set(
      (data || [])
        .map(n => n.related_user_id)
        .filter(Boolean)
    )] as string[];

    // Fetch related profiles if there are any
    let profilesMap: Record<string, string> = {};
    if (relatedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', relatedUserIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile.username;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Transform data to include default values for missing fields and extract username
    const transformedData: Notification[] = (data || []).map((notification) => {
      return {
        id: notification.id,
        created_at: notification.created_at,
        user_id: notification.user_id,
        type: notification.type as 'like' | 'follow' | 'comment' | 'post' | 'mention' | 'system',
        title: notification.title,
        message: notification.message,
        read: notification.read,
        related_post_id: notification.related_post_id,
        related_user_id: notification.related_user_id,
        related_username: notification.related_user_id ? profilesMap[notification.related_user_id] : undefined,
        action_url: undefined, // Default value since column doesn't exist yet
        icon: getDefaultIcon(notification.type), // Generate icon based on type
        priority: 1, // Default priority
        data: notification.data
      };
    });

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error: 'Failed to fetch notifications' };
  }
};

/**
 * Get default icon for notification type
 */
const getDefaultIcon = (type: string): string => {
  switch (type) {
    case 'like': return '❤️';
    case 'follow': return '👥';
    case 'comment': return '💬';
    case 'post': return '📝';
    case 'mention': return '📢';
    case 'system': return '⚙️';
    default: return '📢';
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = async (
  userId: string,
  notificationIds?: string[]
): Promise<ApiResponse<boolean>> => {
  try {
    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    } else {
      // Mark all as read
      query = query.eq('read', false);
    }

    const { error } = await query;

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return { data: null, error: 'Failed to mark notifications as read' };
  }
};

/**
 * Delete notifications
 */
export const deleteNotifications = async (
  userId: string,
  notificationIds: string[]
): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return { data: null, error: 'Failed to delete notifications' };
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<ApiResponse<NotificationPreferences>> => {
  try {
    // Since notification_preferences table might not exist, return default preferences
    const defaultPrefs: NotificationPreferences = {
      id: 'default',
      user_id: userId,
      likes_enabled: true,
      follows_enabled: true,
      comments_enabled: true,
      mentions_enabled: true,
      system_enabled: true,
      email_notifications: false,
      push_notifications: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { data: defaultPrefs, error: null };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return { data: null, error: 'Failed to fetch notification preferences' };
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<ApiResponse<NotificationPreferences>> => {
  try {
    // For now, just return the updated preferences since table might not exist
    const updatedPrefs: NotificationPreferences = {
      id: 'default',
      user_id: userId,
      likes_enabled: preferences.likes_enabled ?? true,
      follows_enabled: preferences.follows_enabled ?? true,
      comments_enabled: preferences.comments_enabled ?? true,
      mentions_enabled: preferences.mentions_enabled ?? true,
      system_enabled: preferences.system_enabled ?? true,
      email_notifications: preferences.email_notifications ?? false,
      push_notifications: preferences.push_notifications ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { data: updatedPrefs, error: null };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { data: null, error: 'Failed to update notification preferences' };
  }
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (
  userId: string,
  onNewNotification: (notification: Notification) => void,
  onNotificationUpdate: (notification: Notification) => void
) => {
  const subscription = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Transform the payload to include default values
        const notification: Notification = {
          id: payload.new.id,
          created_at: payload.new.created_at,
          user_id: payload.new.user_id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          read: payload.new.read,
          related_post_id: payload.new.related_post_id,
          related_user_id: payload.new.related_user_id,
          data: payload.new.data,
          action_url: undefined,
          icon: getDefaultIcon(payload.new.type),
          priority: 1
        };
        onNewNotification(notification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Transform the payload to include default values
        const notification: Notification = {
          id: payload.new.id,
          created_at: payload.new.created_at,
          user_id: payload.new.user_id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          read: payload.new.read,
          related_post_id: payload.new.related_post_id,
          related_user_id: payload.new.related_user_id,
          data: payload.new.data,
          action_url: undefined,
          icon: getDefaultIcon(payload.new.type),
          priority: 1
        };
        onNotificationUpdate(notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

/**
 * Format notification for display
 */
export const formatNotificationTime = (createdAt: string): string => {
  const now = new Date();
  const notificationTime = new Date(createdAt);
  const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return notificationTime.toLocaleDateString();
};

/**
 * Get notification color based on type and priority
 */
export const getNotificationColor = (type: string, priority: number): string => {
  if (priority >= 3) return 'text-red-400 border-red-500';
  if (type === 'like') return 'text-pink-400 border-pink-500';
  if (type === 'follow') return 'text-blue-400 border-blue-500';
  if (type === 'comment') return 'text-green-400 border-green-500';
  if (type === 'system') return 'text-yellow-400 border-yellow-500';
  return 'text-gray-400 border-gray-500';
};

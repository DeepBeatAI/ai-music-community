'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getNotifications, 
  getUnreadNotificationCount,
  markNotificationsAsRead,
  subscribeToNotifications,
  formatNotificationTime,
  getNotificationColor
} from '@/utils/notifications';
import { Notification } from '@/types';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications with better error handling
  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const offset = reset ? 0 : notifications.length;
      const { data, error } = await getNotifications(user.id, 5, offset);

      if (error) {
        console.error('Error fetching notifications:', error);
        setError('Failed to load notifications');
        return;
      }

      if (data) {
        if (reset) {
          setNotifications(data);
        } else {
          setNotifications(prev => [...prev, ...data]);
        }
        setHasMore(data.length === 5);
      } else {
        // Handle null data case
        if (reset) {
          setNotifications([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Notification fetch error:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, notifications.length]);

  // Fetch unread count with error handling
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Don't show error for unread count, just default to 0
      setUnreadCount(0);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications(true);
      fetchUnreadCount();
    }
  }, [user]);

  // Real-time subscription with error handling
  useEffect(() => {
    if (!user) return;

    try {
      const unsubscribe = subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
        (updatedNotification) => {
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
          if (updatedNotification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up real-time notifications:', error);
      // Continue without real-time updates
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notifications as read when dropdown opens
  useEffect(() => {
    if (isOpen && user && unreadCount > 0) {
      const timer = setTimeout(async () => {
        try {
          await markNotificationsAsRead(user.id);
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
        } catch (error) {
          console.error('Error marking notifications as read:', error);
          // Don't show error to user, just fail silently
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, user, unreadCount]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const loadMore = () => {
    if (!loading && hasMore && !error) {
      fetchNotifications();
    }
  };

  const retryFetch = () => {
    setError(null);
    fetchNotifications(true);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read if it's unread
    if (!notification.read && user) {
      try {
        await markNotificationsAsRead(user.id, [notification.id]);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Close the dropdown
    setIsOpen(false);

    // Navigate based on notification type and data
    switch (notification.type) {
      case 'like':
        if (notification.related_post_id) {
          // TODO: Navigate to post page when implemented
          // For now, go to dashboard where post is visible
          router.push('/dashboard');
        } else {
          router.push('/notifications');
        }
        break;
      case 'follow':
        if (notification.related_user_id) {
          // TODO: Navigate to user profile when implemented
          // For now, go to notifications to see the follow activity
          router.push('/notifications');
        } else {
          router.push('/notifications');
        }
        break;
      case 'comment':
        if (notification.related_post_id) {
          // TODO: Navigate to post page with comments when implemented
          router.push('/dashboard');
        } else {
          router.push('/notifications');
        }
        break;
      case 'post':
        // System notifications about posts
        router.push('/notifications');
        break;
      default:
        // Default to notifications page for all other cases
        router.push('/notifications');
        break;
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && !error && (
                <button
                  onClick={() => fetchNotifications(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                  disabled={loading}
                >
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Activity Feed Link */}
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/feed');
            }}
            className="w-full p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors text-left flex items-center space-x-3"
          >
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
            <span className="text-white font-medium">Activity Feed</span>
          </button>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-400 mb-2">Failed to load notifications</p>
                <p className="text-sm text-gray-500 mb-4">
                  There was an issue loading your notifications. This might be temporary.
                </p>
                <button
                  onClick={retryFetch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">🔔</div>
                <p className="text-gray-400 mb-2">No notifications yet</p>
                <p className="text-sm text-gray-500">
                  We'll notify you when someone likes your posts, follows you, or when there's community activity!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onNotificationClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* View All Link */}
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="w-full text-center text-blue-400 hover:text-blue-300 text-sm transition-colors py-1"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Notification Item
interface NotificationItemProps {
  notification: Notification;
  onNotificationClick: (notification: Notification) => void;
}

function NotificationItem({ notification, onNotificationClick }: NotificationItemProps) {
  const colorClass = getNotificationColor(notification.type, notification.priority || 1);
  const timeAgo = formatNotificationTime(notification.created_at);
  
  // Check if this is a reversal notification
  const isReversal = notification.related_notification_id && 
                     notification.data?.moderation_action === 'action_reversed';

  return (
    <div 
      className={`p-4 hover:bg-gray-750 transition-colors cursor-pointer ${
        !notification.read ? 'bg-gray-800/50' : ''
      }`}
      onClick={() => onNotificationClick(notification)}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${colorClass}`}>
          <span className="text-sm">
            {notification.icon || '📢'}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-medium">
              {notification.type === 'moderation' 
                ? notification.title.replace(/<[^>]*>/g, '')
                : notification.title
              }
            </p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            )}
          </div>
          
          {/* Show reversal badge if this is a reversal notification */}
          {isReversal && (
            <div className="mt-1 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
                ✓ Action Reversed
              </span>
            </div>
          )}
          
          {notification.message && (
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
              {notification.type === 'moderation'
                ? notification.message.replace(/<[^>]*>/g, '')
                : notification.message
              }
            </p>
          )}
          
          <p className="text-gray-500 text-xs mt-2">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}
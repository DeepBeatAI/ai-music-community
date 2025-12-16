'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import FollowButton from '@/components/FollowButton';
import { getNotifications, markNotificationsAsRead } from '@/utils/notifications';
import { Notification } from '@/types';
import { formatTimeAgo } from '@/utils/format';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Helper function to extract username from notification
  const extractUsername = (notification: Notification): string | null => {
    // Try related_username first
    if (notification.related_username) {
      return notification.related_username;
    }
    
    // Extract from title based on notification type
    if (!notification.title) return null;
    
    const title = notification.title;
    let match;
    
    // Try different patterns based on notification type
    switch (notification.type) {
      case 'follow':
        // "Username followed you"
        match = title.match(/^(.+?)\s+followed\s+you/i);
        break;
      case 'like':
        // "Username liked your post"
        match = title.match(/^(.+?)\s+liked\s+your/i);
        break;
      case 'comment':
        // "Username commented on your post"
        match = title.match(/^(.+?)\s+commented\s+on/i);
        break;
      case 'mention':
        // "Username mentioned you"
        match = title.match(/^(.+?)\s+mentioned\s+you/i);
        break;
      case 'post':
        // "Username posted something" or similar
        match = title.match(/^(.+?)\s+posted/i);
        break;
      default:
        // Generic pattern: try to extract username from start of title
        // Assumes format "Username did something"
        match = title.match(/^([^\s]+)/);
        break;
    }
    
    return match ? match[1] : null;
  };

  // Helper function to render username link
  const renderUsernameLink = (username: string) => {
    if (!username) return null;
    
    // Check if username is current user
    const isOwnProfile = username === user?.user_metadata?.username;
    
    if (isOwnProfile) {
      return (
        <span className="font-semibold text-white">
          {username}
        </span>
      );
    }
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/profile/${username}`);
        }}
        className="font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
      >
        {username}
      </button>
    );
  };

  // Helper function to render title with clickable username
  const renderTitleWithUsername = (notification: Notification) => {
    if (!notification.title) {
      return notification.title;
    }

    // Don't add username links for moderation notifications
    if (notification.type === 'moderation') {
      return notification.title;
    }

    const username = extractUsername(notification);
    const title = notification.title;
    
    if (!username || !title.includes(username)) {
      return title;
    }

    // Split title by username
    const parts = title.split(username);
    
    return (
      <>
        {parts[0]}
        {renderUsernameLink(username)}
        {parts.slice(1).join(username)}
      </>
    );
  };

  const loadNotifications = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const limit = 20;
      const offset = pageNum * limit;
      const { data, error } = await getNotifications(user.id, limit, offset, filter === 'unread');
      
      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }
      
      if (data) {
        if (reset) {
          setNotifications(data);
        } else {
          setNotifications(prev => [...prev, ...data]);
        }
        setHasMore(data.length === limit);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Notification fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    // Only redirect if auth is not loading AND user is null
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    // Load notifications once user is available
    if (user && !authLoading) {
      loadNotifications(0, true);
    }
  }, [user, authLoading, router, filter, loadNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const { error } = await markNotificationsAsRead(user.id);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && user) {
      await markNotificationsAsRead(user.id, [notification.id]);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'moderation':
        // Navigate to moderation dashboard for moderation notifications
        router.push('/moderation');
        break;
      case 'follow':
        // Navigate to the follower's profile (the person who followed you)
        // Try related_username first, then extract from title
        let username = notification.related_username;
        
        if (!username && notification.title) {
          // Extract username from title like "Username followed you"
          const match = notification.title.match(/^(.+?)\s+followed\s+you/i);
          if (match) {
            username = match[1];
          }
        }
        
        if (username) {
          router.push(`/profile/${username}`);
        }
        break;
      case 'post':
      case 'like':
        // Navigate to dashboard for post and like events
        router.push('/dashboard');
        break;
      case 'comment':
      case 'mention':
        // Navigate to dashboard for comment and mention events
        router.push('/dashboard');
        break;
      default:
        // For other types, navigate to dashboard if there's a related post
        if (notification.related_post_id) {
          router.push('/dashboard');
        } else if (notification.related_username) {
          router.push(`/profile/${notification.related_username}`);
        }
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1, false);
    }
  };

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Return null only if auth is complete and user is not found
  if (!authLoading && !user) {
    return null;
  }

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || (filter === 'unread' && !n.read)
  );

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-gray-400 text-sm">Stay updated with your community interactions</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
              className="bg-gray-800 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
            </select>
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Mark All Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {filter === 'unread' 
                  ? 'All caught up! Check back later for new notifications.'
                  : 'Notifications will appear here when people interact with your posts, follow you, or when there\'s community activity.'
                }
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Create a Post
                </button>
              </div>
            </div>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors border-l-4 ${
                    !notification.read 
                      ? 'border-blue-500 ring-1 ring-blue-500/30' 
                      : 'border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side: Icon and content */}
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="text-2xl flex-shrink-0">
                        {notification.data?.icon || notification.icon || '📢'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-white' : 'text-gray-300'
                          }`}>
                            {renderTitleWithUsername(notification)}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        {notification.message && (
                          <p className="text-gray-400 text-sm mt-1 break-words">
                            {(() => {
                              const message = notification.message || '';
                              
                              // Don't add username links for moderation notifications
                              if (notification.type === 'moderation') {
                                return message;
                              }
                              
                              const username = extractUsername(notification);
                              
                              if (username && message.includes(username)) {
                                const parts = message.split(username);
                                return (
                                  <>
                                    {parts[0]}
                                    {renderUsernameLink(username)}
                                    {parts.slice(1).join(username)}
                                  </>
                                );
                              }
                              
                              return message;
                            })()}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            notification.type === 'like' ? 'bg-pink-900/30 text-pink-300' :
                            notification.type === 'follow' ? 'bg-blue-900/30 text-blue-300' :
                            notification.type === 'comment' ? 'bg-green-900/30 text-green-300' :
                            'bg-gray-900/30 text-gray-400'
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side: Follow button */}
                    {notification.type === 'follow' && notification.related_user_id && (
                      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                        <FollowButton
                          userId={notification.related_user_id}
                          username={notification.related_username}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/feed')}
              className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-colors"
            >
              <span>📱</span>
              <span className="text-sm">View Activity Feed</span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
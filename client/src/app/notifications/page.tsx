'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
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

  // Helper function to render username link
  const renderUsernameLink = (notification: Notification) => {
    if (!notification.related_username) return null;
    
    // Check if username is current user
    const isOwnProfile = notification.related_username === user?.user_metadata?.username;
    
    if (isOwnProfile) {
      return (
        <span className="font-semibold text-white">
          {notification.related_username}
        </span>
      );
    }
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/profile/${notification.related_username}`);
        }}
        className="font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
      >
        {notification.related_username}
      </button>
    );
  };

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
  }, [user, authLoading, router, filter]);

  const loadNotifications = async (pageNum: number = 0, reset: boolean = false) => {
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
  };

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

    // Navigate based on notification data
    if (notification.related_post_id) {
      router.push(`/dashboard`); // Since you don't have individual post pages yet
    } else if (notification.related_username) {
      // Navigate to the creator's profile
      router.push(`/profile/${notification.related_username}`);
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
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl flex-shrink-0">
                      {notification.data?.icon || notification.icon || '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${
                          !notification.read ? 'text-white' : 'text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      {notification.message && (
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                          {notification.message}
                          {notification.related_username && (
                            <span className="ml-1">
                              by {renderUsernameLink(notification)}
                            </span>
                          )}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
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
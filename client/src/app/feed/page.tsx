'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import ActivityFeedFilters, { ActivityFilters } from '@/components/ActivityFeedFilters';
import { useAuth } from '@/contexts/AuthContext';
import { getActivityFeed, ActivityFeedItem, formatActivityMessage, getActivityIconForPost } from '@/utils/activityFeed';
import { formatTimeAgo } from '@/utils/format';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      // Only redirect if we're sure the user is not authenticated
      // Don't redirect during initial loading
      return;
    }
    loadActivities(0, true);
  }, [user, router, filters]);

  const loadActivities = async (pageNum: number = 0, reset: boolean = false) => {
    setLoading(true);
    try {
      const newActivities = await getActivityFeed(user!.id, filters, pageNum, 10);
      if (reset) {
        setActivities(newActivities);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
      }
      setHasMore(newActivities.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: ActivityFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadActivities(page + 1, false);
    }
  };

  const handleActivityClick = (activity: ActivityFeedItem) => {
    if (activity.target_post_id) {
      router.push(`/post/${activity.target_post_id}`);
    } else if (activity.target_user_profile?.username) {
      router.push(`/profile/${activity.target_user_profile.username}`);
    } else {
      router.push(`/profile/${activity.user_profile.username}`);
    }
  };

  // Show loading state while auth is being determined
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

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-xl font-semibold text-white mb-2">Login Required</h2>
            <p className="text-gray-400 mb-6">
              Please sign in to view your personalized activity feed
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <ActivityFeedFilters 
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
        />

        {/* Activity Feed */}
        <div className="space-y-4">
          {loading && activities.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-xl font-semibold text-white mb-2">No Activity Yet</h2>
              <p className="text-gray-400 mb-6">
                Follow some creators or adjust your filters to see activity here
              </p>
              <button
                onClick={() => router.push('/discover')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Discover Creators
              </button>
            </div>
          ) : (
            <>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getActivityIconForPost(activity.activity_type, activity.target_post?.post_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{activity.user_profile.username}</span>
                        <span className="text-gray-400 text-sm">
                          {formatActivityMessage(activity)}
                        </span>
                      </div>
                      
                      {activity.target_post && (
                        <div className="mt-2 p-2 bg-gray-700 rounded text-sm text-gray-300">
                          {activity.target_post.post_type === 'audio' && activity.target_post.audio_filename ? (
                            <div className="flex items-center space-x-2">
                              <span>🎵</span>
                              <span>{activity.target_post.audio_filename}</span>
                            </div>
                          ) : (
                            <p className="truncate">{activity.target_post.content}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        {formatTimeAgo(activity.created_at)}
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
      </div>
    </MainLayout>
  );
}

'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getActivityFeed, 
  markActivitiesAsSeen, 
  subscribeToActivityFeed,
  formatActivityMessage,
  getActivityIcon,
  ActivityFeedItem 
} from '@/utils/activity';
import { formatTimeAgo } from '@/utils/format';

interface ActivityFeedProps {
  className?: string;
  showHeader?: boolean;
  maxItems?: number;
}

export default function ActivityFeed({ 
  className = '', 
  showHeader = true,
  maxItems = 20 
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Fetch initial activities with better error handling
  const fetchActivities = useCallback(async (reset = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const offset = reset ? 0 : page * maxItems;
      const { data, error } = await getActivityFeed(user.id, maxItems, offset);

      if (error) {
        console.error('Activity feed error:', error);
        setError('Failed to load activity feed');
        return;
      }

      if (data) {
        if (reset) {
          setActivities(data);
          setPage(1);
        } else {
          setActivities(prev => [...prev, ...data]);
          setPage(prev => prev + 1);
        }
        setHasMore(data.length === maxItems);
      } else {
        // Handle null data case
        if (reset) {
          setActivities([]);
          setPage(1);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('Activity feed error:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  }, [user, page, maxItems]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchActivities(true);
    }
  }, [user]);

  // Real-time updates with error handling
  useEffect(() => {
    if (!user) return;

    try {
      const unsubscribe = subscribeToActivityFeed(user.id, (newActivity) => {
        setActivities(prev => [newActivity, ...prev]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up activity feed subscription:', error);
      // Continue without real-time updates
    }
  }, [user]);

  // Mark activities as seen when they come into view
  useEffect(() => {
    if (!user || activities.length === 0) return;

    const unseenActivities = activities
      .filter(item => !item.seen)
      .map(item => item.id);

    if (unseenActivities.length > 0) {
      // Mark as seen after a short delay
      const timer = setTimeout(async () => {
        try {
          await markActivitiesAsSeen(user.id, unseenActivities);
          setActivities(prev => 
            prev.map(item => 
              unseenActivities.includes(item.id) 
                ? { ...item, seen: true }
                : item
            )
          );
        } catch (error) {
          console.error('Error marking activities as seen:', error);
          // Fail silently
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activities, user]);

  const loadMore = () => {
    if (!loading && hasMore && !error) {
      fetchActivities();
    }
  };

  const retryFetch = () => {
    setError(null);
    fetchActivities(true);
  };

  if (!user) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-400">Sign in to see your activity feed</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <h2 className="text-xl font-bold mb-4 text-gray-200">Activity Feed</h2>
        )}
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">⚠️</div>
          <p className="text-red-400 mb-2">Failed to load activity feed</p>
          <p className="text-sm text-gray-500 mb-4">
            There was an issue loading community activities. This might be temporary.
          </p>
          <button
            onClick={retryFetch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading && activities.length === 0) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <h2 className="text-xl font-bold mb-4 text-gray-200">Activity Feed</h2>
        )}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">Activity Feed</h2>
          <button
            onClick={() => fetchActivities(true)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-4xl mb-4">📢</div>
            <p className="text-gray-400 mb-2">No activities yet</p>
            <p className="text-sm text-gray-500">
              Follow other users and interact with posts to see activities here. Community activity will appear as you engage with the platform!
            </p>
          </div>
        ) : (
          activities.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))
        )}

        {hasMore && activities.length > 0 && !error && (
          <div className="text-center py-4">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  item: ActivityFeedItem;
}

function ActivityItem({ item }: ActivityItemProps) {
  const { activity } = item;
  const icon = getActivityIcon(activity.activity_type);
  const message = formatActivityMessage(activity);
  const timeAgo = formatTimeAgo(activity.created_at);

  return (
    <div className={`bg-gray-800 p-4 rounded-lg border-l-4 transition-all ${
      item.seen ? 'border-gray-600' : 'border-blue-500 bg-blue-900/20'
    }`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-lg">{icon}</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-gray-200 text-sm font-medium">
              {message}
            </p>
            {!item.seen && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            )}
          </div>
          
          <p className="text-gray-400 text-xs mt-1">{timeAgo}</p>
          
          {/* Additional context based on activity type */}
          {activity.posts && (
            <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
              <p className="text-gray-300 line-clamp-2">
                {activity.posts.audio_filename || activity.posts.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
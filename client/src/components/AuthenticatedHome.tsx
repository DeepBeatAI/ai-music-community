'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UserRecommendations from './UserRecommendations';
import PostItem from './PostItem';
import { getTrendingContent } from '@/utils/search';
import { getActivityFeed } from '@/utils/activityFeed';

export default function AuthenticatedHome() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHomeContent();
    }
  }, [user]);

  const loadHomeContent = async () => {
    setLoading(true);
    try {
      const [trending, activity] = await Promise.all([
        getTrendingContent(4),
        getActivityFeed(user!.id, { following: true }, 0, 6),
      ]);
      setTrendingPosts(trending);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading home content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome back, {profile?.username || user?.user_metadata?.username || 'Creator'}!
        </h1>
        <p className="text-gray-400 mb-6">
          Discover amazing AI-generated music and connect with fellow creators
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Create New Post
          </button>
          <button
            onClick={() => router.push('/discover')}
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Explore Community
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Activity from Following */}
          {recentActivity.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                <button
                  onClick={() => router.push('/feed')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {recentActivity.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => router.push('/feed')}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {activity.activity_type === 'post_created' ? '📝' :
                         activity.activity_type === 'audio_uploaded' ? '🎵' :
                         activity.activity_type === 'post_liked' ? '❤️' : '🔔'}
                      </span>
                      <div>
                        <p className="text-white text-sm">
                          <span className="font-medium">{activity.user_profile.username}</span>{' '}
                          {activity.activity_type === 'post_created' && 'created a new post'}
                          {activity.activity_type === 'audio_uploaded' && 'uploaded new audio'}
                          {activity.activity_type === 'post_liked' && 'liked a post'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending This Week */}
          {trendingPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">🔥 Trending This Week</h2>
                <button
                  onClick={() => router.push('/discover')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {trendingPosts.slice(0, 3).map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUserId={user!.id}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && recentActivity.length === 0 && trendingPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎶</div>
              <h2 className="text-xl font-semibold text-white mb-2">Ready to Get Started?</h2>
              <p className="text-gray-400 mb-6">
                Follow some creators and explore the community to see personalized content here
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => router.push('/discover')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Discover Creators
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Share Your Music
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* User Recommendations */}
          <UserRecommendations limit={4} />

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="text-white text-sm font-medium">Create Post</p>
                    <p className="text-xs text-gray-400">Share your latest creation</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-white text-sm font-medium">Edit Profile</p>
                    <p className="text-xs text-gray-400">Update your information</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => router.push('/notifications')}
                className="w-full text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="text-white text-sm font-medium">Notifications</p>
                    <p className="text-xs text-gray-400">Check your activity</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

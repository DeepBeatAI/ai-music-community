'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/contexts/FollowContext';
import UserRecommendations from './UserRecommendations';
import FollowButton from './FollowButton';
import { getTrendingContent, getFeaturedCreators } from '@/utils/recommendations';
import { getActivityFeed, getActivityIconForPost } from '@/utils/activityFeed';

export default function AuthenticatedHome() {
  const { user, profile } = useAuth();
  const { getFollowStatus } = useFollow();
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
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
      const [trending, featured, activity] = await Promise.all([
        getTrendingContent(4),
        getFeaturedCreators(3, user!.id),
        getActivityFeed(user!.id, { following: true }, 0, 6),
      ]);
      setTrendingPosts(trending);
      setFeaturedCreators(featured);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading home content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

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
            Connect with the Community
          </button>
          <button
            onClick={() => router.push('/discover')}
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Discover Music and Creators
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
                        {getActivityIconForPost(activity.activity_type, activity.target_post?.post_type)}
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
                {trendingPosts.slice(0, 2).map((post) => (
                  <div key={post.id} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {post.user_profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-white">{post.user_profiles?.username || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{post.content}</p>
                        {post.post_type === 'audio' && (
                          <div className="flex items-center space-x-2 text-blue-400">
                            <span>♪</span>
                            <span className="text-sm">{post.track?.title || post.audio_filename || 'Audio Track'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
          {/* Personalized User Recommendations */}
          <UserRecommendations limit={4} />

          {/* Featured Creators */}
          {featuredCreators.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Featured Creators</h3>
              <div className="space-y-4">
                {featuredCreators.map((creator) => (
                  <div key={creator.id} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                         onClick={() => router.push(`/profile/${creator.username}`)}>
                      <span className="text-white font-semibold text-sm">
                        {creator.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-white text-sm truncate cursor-pointer hover:text-blue-300 transition-colors"
                           onClick={() => router.push(`/profile/${creator.username}`)}>
                          {creator.username}
                        </p>
                        <FollowButton 
                          userId={creator.user_id}
                          username={creator.username}
                          size="sm"
                          variant="secondary"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">
                          {getFollowStatus(creator.user_id).followerCount} followers • {creator.user_stats?.posts_count || 0} posts
                        </p>
                        {creator.reason && (
                          <p className="text-xs text-blue-400 truncate">
                            {creator.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

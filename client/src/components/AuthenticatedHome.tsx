'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UserRecommendations from './UserRecommendations';
import { getActivityFeed, getActivityIconForPost, type ActivityFeedItem } from '@/utils/activityFeed';
import { getTrendingTracks7Days, getPopularCreators7Days, getCachedAnalytics, type TrendingTrack, type PopularCreator } from '@/lib/trendingAnalytics';
import { TrendingTrackCard } from './analytics/TrendingTrackCard';

/**
 * AuthenticatedHome Component
 * 
 * Main home page for authenticated users displaying:
 * 1. Trending tracks (objective popularity based on plays + likes)
 * 2. Popular creators (objective popularity based on plays + likes)
 * 3. Personalized user recommendations (social proof + activity patterns)
 * 4. Recent activity from followed users
 * 
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ AuthenticatedHome Component                                     │
 * │                                                                 │
 * │  loadHomeContent() triggers on mount when user is available    │
 * │  ↓                                                              │
 * │  Promise.all([                                                 │
 * │    getCachedAnalytics('home_trending_7d', getTrendingTracks7Days),  │
 * │    getCachedAnalytics('home_popular_creators_7d', getPopularCreators7Days), │
 * │    getActivityFeed(user.id, { following: true }, 0, 6)         │
 * │  ])                                                             │
 * │  ↓                                                              │
 * │  Cache Layer (5-minute TTL)                                    │
 * │  ↓                                                              │
 * │  Database Functions:                                           │
 * │  - get_trending_tracks(7, 4) → TrendingTrack[]                │
 * │    Formula: (play_count × 0.7) + (like_count × 0.3)           │
 * │  - get_popular_creators(7, 3) → PopularCreator[]              │
 * │    Formula: (total_plays × 0.6) + (total_likes × 0.4)         │
 * │  ↓                                                              │
 * │  State Updates:                                                │
 * │  - setTrendingTracks(top 4 tracks)                            │
 * │  - setPopularCreators(top 3 creators)                         │
 * │  - setRecentActivity(activity feed)                           │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * IMPORTANT NOTES:
 * - Trending/Popular sections use OBJECTIVE metrics (no personalization)
 * - "Suggested for You" section uses PERSONALIZED recommendations
 * - All data is cached for 5 minutes to reduce database load
 * - Cache keys are page-specific to avoid conflicts with other pages
 * - Empty states are handled gracefully when no data is available
 * - Errors are logged but don't crash the page
 * 
 * CONSISTENCY:
 * - Uses same database functions as Analytics and Discover pages
 * - Same 7-day time window across all pages
 * - Same scoring formulas ensure consistent results
 */
export default function AuthenticatedHome() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [popularCreators, setPopularCreators] = useState<PopularCreator[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all home page content in parallel
   * 
   * Uses Promise.all for concurrent fetching to minimize load time.
   * Each data source is wrapped in getCachedAnalytics to leverage
   * the 5-minute cache and reduce database queries.
   * 
   * Cache keys are prefixed with 'home_' to avoid conflicts with
   * other pages that fetch the same data.
   * 
   * GOTCHA: We slice the results after fetching to show only the
   * desired number of items (4 tracks, 3 creators) while still
   * caching the full result set for potential reuse.
   */
  const loadHomeContent = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all data sources concurrently for better performance
      const [trending, popular, activity] = await Promise.all([
        // Trending tracks: Objective popularity (plays + likes)
        getCachedAnalytics('home_trending_7d', getTrendingTracks7Days),
        // Popular creators: Objective popularity (plays + likes)
        getCachedAnalytics('home_popular_creators_7d', getPopularCreators7Days),
        // Activity feed: Personalized based on following relationships
        getActivityFeed(user.id, { following: true }, 0, 6),
      ]);
      
      // Limit display to top 3 items for all sections (full data is cached for reuse)
      setTrendingTracks(trending.slice(0, 3)); // Show top 3 trending tracks
      setPopularCreators(popular.slice(0, 3)); // Show top 3 popular creators
      setRecentActivity(activity.slice(0, 3)); // Show top 3 recent activities
    } catch (error) {
      console.error('Error loading home content:', error);
      // Don't throw - allow page to render with empty states
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHomeContent();
    }
  }, [user, loadHomeContent]);

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
                  onClick={() => router.push('/dashboard')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const isOwnActivity = activity.user_profile.id === user?.id;
                  const isFollowEvent = activity.activity_type === 'user_followed';
                  const isPostEvent = activity.activity_type === 'post_created' || 
                                     activity.activity_type === 'audio_uploaded' || 
                                     activity.activity_type === 'post_liked';
                  
                  return (
                    <div
                      key={activity.id}
                      className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        if (isFollowEvent) {
                          // For follow events, redirect to the followed user's profile
                          router.push(`/profile/${activity.user_profile.username}`);
                        } else if (isPostEvent) {
                          // For post/audio post events, redirect to dashboard
                          router.push('/dashboard');
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getActivityIconForPost(activity.activity_type, activity.target_post?.post_type)}
                        </span>
                        <div>
                          <p className="text-white text-sm">
                            {isOwnActivity ? (
                              <span className="font-medium">{activity.user_profile.username}</span>
                            ) : (
                              <span 
                                className="font-medium hover:text-blue-300 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/profile/${activity.user_profile.username}`);
                                }}
                              >
                                {activity.user_profile.username}
                              </span>
                            )}{' '}
                            {activity.activity_type === 'post_created' && 'created a new post'}
                            {activity.activity_type === 'audio_uploaded' && 'uploaded new audio'}
                            {activity.activity_type === 'post_liked' && 'liked a post'}
                            {activity.activity_type === 'user_followed' && 'followed a creator'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trending This Week */}
          {trendingTracks.length > 0 && (
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
              <div className="space-y-2">
                {trendingTracks.map((track, index) => (
                  <TrendingTrackCard
                    key={track.track_id}
                    track={track}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Popular Creators */}
          {popularCreators.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">⭐ Popular Creators</h2>
                <button
                  onClick={() => router.push('/discover')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {popularCreators.map((creator, index) => {
                  const isOwnProfile = creator.user_id === user?.id;
                  
                  return (
                    <div key={creator.user_id} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className="text-2xl font-bold text-amber-500 w-8 flex-shrink-0">
                          #{index + 1}
                        </div>

                        {/* Creator Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ${!isOwnProfile ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                            onClick={() => !isOwnProfile && router.push(`/profile/${creator.username}`)}
                          >
                            <span className="text-white font-semibold text-sm">
                              {creator.username[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {isOwnProfile ? (
                              <p className="font-medium text-white truncate">
                                {creator.username}
                              </p>
                            ) : (
                              <p 
                                className="font-medium text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                                onClick={() => router.push(`/profile/${creator.username}`)}
                              >
                                {creator.username}
                              </p>
                            )}
                            <p className="text-sm text-gray-400">{creator.track_count} tracks</p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-sm flex-shrink-0">
                          <div className="text-center">
                            <div className="font-semibold text-white">{creator.total_plays}</div>
                            <div className="text-gray-500 text-xs">plays</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-white">{creator.total_likes}</div>
                            <div className="text-gray-500 text-xs">likes</div>
                          </div>
                        </div>

                        {/* View Profile Button */}
                        <button
                          onClick={() => router.push(`/profile/${creator.username}`)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors flex-shrink-0"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && recentActivity.length === 0 && trendingTracks.length === 0 && popularCreators.length === 0 && (
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

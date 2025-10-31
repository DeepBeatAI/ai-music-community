'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getTrendingTracks7Days, getPopularCreators7Days } from '@/lib/trendingAnalytics';
import type { TrendingTrack, PopularCreator } from '@/lib/trendingAnalytics';
import { TrendingTrackCard } from '@/components/analytics/TrendingTrackCard';
import { PopularCreatorCard } from '@/components/analytics/PopularCreatorCard';
import UserRecommendations from '@/components/UserRecommendations';

/**
 * DiscoverPage Component
 * 
 * Public discovery page for finding trending content and popular creators.
 * Works for both authenticated and unauthenticated users.
 * 
 * Displays three main sections:
 * 1. "Suggested for You" - Personalized recommendations (authenticated users only)
 * 2. "Trending This Week" - Objective popularity based on plays + likes
 * 3. "Popular Creators" - Objective popularity based on plays + likes
 * 
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ DiscoverPage Component                                          │
 * │                                                                 │
 * │  loadDefaultContent() triggers on mount (no auth required)     │
 * │  ↓                                                              │
 * │  Promise.all([                                                 │
 * │    getTrendingTracks7Days(),                                   │
 * │    getPopularCreators7Days()                                   │
 * │  ])                                                             │
 * │  ↓                                                              │
 * │  Cache Layer (5-minute TTL, built into trendingAnalytics)     │
 * │  ↓                                                              │
 * │  Database Functions:                                           │
 * │  - get_trending_tracks(7, 10) → TrendingTrack[]               │
 * │    Formula: (play_count × 0.7) + (like_count × 0.3)           │
 * │  - get_popular_creators(7, 5) → PopularCreator[]              │
 * │    Formula: (total_plays × 0.6) + (total_likes × 0.4)         │
 * │  ↓                                                              │
 * │  State Updates:                                                │
 * │  - setTrendingTracks(all 10 tracks)                           │
 * │  - setPopularCreators(all 5 creators)                         │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * IMPORTANT NOTES:
 * - This page is PUBLIC - works without authentication
 * - Trending/Popular sections use OBJECTIVE metrics (no personalization)
 * - "Suggested for You" section only shows for authenticated users
 * - Uses same database functions as Home and Analytics pages
 * - Caching is handled internally by trendingAnalytics module
 * - Empty states guide users to create content or explore
 * 
 * CONSISTENCY:
 * - Same 7-day time window as Home and Analytics pages
 * - Same scoring formulas ensure consistent results across pages
 * - Same data sources (database functions) for reliability
 * 
 * GOTCHA: Unlike Home page, this doesn't use getCachedAnalytics wrapper
 * because the trendingAnalytics functions already have internal caching.
 * The cache is shared across all pages that call these functions.
 */
export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [popularCreators, setPopularCreators] = useState<PopularCreator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load content on mount - no authentication required
    // This allows public discovery of platform content
    loadDefaultContent();
  }, []);

  /**
   * Load trending tracks and popular creators
   * 
   * Fetches objective popularity data that's the same for all users.
   * Uses Promise.all for concurrent fetching to minimize load time.
   * 
   * GOTCHA: We don't use getCachedAnalytics wrapper here because
   * the trendingAnalytics functions already have internal caching.
   * The cache is shared across all pages, so if Home page loaded
   * this data recently, Discover page will get cached results.
   * 
   * ERROR HANDLING: On error, we set empty arrays to show the
   * empty state UI rather than crashing the page.
   */
  const loadDefaultContent = async () => {
    setLoading(true);
    try {
      // Fetch both data sources concurrently
      const [tracks, creators] = await Promise.all([
        // Trending tracks: Last 7 days, sorted by engagement score
        getTrendingTracks7Days(),
        // Popular creators: Last 7 days, sorted by creator score
        getPopularCreators7Days(),
      ]);
      
      setTrendingTracks(tracks);
      setPopularCreators(creators);
    } catch (error) {
      console.error('Error loading default content:', error);
      // Set empty arrays on error to show empty state UI
      setTrendingTracks([]);
      setPopularCreators([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Discovery Content */}
        <div className="space-y-8">
          {/* Personalized Recommendations for Authenticated Users */}
          {user && (
            <UserRecommendations 
              title="Suggested for You" 
              limit={6} 
              className="mb-8" 
              showProfileButton={true}
            />
          )}

          {/* Trending Section */}
          {trendingTracks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">🔥 Trending This Week</h2>
              <div className="space-y-4">
                {trendingTracks.map((track, index) => (
                  <TrendingTrackCard
                    key={track.track_id}
                    track={track}
                    rank={index + 1}
                    showDate={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Popular Creators */}
          {popularCreators.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">⭐ Popular Creators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularCreators.map((creator, index) => (
                  <PopularCreatorCard
                    key={creator.user_id}
                    creator={creator}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {trendingTracks.length === 0 && popularCreators.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h2 className="text-xl font-semibold text-white mb-2">Start Exploring!</h2>
              <p className="text-gray-400 mb-6">Be the first to share content in this community</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Create Your First Post
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

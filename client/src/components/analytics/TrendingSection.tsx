'use client';

import { useState, useEffect } from 'react';
import {
  getTrendingTracks7Days,
  getTrendingTracksAllTime,
  getPopularCreators7Days,
  getPopularCreatorsAllTime,
  getCachedAnalytics,
  type TrendingTrack,
  type PopularCreator,
} from '@/lib/trendingAnalytics';
import { TrendingTrackCard } from '@/components/analytics/TrendingTrackCard';
import { PopularCreatorCard } from '@/components/analytics/PopularCreatorCard';

/**
 * TrendingSection Component
 * Displays trending tracks and popular creators analytics
 */
export function TrendingSection() {
  const [trending7d, setTrending7d] = useState<TrendingTrack[]>([]);
  const [trendingAllTime, setTrendingAllTime] = useState<TrendingTrack[]>([]);
  const [creators7d, setCreators7d] = useState<PopularCreator[]>([]);
  const [creatorsAllTime, setCreatorsAllTime] = useState<PopularCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    
    try {
      const [t7d, tAll, c7d, cAll] = await Promise.all([
        getCachedAnalytics('trending_7d', getTrendingTracks7Days),
        getCachedAnalytics('trending_all', getTrendingTracksAllTime),
        getCachedAnalytics('creators_7d', getPopularCreators7Days),
        getCachedAnalytics('creators_all', getPopularCreatorsAllTime),
      ]);

      setTrending7d(t7d);
      setTrendingAllTime(tAll);
      setCreators7d(c7d);
      setCreatorsAllTime(cAll);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white">Trending & Popular</h2>

        {/* Trending Tracks Skeleton (Last 7 Days) */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔥</span>
            <span>Top 10 Trending Tracks (Last 7 Days)</span>
          </h3>
          <div className="space-y-2">
            {[...Array(10)].map((_, index) => (
              <TrendingTrackSkeleton key={`trending-7d-skeleton-${index}`} />
            ))}
          </div>
        </section>

        {/* Trending Tracks Skeleton (All Time) */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>⭐</span>
            <span>Top 10 Trending Tracks (All Time)</span>
          </h3>
          <div className="space-y-2">
            {[...Array(10)].map((_, index) => (
              <TrendingTrackSkeleton key={`trending-all-skeleton-${index}`} />
            ))}
          </div>
        </section>

        {/* Popular Creators Skeleton (Last 7 Days) */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎵</span>
            <span>Top 5 Popular Creators (Last 7 Days)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, index) => (
              <PopularCreatorSkeleton key={`creator-7d-skeleton-${index}`} />
            ))}
          </div>
        </section>

        {/* Popular Creators Skeleton (All Time) */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>👑</span>
            <span>Top 5 Popular Creators (All Time)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, index) => (
              <PopularCreatorSkeleton key={`creator-all-skeleton-${index}`} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white">Trending & Popular</h2>
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Trending & Popular</h2>

      {/* Top 10 Trending Tracks (Last 7 Days) */}
      <section>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔥</span>
          <span>Top 10 Trending Tracks (Last 7 Days)</span>
        </h3>
        {trending7d.length > 0 ? (
          <div className="space-y-2">
            {trending7d.map((track, index) => (
              <TrendingTrackCard
                key={track.track_id}
                track={track}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No trending tracks in the last 7 days</p>
        )}
      </section>

      {/* Top 10 Trending Tracks (All Time) */}
      <section>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>⭐</span>
          <span>Top 10 Trending Tracks (All Time)</span>
        </h3>
        {trendingAllTime.length > 0 ? (
          <div className="space-y-2">
            {trendingAllTime.map((track, index) => (
              <TrendingTrackCard
                key={track.track_id}
                track={track}
                rank={index + 1}
                showDate
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No tracks yet</p>
        )}
      </section>

      {/* Top 5 Popular Creators (Last 7 Days) */}
      <section>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🎵</span>
          <span>Top 5 Popular Creators (Last 7 Days)</span>
        </h3>
        {creators7d.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators7d.map((creator, index) => (
              <PopularCreatorCard
                key={creator.user_id}
                creator={creator}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No active creators in the last 7 days</p>
        )}
      </section>

      {/* Top 5 Popular Creators (All Time) */}
      <section>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>👑</span>
          <span>Top 5 Popular Creators (All Time)</span>
        </h3>
        {creatorsAllTime.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatorsAllTime.map((creator, index) => (
              <PopularCreatorCard
                key={creator.user_id}
                creator={creator}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No creators yet</p>
        )}
      </section>
    </div>
  );
}

/**
 * TrendingTrackSkeleton Component
 * Loading skeleton matching TrendingTrackCard layout
 */
function TrendingTrackSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg animate-pulse">
      {/* Rank Skeleton */}
      <div className="w-8 h-8 bg-gray-700 rounded flex-shrink-0"></div>

      {/* Track Info Skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="flex gap-4 flex-shrink-0">
        <div className="text-center space-y-1">
          <div className="h-5 w-12 bg-gray-700 rounded"></div>
          <div className="h-3 w-12 bg-gray-700 rounded"></div>
        </div>
        <div className="text-center space-y-1">
          <div className="h-5 w-12 bg-gray-700 rounded"></div>
          <div className="h-3 w-12 bg-gray-700 rounded"></div>
        </div>
        <div className="text-center space-y-1">
          <div className="h-5 w-12 bg-gray-700 rounded"></div>
          <div className="h-3 w-12 bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="w-20 h-10 bg-gray-700 rounded flex-shrink-0"></div>
    </div>
  );
}

/**
 * PopularCreatorSkeleton Component
 * Loading skeleton matching PopularCreatorCard layout
 */
function PopularCreatorSkeleton() {
  return (
    <div className="relative p-4 bg-gray-800 rounded-lg animate-pulse">
      {/* Rank Badge Skeleton */}
      <div className="absolute top-2 right-2 w-8 h-8 bg-gray-700 rounded-full"></div>

      {/* Creator Info Skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0"></div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="space-y-1">
          <div className="h-5 bg-gray-700 rounded w-16"></div>
          <div className="h-3 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="space-y-1">
          <div className="h-5 bg-gray-700 rounded w-16"></div>
          <div className="h-3 bg-gray-700 rounded w-20"></div>
        </div>
      </div>

      {/* Score Skeleton */}
      <div className="pt-3 border-t border-gray-700">
        <div className="text-center space-y-1">
          <div className="h-6 bg-gray-700 rounded w-16 mx-auto"></div>
          <div className="h-3 bg-gray-700 rounded w-24 mx-auto"></div>
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="mt-3 h-10 bg-gray-700 rounded"></div>
    </div>
  );
}

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
} from '@/lib/analytics';
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
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

'use client';
import { useState, useEffect } from 'react';
import { getTrendingPlaylists7Days, getTrendingPlaylistsAllTime, getCachedAnalytics } from '@/lib/trendingAnalytics';
import { TrendingPlaylist } from '@/types/analytics';
import TrendingPlaylistCard from './TrendingPlaylistCard';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export default function TrendingPlaylistsSection() {
  const [playlists7d, setPlaylists7d] = useState<TrendingPlaylist[]>([]);
  const [playlistsAllTime, setPlaylistsAllTime] = useState<TrendingPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTrendingPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both 7-day and all-time trending playlists concurrently with caching and retry logic
      const [playlists7dData, playlistsAllTimeData] = await retryWithBackoff(
        async () => {
          return await Promise.all([
            getCachedAnalytics('discover_playlists_7d', getTrendingPlaylists7Days),
            getCachedAnalytics('discover_playlists_all', getTrendingPlaylistsAllTime),
          ]);
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.log(`Retrying trending playlists fetch (attempt ${attempt}):`, error.message);
            setRetryCount(attempt);
          },
        }
      );

      setPlaylists7d(playlists7dData);
      setPlaylistsAllTime(playlistsAllTimeData);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching trending playlists:', err);
      setError('Failed to load trending playlists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingPlaylists();
  }, []);

  const handleRetry = () => {
    fetchTrendingPlaylists();
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
        {/* 7 Days Section Skeleton */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🔥 Top 10 Trending Playlists (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="w-16 h-16 rounded-md bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-700" />
              </div>
            ))}
          </div>
        </div>

        {/* All Time Section Skeleton */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            ⭐ Top 10 Trending Playlists (All Time)
          </h2>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="w-16 h-16 rounded-md bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">⚠️ {error}</p>
          <p className="text-sm text-gray-400">
            There was a problem loading the trending playlists.
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Attempted {retryCount} {retryCount === 1 ? 'retry' : 'retries'}
            </p>
          )}
        </div>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state (no playlists available)
  const hasNoPlaylists = playlists7d.length === 0 && playlistsAllTime.length === 0;
  if (hasNoPlaylists) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-white">
          No trending playlists available yet
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          Check back later to discover popular playlist collections from the community.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 7 Days Section */}
      {playlists7d.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🔥 Top 10 Trending Playlists (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {playlists7d.map((playlist, index) => (
              <TrendingPlaylistCard
                key={playlist.playlist_id}
                playlist={playlist}
                rank={index + 1}
                showDate={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Time Section */}
      {playlistsAllTime.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            ⭐ Top 10 Trending Playlists (All Time)
          </h2>
          <div className="space-y-3">
            {playlistsAllTime.map((playlist, index) => (
              <TrendingPlaylistCard
                key={playlist.playlist_id}
                playlist={playlist}
                rank={index + 1}
                showDate={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

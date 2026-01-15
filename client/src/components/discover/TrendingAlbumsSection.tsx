'use client';
import { useState, useEffect } from 'react';
import { getTrendingAlbums7Days, getTrendingAlbumsAllTime, getCachedAnalytics } from '@/lib/trendingAnalytics';
import { TrendingAlbum } from '@/types/analytics';
import TrendingAlbumCard from './TrendingAlbumCard';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export default function TrendingAlbumsSection() {
  const [albums7d, setAlbums7d] = useState<TrendingAlbum[]>([]);
  const [albumsAllTime, setAlbumsAllTime] = useState<TrendingAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTrendingAlbums = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both 7-day and all-time trending albums concurrently with caching and retry logic
      const [albums7dData, albumsAllTimeData] = await retryWithBackoff(
        async () => {
          return await Promise.all([
            getCachedAnalytics('discover_albums_7d', getTrendingAlbums7Days),
            getCachedAnalytics('discover_albums_all', getTrendingAlbumsAllTime),
          ]);
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.log(`Retrying trending albums fetch (attempt ${attempt}):`, error.message);
            setRetryCount(attempt);
          },
        }
      );

      setAlbums7d(albums7dData);
      setAlbumsAllTime(albumsAllTimeData);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching trending albums:', err);
      setError('Failed to load trending albums. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingAlbums();
  }, []);

  const handleRetry = () => {
    fetchTrendingAlbums();
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
        {/* 7 Days Section Skeleton */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🔥 Top 10 Trending Albums (Last 7 Days)
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
            ⭐ Top 10 Trending Albums (All Time)
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
            There was a problem loading the trending albums.
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

  // Empty state (no albums available)
  const hasNoAlbums = albums7d.length === 0 && albumsAllTime.length === 0;
  if (hasNoAlbums) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-6xl mb-4">📀</div>
        <h3 className="text-xl font-semibold text-white">
          No trending albums available yet
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          Check back later to discover popular album collections from the community.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 7 Days Section */}
      {albums7d.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🔥 Top 10 Trending Albums (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {albums7d.map((album, index) => (
              <TrendingAlbumCard
                key={album.album_id}
                album={album}
                rank={index + 1}
                showDate={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Time Section */}
      {albumsAllTime.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            ⭐ Top 10 Trending Albums (All Time)
          </h2>
          <div className="space-y-3">
            {albumsAllTime.map((album, index) => (
              <TrendingAlbumCard
                key={album.album_id}
                album={album}
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

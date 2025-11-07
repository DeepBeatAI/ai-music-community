'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { getCreatorStats } from '@/lib/profileService';
import { cache, CACHE_TTL } from '@/utils/cache';
import type { CreatorStats } from '@/types';
import { formatCreatorScore } from '@/utils/creatorScore';

/**
 * StatCard Component
 * 
 * Displays a single statistic with an icon, value, and label.
 * Used as a sub-component within CreatorStatsSection.
 * 
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  colorClass: string;
}

const StatCard = memo(function StatCard({ icon, value, label, colorClass }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex flex-col items-center text-center">
        <div className="text-2xl mb-2">{icon}</div>
        <div className={`text-2xl font-bold ${colorClass} mb-1`}>
          {value}
        </div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
});

/**
 * StatCardSkeleton Component
 * 
 * Loading skeleton for StatCard during data fetch.
 */
function StatCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex flex-col items-center text-center animate-pulse">
        <div className="w-8 h-8 bg-gray-700 rounded mb-2"></div>
        <div className="w-16 h-8 bg-gray-700 rounded mb-1"></div>
        <div className="w-20 h-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

/**
 * CreatorStatsSection Component
 * 
 * Displays creator statistics in a responsive grid layout.
 * - Desktop: 1 row x 6 columns
 * - Mobile: 2 rows (3 + 3 columns)
 * 
 * Features:
 * - Fetches stats from getCreatorStats API
 * - Loading skeleton state
 * - Error state with retry button
 * - Responsive layout using Tailwind
 * - Shows Creator Score, Followers, Tracks, Albums, Playlists, Total Plays
 * - Filters all counts to only public content (is_public = true)
 * 
 * Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
interface CreatorStatsSectionProps {
  userId: string;
}

export default function CreatorStatsSection({ userId }: CreatorStatsSectionProps) {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `creator-stats-${userId}`;
    const cachedStats = cache.get<CreatorStats>(cacheKey);

    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const creatorStats = await getCreatorStats(userId);
      setStats(creatorStats);
      
      // Cache the stats for 5 minutes
      cache.set(cacheKey, creatorStats, CACHE_TTL.STATS);
    } catch (err) {
      console.error('Error fetching creator stats:', err);
      setError('Failed to load creator statistics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for cache invalidation events
  useEffect(() => {
    if (!userId) return;

    const handleCacheInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>;
      const invalidatedKey = customEvent.detail.key;
      const statsKey = `creator-stats-${userId}`;

      // If the stats cache was invalidated, refetch
      if (invalidatedKey === statsKey) {
        console.log('📊 Creator stats cache invalidated, refetching...');
        fetchStats();
      }
    };

    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [userId, fetchStats]);

  // Loading state - show 6 skeleton cards
  if (loading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Error state - show error message with retry button
  if (error || !stats) {
    return (
      <div className="mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400 mb-4">{error || 'Failed to load statistics'}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Stats Grid - 3 columns on mobile, 6 columns on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <StatCard
          icon="⭐"
          value={formatCreatorScore(stats.creator_score)}
          label="Creator Score"
          colorClass="text-yellow-400"
        />
        <StatCard
          icon="👥"
          value={stats.follower_count.toLocaleString()}
          label="Followers"
          colorClass="text-blue-400"
        />
        <StatCard
          icon="🎵"
          value={stats.track_count.toLocaleString()}
          label="Tracks"
          colorClass="text-green-400"
        />
        <StatCard
          icon="💿"
          value={stats.album_count.toLocaleString()}
          label="Albums"
          colorClass="text-purple-400"
        />
        <StatCard
          icon="📝"
          value={stats.playlist_count.toLocaleString()}
          label="Playlists"
          colorClass="text-pink-400"
        />
        <StatCard
          icon="🎧"
          value={stats.total_plays.toLocaleString()}
          label="Total Plays"
          colorClass="text-orange-400"
        />
      </div>
    </div>
  );
}

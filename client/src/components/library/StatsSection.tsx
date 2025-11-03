'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLibraryStats } from '@/lib/library';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import type { LibraryStats } from '@/types/library';

/**
 * StatCard Component
 * 
 * Displays a single statistic with an icon, value, and label.
 * Used as a sub-component within StatsSection.
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
 * StatsSection Component
 * 
 * Displays library statistics in a responsive grid layout.
 * - Desktop: 1 row x 6 columns
 * - Mobile: 2 rows x 3 columns
 * 
 * Features:
 * - Fetches stats from getLibraryStats API
 * - Loading skeleton state
 * - Error state with retry button
 * - Responsive layout using Tailwind
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
interface StatsSectionProps {
  userId?: string;
}

export default function StatsSection({ userId }: StatsSectionProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchStats = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.STATS(effectiveUserId);
    const cachedStats = cache.get<LibraryStats>(cacheKey);

    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const libraryStats = await getLibraryStats(effectiveUserId);
      setStats(libraryStats);
      
      // Cache the stats for 5 minutes
      cache.set(cacheKey, libraryStats, CACHE_TTL.STATS);
    } catch (err) {
      console.error('Error fetching library stats:', err);
      setError('Failed to load library statistics');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for cache invalidation events
  useEffect(() => {
    if (!effectiveUserId) return;

    const handleCacheInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>;
      const invalidatedKey = customEvent.detail.key;
      const statsKey = CACHE_KEYS.STATS(effectiveUserId);

      // If the stats cache was invalidated, refetch
      if (invalidatedKey === statsKey) {
        console.log('📊 Stats cache invalidated, refetching...');
        fetchStats();
      }
    };

    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [effectiveUserId, fetchStats]);

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

  // Format upload remaining value
  const uploadRemainingDisplay = stats.uploadRemaining === 'infinite' ? '∞' : stats.uploadRemaining;

  return (
    <div className="mb-8">
      {/* Stats Grid - 3 columns on mobile, 6 columns on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <StatCard
          icon="📤"
          value={uploadRemainingDisplay}
          label="Upload Remaining"
          colorClass="text-blue-400"
        />
        <StatCard
          icon="🎵"
          value={stats.totalTracks}
          label="Total Tracks"
          colorClass="text-green-400"
        />
        <StatCard
          icon="💿"
          value={stats.totalAlbums}
          label="Total Albums"
          colorClass="text-purple-400"
        />
        <StatCard
          icon="📝"
          value={stats.totalPlaylists}
          label="Total Playlists"
          colorClass="text-pink-400"
        />
        <StatCard
          icon="📊"
          value={stats.playsThisWeek}
          label="Plays This Week"
          colorClass="text-yellow-400"
        />
        <StatCard
          icon="🎧"
          value={stats.playsAllTime.toLocaleString()}
          label="Total Plays"
          colorClass="text-orange-400"
        />
      </div>
    </div>
  );
}

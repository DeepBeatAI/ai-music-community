'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { DiscoverTabs } from '@/components/discover/DiscoverTabs';

/**
 * DiscoverPage Component
 * 
 * Discovery page for finding trending content and popular creators.
 * Requires authentication to access.
 * 
 * LAYOUT:
 * Tabbed interface with four tabs:
 * - Tracks: Trending tracks (7 days + all time)
 * - Albums: Trending albums (7 days + all time)
 * - Playlists: Trending playlists (7 days + all time)
 * - Creators: Suggested for You + Popular creators (7 days + all time)
 * 
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ DiscoverPage Component                                          │
 * │  ↓                                                              │
 * │ DiscoverTabs Component (manages tab state and scroll position) │
 * │  ↓                                                              │
 * │ Tab Content Components:                                         │
 * │  - DiscoverTrendingSection (tracks, creators)                  │
 * │  - TrendingAlbumsSection (albums)                              │
 * │  - TrendingPlaylistsSection (playlists)                        │
 * │  - UserRecommendations (suggested for you)                     │
 * │  ↓                                                              │
 * │  Cache Layer (5-minute TTL via getCachedAnalytics)             │
 * │  ↓                                                              │
 * │  Database Functions:                                           │
 * │  - get_trending_tracks(7, 10) → TrendingTrack[]               │
 * │  - get_trending_tracks(null, 10) → TrendingTrack[]            │
 * │  - get_trending_albums(7, 10) → TrendingAlbum[]               │
 * │  - get_trending_albums(null, 10) → TrendingAlbum[]            │
 * │  - get_trending_playlists(7, 10) → TrendingPlaylist[]         │
 * │  - get_trending_playlists(null, 10) → TrendingPlaylist[]      │
 * │  - get_popular_creators(7, 5) → PopularCreator[]              │
 * │  - get_popular_creators(null, 5) → PopularCreator[]           │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * IMPORTANT NOTES:
 * - This page requires authentication
 * - Trending/Popular sections use OBJECTIVE metrics (no personalization)
 * - "Suggested for You" section only shows for authenticated users
 * - Tracks tab is active by default
 * - Scroll position is preserved per tab
 * - Caching is handled by getCachedAnalytics wrapper
 * 
 * REQUIREMENTS:
 * - 7.1: Display four tabs (Tracks, Albums, Playlists, Creators)
 * - 7.2: Tracks tab active by default
 * - 8.1, 8.2: Tracks tab displays trending tracks
 * - 9.1, 9.2: Albums tab displays trending albums
 * - 10.1, 10.2: Playlists tab displays trending playlists
 * - 11.1, 11.2, 11.3: Creators tab displays suggested users and popular creators
 */
export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/discover');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Tabbed Interface */}
        <div className="flex-1 min-h-0">
          <DiscoverTabs defaultTab="tracks" />
        </div>
      </div>
    </MainLayout>
  );
}

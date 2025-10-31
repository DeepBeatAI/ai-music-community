'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoverTrendingSection } from '@/components/discover/DiscoverTrendingSection';
import UserRecommendations from '@/components/UserRecommendations';

/**
 * DiscoverPage Component
 * 
 * Public discovery page for finding trending content and popular creators.
 * Works for both authenticated and unauthenticated users.
 * 
 * LAYOUT:
 * Desktop (≥1024px): Two-column layout
 * - Left Column: Trending tracks (7 days + all time)
 * - Right Column: Suggested for You + Popular creators (7 days + all time)
 * 
 * Mobile (<1024px): Single-column stacked layout
 * - Suggested for You (if authenticated)
 * - Trending tracks (7 days)
 * - Trending tracks (all time)
 * - Popular creators (7 days)
 * - Popular creators (all time)
 * 
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ DiscoverPage Component                                          │
 * │                                                                 │
 * │  DiscoverTrendingSection components handle data fetching       │
 * │  ↓                                                              │
 * │  Cache Layer (5-minute TTL via getCachedAnalytics)             │
 * │  ↓                                                              │
 * │  Database Functions:                                           │
 * │  - get_trending_tracks(7, 10) → TrendingTrack[]               │
 * │  - get_trending_tracks(null, 10) → TrendingTrack[]            │
 * │  - get_popular_creators(7, 5) → PopularCreator[]              │
 * │  - get_popular_creators(null, 5) → PopularCreator[]           │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * IMPORTANT NOTES:
 * - This page is PUBLIC - works without authentication
 * - Trending/Popular sections use OBJECTIVE metrics (no personalization)
 * - "Suggested for You" section only shows for authenticated users
 * - Uses DiscoverTrendingSection component for all trending/popular data
 * - Caching is handled by getCachedAnalytics wrapper in DiscoverTrendingSection
 */
export default function DiscoverPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Tracks */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">🎵 Tracks</h2>
            <DiscoverTrendingSection type="tracks" />
          </div>

          {/* Right Column: Creators */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">👥 Creators</h2>
            
            {/* Personalized Recommendations for Authenticated Users */}
            {user && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">✨ Suggested for You</h3>
                <UserRecommendations 
                  title="" 
                  limit={8}
                  showProfileButton={true}
                />
              </div>
            )}

            {/* Popular Creators Sections */}
            <DiscoverTrendingSection type="creators" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

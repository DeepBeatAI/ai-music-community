'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cache, CACHE_KEYS } from '@/utils/cache';
import MainLayout from '@/components/layout/MainLayout';
import StatsSection from '@/components/library/StatsSection';
import TrackUploadSection from '@/components/library/TrackUploadSection';
import AllTracksSection from '@/components/library/AllTracksSection';
import MyAlbumsSection from '@/components/library/MyAlbumsSection';
import { PlaylistsList } from '@/components/playlists/PlaylistsList';
import {
  StatsSectionErrorBoundary,
  TrackUploadSectionErrorBoundary,
  AllTracksSectionErrorBoundary,
  AlbumsSectionErrorBoundary,
  PlaylistsSectionErrorBoundary,
  SavedTracksSectionErrorBoundary,
  SavedAlbumsSectionErrorBoundary,
  SavedPlaylistsSectionErrorBoundary,
} from '@/components/library/LibraryErrorBoundaries';
import SavedTracksSection from '@/components/library/SavedTracksSection';
import SavedAlbumsSection from '@/components/library/SavedAlbumsSection';
import SavedPlaylistsSection from '@/components/library/SavedPlaylistsSection';

/**
 * LibraryPage Component
 * 
 * Main page for the My Library feature that replaces the playlists-only page.
 * Provides a comprehensive personal music management hub with:
 * - Stats dashboard
 * - Track upload interface
 * - All tracks management
 * - Albums management
 * - Playlists management
 * 
 * Features:
 * - Dashboard-style vertical layout
 * - Collapsible sections with localStorage persistence (handled by individual components)
 * - Authentication check with redirect
 * - Smooth collapse/expand animations (300ms)
 * 
 * Note: Collapsible state management is handled by individual section components
 * (AllTracksSection, MyAlbumsSection) which persist their own state to localStorage.
 * All sections load immediately for better user experience and reliability.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2
 */
export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Handle upload success - invalidate caches and refresh sections
  const handleUploadSuccess = useCallback(() => {
    if (!user) return;
    
    // Add a small delay to ensure database changes are committed
    // PostUploadAssignment already has a 500ms delay before calling this
    setTimeout(() => {
      // Invalidate all relevant caches to force fresh data
      cache.invalidate(CACHE_KEYS.TRACKS(user.id));
      cache.invalidate(CACHE_KEYS.STATS(user.id));
      cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
      cache.invalidate(CACHE_KEYS.PLAYLISTS(user.id));
      
      // Trigger re-render of sections by updating refresh key
      setRefreshKey(prev => prev + 1);
      
      console.log('✅ Library refreshed after track upload with all memberships');
    }, 100); // Small additional delay to ensure database consistency
  }, [user]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/library');
    }
  }, [user, loading, router]);

  // Check for missing cache on mount and listen for cache invalidation events
  useEffect(() => {
    if (!user) return;

    // Check if cache is missing on mount (in case we missed the invalidation event)
    const checkCacheOnMount = () => {
      const albumsCache = cache.get(CACHE_KEYS.ALBUMS(user.id));
      if (!albumsCache) {
        console.log('Albums cache is empty on mount, triggering refresh...');
        setRefreshKey(prev => prev + 1);
      }
    };

    // Check immediately on mount
    checkCacheOnMount();

    const handleCacheInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>;
      const invalidatedKey = customEvent.detail?.key;
      
      // Check if the invalidated key is relevant to this page
      if (
        invalidatedKey === CACHE_KEYS.ALBUMS(user.id) ||
        invalidatedKey === CACHE_KEYS.TRACKS(user.id) ||
        invalidatedKey === CACHE_KEYS.STATS(user.id)
      ) {
        console.log(`Cache invalidated for ${invalidatedKey}, refreshing library...`);
        setRefreshKey(prev => prev + 1);
      }
    };

    // Listen for cache invalidation events from the cache utility
    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [user]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="min-h-screen p-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Library</h1>
            <p className="text-gray-400">
              Manage your tracks, albums, and playlists in one place
            </p>
          </div>

          {/* Stats Section - Always visible, not collapsible */}
          <StatsSectionErrorBoundary>
            <StatsSection userId={user.id} key={`stats-${refreshKey}`} />
          </StatsSectionErrorBoundary>

          {/* Track Upload Section - Collapsible */}
          <div 
            className="mb-8"
            data-section="upload"
          >
            <TrackUploadSectionErrorBoundary>
              <TrackUploadSection 
                onUploadSuccess={handleUploadSuccess}
              />
            </TrackUploadSectionErrorBoundary>
          </div>

          {/* All Tracks Section - Collapsible */}
          <div className="mb-8">
            <AllTracksSectionErrorBoundary>
              <AllTracksSection 
                userId={user.id}
                initialLimit={8}
                key={`tracks-${refreshKey}`}
              />
            </AllTracksSectionErrorBoundary>
          </div>

          {/* My Albums Section - Collapsible */}
          <div className="mb-8">
            <AlbumsSectionErrorBoundary>
              <MyAlbumsSection 
                userId={user.id}
                initialLimit={8}
                key={`albums-${refreshKey}`}
              />
            </AlbumsSectionErrorBoundary>
          </div>

          {/* My Playlists Section */}
          <div className="mb-8">
            <PlaylistsSectionErrorBoundary>
              <PlaylistsList 
                hideMyPlaylistsHeader={false}
              />
            </PlaylistsSectionErrorBoundary>
          </div>

          {/* Saved Content Divider */}
          <div className="mb-8 mt-12">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-2">
                <span>🔖</span>
                <span>Saved Content</span>
              </h2>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
          </div>

          {/* Saved Tracks Section */}
          <div className="mb-8">
            <SavedTracksSectionErrorBoundary>
              <SavedTracksSection 
                userId={user.id}
                initialLimit={8}
                key={`saved-tracks-${refreshKey}`}
              />
            </SavedTracksSectionErrorBoundary>
          </div>

          {/* Saved Albums Section */}
          <div className="mb-8">
            <SavedAlbumsSectionErrorBoundary>
              <SavedAlbumsSection 
                userId={user.id}
                initialLimit={8}
                key={`saved-albums-${refreshKey}`}
              />
            </SavedAlbumsSectionErrorBoundary>
          </div>

          {/* Saved Playlists Section */}
          <div className="mb-8">
            <SavedPlaylistsSectionErrorBoundary>
              <SavedPlaylistsSection 
                userId={user.id}
                initialLimit={8}
                key={`saved-playlists-${refreshKey}`}
              />
            </SavedPlaylistsSectionErrorBoundary>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

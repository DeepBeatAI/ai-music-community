'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/components/library/LibraryErrorBoundaries';

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
 * - Lazy loading for albums and playlists sections
 * - Authentication check with redirect
 * - Smooth collapse/expand animations (300ms)
 * 
 * Note: Collapsible state management is handled by individual section components
 * (AllTracksSection, MyAlbumsSection) which persist their own state to localStorage.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2
 */
export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Lazy loading state for sections
  const [shouldLoadAlbums, setShouldLoadAlbums] = useState(false);
  const [shouldLoadPlaylists, setShouldLoadPlaylists] = useState(false);
  
  // Refs for Intersection Observer
  const albumsRef = useRef<HTMLDivElement>(null);
  const playlistsRef = useRef<HTMLDivElement>(null);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    // Only set up observers if user is authenticated
    if (!user) return;

    const observerOptions = {
      root: null, // viewport
      rootMargin: '200px', // Load when section is 200px from viewport
      threshold: 0,
    };

    const albumsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !shouldLoadAlbums) {
          setShouldLoadAlbums(true);
          // Once loaded, disconnect observer
          albumsObserver.disconnect();
        }
      });
    }, observerOptions);

    const playlistsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !shouldLoadPlaylists) {
          setShouldLoadPlaylists(true);
          // Once loaded, disconnect observer
          playlistsObserver.disconnect();
        }
      });
    }, observerOptions);

    // Observe the sections
    if (albumsRef.current) {
      albumsObserver.observe(albumsRef.current);
    }
    if (playlistsRef.current) {
      playlistsObserver.observe(playlistsRef.current);
    }

    // Cleanup
    return () => {
      albumsObserver.disconnect();
      playlistsObserver.disconnect();
    };
  }, [user, shouldLoadAlbums, shouldLoadPlaylists]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/library');
    }
  }, [user, loading, router]);

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
            <StatsSection userId={user.id} />
          </StatsSectionErrorBoundary>

          {/* Track Upload Section - Collapsible */}
          <div 
            className="mb-8"
            data-section="upload"
          >
            <TrackUploadSectionErrorBoundary>
              <TrackUploadSection 
                onUploadSuccess={() => {
                  // Refresh sections after upload
                  // This will be handled by the sections themselves
                }}
              />
            </TrackUploadSectionErrorBoundary>
          </div>

          {/* All Tracks Section - Collapsible */}
          <div className="mb-8">
            <AllTracksSectionErrorBoundary>
              <AllTracksSection 
                userId={user.id}
                initialLimit={12}
              />
            </AllTracksSectionErrorBoundary>
          </div>

          {/* My Albums Section - Collapsible, Lazy Loaded */}
          <div className="mb-8" ref={albumsRef}>
            <AlbumsSectionErrorBoundary>
              {shouldLoadAlbums ? (
                <MyAlbumsSection 
                  userId={user.id}
                  initialLimit={8}
                />
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span>💿</span>
                      <span>My Albums</span>
                    </h2>
                  </div>
                  {/* Loading skeleton */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-600"></div>
                        <div className="p-4">
                          <div className="h-6 bg-gray-600 rounded mb-2"></div>
                          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AlbumsSectionErrorBoundary>
          </div>

          {/* My Playlists Section - Existing component, Lazy Loaded */}
          <div className="mb-8" ref={playlistsRef}>
            <PlaylistsSectionErrorBoundary>
              {shouldLoadPlaylists ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span>📝</span>
                      <span>My Playlists</span>
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Create and manage your music collections
                    </p>
                  </div>
                  <PlaylistsList />
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span>📝</span>
                      <span>My Playlists</span>
                    </h2>
                  </div>
                  {/* Loading skeleton */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-600"></div>
                        <div className="p-4">
                          <div className="h-6 bg-gray-600 rounded mb-2"></div>
                          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PlaylistsSectionErrorBoundary>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

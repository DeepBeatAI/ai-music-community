'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { getAlbumWithTracks, updateAlbum } from '@/lib/albums';
import { cache, CACHE_KEYS } from '@/utils/cache';
import type { AlbumWithTracks } from '@/types/album';

/**
 * AlbumEditPage Component
 * 
 * Provides a dedicated page for editing album details.
 * 
 * Features:
 * - Fetches album data using getAlbumWithTracks
 * - Edit form with name, description, and is_public fields
 * - Form validation (name is required)
 * - Calls updateAlbum on submit
 * - Invalidates albums cache after successful update
 * - Navigates back to /library after save
 * - "Back to Library" button for navigation
 * 
 * Requirements: 9.2
 */
export default function AlbumEditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const albumId = params?.id as string;

  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch album data
  const fetchAlbum = useCallback(async () => {
    if (!albumId) {
      setError('Invalid album ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const albumData = await getAlbumWithTracks(albumId);
      
      if (!albumData) {
        setError('Album not found');
      } else {
        setAlbum(albumData);
        // Populate form with current values
        setName(albumData.name);
        setDescription(albumData.description || '');
        setIsPublic(albumData.is_public);
      }
    } catch (err) {
      console.error('Error fetching album:', err);
      setError('Failed to load album');
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (!authLoading) {
      fetchAlbum();
    }
  }, [authLoading, fetchAlbum]);

  // Check if current user is the album owner
  const isOwner = user && album && user.id === album.user_id;

  // Redirect if not owner
  useEffect(() => {
    if (!loading && !authLoading && album && !isOwner) {
      router.push('/library');
    }
  }, [loading, authLoading, album, isOwner, router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!album || !user) return;

    // Validate form
    if (!name.trim()) {
      setSaveError('Album name is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateAlbum(album.id, {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      });

      if (result.success) {
        // Invalidate albums and stats cache
        // This will trigger 'cache-invalidated' events that the library page listens to
        cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
        cache.invalidate(CACHE_KEYS.STATS(user.id));
        
        // Navigate back to library
        router.push('/library');
      } else {
        setSaveError(result.error || 'Failed to update album');
      }
    } catch (error) {
      console.error('Error updating album:', error);
      setSaveError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/library');
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading album...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !album) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Album Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The album you are looking for does not exist.'}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Library
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back to Library</span>
          </button>

          {/* Edit Form */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Edit Album</h1>

            {saveError && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
                <p className="text-sm text-red-400">{saveError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Album Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter album name"
                  required
                  disabled={isSaving}
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter album description (optional)"
                  disabled={isSaving}
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <label htmlFor="is-public" className="text-sm font-medium text-gray-300 block mb-1">
                    Make album public
                  </label>
                  <p className="text-xs text-gray-500">
                    Public albums can be viewed by anyone
                  </p>
                </div>
                <button
                  id="is-public"
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  disabled={isSaving}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isPublic ? 'bg-blue-600' : 'bg-gray-600'}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isPublic ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

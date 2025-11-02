'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { getAlbumWithTracks, deleteAlbum, reorderAlbumTracks, updateAlbum } from '@/lib/albums';
import type { AlbumWithTracks } from '@/types/album';
import Image from 'next/image';

/**
 * AlbumDetailPage Component
 * 
 * Displays detailed view of a single album with its tracks.
 * 
 * Features:
 * - Fetches album with tracks using getAlbumWithTracks function
 * - Displays album cover, title, description, and track count
 * - Displays tracks with track numbers (1, 2, 3...)
 * - Implements drag-and-drop track reordering using reorderAlbumTracks
 * - "Edit Album" button for album owner
 * - "Delete Album" button for album owner with confirmation
 * - Loading state while fetching album
 * - Error state if album not found
 * 
 * Requirements: 4.7, 4.11, 4.12
 */
export default function AlbumDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const albumId = params?.id as string;

  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
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
        setEditName(albumData.name);
        setEditDescription(albumData.description || '');
        setEditIsPublic(albumData.is_public);
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

  // Handle album deletion
  const handleDelete = async () => {
    if (!album) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteAlbum(album.id);

      if (result.success) {
        // Redirect to library page after successful deletion
        router.push('/library');
      } else {
        setDeleteError(result.error || 'Failed to delete album');
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle album edit
  const handleSaveEdit = async () => {
    if (!album) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateAlbum(album.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        is_public: editIsPublic,
      });

      if (result.success) {
        // Refresh album data
        await fetchAlbum();
        setShowEditModal(false);
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

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || !album || !isOwner) return;

    // Don't do anything if dropped on same position
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new tracks array with reordered items
    const newTracks = [...album.tracks];
    const [draggedTrack] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(dropIndex, 0, draggedTrack);

    // Optimistically update UI
    setAlbum({
      ...album,
      tracks: newTracks,
    });

    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Update positions in database
    const trackIds = newTracks.map(t => t.track_id);
    const result = await reorderAlbumTracks(album.id, trackIds);

    if (!result.success) {
      // Rollback on error
      console.error('Failed to reorder tracks:', result.error);
      await fetchAlbum();
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
              onClick={() => router.push('/library')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Library
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Generate gradient placeholder if no cover image
  const gradientColors = [
    'from-purple-400 to-pink-600',
    'from-blue-400 to-cyan-600',
    'from-green-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-indigo-400 to-purple-600',
  ];
  const gradientIndex = album.id.charCodeAt(0) % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/library')}
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

          {/* Album Header */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Album Cover */}
              <div className="flex-shrink-0">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                  {album.cover_image_url ? (
                    <Image
                      src={album.cover_image_url}
                      alt={album.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <span className="text-6xl">💿</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Album Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{album.name}</h1>
                    {album.description && (
                      <p className="text-gray-400 mb-4">{album.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}</span>
                      <span>•</span>
                      <span>{album.is_public ? 'Public' : 'Private'}</span>
                    </div>
                  </div>

                  {/* Owner Actions */}
                  {isOwner && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Edit Album
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracks List */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Tracks</h2>

            {album.tracks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-gray-400">No tracks in this album yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {album.tracks.map((albumTrack, index) => {
                  const track = albumTrack.track;
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={albumTrack.id}
                      draggable={isOwner ? true : false}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg transition-all
                        ${isDragging ? 'opacity-50' : ''}
                        ${isDragOver ? 'bg-gray-700 border-2 border-blue-500' : 'bg-gray-750 hover:bg-gray-700'}
                        ${isOwner ? 'cursor-move' : ''}
                      `}
                    >
                      {/* Track Number */}
                      <div className="flex-shrink-0 w-8 text-center text-gray-400 font-medium">
                        {index + 1}
                      </div>

                      {/* Track Cover */}
                      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-600">
                        {track.cover_art_url ? (
                          <Image
                            src={track.cover_art_url}
                            alt={track.title}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl">🎵</span>
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{track.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{track.artist_name || track.author || 'Unknown Artist'}</p>
                      </div>

                      {/* Drag Handle (Owner Only) */}
                      {isOwner && (
                        <div className="flex-shrink-0 text-gray-500">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Album
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &quot;{album.name}&quot;? This action cannot be undone. Tracks will not be deleted, only removed from this album.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
                <p className="text-sm text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Album Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit Album
            </h3>

            {saveError && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
                <p className="text-sm text-red-400">{saveError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-1">
                  Album Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter album name"
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter album description (optional)"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between">
                <label htmlFor="edit-is-public" className="text-sm font-medium text-gray-300">
                  Make album public
                </label>
                <button
                  id="edit-is-public"
                  type="button"
                  onClick={() => setEditIsPublic(!editIsPublic)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${editIsPublic ? 'bg-blue-600' : 'bg-gray-600'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${editIsPublic ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSaveError(null);
                  // Reset form to original values
                  setEditName(album.name);
                  setEditDescription(album.description || '');
                  setEditIsPublic(album.is_public);
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

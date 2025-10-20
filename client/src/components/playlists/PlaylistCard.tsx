'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { deletePlaylist } from '@/lib/playlists';
import type { Playlist } from '@/types/playlist';

interface PlaylistCardProps {
  playlist: Playlist;
  onDelete?: () => void;
  isOwner: boolean;
}

export function PlaylistCard({ playlist, onDelete, isOwner }: PlaylistCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deletePlaylist(playlist.id);

      if (result.success) {
        setShowDeleteModal(false);
        if (onDelete) {
          onDelete();
        }
      } else {
        setDeleteError(result.error || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      setDeleteError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate gradient placeholder if no cover image
  const gradientColors = [
    'from-purple-400 to-pink-600',
    'from-blue-400 to-cyan-600',
    'from-green-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-indigo-400 to-purple-600',
  ];
  const gradientIndex = playlist.id.charCodeAt(0) % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  // Format creation date
  const createdDate = new Date(playlist.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {/* Cover Image or Gradient */}
        <Link href={`/playlists/${playlist.id}`}>
          <div className="relative h-48 w-full">
            {playlist.cover_image_url ? (
              <Image
                src={playlist.cover_image_url}
                alt={playlist.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <svg
                  className="w-16 h-16 text-white opacity-80"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
            
            {/* Privacy Badge */}
            {!playlist.is_public && (
              <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Private
              </div>
            )}
          </div>
        </Link>

        {/* Playlist Info */}
        <div className="p-4">
          <Link href={`/playlists/${playlist.id}`}>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
              {playlist.name}
            </h3>
          </Link>
          
          {playlist.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {playlist.description}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Created {createdDate}
          </p>

          {/* Action Buttons (Owner Only) */}
          {isOwner && (
            <div className="flex gap-2 mt-4">
              <Link
                href={`/playlists/${playlist.id}/edit`}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-center"
              >
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Playlist
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete &quot;{playlist.name}&quot;? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

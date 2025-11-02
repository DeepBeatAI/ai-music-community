'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { deleteAlbum } from '@/lib/albums';
import type { Album, AlbumWithOwner } from '@/types/album';

interface AlbumCardProps {
  album: Album | AlbumWithOwner;
  onDelete?: () => void;
  isOwner: boolean;
  showTrackNumbers?: boolean;
}

// Type guard to check if album has owner information
function isAlbumWithOwner(album: Album | AlbumWithOwner): album is AlbumWithOwner {
  return 'owner' in album && album.owner !== null;
}

/**
 * AlbumCard Component
 * 
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const AlbumCard = memo(function AlbumCard({ album, onDelete, isOwner }: AlbumCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteAlbum(album.id);

      if (result.success) {
        setShowDeleteModal(false);
        if (onDelete) {
          onDelete();
        }
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

  // Format creation date
  const createdDate = new Date(album.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-all">
        {/* Cover Image or Gradient */}
        <Link href={`/library/albums/${album.id}`}>
          <div className="relative h-48 w-full">
            {album.cover_image_url ? (
              <Image
                src={album.cover_image_url}
                alt={album.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                {/* Album icon (💿) */}
                <div className="text-6xl text-white opacity-80">💿</div>
              </div>
            )}
            
            {/* Privacy Badge */}
            {!album.is_public && (
              <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
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

        {/* Album Info */}
        <div className="p-4">
          <Link href={`/library/albums/${album.id}`}>
            <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1">
              {album.name}
            </h3>
          </Link>
          
          {/* Creator name for public albums */}
          {!isOwner && isAlbumWithOwner(album) && (
            <p className="text-sm text-gray-400 mt-1">
              by {album.owner.username}
            </p>
          )}
          
          {album.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {album.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Created {createdDate}
            </p>
            
            {/* Public badge for public albums */}
            {album.is_public && !isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Public
              </span>
            )}
          </div>

          {/* Action Buttons (Owner Only) */}
          {isOwner && (
            <div className="flex gap-2 mt-4">
              <Link
                href={`/library/albums/${album.id}/edit`}
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
              Delete Album
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete &quot;{album.name}&quot;? This action cannot be undone.
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
});

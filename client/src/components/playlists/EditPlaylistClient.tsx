'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { updatePlaylist } from '@/lib/playlists';
import type { Playlist, PlaylistFormData } from '@/types/playlist';

interface EditPlaylistClientProps {
  playlist: Playlist;
}

export function EditPlaylistClient({ playlist }: EditPlaylistClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: playlist.name,
    description: playlist.description || '',
    is_public: playlist.is_public,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!formData.name.trim()) {
      setError('Playlist name is required');
      return;
    }

    if (formData.name.length > 255) {
      setError('Playlist name must be 255 characters or less');
      return;
    }

    // Validate description length
    if (formData.description && formData.description.length > 1000) {
      setError('Description must be 1000 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePlaylist(playlist.id, formData);

      if (result.success) {
        // Redirect to playlist detail page
        router.push(`/playlists/${playlist.id}`);
      } else {
        setError(result.error || 'Failed to update playlist');
      }
    } catch (err) {
      console.error('Error updating playlist:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/playlists/${playlist.id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Edit Playlist</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Playlist Name */}
        <div>
          <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-200 mb-1">
            Playlist Name <span className="text-red-500">*</span>
          </label>
          <input
            id="playlist-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Awesome Playlist"
            maxLength={255}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-800 disabled:cursor-not-allowed placeholder-gray-400"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            {formData.name.length}/255 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="playlist-description" className="block text-sm font-medium text-gray-200 mb-1">
            Description
          </label>
          <textarea
            id="playlist-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your playlist..."
            maxLength={1000}
            rows={4}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-800 disabled:cursor-not-allowed resize-none placeholder-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            {formData.description?.length || 0}/1000 characters
          </p>
        </div>

        {/* Public/Private Toggle */}
        <div className="flex items-center">
          <input
            id="playlist-public"
            type="checkbox"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            disabled={isSubmitting}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded disabled:cursor-not-allowed bg-gray-700"
          />
          <label htmlFor="playlist-public" className="ml-2 block text-sm text-gray-200">
            Make this playlist public
          </label>
        </div>
        <p className="text-xs text-gray-400 ml-6">
          {formData.is_public 
            ? 'Anyone can view this playlist' 
            : 'Only you can view this playlist'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
        </div>
      </div>
    </MainLayout>
  );
}

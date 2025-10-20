'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createPlaylist } from '@/lib/playlists';
import type { PlaylistFormData } from '@/types/playlist';

interface CreatePlaylistProps {
  onSuccess?: (playlistId: string) => void;
  onCancel?: () => void;
}

export function CreatePlaylist({ onSuccess, onCancel }: CreatePlaylistProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: '',
    description: '',
    is_public: false,
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

    if (!user) {
      setError('You must be logged in to create a playlist');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPlaylist(user.id, formData);

      if (result.success && result.playlist) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          is_public: false,
        });

        // Call success callback
        if (onSuccess) {
          onSuccess(result.playlist.id);
        }
      } else {
        setError(result.error || 'Failed to create playlist');
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Playlist Name */}
      <div>
        <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-700 mb-1">
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
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder-gray-400"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.name.length}/255 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="playlist-description" className="block text-sm font-medium text-gray-700 mb-1">
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
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none placeholder-gray-400"
        />
        <p className="text-xs text-gray-500 mt-1">
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
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
        />
        <label htmlFor="playlist-public" className="ml-2 block text-sm text-gray-700">
          Make this playlist public
        </label>
      </div>
      <p className="text-xs text-gray-500 ml-6">
        {formData.is_public 
          ? 'Anyone can view this playlist' 
          : 'Only you can view this playlist'}
      </p>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Playlist'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

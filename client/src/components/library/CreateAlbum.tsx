'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createAlbum } from '@/lib/albums';
import { cache, CACHE_KEYS } from '@/utils/cache';
import type { AlbumFormData } from '@/types/album';

interface CreateAlbumProps {
  onSuccess?: (albumId: string) => void;
  onCancel?: () => void;
}

export function CreateAlbum({ onSuccess, onCancel }: CreateAlbumProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<AlbumFormData>({
    name: '',
    description: '',
    is_public: true, // Albums default to public (different from playlists)
    cover_image_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!formData.name.trim()) {
      setError('Album name is required');
      return;
    }

    if (formData.name.length > 255) {
      setError('Album name must be 255 characters or less');
      return;
    }

    // Validate description length
    if (formData.description && formData.description.length > 1000) {
      setError('Description must be 1000 characters or less');
      return;
    }

    if (!user) {
      setError('You must be logged in to create an album');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAlbum({
        user_id: user.id,
        name: formData.name,
        description: formData.description || undefined,
        is_public: formData.is_public,
        cover_image_url: formData.cover_image_url || undefined,
      });

      if (result.success && result.album) {
        // Invalidate cache on mutation
        if (user) {
          cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
          cache.invalidate(CACHE_KEYS.STATS(user.id));
        }
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          is_public: true,
          cover_image_url: '',
        });

        // Call success callback
        if (onSuccess) {
          onSuccess(result.album.id);
        }
      } else {
        setError(result.error || 'Failed to create album');
      }
    } catch (err) {
      console.error('Error creating album:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Album Name */}
      <div>
        <label htmlFor="album-name" className="block text-sm font-medium text-gray-700 mb-1">
          Album Name <span className="text-red-500">*</span>
        </label>
        <input
          id="album-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Awesome Album"
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
        <label htmlFor="album-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="album-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your album..."
          maxLength={1000}
          rows={4}
          disabled={isSubmitting}
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none placeholder-gray-400"
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.description?.length || 0}/1000 characters
        </p>
      </div>

      {/* Cover Image URL */}
      <div>
        <label htmlFor="album-cover" className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image URL
        </label>
        <input
          id="album-cover"
          type="url"
          value={formData.cover_image_url}
          onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
          placeholder="https://example.com/cover.jpg"
          disabled={isSubmitting}
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder-gray-400"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Provide a URL for the album cover image
        </p>
      </div>

      {/* Public/Private Toggle */}
      <div className="flex items-center">
        <input
          id="album-public"
          type="checkbox"
          checked={formData.is_public}
          onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
          disabled={isSubmitting}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
        />
        <label htmlFor="album-public" className="ml-2 block text-sm text-gray-700">
          Make this album public
        </label>
      </div>
      <p className="text-xs text-gray-500 ml-6">
        {formData.is_public 
          ? 'Anyone can view this album' 
          : 'Only you can view this album'}
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
          {isSubmitting ? 'Creating...' : 'Create Album'}
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

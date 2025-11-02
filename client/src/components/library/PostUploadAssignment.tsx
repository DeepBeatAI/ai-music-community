'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserAlbums } from '@/lib/albums';
import { getUserPlaylists } from '@/lib/playlists';
import { addTrackToAlbum } from '@/lib/albums';
import { addTrackToPlaylist } from '@/lib/playlists';
import type { Album } from '@/types/album';
import type { Playlist } from '@/types/playlist';

interface PostUploadAssignmentProps {
  trackId: string;
  userId: string;
  onDone: () => void;
  onUploadAnother: () => void;
  onSkip: () => void;
}

export default function PostUploadAssignment({
  trackId,
  userId,
  onDone,
  onUploadAnother,
  onSkip,
}: PostUploadAssignmentProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch albums and playlists
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [albumsData, playlistsData] = await Promise.all([
          getUserAlbums(userId),
          getUserPlaylists(userId),
        ]);

        setAlbums(albumsData || []);
        setPlaylists(playlistsData || []);
      } catch (err) {
        console.error('Error fetching albums and playlists:', err);
        setError('Failed to load albums and playlists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Handle album selection
  const handleAlbumChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAlbumId(e.target.value);
    setError(null);
  }, []);

  // Handle playlist selection (multi-select)
  const handlePlaylistToggle = useCallback((playlistId: string) => {
    setSelectedPlaylistIds(prev => {
      if (prev.includes(playlistId)) {
        return prev.filter(id => id !== playlistId);
      } else {
        return [...prev, playlistId];
      }
    });
    setError(null);
  }, []);

  // Handle save assignments
  const handleSave = useCallback(async (action: 'done' | 'upload-another') => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const promises: Promise<unknown>[] = [];

      // Add to album if selected
      if (selectedAlbumId && selectedAlbumId !== 'skip') {
        promises.push(
          addTrackToAlbum({
            album_id: selectedAlbumId,
            track_id: trackId,
          })
        );
      }

      // Add to playlists if selected
      if (selectedPlaylistIds.length > 0) {
        selectedPlaylistIds.forEach(playlistId => {
          promises.push(
            addTrackToPlaylist({
              playlist_id: playlistId,
              track_id: trackId,
            })
          );
        });
      }

      // Execute all assignments in parallel
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        
        // Check for errors
        const errors = results.filter((result: unknown) => {
          const r = result as { success: boolean; error?: string };
          return !r.success;
        });

        if (errors.length > 0) {
          const errorMessages = errors.map((result: unknown) => {
            const r = result as { error?: string };
            return r.error || 'Unknown error';
          });
          throw new Error(errorMessages.join(', '));
        }

        setSuccessMessage('Track assigned successfully!');
      }

      // Call appropriate callback after a brief delay to show success message
      setTimeout(() => {
        if (action === 'done') {
          onDone();
        } else {
          onUploadAnother();
        }
      }, 500);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assignments');
    } finally {
      setIsSaving(false);
    }
  }, [selectedAlbumId, selectedPlaylistIds, trackId, onDone, onUploadAnother]);

  // Handle Done button
  const handleDone = useCallback(() => {
    handleSave('done');
  }, [handleSave]);

  // Handle Upload Another button
  const handleUploadAnotherClick = useCallback(() => {
    handleSave('upload-another');
  }, [handleSave]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2 text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Loading albums and playlists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-4">
      {/* Success Message */}
      <div className="flex items-start space-x-3 pb-3 border-b border-gray-600">
        <span className="text-2xl">✅</span>
        <div className="flex-1">
          <p className="text-green-400 font-medium mb-1">Track uploaded successfully!</p>
          <p className="text-green-300 text-sm">Assign it to albums or playlists (optional)</p>
        </div>
      </div>

      {/* Album Selection */}
      <div>
        <label htmlFor="album-select" className="block text-sm font-medium text-gray-300 mb-2">
          Add to Album (optional)
        </label>
        <select
          id="album-select"
          value={selectedAlbumId}
          onChange={handleAlbumChange}
          disabled={isSaving}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select an album...</option>
          <option value="skip">Skip - Don&apos;t add to album</option>
          {albums.map(album => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
        {albums.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No albums yet. You can create one later from the My Albums section.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Note: A track can only belong to one album at a time
        </p>
      </div>

      {/* Playlist Selection (Multi-select) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Add to Playlists (optional)
        </label>
        <div className="bg-gray-700 border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              No playlists yet. You can create one later from the My Playlists section.
            </div>
          ) : (
            <div className="divide-y divide-gray-600">
              {playlists.map(playlist => (
                <label
                  key={playlist.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylistIds.includes(playlist.id)}
                    onChange={() => handlePlaylistToggle(playlist.id)}
                    disabled={isSaving}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="flex-1 text-sm text-gray-200">{playlist.name}</span>
                  {playlist.is_public && (
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                      Public
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          A track can belong to multiple playlists
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded p-3">
          <p className="text-red-400 text-sm font-medium mb-1">Assignment failed:</p>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700 rounded p-3">
          <p className="text-green-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        <button
          onClick={handleDone}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Done'}
        </button>
        
        <button
          onClick={handleUploadAnotherClick}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Upload Another'}
        </button>
        
        <button
          onClick={onSkip}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

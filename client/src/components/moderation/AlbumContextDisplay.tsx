'use client';

import { AlbumContext } from '@/types/moderation';

interface AlbumContextDisplayProps {
  albumContext: AlbumContext | null;
  loading: boolean;
  error: string | null;
}

/**
 * AlbumContextDisplay Component
 * Requirements: 3.2, 3.4, 3.5
 * 
 * Displays comprehensive album context in the moderation panel when reviewing
 * album reports. Shows album metadata, track list, and aggregate statistics.
 */
export function AlbumContextDisplay({
  albumContext,
  loading,
  error,
}: AlbumContextDisplayProps) {
  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-700 rounded-lg p-5 space-y-3">
        <h3 className="text-lg font-semibold text-white">Album Context</h3>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <p className="text-sm text-gray-400">Loading album context...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-700 rounded-lg p-5 space-y-3">
        <h3 className="text-lg font-semibold text-white">Album Context</h3>
        <div className="bg-red-900/20 border border-red-500 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!albumContext) {
    return null;
  }

  /**
   * Format duration from seconds to MM:SS format
   */
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format total duration for display (e.g., "1h 23m" or "45m 12s")
   */
  const formatTotalDuration = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-700 rounded-lg p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Album Context</h3>

      {/* Album Metadata */}
      <div className="space-y-3">
        {/* Album Cover (if available) */}
        {albumContext.cover_image_url && (
          <div className="flex justify-center">
            <img
              src={albumContext.cover_image_url}
              alt={`${albumContext.name} cover`}
              className="w-32 h-32 rounded-lg object-cover"
            />
          </div>
        )}

        {/* Album Title */}
        <div>
          <span className="text-sm text-gray-400">Album Title:</span>
          <p className="text-white font-semibold text-lg">{albumContext.name}</p>
        </div>

        {/* Album Description */}
        {albumContext.description && (
          <div>
            <span className="text-sm text-gray-400">Description:</span>
            <div className="bg-gray-800 rounded p-3 mt-1 max-h-32 overflow-y-auto">
              <p className="text-white text-sm whitespace-pre-wrap">
                {albumContext.description}
              </p>
            </div>
          </div>
        )}

        {/* Visibility Status */}
        <div>
          <span className="text-sm text-gray-400">Visibility:</span>
          <p className="text-white text-sm">
            {albumContext.is_public ? (
              <span className="inline-flex items-center px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                Public
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                Private
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Aggregate Statistics */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Album Statistics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-gray-400">Track Count</span>
            <p className="text-white text-lg font-semibold">{albumContext.track_count}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Total Duration</span>
            <p className="text-white text-lg font-semibold">
              {formatTotalDuration(albumContext.total_duration)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Upload Date</span>
            <p className="text-white text-sm">{formatDate(albumContext.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Tracks ({albumContext.track_count})
        </h4>
        {albumContext.tracks.length > 0 ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="text-left text-xs text-gray-400 font-medium px-3 py-2 w-12">
                      #
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-3 py-2">
                      Title
                    </th>
                    <th className="text-right text-xs text-gray-400 font-medium px-3 py-2 w-20">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {albumContext.tracks.map((track, index) => (
                    <tr key={track.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="text-gray-400 text-sm px-3 py-2">
                        {index + 1}
                      </td>
                      <td className="text-white text-sm px-3 py-2">
                        {track.title}
                      </td>
                      <td className="text-gray-400 text-sm px-3 py-2 text-right font-mono">
                        {formatDuration(track.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">No tracks in this album</p>
          </div>
        )}
      </div>
    </div>
  );
}

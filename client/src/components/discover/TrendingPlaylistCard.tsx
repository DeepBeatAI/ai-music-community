'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingPlaylist } from '@/types/analytics';
import PlaylistLikeButton from '@/components/playlists/PlaylistLikeButton';
import { PlaylistCardErrorBoundary } from './DiscoverErrorBoundaries';
import { usePlayback } from '@/contexts/PlaybackContext';
import { getPlaylistWithTracks } from '@/lib/playlists';
import { onLikeEvent } from '@/utils/likeEventEmitter';

interface TrendingPlaylistCardProps {
  playlist: TrendingPlaylist;
  rank: number;
  showDate?: boolean;
}

export default function TrendingPlaylistCard({ 
  playlist, 
  rank,
  showDate = false 
}: TrendingPlaylistCardProps) {
  const router = useRouter();
  const { playPlaylist } = usePlayback();
  const [likeCount, setLikeCount] = useState(playlist.like_count);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the like button or play button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/playlist/${playlist.playlist_id}`);
  };

  const handleLikeChange = (liked: boolean, newLikeCount: number) => {
    setLikeCount(newLikeCount);
  };

  // Listen for like events from other instances to sync like count
  useEffect(() => {
    const cleanup = onLikeEvent((detail) => {
      // Only update if this is for the same playlist
      if (detail.itemType === 'playlist' && detail.itemId === playlist.playlist_id) {
        setLikeCount(detail.likeCount);
      }
    });

    return cleanup;
  }, [playlist.playlist_id]);

  /**
   * Handle play button click with retry logic
   */
  const handlePlayPlaylist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (playlist.track_count === 0) return;
    
    setIsLoadingPlay(true);
    
    // Retry logic: try up to 2 times with 500ms delay
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const playlistData = await getPlaylistWithTracks(playlist.playlist_id);
        
        if (!playlistData) {
          console.warn(`Attempt ${attempts + 1}: No playlist data returned for ${playlist.playlist_id}`);
          
          if (attempts < maxAttempts - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            continue;
          } else {
            console.error('Failed to fetch playlist after all attempts');
            break;
          }
        }
        
        // Success - play the playlist
        await playPlaylist(playlistData, 0);
        break;
        
      } catch (error) {
        console.error(`Attempt ${attempts + 1}: Error playing playlist:`, {
          playlistId: playlist.playlist_id,
          error,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        
        if (attempts < maxAttempts - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        } else {
          // Final attempt failed
          console.error('Failed to play playlist after all attempts');
          break;
        }
      }
    }
    
    setIsLoadingPlay(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <PlaylistCardErrorBoundary playlistId={playlist.playlist_id}>
      <div
        onClick={handleCardClick}
        className="
          group relative flex items-center gap-4 p-4 rounded-lg 
          bg-gray-800/50 hover:bg-gray-800/70 
          border border-gray-700/50 hover:border-gray-600/50
          transition-all duration-200 cursor-pointer
        "
      >
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg
            ${rank <= 3 
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900' 
              : 'bg-gray-700 text-gray-300'
            }
          `}>
            {rank}
          </div>
        </div>

        {/* Playlist Cover */}
        <div className="flex-shrink-0">
          {playlist.cover_image_url ? (
            <img
              src={playlist.cover_image_url}
              alt={playlist.name}
              className="w-16 h-16 rounded-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-md bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          )}
        </div>

        {/* Playlist Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
            {playlist.name}
          </h3>
          <p className="text-sm text-gray-400 truncate">
            by{' '}
            <a
              href={`/profile/${playlist.creator_username}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-400 hover:underline transition-colors"
            >
              {playlist.creator_username}
            </a>
          </p>
          {showDate && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(playlist.created_at)}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span>▶️</span>
              <span>{playlist.play_count.toLocaleString()} plays</span>
            </span>
            <span className="flex items-center gap-1">
              <span>❤️</span>
              <span>{likeCount.toLocaleString()} likes</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🎵</span>
              <span>{playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span>{playlist.trending_score.toFixed(1)} score</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Play Button */}
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePlayPlaylist}
            disabled={isLoadingPlay || playlist.track_count === 0}
            title={playlist.track_count === 0 ? 'No tracks in playlist' : 'Play playlist'}
          >
            {isLoadingPlay ? 'Loading...' : 'Play'}
          </button>
          
          {/* Like Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <PlaylistLikeButton
              playlistId={playlist.playlist_id}
              initialLikeCount={playlist.like_count}
              size="md"
              onLikeChange={handleLikeChange}
            />
          </div>
        </div>
      </div>
    </PlaylistCardErrorBoundary>
  );
}

'use client'
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingAlbum } from '@/types/analytics';
import AlbumLikeButton from '@/components/albums/AlbumLikeButton';
import { AlbumCardErrorBoundary } from './DiscoverErrorBoundaries';
import { usePlayback } from '@/contexts/PlaybackContext';
import type { PlaylistWithTracks } from '@/types/playlist';
import { getAlbumWithTracks } from '@/lib/albums';
import { onLikeEvent } from '@/utils/likeEventEmitter';

interface TrendingAlbumCardProps {
  album: TrendingAlbum;
  rank: number;
  showDate?: boolean;
}

export default function TrendingAlbumCard({ 
  album, 
  rank,
  showDate = false 
}: TrendingAlbumCardProps) {
  const router = useRouter();
  const { playPlaylist } = usePlayback();
  const [likeCount, setLikeCount] = useState(album.like_count);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the like button or play button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/album/${album.album_id}`);
  };

  const handleLikeChange = (liked: boolean, newLikeCount: number) => {
    setLikeCount(newLikeCount);
  };

  // Listen for like events from other instances to sync like count
  useEffect(() => {
    const cleanup = onLikeEvent((detail) => {
      // Only update if this is for the same album
      if (detail.itemType === 'album' && detail.itemId === album.album_id) {
        setLikeCount(detail.likeCount);
      }
    });

    return cleanup;
  }, [album.album_id]);

  /**
   * Convert album to playlist format for playback
   */
  const convertAlbumToPlaylist = useCallback(async (albumId: string): Promise<PlaylistWithTracks | null> => {
    try {
      const albumData = await getAlbumWithTracks(albumId);
      if (!albumData) return null;

      return {
        id: `album-${albumData.id}`,
        name: albumData.name,
        description: albumData.description,
        cover_image_url: albumData.cover_image_url,
        user_id: albumData.user_id,
        is_public: albumData.is_public,
        created_at: albumData.created_at,
        updated_at: albumData.updated_at,
        tracks: albumData.tracks.map((albumTrack) => ({
          id: `album-track-${albumTrack.id}`,
          track_id: albumTrack.track_id,
          position: albumTrack.position,
          added_at: albumTrack.added_at,
          track: {
            id: albumTrack.track.id,
            title: albumTrack.track.title,
            author: albumTrack.track.artist_name || albumTrack.track.author || 'Unknown Artist',
            artist_name: albumTrack.track.artist_name || albumTrack.track.author || 'Unknown Artist',
            description: albumTrack.track.description || null,
            file_url: albumTrack.track.file_url || '',
            audio_url: albumTrack.track.file_url || '',
            duration: albumTrack.track.duration,
            cover_image_url: albumTrack.track.cover_art_url,
          },
        })),
        track_count: albumData.track_count,
      };
    } catch (error) {
      console.error('Error converting album to playlist:', error);
      return null;
    }
  }, []);

  /**
   * Handle play button click with retry logic
   */
  const handlePlayAlbum = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (album.track_count === 0) return;
    
    setIsLoadingPlay(true);
    
    // Retry logic: try up to 2 times with 500ms delay
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const playlistFormat = await convertAlbumToPlaylist(album.album_id);
        
        if (!playlistFormat) {
          console.warn(`Attempt ${attempts + 1}: No album data returned for ${album.album_id}`);
          
          if (attempts < maxAttempts - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            continue;
          } else {
            console.error('Failed to fetch album after all attempts');
            break;
          }
        }
        
        // Success - play the album
        await playPlaylist(playlistFormat, 0);
        break;
        
      } catch (error) {
        console.error(`Attempt ${attempts + 1}: Error playing album:`, {
          albumId: album.album_id,
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
          console.error('Failed to play album after all attempts');
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
    <AlbumCardErrorBoundary albumId={album.album_id}>
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

        {/* Album Cover */}
        <div className="flex-shrink-0">
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt={album.name}
              className="w-16 h-16 rounded-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-md bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
          )}
        </div>

        {/* Album Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
            {album.name}
          </h3>
          <p className="text-sm text-gray-400 truncate">
            by{' '}
            <a
              href={`/profile/${album.creator_username}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-400 hover:underline transition-colors"
            >
              {album.creator_username}
            </a>
          </p>
          {showDate && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(album.created_at)}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span>▶️</span>
              <span>{album.play_count.toLocaleString()} plays</span>
            </span>
            <span className="flex items-center gap-1">
              <span>❤️</span>
              <span>{likeCount.toLocaleString()} likes</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🎵</span>
              <span>{album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span>{album.trending_score.toFixed(1)} score</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Play Button */}
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePlayAlbum}
            disabled={isLoadingPlay || album.track_count === 0}
            title={album.track_count === 0 ? 'No tracks in album' : 'Play album'}
          >
            {isLoadingPlay ? 'Loading...' : 'Play'}
          </button>
          
          {/* Like Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <AlbumLikeButton
              albumId={album.album_id}
              initialLikeCount={album.like_count}
              size="md"
              onLikeChange={handleLikeChange}
            />
          </div>
        </div>
      </div>
    </AlbumCardErrorBoundary>
  );
}

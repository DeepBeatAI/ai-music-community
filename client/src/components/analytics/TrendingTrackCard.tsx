'use client';

import { useState, useEffect } from 'react';
import { usePlayback } from '@/contexts/PlaybackContext';
import { useAuth } from '@/contexts/AuthContext';
import SaveButton from '@/components/profile/SaveButton';
import type { TrendingTrack } from '@/lib/trendingAnalytics';
import type { PlaylistTrackDisplay } from '@/types/playlist';
import { getSavedStatus } from '@/lib/saveService';

interface TrendingTrackCardProps {
  track: TrendingTrack;
  rank: number;
  showDate?: boolean;
}

/**
 * TrendingTrackCard Component
 * Displays a single trending track with rank, stats, and play button
 */
export function TrendingTrackCard({ track, rank, showDate }: TrendingTrackCardProps) {
  const { playTrack, currentTrack, isPlaying, pause } = usePlayback();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  
  // Check if this track is currently playing
  const isCurrentTrack = currentTrack?.id === track.track_id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  
  /**
   * Handle play button click
   * Converts trending track to PlaylistTrackDisplay format and plays it
   */
  const handlePlay = async (): Promise<void> => {
    try {
      // If this track is currently playing, pause it
      if (isCurrentlyPlaying) {
        pause();
        return;
      }
      
      setIsLoading(true);
      
      // Convert TrendingTrack to PlaylistTrackDisplay format
      // Use file_url directly from the track (added in Task 7)
      const trackToPlay: PlaylistTrackDisplay = {
        id: track.track_id,
        title: track.title,
        author: track.author,
        file_url: track.file_url,
        created_at: track.created_at,
        // Include other fields that might be needed
        play_count: track.play_count,
      };
      
      // Play the track using PlaybackContext
      await playTrack(trackToPlay);
    } catch (error) {
      console.error('Failed to play track:', error);
      // TODO: Show user-friendly error notification
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
  };

  // Fetch saved status on mount
  useEffect(() => {
    const fetchSavedStatus = async () => {
      if (!user) {
        setIsLoadingSaved(false);
        return;
      }

      try {
        const result = await getSavedStatus(user.id, track.track_id, 'track');
        if (result.data !== null) {
          setIsSaved(result.data);
        }
      } catch (error) {
        console.error('Error fetching saved status:', error);
      } finally {
        setIsLoadingSaved(false);
      }
    };

    fetchSavedStatus();
  }, [user, track.track_id]);
  
  // Determine button text based on state
  const buttonText = isCurrentlyPlaying ? 'Pause' : 'Play';
  
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
      {/* Rank */}
      <div className="text-2xl font-bold text-gray-500 w-8 flex-shrink-0">
        #{rank}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate">{track.title}</h4>
        <p className="text-sm text-gray-400 truncate">by {track.author}</p>
        {showDate && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(track.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm flex-shrink-0">
        <div className="text-center">
          <div className="font-semibold text-white">{track.play_count}</div>
          <div className="text-gray-500 text-xs">plays</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-white">{track.like_count}</div>
          <div className="text-gray-500 text-xs">likes</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-blue-400">{track.trending_score.toFixed(1)}</div>
          <div className="text-gray-500 text-xs">score</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePlay}
          disabled={isLoading || !track.file_url}
        >
          {isLoading ? 'Loading...' : buttonText}
        </button>

        {/* Save Button - only show if not own content */}
        {!isLoadingSaved && user && user.id !== track.user_id && (
          <SaveButton
            itemId={track.track_id}
            itemType="track"
            isSaved={isSaved}
            onToggle={handleSaveToggle}
            size="md"
          />
        )}
      </div>
    </div>
  );
}

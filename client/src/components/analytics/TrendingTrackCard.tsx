'use client';

import type { TrendingTrack } from '@/lib/analytics';

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
      <button 
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex-shrink-0"
        onClick={() => {
          // TODO: Implement play functionality
          console.log('Play track:', track.track_id);
        }}
      >
        Play
      </button>
    </div>
  );
}

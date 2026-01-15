'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { PopularCreator } from '@/lib/trendingAnalytics';
import { formatCreatorScore } from '@/utils/creatorScore';

interface PopularCreatorCardProps {
  creator: PopularCreator;
  rank: number;
}

/**
 * PopularCreatorCard Component
 * Displays a single popular creator with rank, stats, and profile link
 * Compact horizontal layout for discover page
 */
export function PopularCreatorCard({ creator, rank }: PopularCreatorCardProps) {
  return (
    <div className="relative flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
      {/* Rank Badge */}
      <div className="flex-shrink-0 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
        #{rank}
      </div>

      {/* Avatar */}
      {creator.avatar_url ? (
        <Image
          src={creator.avatar_url}
          alt={creator.username}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}

      {/* Creator Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate text-sm">{creator.username}</h4>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{creator.track_count} tracks</span>
          <span>•</span>
          <span>{creator.total_plays} plays</span>
          <span>•</span>
          <span>{creator.total_likes} likes</span>
        </div>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-bold text-amber-500">
          {formatCreatorScore(creator.creator_score)}
        </div>
        <div className="text-xs text-gray-500">Score</div>
      </div>

      {/* View Profile Button */}
      <Link
        href={`/profile/${creator.username}`}
        className="flex-shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
      >
        View
      </Link>
    </div>
  );
}

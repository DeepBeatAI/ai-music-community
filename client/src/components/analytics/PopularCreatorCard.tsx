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
 */
export function PopularCreatorCard({ creator, rank }: PopularCreatorCardProps) {
  return (
    <div className="relative p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
      {/* Rank Badge */}
      <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
        #{rank}
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-3 mb-3">
        {creator.avatar_url ? (
          <Image
            src={creator.avatar_url}
            alt={creator.username}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{creator.username}</h4>
          <p className="text-sm text-gray-400">{creator.track_count} tracks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="font-semibold text-white">{creator.total_plays}</div>
          <div className="text-gray-500 text-xs">Total Plays</div>
        </div>
        <div>
          <div className="font-semibold text-white">{creator.total_likes}</div>
          <div className="text-gray-500 text-xs">Total Likes</div>
        </div>
      </div>

      {/* Score */}
      <div className="pt-3 border-t border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-amber-500">
            {formatCreatorScore(creator.creator_score)}
          </div>
          <div className="text-xs text-gray-500">Creator Score</div>
        </div>
      </div>

      {/* Actions */}
      <Link
        href={`/profile/${creator.username}`}
        className="block mt-3 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-center rounded transition-colors"
      >
        View Profile
      </Link>
    </div>
  );
}

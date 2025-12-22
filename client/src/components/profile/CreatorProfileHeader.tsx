'use client'

import Image from 'next/image';
import FollowButton from '@/components/FollowButton';
import { ReportButton } from '@/components/moderation/ReportButton';
import { ModeratorFlagButton } from '@/components/moderation/ModeratorFlagButton';
import type { CreatorProfile } from '@/types';

interface CreatorProfileHeaderProps {
  profile: CreatorProfile;
  isOwnProfile: boolean;
}

export default function CreatorProfileHeader({
  profile,
  isOwnProfile
}: CreatorProfileHeaderProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-600">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 128px, 160px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl md:text-6xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 break-words">
                {profile.username}
              </h1>
              {profile.full_name && (
                <p className="text-lg text-gray-300 break-words">
                  {profile.full_name}
                </p>
              )}
            </div>

            {/* Follow Button and Moderation Actions - Hidden for own profile */}
            {!isOwnProfile && (
              <div className="flex-shrink-0 flex flex-col gap-2">
                <FollowButton
                  userId={profile.id}
                  username={profile.username}
                  size="lg"
                  variant="primary"
                />
                
                {/* Report and Flag Buttons */}
                <div className="flex items-center gap-2">
                  <ReportButton
                    reportType="user"
                    targetId={profile.id}
                    contentCreatorId={profile.id}
                    iconOnly={false}
                  />
                  <ModeratorFlagButton
                    reportType="user"
                    targetId={profile.id}
                    contentCreatorId={profile.id}
                    iconOnly={false}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-300 mb-4 whitespace-pre-wrap break-words">
              {profile.bio}
            </p>
          )}

          {/* Website */}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
              aria-label={`Visit ${profile.username}'s website`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="break-all">{profile.website}</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

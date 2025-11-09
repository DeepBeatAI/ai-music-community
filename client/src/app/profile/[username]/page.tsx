'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import UserTypeBadge from '@/components/profile/UserTypeBadge';
import CreatorProfileHeader from '@/components/profile/CreatorProfileHeader';
import CreatorStatsSection from '@/components/profile/CreatorStatsSection';
import CreatorTracksSection from '@/components/profile/CreatorTracksSection';
import CreatorAlbumsSection from '@/components/profile/CreatorAlbumsSection';
import CreatorPlaylistsSection from '@/components/profile/CreatorPlaylistsSection';
import { getCreatorByUsername, getCreatorById } from '@/lib/profileService';
import type { CreatorProfile } from '@/types';



/**
 * CreatorProfilePage Component
 * 
 * Main page for viewing a creator's public profile.
 * Displays profile information, stats, and public content (tracks, albums, playlists).
 * 
 * Features:
 * - Username-based routing with fallback to user ID
 * - User type badge display
 * - Follow/Following button (hidden for own profile)
 * - Stats dashboard
 * - Public tracks, albums, and playlists sections
 * - Error boundaries for each section
 * - Loading and error states
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 14.1
 */
export default function CreatorProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [refreshKey] = useState(0);

  // Fetch creator profile
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try fetching by username first
        let profile = await getCreatorByUsername(username);

        // If not found, try as user ID
        if (!profile) {
          profile = await getCreatorById(username);
        }

        if (!profile) {
          setError('Creator not found');
          setCreatorProfile(null);
          return;
        }

        setCreatorProfile(profile);

        // Check if viewing own profile
        if (user && user.id === profile.id) {
          setIsOwnProfile(true);
        } else {
          setIsOwnProfile(false);
        }
      } catch (err) {
        console.error('Error fetching creator profile:', err);
        setError('Failed to load creator profile');
        setCreatorProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCreator();
    }
  }, [username, user, authLoading]);

  // Show loading state
  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading creator profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state - Creator not found
  if (error || !creatorProfile) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto p-4 text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              Creator Not Found
            </h1>
            <p className="text-gray-400 mb-6">
              The creator you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Discover Creators
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen p-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          {/* User Type Badge */}
          <div className="mb-6">
            <UserTypeBadge userType={creatorProfile.user_type} />
          </div>

          {/* Profile Header */}
          <div className="mb-8">
            <CreatorProfileHeader
              profile={creatorProfile}
              isOwnProfile={isOwnProfile}
            />
          </div>

          {/* Stats Section */}
          <div className="mb-8">
            {isOwnProfile && (
              <div className="mb-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-400 text-xl flex-shrink-0">ℹ️</div>
                  <div>
                    <p className="text-blue-300 text-sm font-medium mb-1">
                      Preview Mode
                    </p>
                    <p className="text-blue-200/80 text-sm">
                      This is how other users see your profile. Only your public content is displayed in the stats and sections below.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <CreatorStatsSection
              userId={creatorProfile.id}
              isOwnProfile={false}
              key={`stats-${refreshKey}`}
            />
          </div>

          {/* All Tracks Section */}
          <div className="mb-8">
            <CreatorTracksSection
              userId={creatorProfile.id}
              initialLimit={8}
              showViewAll={true}
              username={creatorProfile.username}
              isOwnProfile={isOwnProfile}
              key={`tracks-${refreshKey}`}
            />
          </div>

          {/* Albums Section */}
          <div className="mb-8">
            <CreatorAlbumsSection
              userId={creatorProfile.id}
              initialLimit={8}
              isOwnProfile={isOwnProfile}
              key={`albums-${refreshKey}`}
            />
          </div>

          {/* Public Playlists Section */}
          <div className="mb-8">
            <CreatorPlaylistsSection
              userId={creatorProfile.id}
              initialLimit={8}
              isOwnProfile={isOwnProfile}
              key={`playlists-${refreshKey}`}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getCreatorByUsername, getCreatorById, getPublicPlaylists } from '@/lib/profileService';
import { getBulkSavedStatus } from '@/lib/saveService';
import SaveButton from '@/components/profile/SaveButton';
import type { Playlist } from '@/types/playlist';
import type { CreatorProfile } from '@/types';

type SortOption = 'recent' | 'oldest' | 'most_tracks';

const ITEMS_PER_PAGE = 20;

/**
 * CreatorPlaylistCard Component
 * 
 * Displays a playlist card for creator profiles with save functionality.
 */
interface CreatorPlaylistCardProps {
  playlist: Playlist;
  isSaved: boolean;
  onSaveToggle: () => Promise<void>;
  isOwnProfile?: boolean;
}

function CreatorPlaylistCard({ playlist, isSaved, onSaveToggle, isOwnProfile = false }: CreatorPlaylistCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/playlist/${playlist.id}`);
  };

  // Generate gradient placeholder if no cover image
  const gradientColors = [
    'from-purple-400 to-pink-600',
    'from-blue-400 to-cyan-600',
    'from-green-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-indigo-400 to-purple-600',
  ];
  const gradientIndex = playlist.id.charCodeAt(0) % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
      {/* Cover Image or Gradient Placeholder */}
      <div 
        className="h-48 relative"
        onClick={handleCardClick}
      >
        {playlist.cover_image_url ? (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${playlist.cover_image_url})` }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            {/* Playlist icon */}
            <svg
              className="w-16 h-16 text-white opacity-80"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 
          className="text-lg font-semibold text-white truncate mb-2 cursor-pointer hover:text-blue-400 transition-colors"
          onClick={handleCardClick}
        >
          {playlist.name}
        </h3>
        
        {/* Description */}
        {playlist.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {playlist.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {new Date(playlist.created_at).toLocaleDateString()}
          </span>
          {!isOwnProfile && (
            <SaveButton
              itemId={playlist.id}
              itemType="playlist"
              isSaved={isSaved}
              onToggle={onSaveToggle}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * All Creator Playlists Page
 * 
 * Displays all public playlists from a creator with pagination and sorting options.
 * Supports sorting by recent, oldest, and most tracks.
 * 
 * Features:
 * - Pagination with 20 items per page
 * - Sorting options (recent, oldest, most tracks)
 * - Save functionality for playlists
 * - Loading states for pagination
 * - Authentication check
 */
export default function AllCreatorPlaylistsPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const { showToast } = useToast();

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedPlaylistIds, setSavedPlaylistIds] = useState<Set<string>>(new Set());
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Fetch creator profile
  useEffect(() => {
    const fetchCreator = async () => {
      try {
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
        // Silently handle errors - they're expected during logout or when unauthenticated
        setError('Failed to load creator profile');
        setCreatorProfile(null);
      }
    };

    fetchCreator();
  }, [username, user]);

  // Fetch playlists
  useEffect(() => {
    if (!creatorProfile) return;

    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all public playlists
        const allPlaylists = await getPublicPlaylists(creatorProfile.id, 1000, 0);

        // Apply sorting
        const sortedPlaylists = [...allPlaylists].sort((a, b) => {
          switch (sortBy) {
            case 'recent':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'oldest':
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'most_tracks':
              // Sort by track count (if available in the playlist data)
              const aCount = (a as Playlist & { track_count?: number }).track_count || 0;
              const bCount = (b as Playlist & { track_count?: number }).track_count || 0;
              return bCount - aCount;
            default:
              return 0;
          }
        });

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        const paginatedPlaylists = sortedPlaylists.slice(from, to);

        // Check if there are more playlists
        setHasMore(to < sortedPlaylists.length);

        // Append or replace playlists based on page
        if (currentPage === 1) {
          setPlaylists(paginatedPlaylists);
        } else {
          setPlaylists(prev => [...prev, ...paginatedPlaylists]);
        }

        // Fetch saved status if user is authenticated
        if (user && !isOwnProfile) {
          fetchSavedStatus(paginatedPlaylists);
        }
      } catch (err) {
        console.error('Unexpected error fetching playlists:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchPlaylists();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorProfile, sortBy, currentPage, user, isOwnProfile]);

  // Fetch saved status for playlists
  const fetchSavedStatus = async (playlistsToCheck: Playlist[]) => {
    if (!user) return;

    try {
      const playlistIds = playlistsToCheck.map(playlist => playlist.id);
      const result = await getBulkSavedStatus(user.id, playlistIds, 'playlist');
      
      if (result.data) {
        const savedIds = new Set<string>();
        Object.entries(result.data).forEach(([id, isSaved]) => {
          if (isSaved) savedIds.add(id);
        });
        setSavedPlaylistIds(savedIds);
      }
    } catch (err) {
      console.error('Error fetching saved status:', err);
    }
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    setPlaylists([]);
  };

  // Handle load more
  const handleLoadMore = () => {
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  };

  // Handle save toggle
  const handleSaveToggle = async (playlistId: string) => {
    if (!user) {
      showToast('Please log in to save playlists', 'info');
      router.push('/login');
      return;
    }

    // Optimistic update
    const wasSaved = savedPlaylistIds.has(playlistId);
    const newSavedIds = new Set(savedPlaylistIds);
    
    if (wasSaved) {
      newSavedIds.delete(playlistId);
    } else {
      newSavedIds.add(playlistId);
    }
    
    setSavedPlaylistIds(newSavedIds);
  };

  if (!creatorProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">
          {loading ? 'Loading...' : error || 'Creator not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/profile/${username}`)}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Profile
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">
            {creatorProfile.username}&apos;s Playlists
          </h1>
          <p className="text-gray-400">
            {playlists.length > 0 && `Showing ${playlists.length} playlist${playlists.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Sorting Options */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-gray-400 text-sm">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('recent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => handleSortChange('oldest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'oldest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Oldest
            </button>
            <button
              onClick={() => handleSortChange('most_tracks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'most_tracks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Most Tracks
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setCurrentPage(1);
              }}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && currentPage === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Playlists Grid */}
        {!loading && playlists.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map(playlist => (
                <CreatorPlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  isSaved={savedPlaylistIds.has(playlist.id)}
                  onSaveToggle={() => handleSaveToggle(playlist.id)}
                  isOwnProfile={isOwnProfile}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && playlists.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">📝</div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No public playlists yet</h3>
            <p className="text-gray-400 mb-6">
              This creator hasn&apos;t created any public playlists
            </p>
            <button
              onClick={() => router.push(`/profile/${username}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

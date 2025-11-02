import { supabase } from './supabase';
import type { LibraryStats, TrackWithMembership } from '@/types/library';

/**
 * Get library statistics for a user
 * 
 * Fetches comprehensive statistics about a user's library including:
 * - Upload remaining (infinite for MVP)
 * - Total tracks count
 * - Total albums count
 * - Total playlists count
 * - Plays this week (tracks created in last 7 days)
 * - Plays all time (sum of all play counts)
 * 
 * All queries are executed in parallel using Promise.all for optimal performance.
 * 
 * @param userId - The ID of the user
 * @returns Promise<LibraryStats> - Library statistics object
 * 
 * @example
 * ```typescript
 * const stats = await getLibraryStats(user.id);
 * console.log(`Total tracks: ${stats.totalTracks}`);
 * console.log(`Plays this week: ${stats.playsThisWeek}`);
 * ```
 * 
 * @remarks
 * - uploadRemaining is set to 'infinite' for MVP phase
 * - playsThisWeek counts tracks created in the last 7 days
 * - playsAllTime sums all play_count values across all tracks
 * - All queries use count optimization for performance
 */
export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  try {
    // Fetch all data in parallel for optimal performance
    const [tracksResult, albumsResult, playlistsResult, playsResult] = await Promise.all([
      // Get total tracks count
      supabase
        .from('tracks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Get total albums count
      supabase
        .from('albums')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Get total playlists count
      supabase
        .from('playlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Get play counts for user's tracks
      supabase
        .from('tracks')
        .select('play_count, created_at')
        .eq('user_id', userId)
    ]);

    // Calculate plays this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const playsThisWeek = playsResult.data?.reduce((sum, track) => {
      const trackDate = new Date(track.created_at);
      if (trackDate >= oneWeekAgo) {
        return sum + (track.play_count || 0);
      }
      return sum;
    }, 0) || 0;

    // Calculate total plays
    const playsAllTime = playsResult.data?.reduce((sum, track) => {
      return sum + (track.play_count || 0);
    }, 0) || 0;

    return {
      uploadRemaining: 'infinite',
      totalTracks: tracksResult.count || 0,
      totalAlbums: albumsResult.count || 0,
      totalPlaylists: playlistsResult.count || 0,
      playsThisWeek,
      playsAllTime
    };
  } catch (error) {
    console.error('Error fetching library stats:', error);
    
    // Return default stats on error
    return {
      uploadRemaining: 'infinite',
      totalTracks: 0,
      totalAlbums: 0,
      totalPlaylists: 0,
      playsThisWeek: 0,
      playsAllTime: 0
    };
  }
}

/**
 * Get user tracks with album and playlist membership information
 * 
 * Fetches tracks for a user with their associated album and playlist memberships.
 * Includes album name and playlist names for display purposes.
 * Supports optional limit parameter for pagination.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for number of tracks to fetch (for pagination)
 * @returns Promise<TrackWithMembership[]> - Array of tracks with membership info
 * 
 * @example
 * ```typescript
 * // Get first 12 tracks
 * const tracks = await getUserTracksWithMembership(user.id, 12);
 * 
 * // Get all tracks
 * const allTracks = await getUserTracksWithMembership(user.id);
 * 
 * tracks.forEach(track => {
 *   console.log(`${track.title} - Album: ${track.albumName || 'None'}`);
 *   console.log(`Playlists: ${track.playlistNames.join(', ') || 'None'}`);
 * });
 * ```
 * 
 * @remarks
 * - Tracks are ordered by creation date (newest first)
 * - Each track can belong to at most one album (exclusive relationship)
 * - Each track can belong to multiple playlists (non-exclusive relationship)
 * - Returns empty array on error
 * - Limit parameter is useful for initial page load optimization
 */
export async function getUserTracksWithMembership(
  userId: string,
  limit?: number
): Promise<TrackWithMembership[]> {
  try {
    let query = supabase
      .from('tracks')
      .select(`
        *,
        album_tracks (
          album_id,
          albums (name)
        ),
        playlist_tracks (
          playlist_id,
          playlists (name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tracks with membership:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform data to include membership info
    return data.map(track => {
      const albumTracks = track.album_tracks as Array<{ album_id: string; albums: { name: string } }> | undefined;
      const playlistTracks = track.playlist_tracks as Array<{ playlist_id: string; playlists: { name: string } }> | undefined;
      
      return {
        ...track,
        albumId: albumTracks?.[0]?.album_id || null,
        albumName: albumTracks?.[0]?.albums?.name || null,
        playlistIds: playlistTracks?.map(pt => pt.playlist_id) || [],
        playlistNames: playlistTracks?.map(pt => pt.playlists?.name) || []
      };
    }) as TrackWithMembership[];
  } catch (error) {
    console.error('Unexpected error fetching tracks with membership:', error);
    return [];
  }
}

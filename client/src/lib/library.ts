import { supabase } from './supabase';
import type { 
  LibraryStats, 
  TrackWithMembership,
  SavedTrackWithUploader,
  SavedAlbumWithCreator,
  SavedPlaylistWithCreator
} from '@/types/library';
import type { Track } from '@/types/track';
import type { Album } from '@/types/album';
import type { Playlist } from '@/types/playlist';

/**
 * Get library statistics for a user
 * 
 * Fetches comprehensive statistics about a user's library including:
 * - Upload remaining (infinite for MVP)
 * - Total tracks count
 * - Total albums count
 * - Total playlists count
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
 * console.log(`Total plays: ${stats.playsAllTime}`);
 * ```
 * 
 * @remarks
 * - uploadRemaining is set to 'infinite' for MVP phase
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
        .select('play_count')
        .eq('user_id', userId)
    ]);

    // Calculate total plays
    const playsAllTime = playsResult.data?.reduce((sum, track) => {
      return sum + (track.play_count || 0);
    }, 0) || 0;

    return {
      uploadRemaining: 'infinite',
      totalTracks: tracksResult.count || 0,
      totalAlbums: albumsResult.count || 0,
      totalPlaylists: playlistsResult.count || 0,
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
    // First, get tracks with basic relationships
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

    // Get like counts for all tracks
    const trackIds = data.map(t => t.id);
    
    // Fetch user profile data separately
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('id', userId)
      .single();

    const { data: postsData } = await supabase
      .from('posts')
      .select('track_id, post_likes(count)')
      .in('track_id', trackIds);

    // Create a map of track_id to like count
    const likeCountMap = new Map<string, number>();
    if (postsData) {
      postsData.forEach(post => {
        const postLikes = post.post_likes as unknown[];
        const currentCount = likeCountMap.get(post.track_id) || 0;
        likeCountMap.set(post.track_id, currentCount + (postLikes?.length || 0));
      });
    }

    // Transform data to include membership info
    return data.map(track => {
      const albumTracks = track.album_tracks as Array<{ album_id: string; albums: { name: string } }> | undefined;
      const playlistTracks = track.playlist_tracks as Array<{ playlist_id: string; playlists: { name: string } }> | undefined;
      
      return {
        ...track,
        user: userProfile || undefined,
        albumId: albumTracks?.[0]?.album_id || null,
        albumName: albumTracks?.[0]?.albums?.name || null,
        playlistIds: playlistTracks?.map(pt => pt.playlist_id) || [],
        playlistNames: playlistTracks?.map(pt => pt.playlists?.name) || [],
        like_count: likeCountMap.get(track.id) || 0
      };
    }) as TrackWithMembership[];
  } catch (error) {
    console.error('Unexpected error fetching tracks with membership:', error);
    return [];
  }
}

/**
 * Get track membership information (album and playlists)
 * 
 * Fetches album and playlist membership for a specific track.
 * 
 * @param trackId - The ID of the track
 * @returns Promise with album and playlist membership info
 */
export async function getTrackMembership(trackId: string): Promise<{
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select(`
        album_tracks (
          album_id,
          albums (name)
        ),
        playlist_tracks (
          playlist_id,
          playlists (name)
        )
      `)
      .eq('id', trackId)
      .single();

    if (error || !data) {
      return {
        albumId: null,
        albumName: null,
        playlistIds: [],
        playlistNames: []
      };
    }

    const albumTracks = data.album_tracks as unknown as Array<{ album_id: string; albums: { name: string } }> | undefined;
    const playlistTracks = data.playlist_tracks as unknown as Array<{ playlist_id: string; playlists: { name: string } }> | undefined;

    return {
      albumId: albumTracks?.[0]?.album_id || null,
      albumName: albumTracks?.[0]?.albums?.name || null,
      playlistIds: playlistTracks?.map(pt => pt.playlist_id) || [],
      playlistNames: playlistTracks?.map(pt => pt.playlists?.name) || []
    };
  } catch (error) {
    console.error('Error fetching track membership:', error);
    return {
      albumId: null,
      albumName: null,
      playlistIds: [],
      playlistNames: []
    };
  }
}

/**
 * Get saved tracks for a user with uploader information
 * 
 * Fetches tracks that the user has saved from other users.
 * Includes track details (including author field), uploader username, and saved timestamp.
 * 
 * Note: Tracks have both an 'author' field (the artist/creator of the music) and
 * a 'user_id' field (the person who uploaded it to the platform). The UI displays
 * the author field prominently, with uploader info available separately.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination (default: no limit)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Promise<SavedTrackWithUploader[]> - Array of saved tracks with uploader info
 * 
 * @example
 * ```typescript
 * // Get first 8 saved tracks
 * const tracks = await getSavedTracks(user.id, 8);
 * 
 * // Get all saved tracks
 * const allTracks = await getSavedTracks(user.id);
 * 
 * tracks.forEach(track => {
 *   console.log(`${track.title} by ${track.author}`);
 *   console.log(`Uploaded by @${track.uploader_username}`);
 *   console.log(`Saved at: ${track.saved_at}`);
 * });
 * ```
 * 
 * @remarks
 * - Tracks are ordered by saved date (most recently saved first)
 * - Returns empty array on error for graceful degradation
 * - Includes like counts from posts
 * - Supports pagination with limit and offset parameters
 */
export async function getSavedTracks(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedTrackWithUploader[]> {
  try {
    // Build query to get saved tracks (exclude own tracks)
    let query = supabase
      .from('saved_tracks')
      .select(`
        created_at,
        tracks!inner (*)
      `)
      .eq('user_id', userId)
      .neq('tracks.user_id', userId)
      .order('created_at', { ascending: false });

    // Apply pagination if provided
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved tracks:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get unique uploader IDs
    const uploaderIds = [...new Set(data.map(item => {
      const track = item.tracks as unknown as Track;
      return track.user_id;
    }))];

    // Fetch uploader profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username')
      .in('id', uploaderIds);

    // Create a map of user_id to profile
    const profileMap = new Map<string, { id: string; username: string }>();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Get track IDs for like counts
    const trackIds = data.map(item => {
      const track = item.tracks as unknown as Track;
      return track.id;
    });

    const { data: postsData } = await supabase
      .from('posts')
      .select('track_id, post_likes(count)')
      .in('track_id', trackIds);

    // Create a map of track_id to like count
    const likeCountMap = new Map<string, number>();
    if (postsData) {
      postsData.forEach(post => {
        const postLikes = post.post_likes as unknown[];
        const currentCount = likeCountMap.get(post.track_id) || 0;
        likeCountMap.set(post.track_id, currentCount + (postLikes?.length || 0));
      });
    }

    // Transform data to SavedTrackWithUploader format
    return data.map(item => {
      const track = item.tracks as unknown as Track;
      const uploader = profileMap.get(track.user_id);
      
      return {
        ...track,
        uploader_username: uploader?.username || 'Unknown',
        uploader_id: uploader?.id || '',
        saved_at: item.created_at,
        like_count: likeCountMap.get(track.id) || 0
      } as SavedTrackWithUploader;
    });
  } catch (error) {
    console.error('Unexpected error fetching saved tracks:', error);
    return [];
  }
}

/**
 * Get saved albums for a user with creator information
 * 
 * Fetches albums that the user has saved from other users.
 * Includes album details, creator username, track count, and saved timestamp.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination (default: no limit)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Promise<SavedAlbumWithCreator[]> - Array of saved albums with creator info
 * 
 * @example
 * ```typescript
 * // Get first 8 saved albums
 * const albums = await getSavedAlbums(user.id, 8);
 * 
 * // Get all saved albums
 * const allAlbums = await getSavedAlbums(user.id);
 * 
 * albums.forEach(album => {
 *   console.log(`${album.name} by @${album.creator_username}`);
 *   console.log(`Tracks: ${album.track_count}`);
 *   console.log(`Saved at: ${album.saved_at}`);
 * });
 * ```
 * 
 * @remarks
 * - Albums are ordered by saved date (most recently saved first)
 * - Returns empty array on error for graceful degradation
 * - Includes track count via subquery
 * - Supports pagination with limit and offset parameters
 */
export async function getSavedAlbums(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedAlbumWithCreator[]> {
  try {
    // Build query to get saved albums (exclude own albums)
    let query = supabase
      .from('saved_albums')
      .select(`
        created_at,
        albums!inner (*)
      `)
      .eq('user_id', userId)
      .neq('albums.user_id', userId)
      .order('created_at', { ascending: false });

    // Apply pagination if provided
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved albums:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get unique creator IDs
    const creatorIds = [...new Set(data.map(item => {
      const album = item.albums as unknown as Album;
      return album.user_id;
    }))];

    console.log('Fetching profiles for creator IDs:', creatorIds);

    // Fetch creator profiles - match on user_id field
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', creatorIds);

    if (profileError) {
      console.error('Error fetching creator profiles:', profileError);
    }

    console.log('Found profiles:', profiles);

    // Create a map of user_id to profile
    const profileMap = new Map<string, { user_id: string; username: string }>();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });
    }

    // Get track counts for all albums
    const albumIds = data.map(item => {
      const album = item.albums as unknown as Album;
      return album.id;
    });

    const { data: trackCounts } = await supabase
      .from('album_tracks')
      .select('album_id')
      .in('album_id', albumIds);

    // Create a map of album_id to track count
    const trackCountMap = new Map<string, number>();
    if (trackCounts) {
      trackCounts.forEach(item => {
        const currentCount = trackCountMap.get(item.album_id) || 0;
        trackCountMap.set(item.album_id, currentCount + 1);
      });
    }

    // Transform data to SavedAlbumWithCreator format
    return data.map(item => {
      const album = item.albums as unknown as Album;
      const creator = profileMap.get(album.user_id);
      
      return {
        ...album,
        creator_username: creator?.username || 'Unknown Creator',
        creator_id: album.user_id, // Use album.user_id directly
        saved_at: item.created_at,
        track_count: trackCountMap.get(album.id) || 0
      } as SavedAlbumWithCreator;
    });
  } catch (error) {
    console.error('Unexpected error fetching saved albums:', error);
    return [];
  }
}

/**
 * Get saved playlists for a user with creator information
 * 
 * Fetches playlists that the user has saved from other users.
 * Includes playlist details, creator username, track count, and saved timestamp.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination (default: no limit)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Promise<SavedPlaylistWithCreator[]> - Array of saved playlists with creator info
 * 
 * @example
 * ```typescript
 * // Get first 8 saved playlists
 * const playlists = await getSavedPlaylists(user.id, 8);
 * 
 * // Get all saved playlists
 * const allPlaylists = await getSavedPlaylists(user.id);
 * 
 * playlists.forEach(playlist => {
 *   console.log(`${playlist.name} by @${playlist.creator_username}`);
 *   console.log(`Tracks: ${playlist.track_count}`);
 *   console.log(`Privacy: ${playlist.is_public ? 'Public' : 'Private'}`);
 *   console.log(`Saved at: ${playlist.saved_at}`);
 * });
 * ```
 * 
 * @remarks
 * - Playlists are ordered by saved date (most recently saved first)
 * - Returns empty array on error for graceful degradation
 * - Includes track count via subquery
 * - Supports pagination with limit and offset parameters
 */
export async function getSavedPlaylists(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedPlaylistWithCreator[]> {
  try {
    // Build query with joins - join through playlists to get creator info (exclude own and private playlists)
    let query = supabase
      .from('saved_playlists')
      .select(`
        created_at,
        playlists!inner (
          *,
          user_profiles!user_id (
            id,
            username
          )
        )
      `)
      .eq('user_id', userId)
      .neq('playlists.user_id', userId)
      .eq('playlists.is_public', true)
      .order('created_at', { ascending: false });

    // Apply pagination if provided
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved playlists:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get track counts for all playlists
    const playlistIds = data.map(item => {
      const playlist = item.playlists as unknown as Playlist;
      return playlist.id;
    });

    const { data: trackCounts } = await supabase
      .from('playlist_tracks')
      .select('playlist_id')
      .in('playlist_id', playlistIds);

    // Create a map of playlist_id to track count
    const trackCountMap = new Map<string, number>();
    if (trackCounts) {
      trackCounts.forEach(item => {
        const currentCount = trackCountMap.get(item.playlist_id) || 0;
        trackCountMap.set(item.playlist_id, currentCount + 1);
      });
    }

    // Transform data to SavedPlaylistWithCreator format
    return data.map(item => {
      const playlist = item.playlists as unknown as Playlist & { user_profiles: { id: string; username: string } | null };
      const creator = playlist.user_profiles;
      
      return {
        ...playlist,
        creator_username: creator?.username || 'Unknown',
        creator_id: creator?.id || '',
        saved_at: item.created_at,
        track_count: trackCountMap.get(playlist.id) || 0
      } as SavedPlaylistWithCreator;
    });
  } catch (error) {
    console.error('Unexpected error fetching saved playlists:', error);
    return [];
  }
}

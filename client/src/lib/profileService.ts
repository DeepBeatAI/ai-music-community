import { supabase } from './supabase';
import type { CreatorProfile, CreatorStats } from '@/types';
import type { Database } from '@/types/database';

type Track = Database['public']['Tables']['tracks']['Row'];
type Album = Database['public']['Tables']['albums']['Row'];
type Playlist = Database['public']['Tables']['playlists']['Row'];

/**
 * Get creator profile by username
 * 
 * Fetches a creator's public profile information by their username.
 * Returns null if the creator doesn't exist.
 * 
 * @param username - The username of the creator
 * @returns Promise<CreatorProfile | null> - Creator profile or null if not found
 * 
 * @example
 * ```typescript
 * const creator = await getCreatorByUsername('johndoe');
 * if (creator) {
 *   console.log(`Found creator: ${creator.username}`);
 * }
 * ```
 */
export async function getCreatorByUsername(username: string): Promise<CreatorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    // Map user_profiles to CreatorProfile interface
    return {
      id: data.user_id,
      username: data.username,
      full_name: null, // user_profiles doesn't have full_name yet
      avatar_url: null, // user_profiles doesn't have avatar_url yet
      bio: null, // user_profiles doesn't have bio yet
      website: null, // user_profiles doesn't have website yet
      user_type: data.user_type || 'Free User',
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
    };
  } catch (error) {
    console.error('Error fetching creator by username:', error);
    return null;
  }
}

/**
 * Get creator profile by user ID
 * 
 * Fetches a creator's public profile information by their user ID.
 * Returns null if the creator doesn't exist.
 * 
 * @param userId - The user ID of the creator
 * @returns Promise<CreatorProfile | null> - Creator profile or null if not found
 * 
 * @example
 * ```typescript
 * const creator = await getCreatorById('uuid-here');
 * if (creator) {
 *   console.log(`Found creator: ${creator.username}`);
 * }
 * ```
 */
export async function getCreatorById(userId: string): Promise<CreatorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    // Map user_profiles to CreatorProfile interface
    return {
      id: data.user_id,
      username: data.username,
      full_name: null,
      avatar_url: null,
      bio: null,
      website: null,
      user_type: data.user_type || 'Free User',
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
    };
  } catch (error) {
    console.error('Error fetching creator by ID:', error);
    return null;
  }
}

/**
 * Get creator statistics
 * 
 * Fetches comprehensive statistics for a creator including:
 * - Creator score (calculated from plays and likes)
 * - Follower count
 * - Public track count
 * - Public album count
 * - Public playlist count
 * - Total plays across all public tracks
 * 
 * @param userId - The user ID of the creator
 * @returns Promise<CreatorStats> - Creator statistics
 * 
 * @example
 * ```typescript
 * const stats = await getCreatorStats(userId);
 * console.log(`Creator score: ${stats.creator_score}`);
 * console.log(`Followers: ${stats.follower_count}`);
 * ```
 */
export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  try {
    // Use the same database function as discover page for consistency
    // This ensures creator scores match exactly across all pages
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 0, // 0 = all time
      result_limit: 1000 // High limit to ensure we get the user
    });

    if (error) throw error;

    // Find the creator in the results
    type PopularCreator = {
      user_id: string;
      username: string;
      avatar_url: string | null;
      track_count: number;
      total_plays: number;
      total_likes: number;
      follower_count: number;
      creator_score: number;
    };
    const creatorData = data?.find((creator: PopularCreator) => creator.user_id === userId);

    if (!creatorData) {
      // If not found in popular creators, they have no stats yet
      // Fetch counts separately for albums and playlists (not in database function)
      const [albumsResult, playlistsResult, followersResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true),
        
        supabase
          .from('playlists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true),
        
        supabase
          .from('user_follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
      ]);

      return {
        creator_score: 0,
        follower_count: followersResult.count || 0,
        track_count: 0,
        album_count: albumsResult.count || 0,
        playlist_count: playlistsResult.count || 0,
        total_plays: 0,
      };
    }

    // Fetch albums and playlists counts (not included in database function)
    const [albumsResult, playlistsResult] = await Promise.all([
      supabase
        .from('albums')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true),
      
      supabase
        .from('playlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true),
    ]);

    // Get follower count separately (not in database function)
    const { count: followerCount } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Return stats using database function results
    return {
      creator_score: creatorData.creator_score, // Exact same calculation as discover page
      follower_count: followerCount || 0,
      track_count: creatorData.track_count,
      album_count: albumsResult.count || 0,
      playlist_count: playlistsResult.count || 0,
      total_plays: creatorData.total_plays,
    };
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    
    // Return default stats on error
    return {
      creator_score: 0,
      follower_count: 0,
      track_count: 0,
      album_count: 0,
      playlist_count: 0,
      total_plays: 0,
    };
  }
}

/**
 * Get public tracks for a creator
 * 
 * Fetches public tracks for a creator with pagination support.
 * Only returns tracks where is_public = true.
 * 
 * @param userId - The user ID of the creator
 * @param limit - Maximum number of tracks to return
 * @param offset - Number of tracks to skip (for pagination)
 * @returns Promise<Track[]> - Array of public tracks
 * 
 * @example
 * ```typescript
 * // Get first 12 tracks
 * const tracks = await getPublicTracks(userId, 12, 0);
 * 
 * // Get next 12 tracks
 * const moreTracks = await getPublicTracks(userId, 12, 12);
 * ```
 */
export async function getPublicTracks(
  userId: string,
  limit: number = 12,
  offset: number = 0
): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching public tracks:', error);
    return [];
  }
}

/**
 * Get public albums for a creator
 * 
 * Fetches public albums for a creator with pagination support.
 * Only returns albums where is_public = true.
 * 
 * @param userId - The user ID of the creator
 * @param limit - Maximum number of albums to return
 * @param offset - Number of albums to skip (for pagination)
 * @returns Promise<Album[]> - Array of public albums
 * 
 * @example
 * ```typescript
 * // Get first 8 albums
 * const albums = await getPublicAlbums(userId, 8, 0);
 * ```
 */
export async function getPublicAlbums(
  userId: string,
  limit: number = 8,
  offset: number = 0
): Promise<Album[]> {
  try {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching public albums:', error);
    return [];
  }
}

/**
 * Get public playlists for a creator
 * 
 * Fetches public playlists for a creator with pagination support.
 * Only returns playlists where is_public = true.
 * 
 * @param userId - The user ID of the creator
 * @param limit - Maximum number of playlists to return
 * @param offset - Number of playlists to skip (for pagination)
 * @returns Promise<Playlist[]> - Array of public playlists
 * 
 * @example
 * ```typescript
 * // Get first 8 playlists
 * const playlists = await getPublicPlaylists(userId, 8, 0);
 * ```
 */
export async function getPublicPlaylists(
  userId: string,
  limit: number = 8,
  offset: number = 0
): Promise<Playlist[]> {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching public playlists:', error);
    return [];
  }
}

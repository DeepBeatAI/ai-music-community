import { supabase } from './supabase';
import type { ApiResponse } from '@/types';

/**
 * Save a track for the current user
 * 
 * Creates a saved_tracks record for the user and track.
 * Handles duplicate saves gracefully (unique constraint).
 * 
 * @param userId - The ID of the user saving the track
 * @param trackId - The ID of the track to save
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await saveTrack(user.id, track.id);
 * if (result.data) {
 *   console.log('Track saved successfully');
 * }
 * ```
 */
export async function saveTrack(
  userId: string,
  trackId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_tracks')
      .insert({ user_id: userId, track_id: trackId });

    if (error) {
      // Check if it's a duplicate error (already saved)
      if (error.code === '23505') {
        // Unique constraint violation - already saved
        return { data: true, error: null };
      }
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error saving track:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save track';
    return { data: null, error: errorMessage };
  }
}

/**
 * Unsave a track for the current user
 * 
 * Removes the saved_tracks record for the user and track.
 * 
 * @param userId - The ID of the user unsaving the track
 * @param trackId - The ID of the track to unsave
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await unsaveTrack(user.id, track.id);
 * if (result.data) {
 *   console.log('Track unsaved successfully');
 * }
 * ```
 */
export async function unsaveTrack(
  userId: string,
  trackId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_tracks')
      .delete()
      .eq('user_id', userId)
      .eq('track_id', trackId);

    if (error) {
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error unsaving track:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to unsave track';
    return { data: null, error: errorMessage };
  }
}

/**
 * Save an album for the current user
 * 
 * Creates a saved_albums record for the user and album.
 * Handles duplicate saves gracefully (unique constraint).
 * 
 * @param userId - The ID of the user saving the album
 * @param albumId - The ID of the album to save
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await saveAlbum(user.id, album.id);
 * if (result.data) {
 *   console.log('Album saved successfully');
 * }
 * ```
 */
export async function saveAlbum(
  userId: string,
  albumId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_albums')
      .insert({ user_id: userId, album_id: albumId });

    if (error) {
      // Check if it's a duplicate error (already saved)
      if (error.code === '23505') {
        // Unique constraint violation - already saved
        return { data: true, error: null };
      }
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error saving album:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save album';
    return { data: null, error: errorMessage };
  }
}

/**
 * Unsave an album for the current user
 * 
 * Removes the saved_albums record for the user and album.
 * 
 * @param userId - The ID of the user unsaving the album
 * @param albumId - The ID of the album to unsave
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await unsaveAlbum(user.id, album.id);
 * if (result.data) {
 *   console.log('Album unsaved successfully');
 * }
 * ```
 */
export async function unsaveAlbum(
  userId: string,
  albumId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_albums')
      .delete()
      .eq('user_id', userId)
      .eq('album_id', albumId);

    if (error) {
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error unsaving album:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to unsave album';
    return { data: null, error: errorMessage };
  }
}

/**
 * Save a playlist for the current user
 * 
 * Creates a saved_playlists record for the user and playlist.
 * Handles duplicate saves gracefully (unique constraint).
 * 
 * @param userId - The ID of the user saving the playlist
 * @param playlistId - The ID of the playlist to save
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await savePlaylist(user.id, playlist.id);
 * if (result.data) {
 *   console.log('Playlist saved successfully');
 * }
 * ```
 */
export async function savePlaylist(
  userId: string,
  playlistId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_playlists')
      .insert({ user_id: userId, playlist_id: playlistId });

    if (error) {
      // Check if it's a duplicate error (already saved)
      if (error.code === '23505') {
        // Unique constraint violation - already saved
        return { data: true, error: null };
      }
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error saving playlist:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save playlist';
    return { data: null, error: errorMessage };
  }
}

/**
 * Unsave a playlist for the current user
 * 
 * Removes the saved_playlists record for the user and playlist.
 * 
 * @param userId - The ID of the user unsaving the playlist
 * @param playlistId - The ID of the playlist to unsave
 * @returns Promise<ApiResponse<boolean>> - Success status
 * 
 * @example
 * ```typescript
 * const result = await unsavePlaylist(user.id, playlist.id);
 * if (result.data) {
 *   console.log('Playlist unsaved successfully');
 * }
 * ```
 */
export async function unsavePlaylist(
  userId: string,
  playlistId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('saved_playlists')
      .delete()
      .eq('user_id', userId)
      .eq('playlist_id', playlistId);

    if (error) {
      throw error;
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error unsaving playlist:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to unsave playlist';
    return { data: null, error: errorMessage };
  }
}

/**
 * Get saved status for an item
 * 
 * Checks if a track, album, or playlist is saved by the user.
 * 
 * @param userId - The ID of the user
 * @param itemId - The ID of the item (track, album, or playlist)
 * @param itemType - The type of item ('track', 'album', or 'playlist')
 * @returns Promise<ApiResponse<boolean>> - Saved status
 * 
 * @example
 * ```typescript
 * const result = await getSavedStatus(user.id, track.id, 'track');
 * if (result.data) {
 *   console.log('Track is saved');
 * }
 * ```
 */
export async function getSavedStatus(
  userId: string,
  itemId: string,
  itemType: 'track' | 'album' | 'playlist'
): Promise<ApiResponse<boolean>> {
  try {
    let query;
    
    switch (itemType) {
      case 'track':
        query = supabase
          .from('saved_tracks')
          .select('id')
          .eq('user_id', userId)
          .eq('track_id', itemId)
          .maybeSingle();
        break;
      case 'album':
        query = supabase
          .from('saved_albums')
          .select('id')
          .eq('user_id', userId)
          .eq('album_id', itemId)
          .maybeSingle();
        break;
      case 'playlist':
        query = supabase
          .from('saved_playlists')
          .select('id')
          .eq('user_id', userId)
          .eq('playlist_id', itemId)
          .maybeSingle();
        break;
      default:
        return { data: false, error: 'Invalid item type' };
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error getting saved status:', error);
    // Return false on error (not saved)
    return { data: false, error: null };
  }
}

/**
 * Get multiple saved statuses at once
 * 
 * Efficiently checks saved status for multiple items of the same type.
 * Useful for checking saved status for a list of tracks, albums, or playlists.
 * 
 * @param userId - The ID of the user
 * @param itemIds - Array of item IDs to check
 * @param itemType - The type of items ('track', 'album', or 'playlist')
 * @returns Promise<ApiResponse<Record<string, boolean>>> - Map of item ID to saved status
 * 
 * @example
 * ```typescript
 * const trackIds = ['id1', 'id2', 'id3'];
 * const result = await getBulkSavedStatus(user.id, trackIds, 'track');
 * if (result.data) {
 *   console.log('Track id1 saved:', result.data['id1']);
 * }
 * ```
 */
export async function getBulkSavedStatus(
  userId: string,
  itemIds: string[],
  itemType: 'track' | 'album' | 'playlist'
): Promise<ApiResponse<Record<string, boolean>>> {
  try {
    if (itemIds.length === 0) {
      return { data: {}, error: null };
    }

    let query;
    let idColumn: string;
    
    switch (itemType) {
      case 'track':
        query = supabase
          .from('saved_tracks')
          .select('track_id')
          .eq('user_id', userId)
          .in('track_id', itemIds);
        idColumn = 'track_id';
        break;
      case 'album':
        query = supabase
          .from('saved_albums')
          .select('album_id')
          .eq('user_id', userId)
          .in('album_id', itemIds);
        idColumn = 'album_id';
        break;
      case 'playlist':
        query = supabase
          .from('saved_playlists')
          .select('playlist_id')
          .eq('user_id', userId)
          .in('playlist_id', itemIds);
        idColumn = 'playlist_id';
        break;
      default:
        return { data: null, error: 'Invalid item type' };
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Create a map of saved items
    const savedMap: Record<string, boolean> = {};
    
    // Initialize all items as not saved
    itemIds.forEach(id => {
      savedMap[id] = false;
    });

    // Mark saved items as true
    if (data) {
      data.forEach((item: Record<string, unknown>) => {
        const itemId = item[idColumn] as string;
        if (itemId) {
          savedMap[itemId] = true;
        }
      });
    }

    return { data: savedMap, error: null };
  } catch (error) {
    console.error('Error getting bulk saved status:', error);
    // Return all false on error
    const savedMap: Record<string, boolean> = {};
    itemIds.forEach(id => {
      savedMap[id] = false;
    });
    return { data: savedMap, error: null };
  }
}

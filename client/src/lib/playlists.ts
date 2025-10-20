import { supabase } from './supabase';
import type {
  Playlist,
  PlaylistFormData,
  PlaylistWithTracks,
  AddTrackToPlaylistParams,
  RemoveTrackFromPlaylistParams,
  CreatePlaylistResponse,
  PlaylistOperationResponse,
  PlaylistUpdate,
} from '@/types/playlist';

/**
 * Create a new playlist for a user
 * @param userId - The ID of the user creating the playlist
 * @param formData - The playlist form data (name, description, is_public, cover_image_url)
 * @returns CreatePlaylistResponse with success status and playlist data or error
 */
export async function createPlaylist(
  userId: string,
  formData: PlaylistFormData
): Promise<CreatePlaylistResponse> {
  try {
    // Validate required fields
    if (!formData.name || formData.name.trim().length === 0) {
      return {
        success: false,
        error: 'Playlist name is required',
      };
    }

    // Insert playlist record
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: userId,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        is_public: formData.is_public ?? false,
        cover_image_url: formData.cover_image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to create playlist',
      };
    }

    return {
      success: true,
      playlist: data,
    };
  } catch (error) {
    console.error('Unexpected error creating playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create playlist',
    };
  }
}

/**
 * Get all playlists for a user, ordered by creation date (newest first)
 * @param userId - The ID of the user
 * @returns Array of playlists or null on error
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[] | null> {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user playlists:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching user playlists:', error);
    return null;
  }
}

/**
 * Get a playlist with all its tracks, sorted by position
 * @param playlistId - The ID of the playlist
 * @returns PlaylistWithTracks or null on error
 */
export async function getPlaylistWithTracks(
  playlistId: string
): Promise<PlaylistWithTracks | null> {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          id,
          track_id,
          position,
          added_at,
          track:tracks(
            id,
            title,
            artist_name,
            audio_url,
            duration,
            cover_image_url
          )
        )
      `)
      .eq('id', playlistId)
      .single();

    if (error) {
      console.error('Error fetching playlist with tracks:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Sort tracks by position
    const sortedTracks = (data.tracks || []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

    // Calculate track count
    const track_count = sortedTracks.length;

    return {
      ...data,
      tracks: sortedTracks,
      track_count,
    } as PlaylistWithTracks;
  } catch (error) {
    console.error('Unexpected error fetching playlist with tracks:', error);
    return null;
  }
}

/**
 * Update a playlist's metadata
 * @param playlistId - The ID of the playlist to update
 * @param updates - Partial playlist data to update
 * @returns PlaylistOperationResponse with success status
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<PlaylistUpdate>
): Promise<PlaylistOperationResponse> {
  try {
    const { error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlistId);

    if (error) {
      console.error('Error updating playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to update playlist',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error updating playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update playlist',
    };
  }
}

/**
 * Delete a playlist and all its associated tracks
 * @param playlistId - The ID of the playlist to delete
 * @returns PlaylistOperationResponse with success status
 */
export async function deletePlaylist(
  playlistId: string
): Promise<PlaylistOperationResponse> {
  try {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) {
      console.error('Error deleting playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete playlist',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error deleting playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete playlist',
    };
  }
}

/**
 * Add a track to a playlist with automatic position calculation
 * @param params - AddTrackToPlaylistParams with playlist_id, track_id, and optional position
 * @returns PlaylistOperationResponse with success status
 */
export async function addTrackToPlaylist(
  params: AddTrackToPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { playlist_id, track_id, position } = params;

    // If position is not provided, calculate the next position
    let finalPosition = position;
    if (finalPosition === undefined) {
      const { data: existingTracks, error: fetchError } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlist_id)
        .order('position', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing tracks:', fetchError);
        return {
          success: false,
          error: 'Failed to calculate track position',
        };
      }

      // Set position to max + 1, or 0 if no tracks exist
      finalPosition = existingTracks && existingTracks.length > 0
        ? existingTracks[0].position + 1
        : 0;
    }

    // Insert the track into the playlist
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id,
        track_id,
        position: finalPosition,
      });

    if (error) {
      // Check for unique constraint violation (duplicate track)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Track already in playlist',
        };
      }

      console.error('Error adding track to playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to add track to playlist',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error adding track to playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add track to playlist',
    };
  }
}

/**
 * Remove a track from a playlist
 * @param params - RemoveTrackFromPlaylistParams with playlist_id and track_id
 * @returns PlaylistOperationResponse with success status
 */
export async function removeTrackFromPlaylist(
  params: RemoveTrackFromPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { playlist_id, track_id } = params;

    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlist_id)
      .eq('track_id', track_id);

    if (error) {
      console.error('Error removing track from playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove track from playlist',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error removing track from playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove track from playlist',
    };
  }
}

/**
 * Check if a track is already in a playlist
 * @param playlistId - The ID of the playlist
 * @param trackId - The ID of the track
 * @returns boolean indicating if track is in playlist, or null on error
 */
export async function isTrackInPlaylist(
  playlistId: string,
  trackId: string
): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if track is in playlist:', error);
      return null;
    }

    return data !== null;
  } catch (error) {
    console.error('Unexpected error checking if track is in playlist:', error);
    return null;
  }
}

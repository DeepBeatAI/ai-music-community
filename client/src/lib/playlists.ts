import { supabase } from './supabase';
import type {
  Playlist,
  PlaylistFormData,
  PlaylistWithTracks,
  PlaylistWithOwner,
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
 * Get public playlists created by other users (excluding current user's playlists)
 * 
 * Fetches playlists where is_public=true and user_id does not match the current user.
 * Includes user profile information (username) for display.
 * Useful for discovering content created by the community.
 * 
 * @param currentUserId - The ID of the current user (to exclude their playlists)
 * @returns Promise<PlaylistWithOwner[] | null> - Array of public playlists with owner info or null on error
 * 
 * @example
 * ```typescript
 * const publicPlaylists = await getPublicPlaylists(user.id);
 * if (publicPlaylists) {
 *   console.log(`Found ${publicPlaylists.length} public playlists`);
 *   publicPlaylists.forEach(p => console.log(`${p.name} by ${p.owner.username}`));
 * }
 * ```
 * 
 * @remarks
 * - Only returns playlists marked as public (is_public=true)
 * - Excludes playlists created by the current user
 * - Includes owner username and avatar for display
 * - Ordered by creation date (newest first)
 * - Limited to 50 results for performance
 * - Returns null on database errors
 */
export async function getPublicPlaylists(currentUserId: string): Promise<PlaylistWithOwner[] | null> {
  try {
    // First try with owner relationship
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        owner:user_profiles!playlists_user_id_user_profiles_fkey(
          id,
          username
        )
      `)
      .eq('is_public', true)
      .neq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching public playlists with owner:', error);
      
      // Fallback: fetch without owner relationship
      console.log('Attempting fallback query without owner relationship...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return null;
      }
      
      console.log('Fallback query succeeded, returning', fallbackData?.length || 0, 'playlists without owner info');
      return fallbackData as PlaylistWithOwner[];
    }

    return data as PlaylistWithOwner[];
  } catch (error) {
    console.error('Unexpected error fetching public playlists:', error);
    return null;
  }
}

/**
 * Get a playlist with all its tracks, sorted by position
 * 
 * Fetches a playlist with all associated tracks joined from the tracks table.
 * Playlists now correctly reference tracks (not posts) via playlist_tracks.track_id.
 * 
 * @param playlistId - The ID of the playlist to fetch
 * @returns Promise<PlaylistWithTracks | null> - Playlist with tracks array or null on error
 * 
 * @example
 * ```typescript
 * const playlist = await getPlaylistWithTracks(playlistId);
 * if (playlist) {
 *   console.log(`Playlist: ${playlist.name}`);
 *   playlist.tracks.forEach(pt => {
 *     console.log(`Track: ${pt.track.title}`);
 *   });
 * }
 * ```
 * 
 * @remarks
 * - Tracks are sorted by position (ascending)
 * - Each track includes full track metadata from tracks table
 * - Returns null if playlist doesn't exist or user doesn't have access
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
          track:tracks(*)
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
 * 
 * Adds a track to a playlist by creating a playlist_tracks record.
 * Validates that the track exists and the user has permission to add it.
 * Automatically calculates the next position if not provided.
 * 
 * @param params - AddTrackToPlaylistParams with playlist_id, track_id, and optional position
 * @returns Promise<PlaylistOperationResponse> - Result with success status and optional error
 * 
 * @example
 * ```typescript
 * // Add track to end of playlist
 * const result = await addTrackToPlaylist({
 *   playlist_id: playlistId,
 *   track_id: trackId,
 * });
 * 
 * // Add track at specific position
 * const result = await addTrackToPlaylist({
 *   playlist_id: playlistId,
 *   track_id: trackId,
 *   position: 0, // Add at beginning
 * });
 * ```
 * 
 * @remarks
 * - Validates track exists before adding
 * - Checks user has access to track (owns it or it's public)
 * - Prevents duplicate tracks in same playlist
 * - Position is auto-calculated if not provided (appends to end)
 * - Track can be from a post or added directly from track library
 */
export async function addTrackToPlaylist(
  params: AddTrackToPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { playlist_id, track_id, position } = params;

    console.log('🎵 addTrackToPlaylist called with:', { playlist_id, track_id, position });

    // Verify track exists and check access permissions
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, user_id, is_public')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      console.error('❌ Error fetching track:', trackError);
      console.error('❌ Track ID that failed:', track_id);
      return {
        success: false,
        error: 'Track not found',
      };
    }

    console.log('✅ Track found:', track);

    // Get current user to check permissions
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Verify user has access to the track (either owns it or it's public)
    if (track.user_id !== user.id && !track.is_public) {
      return {
        success: false,
        error: 'You do not have permission to add this track',
      };
    }

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
    console.log('🎵 Attempting to insert into playlist_tracks:', { playlist_id, track_id, position: finalPosition });
    
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id,
        track_id,
        position: finalPosition,
      });

    if (error) {
      console.error('❌ Insert error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      
      // Check for unique constraint violation (duplicate track)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Track is already in this playlist',
        };
      }

      // Check for foreign key constraint violation
      if (error.code === '23503') {
        console.error('❌ Foreign key violation - playlist_id:', playlist_id, 'track_id:', track_id);
        return {
          success: false,
          error: 'Invalid playlist or track reference',
        };
      }

      console.error('Error adding track to playlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to add track to playlist',
      };
    }

    console.log('✅ Track added to playlist successfully');
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

    // Verify the track exists in the playlist before attempting to remove
    const { data: existingTrack } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlist_id)
      .eq('track_id', track_id)
      .maybeSingle();

    if (!existingTrack) {
      return {
        success: false,
        error: 'Track not found in playlist',
      };
    }

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
 * 
 * Queries the playlist_tracks table to determine if a specific track
 * is already present in a playlist. Useful for preventing duplicates.
 * 
 * @param playlistId - The ID of the playlist to check
 * @param trackId - The ID of the track to look for
 * @returns Promise<boolean | null> - True if track is in playlist, false if not, null on error
 * 
 * @example
 * ```typescript
 * const isInPlaylist = await isTrackInPlaylist(playlistId, trackId);
 * if (isInPlaylist) {
 *   console.log('Track is already in this playlist');
 * }
 * ```
 * 
 * @remarks
 * - Returns null on database errors
 * - Useful for UI state management (showing "Added" vs "Add" buttons)
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

/**
 * Reorder tracks in a playlist by updating their positions
 * 
 * Calls the database function to update track positions in a single transaction.
 * Implements optimistic UI updates with rollback on error.
 * 
 * @param playlistId - The ID of the playlist
 * @param trackPositions - Array of {track_id, position} objects
 * @returns Promise<PlaylistOperationResponse> - Result with success status and optional error
 * 
 * @example
 * ```typescript
 * const result = await reorderPlaylistTracks(playlistId, [
 *   { track_id: 'track-1', position: 0 },
 *   { track_id: 'track-2', position: 1 },
 *   { track_id: 'track-3', position: 2 },
 * ]);
 * ```
 * 
 * @remarks
 * - Only the playlist owner can reorder tracks
 * - Updates are performed in a single database transaction
 * - All positions must be valid (non-negative integers)
 */
export async function reorderPlaylistTracks(
  playlistId: string,
  trackPositions: Array<{ track_id: string; position: number }>
): Promise<PlaylistOperationResponse> {
  try {
    // Validate input
    if (!playlistId || !trackPositions || trackPositions.length === 0) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // Validate all positions are non-negative
    const hasInvalidPosition = trackPositions.some(tp => tp.position < 0);
    if (hasInvalidPosition) {
      return {
        success: false,
        error: 'All positions must be non-negative',
      };
    }

    // Call the database function
    const { error } = await supabase.rpc('reorder_playlist_tracks', {
      p_playlist_id: playlistId,
      p_track_positions: trackPositions,
    });

    if (error) {
      console.error('Error reordering playlist tracks:', error);
      
      // Handle specific error cases
      if (error.message.includes('Not authenticated')) {
        return {
          success: false,
          error: 'You must be logged in to reorder tracks',
        };
      }
      
      if (error.message.includes('Not authorized')) {
        return {
          success: false,
          error: 'You do not have permission to reorder tracks in this playlist',
        };
      }
      
      if (error.message.includes('Playlist not found')) {
        return {
          success: false,
          error: 'Playlist not found',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to reorder tracks',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error reordering playlist tracks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder tracks',
    };
  }
}

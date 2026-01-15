import { supabase } from './supabase';
import type {
  Album,
  AlbumInsert,
  AlbumUpdate,
  AlbumWithTracks,
  AlbumWithOwner,
  CreateAlbumResponse,
  AlbumOperationResponse,
  AddTrackToAlbumParams,
  RemoveTrackFromAlbumParams,
} from '@/types/album';

/**
 * Get all albums for a specific user
 * @param userId - The ID of the user
 * @returns Array of albums ordered by creation date (newest first)
 */
export async function getUserAlbums(userId: string): Promise<Album[]> {
  try {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user albums:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching user albums:', error);
    return [];
  }
}

/**
 * Get public albums (excluding user's own)
 * @param userId - The ID of the current user (to exclude their albums)
 * @returns Array of public albums with owner information
 */
export async function getPublicAlbums(userId: string): Promise<AlbumWithOwner[]> {
  try {
    const { data, error } = await supabase
      .from('albums')
      .select(`
        *,
        owner:user_profiles!albums_user_id_fkey(
          id,
          username
        )
      `)
      .eq('is_public', true)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public albums:', error);
      return [];
    }

    return data as AlbumWithOwner[] || [];
  } catch (error) {
    console.error('Unexpected error fetching public albums:', error);
    return [];
  }
}

/**
 * Get album with tracks
 * @param albumId - The ID of the album to fetch
 * @returns Album with tracks and track count, or null if not found
 */
export async function getAlbumWithTracks(albumId: string): Promise<AlbumWithTracks | null> {
  try {
    const { data, error } = await supabase
      .from('albums')
      .select(`
        *,
        tracks:album_tracks(
          id,
          track_id,
          position,
          added_at,
          track:tracks(*)
        )
      `)
      .eq('id', albumId)
      .single();

    if (error) {
      console.error('Error fetching album with tracks:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Fetch creator information separately
    const { data: creatorData, error: creatorError } = await supabase
      .from('user_profiles')
      .select('username, user_id')
      .eq('user_id', data.user_id)
      .single();

    if (creatorError) {
      console.error('Error fetching creator profile:', creatorError);
      console.log('Looking for user_id:', data.user_id);
    }

    // Sort tracks by position
    const sortedTracks = (data.tracks || []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

    // Ensure tracks have proper author field
    const tracksWithAuthor = sortedTracks.map((pt: {
      id: string;
      track_id: string;
      position: number;
      added_at: string;
      track: Record<string, unknown>;
    }) => {
      return {
        ...pt,
        track: {
          ...pt.track,
          author: (pt.track?.author as string) || 'Unknown Artist',
          artist_name: (pt.track?.author as string) || 'Unknown Artist',
          file_url: (pt.track?.file_url as string) || (pt.track?.audio_url as string),
        },
      };
    });

    // Calculate track count
    const track_count = tracksWithAuthor.length;

    return {
      ...data,
      tracks: tracksWithAuthor,
      track_count,
      creator_username: creatorData?.username || 'Unknown',
      creator_display_name: creatorData?.username || 'Unknown',
    } as AlbumWithTracks;
  } catch (error) {
    console.error('Unexpected error fetching album with tracks:', error);
    return null;
  }
}

/**
 * Create a new album
 * @param albumData - The album data to insert
 * @returns CreateAlbumResponse with success status and album data or error
 */
export async function createAlbum(
  albumData: AlbumInsert
): Promise<CreateAlbumResponse> {
  try {
    // Validate required fields
    if (!albumData.name || albumData.name.trim().length === 0) {
      return {
        success: false,
        error: 'Album name is required',
      };
    }

    // Insert album record
    const { data, error } = await supabase
      .from('albums')
      .insert({
        user_id: albumData.user_id,
        name: albumData.name.trim(),
        description: albumData.description?.trim() || null,
        is_public: albumData.is_public ?? true, // Albums default to public
        cover_image_url: albumData.cover_image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating album:', error);
      return {
        success: false,
        error: error.message || 'Failed to create album',
      };
    }

    return {
      success: true,
      album: data,
    };
  } catch (error) {
    console.error('Unexpected error creating album:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create album',
    };
  }
}

/**
 * Update an album
 * @param albumId - The ID of the album to update
 * @param updates - Partial album data to update
 * @returns AlbumOperationResponse with success status
 */
export async function updateAlbum(
  albumId: string,
  updates: Partial<AlbumUpdate>
): Promise<AlbumOperationResponse> {
  try {
    const { error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', albumId);

    if (error) {
      console.error('Error updating album:', error);
      return {
        success: false,
        error: error.message || 'Failed to update album',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error updating album:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update album',
    };
  }
}

/**
 * Delete an album
 * @param albumId - The ID of the album to delete
 * @returns AlbumOperationResponse with success status
 */
export async function deleteAlbum(albumId: string): Promise<AlbumOperationResponse> {
  try {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId);

    if (error) {
      console.error('Error deleting album:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete album',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error deleting album:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete album',
    };
  }
}

/**
 * Add track to album (removes from previous album if exists - exclusive relationship)
 * @param params - AddTrackToAlbumParams with album_id, track_id, and optional position
 * @returns AlbumOperationResponse with success status
 */
export async function addTrackToAlbum(
  params: AddTrackToAlbumParams
): Promise<AlbumOperationResponse> {
  try {
    const { album_id, track_id, position } = params;

    console.log('🎵 addTrackToAlbum called with:', { album_id, track_id, position });

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

    // EXCLUSIVE RELATIONSHIP: Remove track from any existing album first
    console.log('🔄 Removing track from any existing album...');
    const { error: removeError } = await supabase
      .from('album_tracks')
      .delete()
      .eq('track_id', track_id);

    if (removeError) {
      console.error('❌ Error removing track from previous album:', removeError);
      return {
        success: false,
        error: removeError.message || 'Failed to remove track from previous album',
      };
    }

    console.log('✅ Track removed from previous album (if any)');

    // If position is not provided, calculate the next position
    let finalPosition = position;
    if (finalPosition === undefined) {
      const { data: existingTracks, error: fetchError } = await supabase
        .from('album_tracks')
        .select('position')
        .eq('album_id', album_id)
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

    // Insert the track into the album
    console.log('🎵 Attempting to insert into album_tracks:', { album_id, track_id, position: finalPosition });
    
    const { error } = await supabase
      .from('album_tracks')
      .insert({
        album_id,
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
          error: 'Track is already in this album',
        };
      }

      // Check for foreign key constraint violation
      if (error.code === '23503') {
        console.error('❌ Foreign key violation - album_id:', album_id, 'track_id:', track_id);
        return {
          success: false,
          error: 'Invalid album or track reference',
        };
      }

      console.error('Error adding track to album:', error);
      return {
        success: false,
        error: error.message || 'Failed to add track to album',
      };
    }

    console.log('✅ Track added to album successfully');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error adding track to album:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add track to album',
    };
  }
}

/**
 * Remove track from album
 * @param params - RemoveTrackFromAlbumParams with album_id and track_id
 * @returns AlbumOperationResponse with success status
 */
export async function removeTrackFromAlbum(
  params: RemoveTrackFromAlbumParams
): Promise<AlbumOperationResponse> {
  try {
    const { album_id, track_id } = params;

    // Verify the track exists in the album before attempting to remove
    const { data: existingTrack } = await supabase
      .from('album_tracks')
      .select('id')
      .eq('album_id', album_id)
      .eq('track_id', track_id)
      .maybeSingle();

    if (!existingTrack) {
      return {
        success: false,
        error: 'Track not found in album',
      };
    }

    const { error } = await supabase
      .from('album_tracks')
      .delete()
      .eq('album_id', album_id)
      .eq('track_id', track_id);

    if (error) {
      console.error('Error removing track from album:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove track from album',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error removing track from album:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove track from album',
    };
  }
}

/**
 * Reorder tracks in album (for drag-and-drop support)
 * @param albumId - The ID of the album
 * @param trackIds - Array of track IDs in the desired order
 * @returns AlbumOperationResponse with success status
 */
export async function reorderAlbumTracks(
  albumId: string,
  trackIds: string[]
): Promise<AlbumOperationResponse> {
  try {
    // Validate input
    if (!albumId || !trackIds || trackIds.length === 0) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // Update positions for all tracks
    const updates = trackIds.map((trackId, index) => ({
      album_id: albumId,
      track_id: trackId,
      position: index + 1,
    }));

    const { error } = await supabase
      .from('album_tracks')
      .upsert(updates, { onConflict: 'album_id,track_id' });

    if (error) {
      console.error('Error reordering album tracks:', error);
      return {
        success: false,
        error: error.message || 'Failed to reorder album tracks',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error reordering album tracks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder album tracks',
    };
  }
}

/**
 * Toggle album like status
 * @param albumId - The ID of the album to like/unlike
 * @param userId - The ID of the user performing the action
 * @param isCurrentlyLiked - Current like status
 * @returns Promise with liked status and like count
 */
export async function toggleAlbumLike(
  albumId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }> {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[ALBUM-LIKE-${requestId}] Starting toggleAlbumLike:`, { albumId, userId, isCurrentlyLiked });

  try {
    // Check if user is authenticated
    if (!userId) {
      return {
        data: null,
        error: 'Authentication required',
      };
    }

    if (isCurrentlyLiked) {
      // Unlike: delete the like record
      console.log(`[ALBUM-LIKE-${requestId}] Attempting DELETE from album_likes`);
      const { error } = await supabase
        .from('album_likes')
        .delete()
        .eq('album_id', albumId)
        .eq('user_id', userId);

      console.log(`[ALBUM-LIKE-${requestId}] DELETE result:`, { error });
      if (error) throw error;
    } else {
      // Like: insert a new like record
      console.log(`[ALBUM-LIKE-${requestId}] Attempting INSERT into album_likes`);
      const { error } = await supabase
        .from('album_likes')
        .insert({ album_id: albumId, user_id: userId });

      console.log(`[ALBUM-LIKE-${requestId}] INSERT result:`, { error });
      if (error) {
        // Check for unique constraint violation (duplicate like)
        if (error.code === '23505') {
          console.log(`[ALBUM-LIKE-${requestId}] Duplicate like detected, treating as success`);
          // Already liked, just return current status
          const { count } = await supabase
            .from('album_likes')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', albumId);

          return {
            data: { liked: true, likeCount: count || 0 },
            error: null,
          };
        }
        throw error;
      }
    }

    // Get updated like count
    console.log(`[ALBUM-LIKE-${requestId}] Getting updated count`);
    const { count, error: countError } = await supabase
      .from('album_likes')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', albumId);

    console.log(`[ALBUM-LIKE-${requestId}] Count result:`, { count, countError });
    if (countError) throw countError;

    console.log(`[ALBUM-LIKE-${requestId}] SUCCESS - Returning result`);
    return {
      data: { liked: !isCurrentlyLiked, likeCount: count || 0 },
      error: null,
    };
  } catch (error) {
    console.error(`[ALBUM-LIKE-${requestId}] ERROR CAUGHT:`, error);
    console.error(`[ALBUM-LIKE-${requestId}] Error object details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      name: error instanceof Error ? error.name : 'Unknown',
    });
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error);
    return {
      data: null,
      error: `Failed to update like status: ${errorMessage}`,
    };
  }
}

/**
 * Get album like status for a user
 * @param albumId - The ID of the album
 * @param userId - The ID of the user (optional for unauthenticated users)
 * @returns Promise with liked status and like count
 */
export async function getAlbumLikeStatus(
  albumId: string,
  userId?: string
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }> {
  try {
    // If no user, return not liked with count
    if (!userId) {
      const { count } = await supabase
        .from('album_likes')
        .select('*', { count: 'exact', head: true })
        .eq('album_id', albumId);

      return {
        data: {
          liked: false,
          likeCount: count || 0,
        },
        error: null,
      };
    }

    // Fetch like status and count in parallel
    const [likeStatus, likeCount] = await Promise.all([
      supabase
        .from('album_likes')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('album_likes')
        .select('*', { count: 'exact', head: true })
        .eq('album_id', albumId),
    ]);

    return {
      data: {
        liked: !likeStatus.error && !!likeStatus.data,
        likeCount: likeCount.count || 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting album like status:', error);
    return {
      data: { liked: false, likeCount: 0 },
      error: null,
    };
  }
}

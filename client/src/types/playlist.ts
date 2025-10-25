import { Database } from './supabase';
import { Track } from './track';

// Base types from database
export type Playlist = Database['public']['Tables']['playlists']['Row'];
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];
export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert'];

// Extended track type for playlist display
// This is a flexible type that can represent tracks from different sources
export interface PlaylistTrackDisplay {
  id: string;
  title: string;
  artist_name?: string | null;
  description?: string | null;
  audio_url?: string | null;
  file_url?: string | null;
  duration?: number | null;
  cover_image_url?: string | null;
  genre?: string | null;
  // Allow any additional properties from the full Track type
  [key: string]: any;
}

// Extended types with relationships
export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: PlaylistTrackDisplay; // Use display type that includes artist_name
  }>;
  track_count: number;
}

export interface PlaylistWithOwner extends Playlist {
  owner: {
    id: string;
    username: string;
  };
}

// Form data interfaces
export interface PlaylistFormData {
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
}

// Operation parameter interfaces
export interface AddTrackToPlaylistParams {
  playlist_id: string;
  track_id: string;
  position?: number;
}

export interface RemoveTrackFromPlaylistParams {
  playlist_id: string;
  track_id: string;
}

// Response interfaces
export interface CreatePlaylistResponse {
  success: boolean;
  playlist?: Playlist;
  error?: string;
}

export interface PlaylistOperationResponse {
  success: boolean;
  error?: string;
}

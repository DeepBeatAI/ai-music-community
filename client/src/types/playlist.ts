import { Database } from './supabase';
import { Track } from './track';

// Base types from database
export type Playlist = Database['public']['Tables']['playlists']['Row'];
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];
export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert'];

// Extended types with relationships
export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: Track; // Now correctly references Track type from tracks table
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

import { Database } from './supabase';
import { PlaylistTrackDisplay } from './playlist';

// Base types from database
export type Album = Database['public']['Tables']['albums']['Row'];
export type AlbumInsert = Database['public']['Tables']['albums']['Insert'];
export type AlbumUpdate = Database['public']['Tables']['albums']['Update'];
export type AlbumTrack = Database['public']['Tables']['album_tracks']['Row'];
export type AlbumTrackInsert = Database['public']['Tables']['album_tracks']['Insert'];

// Extended types with relationships
export interface AlbumWithTracks extends Album {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: PlaylistTrackDisplay; // Reuse display type from playlists
  }>;
  track_count: number;
  creator_username?: string;
  creator_display_name?: string;
}

export interface AlbumWithOwner extends Album {
  owner: {
    id: string;
    username: string;
  };
}

// Form data interfaces
export interface AlbumFormData {
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
}

// Operation parameter interfaces
export interface AddTrackToAlbumParams {
  album_id: string;
  track_id: string;
  position?: number;
}

export interface RemoveTrackFromAlbumParams {
  album_id: string;
  track_id: string;
}

// Response interfaces
export interface CreateAlbumResponse {
  success: boolean;
  album?: Album;
  error?: string;
}

export interface AlbumOperationResponse {
  success: boolean;
  error?: string;
}

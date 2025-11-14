import { Track } from './track';
import { Album } from './album';
import { Playlist } from './playlist';

// Library statistics interface
export interface LibraryStats {
  uploadRemaining: number | 'infinite';
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  playsAllTime: number;
}

// Track with album and playlist membership information
export interface TrackWithMembership extends Track {
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
  like_count?: number;
}

// Saved track with uploader information
// Note: Track already has 'author' field for the artist name
// This adds uploader info (the platform user who uploaded it)
export interface SavedTrackWithUploader extends Track {
  uploader_username: string;
  uploader_id: string;
  saved_at: string;
  like_count?: number;
}

// Saved album with creator information
export interface SavedAlbumWithCreator extends Album {
  creator_username: string;
  creator_id: string;
  saved_at: string;
  track_count: number;
}

// Saved playlist with creator information
export interface SavedPlaylistWithCreator extends Playlist {
  creator_username: string;
  creator_id: string;
  saved_at: string;
  track_count: number;
}

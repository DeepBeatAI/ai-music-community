import { Track } from './track';

// Library statistics interface
export interface LibraryStats {
  uploadRemaining: number | 'infinite';
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  playsThisWeek: number;
  playsAllTime: number;
}

// Track with album and playlist membership information
export interface TrackWithMembership extends Track {
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
}

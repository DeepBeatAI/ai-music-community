# My Library Feature - Design Document

## Overview

The My Library feature transforms the existing `/playlists` page into a comprehensive personal music management hub at `/library`. This design document outlines the architecture, components, data models, and implementation strategy for building a dashboard-style interface that manages tracks, albums, and playlists in a unified experience.

### Key Design Principles

1. **Component Reuse**: Leverage existing playlist components and patterns for albums
2. **Progressive Enhancement**: Load sections incrementally to optimize performance
3. **Mobile-First**: Ensure responsive design works seamlessly on all devices
4. **Minimal Scrolling**: Use collapsible sections and "View All" links to reduce page height
5. **Clear Visual Hierarchy**: Distinguish between albums (exclusive) and playlists (non-exclusive)

## Architecture

### Page Structure

```
/library (formerly /playlists)
├── LibraryPage (Main container)
│   ├── StatsSection (Always visible)
│   ├── TrackUploadSection (Collapsible)
│   ├── AllTracksSection (Collapsible, lazy-loaded)
│   ├── MyAlbumsSection (Collapsible, lazy-loaded)
│   └── MyPlaylistsSection (Existing, adapted)
```

### Component Hierarchy

```
LibraryPage
├── MainLayout (Existing)
├── LibraryHeader
│   ├── Page Title: "My Library"
│   └── Page Description
├── StatsSection
│   └── StatCard (x6)
├── TrackUploadSection
│   ├── CollapseToggle
│   └── AudioUpload (Reused from dashboard)
│       └── PostUploadAssignment
│           ├── AlbumDropdown
│           └── PlaylistMultiSelect
├── AllTracksSection
│   ├── SectionHeader
│   │   ├── Title + Count
│   │   └── ViewAllButton
│   ├── TrackGrid
│   │   └── TrackCard (x8-12)
│   │       ├── CoverArt
│   │       ├── TrackInfo
│   │       ├── MembershipBadges
│   │       └── ActionsMenu
│   └── EmptyState
├── MyAlbumsSection
│   ├── SectionHeader
│   │   ├── Title + Count
│   │   ├── NewAlbumButton
│   │   └── ViewAllButton
│   ├── AlbumGrid
│   │   └── AlbumCard (x6-8, reused from PlaylistCard)
│   └── CreateAlbumModal (adapted from CreatePlaylistModal)
└── MyPlaylistsSection (Existing)
    └── PlaylistsList (Existing component)
```

## Components and Interfaces

### 1. StatsSection Component

**Purpose**: Display user library metrics at a glance

**Props**:
```typescript
interface StatsSectionProps {
  userId: string;
}
```

**State**:
```typescript
interface StatsData {
  uploadRemaining: number | 'infinite';
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  playsThisWeek: number;
  playsAllTime: number;
  loading: boolean;
  error: string | null;
}
```

**Layout**:
- Desktop: 1 row x 6 columns
- Mobile: 2 rows x 3 columns
- Each stat card shows: Icon, Value, Label

**Data Fetching**:
```typescript
// Fetch all stats in parallel
const fetchStats = async (userId: string) => {
  const [tracks, albums, playlists, plays] = await Promise.all([
    getUserTracks(userId),
    getUserAlbums(userId),
    getUserPlaylists(userId),
    getUserPlayStats(userId)
  ]);
  
  return {
    uploadRemaining: 'infinite',
    totalTracks: tracks.length,
    totalAlbums: albums.length,
    totalPlaylists: playlists.length,
    playsThisWeek: calculateWeeklyPlays(plays),
    playsAllTime: calculateTotalPlays(plays)
  };
};
```

### 2. TrackUploadSection Component

**Purpose**: Reuse dashboard AudioUpload component with post-upload assignment

**Props**:
```typescript
interface TrackUploadSectionProps {
  userId: string;
  onUploadSuccess: (track: Track) => void;
}
```

**State**:
```typescript
interface TrackUploadState {
  isExpanded: boolean;
  uploadedTrack: Track | null;
  showAssignment: boolean;
  selectedAlbumId: string | null;
  selectedPlaylistIds: string[];
  albums: Album[];
  playlists: Playlist[];
}
```

**Behavior**:
- Collapsed by default (shows "Upload New Track" button)
- Expands to show AudioUpload component
- After successful upload:
  - Show success message
  - Display album dropdown (single select)
  - Display playlist dropdown (multi-select)
  - Provide "Skip", "Done", and "Upload Another" buttons
- "Done" collapses the section
- "Upload Another" keeps section expanded and resets form

### 3. AllTracksSection Component

**Purpose**: Display grid of user's uploaded tracks with management actions

**Props**:
```typescript
interface AllTracksSectionProps {
  userId: string;
  initialLimit?: number; // Default: 12
}
```

**State**:
```typescript
interface AllTracksState {
  tracks: TrackWithMembership[];
  loading: boolean;
  error: string | null;
  isCollapsed: boolean;
}

interface TrackWithMembership extends Track {
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
}
```

**TrackCard Component**:
```typescript
interface TrackCardProps {
  track: TrackWithMembership;
  onAddToAlbum: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
  onDelete: (trackId: string) => void;
}
```

**TrackCard Layout**:
```
┌─────────────────────┐
│   Cover Art         │
│   (Square)          │
├─────────────────────┤
│ Track Title         │
│ 🎵 Album Badge      │
│ 📝 Playlist Badge   │
├─────────────────────┤
│ 👁️ 123 plays       │
│ 📅 2 days ago   [⋮] │
└─────────────────────┘
```

**Actions Menu**:
- Add to Album (shows album dropdown)
- Add to Playlist (shows playlist multi-select)
- Copy Track URL
- Share (opens share modal)
- Delete (shows confirmation dialog)



### 4. MyAlbumsSection Component

**Purpose**: Display and manage user's albums (reusing playlist patterns)

**Props**:
```typescript
interface MyAlbumsSectionProps {
  userId: string;
  initialLimit?: number; // Default: 8
}
```

**State**:
```typescript
interface MyAlbumsState {
  albums: Album[];
  loading: boolean;
  error: string | null;
  isCollapsed: boolean;
  showCreateModal: boolean;
}
```

**AlbumCard Component** (Reuses PlaylistCard with modifications):
```typescript
interface AlbumCardProps {
  album: Album;
  isOwner: boolean;
  onDelete: () => void;
  showTrackNumbers?: boolean; // TRUE for albums
}
```

**Key Differences from Playlists**:
1. **Track Numbers**: Albums show track numbers (1, 2, 3...) in track list
2. **Default Visibility**: Albums default to `is_public: true`
3. **Exclusive Relationship**: Adding track to album removes it from previous album
4. **Visual Indicator**: Different icon (💿 vs 📝) to distinguish from playlists

### 5. MyPlaylistsSection Component

**Purpose**: Maintain existing playlist functionality

**Implementation**: Keep existing `PlaylistsList` component with minimal changes
- Continue showing "My Playlists" and "Public Playlists" subsections
- Maintain all existing CRUD operations
- Keep default visibility as `is_public: false`
- No track numbers in playlist views

## Data Models

### Database Schema

#### Albums Table
```sql
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX idx_albums_is_public ON albums(is_public);

-- RLS Policies
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Users can view their own albums
CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public albums
CREATE POLICY "Users can view public albums"
  ON albums FOR SELECT
  USING (is_public = true);

-- Users can insert their own albums
CREATE POLICY "Users can insert own albums"
  ON albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own albums
CREATE POLICY "Users can update own albums"
  ON albums FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own albums
CREATE POLICY "Users can delete own albums"
  ON albums FOR DELETE
  USING (auth.uid() = user_id);
```

#### Album Tracks Table
```sql
CREATE TABLE album_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(album_id, track_id)
);

-- Indexes
CREATE INDEX idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX idx_album_tracks_track_id ON album_tracks(track_id);
CREATE INDEX idx_album_tracks_position ON album_tracks(position);

-- RLS Policies
ALTER TABLE album_tracks ENABLE ROW LEVEL SECURITY;

-- Users can view album_tracks for albums they own or that are public
CREATE POLICY "Users can view album tracks"
  ON album_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tracks.album_id
      AND (albums.user_id = auth.uid() OR albums.is_public = true)
    )
  );

-- Users can insert tracks into their own albums
CREATE POLICY "Users can insert into own albums"
  ON album_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tracks.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Users can update tracks in their own albums
CREATE POLICY "Users can update own album tracks"
  ON album_tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tracks.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Users can delete tracks from their own albums
CREATE POLICY "Users can delete own album tracks"
  ON album_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tracks.album_id
      AND albums.user_id = auth.uid()
    )
  );
```

#### Database Functions

```sql
-- Get album track count
CREATE OR REPLACE FUNCTION get_album_track_count(album_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM album_tracks
  WHERE album_id = album_uuid;
$$ LANGUAGE SQL STABLE;

-- Get next position for album
CREATE OR REPLACE FUNCTION get_next_album_position(album_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(position), 0) + 1
  FROM album_tracks
  WHERE album_id = album_uuid;
$$ LANGUAGE SQL STABLE;

-- Update album updated_at timestamp
CREATE OR REPLACE FUNCTION update_album_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_album_updated_at();
```

### TypeScript Types

#### Album Types (Mirror Playlist Types)
```typescript
// client/src/types/album.ts
import { Database } from './supabase';

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
    track: PlaylistTrackDisplay; // Reuse from playlist types
  }>;
  track_count: number;
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
```

#### Library Stats Types
```typescript
// client/src/types/library.ts
export interface LibraryStats {
  uploadRemaining: number | 'infinite';
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  playsThisWeek: number;
  playsAllTime: number;
}

export interface TrackWithMembership extends Track {
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
}
```



## API Layer

### Album Operations (Mirror Playlist Operations)

```typescript
// client/src/lib/albums.ts

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
  RemoveTrackFromAlbumParams
} from '@/types/album';

/**
 * Get all albums for a specific user
 */
export async function getUserAlbums(userId: string): Promise<Album[]> {
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
}

/**
 * Get public albums (excluding user's own)
 */
export async function getPublicAlbums(userId: string): Promise<AlbumWithOwner[]> {
  const { data, error } = await supabase
    .from('albums')
    .select(`
      *,
      owner:user_profiles!albums_user_id_fkey (
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

  return data || [];
}

/**
 * Get album with tracks
 */
export async function getAlbumWithTracks(albumId: string): Promise<AlbumWithTracks | null> {
  const { data, error } = await supabase
    .from('albums')
    .select(`
      *,
      tracks:album_tracks (
        id,
        track_id,
        position,
        added_at,
        track:tracks (*)
      )
    `)
    .eq('id', albumId)
    .single();

  if (error) {
    console.error('Error fetching album with tracks:', error);
    return null;
  }

  // Calculate track count
  const albumWithCount = {
    ...data,
    track_count: data.tracks?.length || 0
  };

  return albumWithCount;
}

/**
 * Create a new album
 */
export async function createAlbum(
  albumData: AlbumInsert
): Promise<CreateAlbumResponse> {
  const { data, error } = await supabase
    .from('albums')
    .insert(albumData)
    .select()
    .single();

  if (error) {
    console.error('Error creating album:', error);
    return { success: false, error: error.message };
  }

  return { success: true, album: data };
}

/**
 * Update an album
 */
export async function updateAlbum(
  albumId: string,
  updates: AlbumUpdate
): Promise<AlbumOperationResponse> {
  const { error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', albumId);

  if (error) {
    console.error('Error updating album:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete an album
 */
export async function deleteAlbum(albumId: string): Promise<AlbumOperationResponse> {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId);

  if (error) {
    console.error('Error deleting album:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add track to album (removes from previous album if exists)
 */
export async function addTrackToAlbum(
  params: AddTrackToAlbumParams
): Promise<AlbumOperationResponse> {
  const { album_id, track_id, position } = params;

  // First, remove track from any existing album (exclusive relationship)
  const { error: removeError } = await supabase
    .from('album_tracks')
    .delete()
    .eq('track_id', track_id);

  if (removeError) {
    console.error('Error removing track from previous album:', removeError);
    return { success: false, error: removeError.message };
  }

  // Get next position if not provided
  let trackPosition = position;
  if (trackPosition === undefined) {
    const { data: positionData } = await supabase
      .rpc('get_next_album_position', { album_uuid: album_id });
    trackPosition = positionData || 1;
  }

  // Add track to new album
  const { error: insertError } = await supabase
    .from('album_tracks')
    .insert({
      album_id,
      track_id,
      position: trackPosition
    });

  if (insertError) {
    console.error('Error adding track to album:', insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

/**
 * Remove track from album
 */
export async function removeTrackFromAlbum(
  params: RemoveTrackFromAlbumParams
): Promise<AlbumOperationResponse> {
  const { album_id, track_id } = params;

  const { error } = await supabase
    .from('album_tracks')
    .delete()
    .eq('album_id', album_id)
    .eq('track_id', track_id);

  if (error) {
    console.error('Error removing track from album:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder tracks in album
 */
export async function reorderAlbumTracks(
  albumId: string,
  trackIds: string[]
): Promise<AlbumOperationResponse> {
  // Update positions for all tracks
  const updates = trackIds.map((trackId, index) => ({
    album_id: albumId,
    track_id: trackId,
    position: index + 1
  }));

  const { error } = await supabase
    .from('album_tracks')
    .upsert(updates, { onConflict: 'album_id,track_id' });

  if (error) {
    console.error('Error reordering album tracks:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

### Library Stats Operations

```typescript
// client/src/lib/library.ts

import { supabase } from './supabase';
import type { LibraryStats } from '@/types/library';

/**
 * Get library statistics for a user
 */
export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  // Fetch all data in parallel
  const [tracksResult, albumsResult, playlistsResult, playsResult] = await Promise.all([
    // Get total tracks
    supabase
      .from('tracks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Get total albums
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Get total playlists
    supabase
      .from('playlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Get play counts for user's tracks
    supabase
      .from('tracks')
      .select('play_count, created_at')
      .eq('user_id', userId)
  ]);

  // Calculate plays this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const playsThisWeek = playsResult.data?.reduce((sum, track) => {
    const trackDate = new Date(track.created_at);
    if (trackDate >= oneWeekAgo) {
      return sum + (track.play_count || 0);
    }
    return sum;
  }, 0) || 0;

  // Calculate total plays
  const playsAllTime = playsResult.data?.reduce((sum, track) => {
    return sum + (track.play_count || 0);
  }, 0) || 0;

  return {
    uploadRemaining: 'infinite',
    totalTracks: tracksResult.count || 0,
    totalAlbums: albumsResult.count || 0,
    totalPlaylists: playlistsResult.count || 0,
    playsThisWeek,
    playsAllTime
  };
}

/**
 * Get user tracks with album and playlist membership
 */
export async function getUserTracksWithMembership(
  userId: string,
  limit?: number
): Promise<TrackWithMembership[]> {
  let query = supabase
    .from('tracks')
    .select(`
      *,
      album_tracks (
        album_id,
        albums (name)
      ),
      playlist_tracks (
        playlist_id,
        playlists (name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tracks with membership:', error);
    return [];
  }

  // Transform data to include membership info
  return data.map(track => ({
    ...track,
    albumId: track.album_tracks?.[0]?.album_id || null,
    albumName: track.album_tracks?.[0]?.albums?.name || null,
    playlistIds: track.playlist_tracks?.map(pt => pt.playlist_id) || [],
    playlistNames: track.playlist_tracks?.map(pt => pt.playlists?.name) || []
  }));
}
```



## UI/UX Design Specifications

### Layout Structure

#### Desktop Layout (≥1024px)
```
┌─────────────────────────────────────────────────────────┐
│  My Library                                              │
│  Manage your tracks, albums, and playlists              │
├─────────────────────────────────────────────────────────┤
│  📊 Stats Section (6 cards in 1 row)                    │
│  [∞ Uploads] [24 Tracks] [3 Albums]                    │
│  [5 Playlists] [142 Plays/Week] [1.2K Total]           │
├─────────────────────────────────────────────────────────┤
│  🎵 Upload New Track                          [▼]       │
│  (Collapsed - click to expand)                          │
├─────────────────────────────────────────────────────────┤
│  📀 All Tracks (24)                    [View All →]     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│  │ T1 │ │ T2 │ │ T3 │ │ T4 │  (4 columns)             │
│  └────┘ └────┘ └────┘ └────┘                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│  │ T5 │ │ T6 │ │ T7 │ │ T8 │                          │
│  └────┘ └────┘ └────┘ └────┘                          │
├─────────────────────────────────────────────────────────┤
│  💿 My Albums (3)          [+ New Album] [View All →]  │
│  ┌────────┐ ┌────────┐ ┌────────┐                     │
│  │ Album1 │ │ Album2 │ │ Album3 │  (3 columns)        │
│  │ 8 trks │ │ 12 trks│ │ 5 trks │                     │
│  └────────┘ └────────┘ └────────┘                     │
├─────────────────────────────────────────────────────────┤
│  📝 My Playlists (Existing component)                   │
│  (Keep current layout and functionality)                │
└─────────────────────────────────────────────────────────┘
```

#### Mobile Layout (≤768px)
```
┌─────────────────────────┐
│  My Library             │
├─────────────────────────┤
│  📊 Stats (2x3 grid)    │
│  [∞ Uploads] [24 Trks] │
│  [3 Albums] [5 Lists]  │
│  [142/Wk] [1.2K Total] │
├─────────────────────────┤
│  🎵 Upload Track   [▼] │
├─────────────────────────┤
│  📀 All Tracks (24)     │
│  [View All →]           │
│  ┌──────┐ ┌──────┐     │
│  │  T1  │ │  T2  │     │
│  └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐     │
│  │  T3  │ │  T4  │     │
│  └──────┘ └──────┘     │
├─────────────────────────┤
│  💿 My Albums (3)       │
│  [+ New] [View All →]  │
│  ┌────────────────────┐│
│  │ Album1 (8 tracks) ││
│  └────────────────────┘│
│  (Horizontal scroll)    │
├─────────────────────────┤
│  📝 My Playlists        │
│  (Existing mobile view) │
└─────────────────────────┘
```

### Visual Design Tokens

#### Colors
```typescript
const libraryColors = {
  stats: {
    uploadRemaining: 'text-blue-400',
    tracks: 'text-green-400',
    albums: 'text-purple-400',
    playlists: 'text-pink-400',
    playsWeek: 'text-yellow-400',
    playsTotal: 'text-orange-400'
  },
  badges: {
    album: 'bg-purple-600',
    playlist: 'bg-pink-600'
  },
  sections: {
    background: 'bg-gray-800',
    border: 'border-gray-700',
    hover: 'hover:bg-gray-750'
  }
};
```

#### Typography
```typescript
const libraryTypography = {
  pageTitle: 'text-3xl font-bold',
  sectionTitle: 'text-2xl font-bold',
  cardTitle: 'text-lg font-semibold',
  statValue: 'text-2xl font-bold',
  statLabel: 'text-sm text-gray-400',
  metadata: 'text-sm text-gray-500'
};
```

#### Spacing
```typescript
const librarySpacing = {
  sectionGap: 'mb-12',
  cardGap: 'gap-6',
  statGap: 'gap-4',
  padding: {
    section: 'p-6',
    card: 'p-4',
    stat: 'p-4'
  }
};
```

### Interaction Patterns

#### Collapsible Sections
```typescript
interface CollapsibleSectionProps {
  title: string;
  count?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

// Behavior:
// - Click header to toggle
// - Smooth animation (300ms)
// - Save state to localStorage
// - Icon rotates: ▼ (expanded) / ▶ (collapsed)
```

#### Track Actions Menu
```typescript
// Desktop: Show on hover
// Mobile: Show on long-press (500ms)
// Menu position: Below card, aligned right
// Backdrop: Semi-transparent overlay
// Close: Click outside or select action
```

#### Album/Playlist Assignment
```typescript
// After track upload or from track actions menu
// Show modal with:
// - Album dropdown (single select, with "None" option)
// - Playlist multi-select (checkboxes)
// - "Skip" button (closes without saving)
// - "Save" button (applies selections)
```

### Responsive Breakpoints

```typescript
const breakpoints = {
  mobile: '0-767px',    // 2-column grid for tracks
  tablet: '768-1023px', // 3-column grid for tracks
  desktop: '1024px+',   // 4-column grid for tracks
};

// Stats Section:
// - Mobile: 2 rows x 3 columns
// - Tablet+: 1 row x 6 columns

// All Tracks:
// - Mobile: 2 columns
// - Tablet: 3 columns
// - Desktop: 4 columns

// Albums:
// - Mobile: Horizontal scroll
// - Tablet: 2-3 columns
// - Desktop: 3-4 columns
```

## Error Handling

### Error States

#### Section Load Errors
```typescript
interface SectionErrorState {
  title: string;
  message: string;
  retryAction: () => void;
}

// Display:
// - Error icon (red)
// - User-friendly message
// - "Try Again" button
// - Preserve other sections (don't break entire page)
```

#### Track Upload Errors
```typescript
// Reuse existing error handling from AudioUpload component
// Additional errors for assignment:
// - Album assignment failed
// - Playlist assignment failed
// Show inline error message with retry option
```

#### Track Action Errors
```typescript
// Delete confirmation:
// - "Are you sure?" modal
// - Explain consequences (removed from albums/playlists)
// - "Cancel" and "Delete" buttons

// Action failures:
// - Show toast notification
// - Rollback optimistic update
// - Provide retry option
```

### Loading States

```typescript
// Stats Section: Skeleton cards (6 placeholders)
// Track Upload: Disabled state while uploading
// All Tracks: Skeleton grid (8-12 placeholders)
// Albums: Skeleton cards (6-8 placeholders)
// Playlists: Existing loading state

// Optimistic Updates:
// - Add to album: Immediate badge update
// - Add to playlist: Immediate badge update
// - Delete: Immediate removal from grid
// - Rollback on error
```

## Testing Strategy

### Unit Tests

```typescript
// Component Tests:
// - StatsSection: Renders all 6 stats correctly
// - TrackUploadSection: Collapse/expand behavior
// - TrackCard: Actions menu interactions
// - AlbumCard: Track number display

// Utility Tests:
// - getLibraryStats: Calculates plays correctly
// - addTrackToAlbum: Removes from previous album
// - reorderAlbumTracks: Updates positions correctly
```

### Integration Tests

```typescript
// User Flows:
// 1. Upload track → Assign to album → Verify in All Tracks
// 2. Create album → Add tracks → Reorder → Verify order
// 3. Delete track → Verify removed from albums/playlists
// 4. Add track to album → Verify removed from previous album
// 5. Collapse sections → Refresh page → Verify state persisted
```

### E2E Tests

```typescript
// Critical Paths:
// 1. New user: Upload first track → Create first album
// 2. Existing user: View library → Manage tracks → Update album
// 3. Mobile user: Navigate sections → Perform actions
// 4. Error scenarios: Network failure → Retry → Success
```

## Performance Optimization

### Lazy Loading Strategy

```typescript
// Initial Load (Priority 1):
// - Stats Section
// - Track Upload Section (collapsed)
// - First 8-12 tracks in All Tracks

// Lazy Load (Priority 2):
// - Albums Section (when scrolled into view)
// - Playlists Section (when scrolled into view)
// - Additional tracks (on "View All" click)

// Implementation:
// - Use Intersection Observer API
// - Load when section is 200px from viewport
// - Show loading skeleton during fetch
```

### Caching Strategy

```typescript
// Component-level caching:
// - Cache stats for 5 minutes
// - Cache tracks list for 2 minutes
// - Cache albums list for 2 minutes
// - Invalidate on mutations (create, update, delete)

// React.memo optimization:
// - Memo StatCard component
// - Memo TrackCard component
// - Memo AlbumCard component
// - Prevent re-renders on unrelated state changes
```

### Database Query Optimization

```typescript
// Batch queries:
// - Fetch stats in parallel (Promise.all)
// - Limit initial queries (8-12 items)
// - Use pagination for "View All" pages

// Indexes (already defined in schema):
// - albums.user_id
// - albums.created_at
// - album_tracks.album_id
// - album_tracks.track_id
// - album_tracks.position
```

## Migration Strategy

### Phase 1: Database Setup
1. Create albums and album_tracks tables
2. Create RLS policies
3. Create database functions
4. Run migrations on remote database

### Phase 2: Type Definitions
1. Generate TypeScript types from database
2. Create album.ts types file
3. Create library.ts types file
4. Update imports in existing files

### Phase 3: API Layer
1. Implement albums.ts library functions
2. Implement library.ts stats functions
3. Test API functions with manual queries

### Phase 4: Component Development
1. Build StatsSection component
2. Adapt TrackUploadSection with assignment
3. Build AllTracksSection with TrackCard
4. Build MyAlbumsSection (reuse playlist components)
5. Adapt MyPlaylistsSection for new layout

### Phase 5: Page Integration
1. Create new /library page
2. Integrate all sections
3. Implement collapsible behavior
4. Add lazy loading
5. Test responsive design

### Phase 6: Testing & Polish
1. Run unit tests
2. Run integration tests
3. Perform user testing
4. Fix bugs and polish UI
5. Update documentation

## Dependencies and Priorities

### External Dependencies
- Existing AudioUpload component (dashboard)
- Existing PlaylistCard component
- Existing CreatePlaylistModal component
- Existing playlist API functions (lib/playlists.ts)
- Existing track types and functions

### Implementation Priority

**High Priority (MVP)**:
1. Database schema (albums, album_tracks)
2. Type definitions (album.ts, library.ts)
3. API layer (albums.ts, library.ts)
4. StatsSection component
5. AllTracksSection component
6. MyAlbumsSection component (basic)
7. Page integration and routing

**Medium Priority (Post-MVP)**:
1. TrackUploadSection with assignment
2. Track actions menu (add to album/playlist)
3. Collapsible sections
4. Lazy loading optimization
5. Mobile responsive polish

**Low Priority (Future)**:
1. Advanced filtering/search
2. Bulk operations
3. Album cover upload
4. Analytics and insights
5. Export/import functionality

## Success Metrics

### Performance Metrics
- Initial page load: < 1 second
- Stats section load: < 500ms
- Track grid render: < 300ms
- Album assignment: < 200ms

### User Experience Metrics
- Task completion rate: > 95%
- Error rate: < 2%
- User satisfaction: > 4.5/5
- Mobile usability: > 90%

### Technical Metrics
- Test coverage: > 80%
- TypeScript errors: 0
- Linting errors: 0
- Accessibility score: > 90

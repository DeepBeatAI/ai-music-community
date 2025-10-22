# Design Document: Tracks vs Posts Separation

## Document Information
- **Feature**: Tracks vs Posts Separation
- **Version**: 1.0
- **Status**: Design Phase
- **Created**: January 2025
- **Last Updated**: January 2025

## Overview

This design document outlines the architectural changes required to separate the "tracks" concept from "posts" in the AI Music Community Platform. Currently, the platform conflates these two concepts by storing audio metadata directly in the posts table and using post IDs in playlists. This design establishes a clear separation where:

- **Tracks** are reusable audio assets with metadata (title, duration, file URL, etc.)
- **Posts** are social media content items that may optionally reference a track
- **Playlists** contain tracks, not posts

### Design Goals

1. **Semantic Clarity**: Establish clear boundaries between social content (posts) and audio assets (tracks)
2. **Reusability**: Enable tracks to be referenced by multiple posts and playlists
3. **Future-Proofing**: Support upcoming features like track libraries and track-only uploads
4. **Data Integrity**: Ensure no data loss during migration
5. **Backward Compatibility**: Maintain existing functionality during transition

### Non-Goals

- Changing the user interface or user experience (UI/UX remains the same initially)
- Modifying audio storage or compression mechanisms
- Altering social features (likes, comments, follows)
- Changing authentication or authorization systems

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Current Structure                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              posts table                              │  │
│  │  - id (UUID)                                          │  │
│  │  - user_id                                            │  │
│  │  - content (text)                                     │  │
│  │  - post_type ('text' | 'audio')                      │  │
│  │  - audio_url                                          │  │
│  │  - audio_filename                                     │  │
│  │  - audio_duration                                     │  │
│  │  - audio_file_size                                    │  │
│  │  - audio_mime_type                                    │  │
│  │  - created_at, updated_at                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │                                   │
│                          │ references                        │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         playlist_tracks table                         │  │
│  │  - id (UUID)                                          │  │
│  │  - playlist_id                                        │  │
│  │  - track_id (FK → posts.id) ❌ INCORRECT             │  │
│  │  - position                                           │  │
│  │  - added_at                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              tracks table                             │  │
│  │  - UNUSED (exists but not referenced)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Issues:
- Posts table serves dual purpose (social + audio storage)
- Playlists reference posts instead of tracks
- Tracks table exists but is unused
- Cannot upload tracks without creating posts
- Cannot reuse tracks across multiple posts
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Proposed Structure                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              tracks table                             │  │
│  │  - id (UUID) PRIMARY KEY                             │  │
│  │  - user_id (FK → profiles.id)                        │  │
│  │  - title (TEXT) NOT NULL                             │  │
│  │  - description (TEXT)                                 │  │
│  │  - file_url (TEXT) NOT NULL                          │  │
│  │  - duration (INTEGER) -- seconds                     │  │
│  │  - file_size (INTEGER) -- bytes                      │  │
│  │  - mime_type (TEXT)                                   │  │
│  │  - genre (TEXT)                                       │  │
│  │  - tags (TEXT)                                        │  │
│  │  - is_public (BOOLEAN) DEFAULT TRUE                  │  │
│  │  - play_count (INTEGER) DEFAULT 0                    │  │
│  │  - created_at, updated_at                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │                                   │
│                          │ references                        │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              posts table                              │  │
│  │  - id (UUID)                                          │  │
│  │  - user_id                                            │  │
│  │  - content (text)                                     │  │
│  │  - post_type ('text' | 'audio')                      │  │
│  │  - track_id (FK → tracks.id) ✅ NEW                  │  │
│  │  - created_at, updated_at                            │  │
│  │                                                       │  │
│  │  Audio fields REMOVED:                                │  │
│  │  ❌ audio_url                                         │  │
│  │  ❌ audio_filename                                    │  │
│  │  ❌ audio_duration                                    │  │
│  │  ❌ audio_file_size                                   │  │
│  │  ❌ audio_mime_type                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         playlist_tracks table                         │  │
│  │  - id (UUID)                                          │  │
│  │  - playlist_id                                        │  │
│  │  - track_id (FK → tracks.id) ✅ CORRECT              │  │
│  │  - position                                           │  │
│  │  - added_at                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Benefits:
✅ Clear separation of concerns
✅ Tracks can be reused across posts
✅ Playlists correctly reference tracks
✅ Supports track-only uploads
✅ Enables track library features
```



## Components and Interfaces

### Database Schema Changes

#### 1. Tracks Table (Activate Existing Table)

The tracks table already exists from migration `001_initial_schema.sql` but needs to be updated to match our needs:

```sql
-- Update tracks table structure
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS original_file_size INTEGER, -- NEW: For compression tracking
  ADD COLUMN IF NOT EXISTS compression_ratio DECIMAL(4,2), -- NEW: Compression ratio
  ADD COLUMN IF NOT EXISTS compression_applied BOOLEAN DEFAULT FALSE, -- NEW: Was compression used
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN file_url SET NOT NULL;

-- Add comments for new columns
COMMENT ON COLUMN public.tracks.original_file_size IS 'Original file size before compression (bytes)';
COMMENT ON COLUMN public.tracks.compression_ratio IS 'Compression ratio (e.g., 2.5 means 2.5x smaller)';
COMMENT ON COLUMN public.tracks.compression_applied IS 'Whether compression was applied to this track';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON public.tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON public.tracks(is_public) WHERE is_public = true;

-- Update RLS policies (already exist, verify they're correct)
-- Policies should allow:
-- - Public tracks viewable by everyone
-- - Users can view their own private tracks
-- - Users can CRUD their own tracks
```

#### 2. Posts Table (Add Track Reference)

```sql
-- Add track_id foreign key to posts table
ALTER TABLE public.posts
  ADD COLUMN track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL;

-- Add index for track_id lookups
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON public.posts(track_id);

-- Add constraint: audio posts must have track_id
ALTER TABLE public.posts
  ADD CONSTRAINT audio_posts_must_have_track 
  CHECK (
    (post_type = 'audio' AND track_id IS NOT NULL) OR 
    (post_type = 'text' AND track_id IS NULL)
  );

-- Note: Keep audio_* columns temporarily for migration
-- They will be removed in a later phase after data migration
```

#### 3. Playlist Tracks Table (Update Foreign Key)

```sql
-- The current foreign key references posts.id
-- We need to update it to reference tracks.id

-- Step 1: Drop existing foreign key constraint
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

-- Step 2: Add new foreign key constraint to tracks table
ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;

-- Note: This requires data migration first (see Data Migration section)
```

### TypeScript Type Definitions

#### 1. Track Types (New)

```typescript
// client/src/types/track.ts

import { Database } from './database';

// Base types from database
export type Track = Database['public']['Tables']['tracks']['Row'];
export type TrackInsert = Database['public']['Tables']['tracks']['Insert'];
export type TrackUpdate = Database['public']['Tables']['tracks']['Update'];

// Extended types with relationships
export interface TrackWithOwner extends Track {
  owner: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface TrackWithStats extends Track {
  play_count: number;
  playlist_count: number;
  post_count: number;
}

// Extended types with compression metadata (NEW)
export interface TrackWithCompression extends Track {
  original_file_size?: number | null;
  compression_ratio?: number | null;
  compression_applied?: boolean | null;
  compression_savings?: number; // Calculated: original_file_size - file_size
}

// Form data interfaces
export interface TrackFormData {
  title: string;
  description?: string;
  genre?: string;
  tags?: string;
  is_public: boolean;
}

// Upload interfaces
export interface TrackUploadData extends TrackFormData {
  file: File;
}

export interface TrackUploadResult {
  success: boolean;
  track?: Track;
  error?: string;
}
```

#### 2. Updated Post Types

```typescript
// client/src/types/index.ts (updated)

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  content: string;
  user_id: string;
  post_type: 'text' | 'audio';
  
  // NEW: Track reference for audio posts
  track_id?: string;
  track?: Track; // Joined track data
  
  // DEPRECATED: Keep temporarily for backward compatibility
  // These will be removed after migration
  audio_url?: string;
  audio_filename?: string;
  audio_file_size?: number;
  audio_duration?: number;
  audio_mime_type?: string;
  
  // Joined user profile data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  
  // Interaction fields
  like_count?: number;
  liked_by_user?: boolean;
}
```

#### 3. Updated Playlist Types

```typescript
// client/src/types/playlist.ts (updated)

export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: Track; // Now correctly references Track type
  }>;
  track_count: number;
}
```

### API Functions

#### 1. Track Management Functions (New)

```typescript
// client/src/lib/tracks.ts (NEW FILE)

import { supabase } from './supabase';
import type {
  Track,
  TrackFormData,
  TrackUploadData,
  TrackUploadResult,
  TrackWithOwner,
} from '@/types/track';

/**
 * Upload a new track with audio file
 * UPDATED: Now includes audio compression integration
 */
export async function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult> {
  try {
    // 1. Apply audio compression (NEW - CRITICAL)
    const compressionResult = await serverAudioCompressor.compressAudio(
      uploadData.file,
      serverAudioCompressor.getRecommendedSettings(uploadData.file)
    );

    // 2. Use compressed file if available, otherwise use original
    const fileToUpload = compressionResult.success && compressionResult.compressedFile
      ? compressionResult.compressedFile
      : uploadData.file;

    // 3. Track compression analytics (NEW)
    if (compressionResult.success && compressionResult.compressionApplied) {
      compressionAnalytics.trackCompression({
        userId,
        fileName: uploadData.file.name,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
        processingTime: 0, // Calculate from actual timing
        compressionApplied: true,
        quality: 'medium',
        bitrate: compressionResult.bitrate || 'unknown',
        originalBitrate: compressionResult.originalBitrate || 'unknown'
      });
    }

    // 4. Upload audio file to storage
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, fileToUpload);

    if (storageError) throw storageError;

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    // 6. Create track record with compression metadata (NEW)
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert({
        user_id: userId,
        title: uploadData.title,
        description: uploadData.description || null,
        file_url: publicUrl,
        file_size: fileToUpload.size, // Compressed size
        original_file_size: uploadData.file.size, // NEW: Original size
        compression_ratio: compressionResult.compressionRatio || 1.0, // NEW
        compression_applied: compressionResult.compressionApplied || false, // NEW
        mime_type: fileToUpload.type,
        genre: uploadData.genre || null,
        tags: uploadData.tags || null,
        is_public: uploadData.is_public,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      success: true,
      track,
    };
  } catch (error) {
    console.error('Error uploading track:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload track',
    };
  }
}

/**
 * Get track by ID
 */
export async function getTrack(trackId: string): Promise<Track | null> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching track:', error);
    return null;
  }
}

/**
 * Get user's tracks
 */
export async function getUserTracks(
  userId: string,
  includePrivate: boolean = false
): Promise<Track[]> {
  try {
    let query = supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includePrivate) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user tracks:', error);
    return [];
  }
}

/**
 * Update track metadata
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<TrackFormData>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracks')
      .update(updates)
      .eq('id', trackId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating track:', error);
    return false;
  }
}

/**
 * Delete track
 */
export async function deleteTrack(trackId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting track:', error);
    return false;
  }
}
```



#### 2. Updated Post Functions

```typescript
// client/src/utils/posts.ts (UPDATED)

/**
 * Create audio post with track reference
 * NEW APPROACH: Create track first, then post
 */
export async function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: caption?.trim() || '',
        post_type: 'audio',
        track_id: trackId, // NEW: Reference to track
      })
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating audio post:', error);
    throw error;
  }
}

/**
 * Fetch posts with track data
 * UPDATED: Join with tracks table for audio posts
 */
export async function fetchPosts(
  page: number = 1,
  limit: number = 15,
  userId?: string
): Promise<{ posts: PostWithProfile[]; hasMore: boolean }> {
  try {
    const offset = (page - 1) * limit;
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // ... rest of the function remains similar
    // Add like counts and user like status as before
    
    return { posts: postsWithInteractions, hasMore };
  } catch (error) {
    logger.error('Error in fetchPosts:', error);
    throw error;
  }
}
```

#### 3. Updated Playlist Functions

```typescript
// client/src/lib/playlists.ts (UPDATED)

/**
 * Get playlist with tracks
 * UPDATED: Now correctly joins with tracks table
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

    if (error) throw error;
    if (!data) return null;

    // Sort tracks by position
    const sortedTracks = (data.tracks || []).sort(
      (a, b) => a.position - b.position
    );

    return {
      ...data,
      tracks: sortedTracks,
      track_count: sortedTracks.length,
    } as PlaylistWithTracks;
  } catch (error) {
    console.error('Error fetching playlist with tracks:', error);
    return null;
  }
}

/**
 * Add track to playlist
 * UPDATED: Now accepts actual track IDs
 */
export async function addTrackToPlaylist(
  params: AddTrackToPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { playlist_id, track_id, position } = params;

    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      return {
        success: false,
        error: 'Track not found',
      };
    }

    // Calculate position if not provided
    let finalPosition = position;
    if (finalPosition === undefined) {
      const { data: existingTracks, error: fetchError } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlist_id)
        .order('position', { ascending: false })
        .limit(1);

      if (fetchError) {
        return {
          success: false,
          error: 'Failed to calculate track position',
        };
      }

      finalPosition = existingTracks && existingTracks.length > 0
        ? existingTracks[0].position + 1
        : 0;
    }

    // Insert track into playlist
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id,
        track_id,
        position: finalPosition,
      });

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Track already in playlist',
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add track',
    };
  }
}
```



## Data Models

### Entity Relationship Diagram

```
┌─────────────────────┐
│     profiles        │
│  (auth.users)       │
│                     │
│  - id (PK)          │
│  - username         │
│  - avatar_url       │
│  - bio              │
└──────────┬──────────┘
           │
           │ owns
           │
           ├──────────────────────────────────────┐
           │                                      │
           ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│      tracks         │              │       posts         │
│                     │              │                     │
│  - id (PK)          │◄─────────────│  - id (PK)          │
│  - user_id (FK)     │  references  │  - user_id (FK)     │
│  - title            │   track_id   │  - content          │
│  - description      │              │  - post_type        │
│  - file_url         │              │  - track_id (FK)    │
│  - duration         │              │  - created_at       │
│  - file_size        │              │  - updated_at       │
│  - mime_type        │              └─────────────────────┘
│  - genre            │                        │
│  - tags             │                        │ has
│  - is_public        │                        │
│  - play_count       │                        ▼
│  - created_at       │              ┌─────────────────────┐
│  - updated_at       │              │    post_likes       │
└──────────┬──────────┘              │                     │
           │                         │  - id (PK)          │
           │ contains                │  - post_id (FK)     │
           │                         │  - user_id (FK)     │
           ▼                         │  - created_at       │
┌─────────────────────┐              └─────────────────────┘
│  playlist_tracks    │                        │
│                     │                        │ has
│  - id (PK)          │                        ▼
│  - playlist_id (FK) │              ┌─────────────────────┐
│  - track_id (FK)    │              │     comments        │
│  - position         │              │                     │
│  - added_at         │              │  - id (PK)          │
└──────────┬──────────┘              │  - post_id (FK)     │
           │                         │  - user_id (FK)     │
           │ belongs to              │  - content          │
           │                         │  - parent_id (FK)   │
           ▼                         │  - created_at       │
┌─────────────────────┐              └─────────────────────┘
│     playlists       │
│                     │
│  - id (PK)          │
│  - user_id (FK)     │
│  - name             │
│  - description      │
│  - is_public        │
│  - cover_image_url  │
│  - created_at       │
│  - updated_at       │
└─────────────────────┘
```

### Data Flow Diagrams

#### Audio Upload and Post Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Audio Upload Flow (NEW)                     │
└─────────────────────────────────────────────────────────────┘

User Action: Upload Audio File
         │
         ▼
┌─────────────────────┐
│  1. Upload File     │
│  to Storage         │
│  (audio-files)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Create Track    │
│  Record in DB       │
│  (tracks table)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. User Choice:    │
│  - Create Post      │
│  - Add to Library   │
│  - Add to Playlist  │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Create Post with   │  │  Add to Playlist    │
│  track_id reference │  │  directly           │
│  (posts table)      │  │  (playlist_tracks)  │
└─────────────────────┘  └─────────────────────┘
```

#### Playlist Track Addition Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Add Track to Playlist Flow (UPDATED)            │
└─────────────────────────────────────────────────────────────┘

User Action: Add to Playlist
         │
         ▼
┌─────────────────────┐
│  Source Options:    │
│  - From Post        │
│  - From Library     │
│  - From Search      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Extract track_id   │
│  - Post: post.track_id
│  - Library: track.id│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Verify Track       │
│  Exists & Access    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Insert into        │
│  playlist_tracks    │
│  with track_id      │
└─────────────────────┘
```



## Error Handling

### Database Constraints and Validation

#### 1. Track Validation

```sql
-- Tracks table constraints
ALTER TABLE public.tracks
  ADD CONSTRAINT track_title_not_empty 
    CHECK (length(trim(title)) > 0),
  ADD CONSTRAINT track_title_max_length 
    CHECK (length(title) <= 255),
  ADD CONSTRAINT track_file_url_not_empty 
    CHECK (length(trim(file_url)) > 0),
  ADD CONSTRAINT track_duration_positive 
    CHECK (duration IS NULL OR duration > 0),
  ADD CONSTRAINT track_file_size_positive 
    CHECK (file_size IS NULL OR file_size > 0);
```

#### 2. Post-Track Relationship Validation

```sql
-- Posts table constraints
ALTER TABLE public.posts
  ADD CONSTRAINT audio_posts_must_have_track 
    CHECK (
      (post_type = 'audio' AND track_id IS NOT NULL) OR 
      (post_type = 'text' AND track_id IS NULL)
    );
```

#### 3. Referential Integrity

```sql
-- Ensure cascading deletes are properly configured
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_track_id_fkey,
  ADD CONSTRAINT posts_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE SET NULL; -- Post remains but loses track reference

ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey,
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE CASCADE; -- Remove from playlist if track deleted
```

### Application-Level Error Handling

#### 1. Track Upload Errors

```typescript
export enum TrackUploadError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  STORAGE_FAILED = 'STORAGE_FAILED',
  DATABASE_FAILED = 'DATABASE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface TrackUploadErrorDetails {
  code: TrackUploadError;
  message: string;
  details?: any;
}

// Error handling in upload function
export async function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult> {
  try {
    // Validate file size (50MB limit)
    if (uploadData.file.size > 50 * 1024 * 1024) {
      return {
        success: false,
        error: 'File size exceeds 50MB limit',
        errorCode: TrackUploadError.FILE_TOO_LARGE,
      };
    }

    // Validate file format
    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/flac'];
    if (!validFormats.includes(uploadData.file.type)) {
      return {
        success: false,
        error: 'Invalid audio format. Supported: MP3, WAV, FLAC',
        errorCode: TrackUploadError.INVALID_FORMAT,
      };
    }

    // Upload with retry logic
    let retries = 3;
    let storageData;
    let storageError;

    while (retries > 0) {
      const result = await supabase.storage
        .from('audio-files')
        .upload(fileName, uploadData.file);
      
      storageData = result.data;
      storageError = result.error;

      if (!storageError) break;
      
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (storageError) {
      return {
        success: false,
        error: 'Failed to upload file to storage',
        errorCode: TrackUploadError.STORAGE_FAILED,
        details: storageError,
      };
    }

    // ... rest of upload logic
  } catch (error) {
    logger.error('Unexpected error uploading track:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      errorCode: TrackUploadError.NETWORK_ERROR,
    };
  }
}
```

#### 2. Post Creation Errors

```typescript
export async function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post> {
  try {
    // Verify track exists and user has access
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, user_id, is_public')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      throw new Error('Track not found');
    }

    // Verify user owns track or track is public
    if (track.user_id !== userId && !track.is_public) {
      throw new Error('You do not have permission to use this track');
    }

    // Create post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: caption?.trim() || '',
        post_type: 'audio',
        track_id: trackId,
      })
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating audio post:', error);
    throw error;
  }
}
```

#### 3. Playlist Errors

```typescript
export async function addTrackToPlaylist(
  params: AddTrackToPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { playlist_id, track_id } = params;

    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, is_public, user_id')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      return {
        success: false,
        error: 'Track not found',
      };
    }

    // Verify user has access to track
    const { data: { user } } = await supabase.auth.getUser();
    if (!track.is_public && track.user_id !== user?.id) {
      return {
        success: false,
        error: 'You do not have access to this track',
      };
    }

    // Check if track already in playlist
    const { data: existing } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlist_id)
      .eq('track_id', track_id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: 'Track already in playlist',
      };
    }

    // ... rest of add logic
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return {
      success: false,
      error: 'Failed to add track to playlist',
    };
  }
}
```



## Testing Strategy

### Unit Tests

#### 1. Track Management Tests

```typescript
// client/src/__tests__/unit/tracks.test.ts

describe('Track Management', () => {
  describe('uploadTrack', () => {
    it('should upload track successfully', async () => {
      const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      const uploadData = {
        file: mockFile,
        title: 'Test Track',
        description: 'Test Description',
        is_public: true,
      };

      const result = await uploadTrack('user-id', uploadData);

      expect(result.success).toBe(true);
      expect(result.track).toBeDefined();
      expect(result.track?.title).toBe('Test Track');
    });

    it('should reject files over 50MB', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.mp3', {
        type: 'audio/mpeg',
      });
      const uploadData = {
        file: largeFile,
        title: 'Large Track',
        is_public: true,
      };

      const result = await uploadTrack('user-id', uploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('50MB');
    });

    it('should reject invalid audio formats', async () => {
      const invalidFile = new File(['data'], 'test.txt', { type: 'text/plain' });
      const uploadData = {
        file: invalidFile,
        title: 'Invalid Track',
        is_public: true,
      };

      const result = await uploadTrack('user-id', uploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid audio format');
    });
  });

  describe('getTrack', () => {
    it('should fetch track by ID', async () => {
      const track = await getTrack('track-id');

      expect(track).toBeDefined();
      expect(track?.id).toBe('track-id');
    });

    it('should return null for non-existent track', async () => {
      const track = await getTrack('non-existent-id');

      expect(track).toBeNull();
    });
  });

  describe('getUserTracks', () => {
    it('should fetch public tracks only by default', async () => {
      const tracks = await getUserTracks('user-id');

      expect(tracks).toBeInstanceOf(Array);
      expect(tracks.every(t => t.is_public)).toBe(true);
    });

    it('should fetch all tracks when includePrivate is true', async () => {
      const tracks = await getUserTracks('user-id', true);

      expect(tracks).toBeInstanceOf(Array);
      // May include private tracks
    });
  });
});
```

#### 2. Post Creation Tests

```typescript
// client/src/__tests__/unit/posts.test.ts

describe('Post Creation with Tracks', () => {
  describe('createAudioPost', () => {
    it('should create audio post with track reference', async () => {
      const post = await createAudioPost('user-id', 'track-id', 'Test caption');

      expect(post).toBeDefined();
      expect(post.post_type).toBe('audio');
      expect(post.track_id).toBe('track-id');
      expect(post.content).toBe('Test caption');
    });

    it('should throw error for non-existent track', async () => {
      await expect(
        createAudioPost('user-id', 'non-existent-track', 'Caption')
      ).rejects.toThrow('Track not found');
    });

    it('should throw error for unauthorized track access', async () => {
      // Assuming track is private and belongs to different user
      await expect(
        createAudioPost('user-id', 'private-track-id', 'Caption')
      ).rejects.toThrow('permission');
    });
  });

  describe('fetchPosts', () => {
    it('should fetch posts with track data', async () => {
      const { posts } = await fetchPosts(1, 15);

      expect(posts).toBeInstanceOf(Array);
      
      const audioPost = posts.find(p => p.post_type === 'audio');
      if (audioPost) {
        expect(audioPost.track_id).toBeDefined();
        expect(audioPost.track).toBeDefined();
      }
    });
  });
});
```

#### 3. Playlist Tests

```typescript
// client/src/__tests__/unit/playlists.test.ts

describe('Playlist Track Management', () => {
  describe('addTrackToPlaylist', () => {
    it('should add track to playlist successfully', async () => {
      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-id',
        track_id: 'track-id',
      });

      expect(result.success).toBe(true);
    });

    it('should prevent duplicate tracks', async () => {
      // Add track first time
      await addTrackToPlaylist({
        playlist_id: 'playlist-id',
        track_id: 'track-id',
      });

      // Try to add same track again
      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-id',
        track_id: 'track-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already in playlist');
    });

    it('should reject non-existent tracks', async () => {
      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-id',
        track_id: 'non-existent-track',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getPlaylistWithTracks', () => {
    it('should fetch playlist with track details', async () => {
      const playlist = await getPlaylistWithTracks('playlist-id');

      expect(playlist).toBeDefined();
      expect(playlist?.tracks).toBeInstanceOf(Array);
      
      if (playlist && playlist.tracks.length > 0) {
        expect(playlist.tracks[0].track).toBeDefined();
        expect(playlist.tracks[0].track.title).toBeDefined();
      }
    });
  });
});
```

### Integration Tests

#### 1. End-to-End Audio Upload and Post Flow

```typescript
// client/src/__tests__/integration/audio-upload-flow.test.ts

describe('Audio Upload and Post Creation Flow', () => {
  it('should complete full workflow: upload → track → post', async () => {
    // 1. Upload audio file
    const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    const uploadResult = await uploadTrack('user-id', {
      file: mockFile,
      title: 'Integration Test Track',
      description: 'Test Description',
      is_public: true,
    });

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.track).toBeDefined();

    const trackId = uploadResult.track!.id;

    // 2. Create post with track
    const post = await createAudioPost(
      'user-id',
      trackId,
      'Check out my new track!'
    );

    expect(post).toBeDefined();
    expect(post.track_id).toBe(trackId);
    expect(post.track).toBeDefined();

    // 3. Verify post appears in feed
    const { posts } = await fetchPosts(1, 15, 'user-id');
    const createdPost = posts.find(p => p.id === post.id);

    expect(createdPost).toBeDefined();
    expect(createdPost?.track?.title).toBe('Integration Test Track');

    // 4. Add track to playlist
    const playlistResult = await addTrackToPlaylist({
      playlist_id: 'test-playlist-id',
      track_id: trackId,
    });

    expect(playlistResult.success).toBe(true);

    // 5. Verify track in playlist
    const playlist = await getPlaylistWithTracks('test-playlist-id');
    const playlistTrack = playlist?.tracks.find(t => t.track_id === trackId);

    expect(playlistTrack).toBeDefined();
    expect(playlistTrack?.track.title).toBe('Integration Test Track');
  });
});
```

#### 2. Track Reuse Across Multiple Posts

```typescript
// client/src/__tests__/integration/track-reuse.test.ts

describe('Track Reuse Functionality', () => {
  it('should allow same track in multiple posts', async () => {
    // Create a track
    const uploadResult = await uploadTrack('user-id', {
      file: mockAudioFile,
      title: 'Reusable Track',
      is_public: true,
    });

    const trackId = uploadResult.track!.id;

    // Create first post
    const post1 = await createAudioPost('user-id', trackId, 'First post');
    expect(post1.track_id).toBe(trackId);

    // Create second post with same track
    const post2 = await createAudioPost('user-id', trackId, 'Second post');
    expect(post2.track_id).toBe(trackId);

    // Verify both posts exist and reference same track
    const { posts } = await fetchPosts(1, 15, 'user-id');
    const userPosts = posts.filter(p => 
      p.track_id === trackId && p.user_id === 'user-id'
    );

    expect(userPosts.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Database Migration Tests

```typescript
// tests/migration/tracks-posts-separation.test.ts

describe('Data Migration Tests', () => {
  it('should migrate all audio posts to tracks', async () => {
    // Get count of audio posts before migration
    const { count: audioPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('post_type', 'audio');

    // Run migration
    await runMigration('migrate_audio_posts_to_tracks');

    // Verify tracks created
    const { count: tracks } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true });

    expect(tracks).toBeGreaterThanOrEqual(audioPosts || 0);

    // Verify all audio posts have track_id
    const { data: postsWithoutTrack } = await supabase
      .from('posts')
      .select('id')
      .eq('post_type', 'audio')
      .is('track_id', null);

    expect(postsWithoutTrack).toHaveLength(0);
  });

  it('should update playlist_tracks references', async () => {
    // Verify all playlist_tracks reference valid tracks
    const { data: playlistTracks } = await supabase
      .from('playlist_tracks')
      .select(`
        track_id,
        track:tracks(id)
      `);

    playlistTracks?.forEach(pt => {
      expect(pt.track).toBeDefined();
      expect(pt.track.id).toBe(pt.track_id);
    });
  });
});
```



## Data Migration Strategy

### Migration Overview

The migration must be performed carefully to avoid data loss and maintain system availability. We'll use a phased approach with rollback capabilities.

### Phase 1: Schema Preparation (Non-Breaking)

```sql
-- Migration: 001_prepare_tracks_posts_separation.sql
-- This migration prepares the schema without breaking existing functionality

BEGIN;

-- 1. Update tracks table structure
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 2. Add track_id to posts table (nullable initially)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS track_id UUID;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON public.posts(track_id);

-- 4. Add foreign key constraint (without enforcement yet)
ALTER TABLE public.posts
  ADD CONSTRAINT posts_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE SET NULL
    NOT VALID; -- Don't enforce yet

-- Validate constraint in background
ALTER TABLE public.posts
  VALIDATE CONSTRAINT posts_track_id_fkey;

COMMIT;
```

### Phase 2: Data Migration

```sql
-- Migration: 002_migrate_audio_posts_to_tracks.sql
-- This migration copies audio post data to tracks table

BEGIN;

-- Create tracks from existing audio posts
INSERT INTO public.tracks (
  id,
  user_id,
  title,
  description,
  file_url,
  duration,
  file_size,
  mime_type,
  is_public,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  p.user_id,
  COALESCE(
    p.audio_filename,
    'Audio Track - ' || to_char(p.created_at, 'YYYY-MM-DD')
  ) as title,
  p.content as description,
  p.audio_url as file_url,
  p.audio_duration as duration,
  p.audio_file_size as file_size,
  p.audio_mime_type as mime_type,
  TRUE as is_public, -- Assume public since posts are public
  p.created_at,
  p.updated_at
FROM public.posts p
WHERE p.post_type = 'audio'
  AND p.audio_url IS NOT NULL
  AND NOT EXISTS (
    -- Avoid duplicates if migration is run multiple times
    SELECT 1 FROM public.tracks t
    WHERE t.file_url = p.audio_url
      AND t.user_id = p.user_id
  );

-- Update posts to reference the newly created tracks
UPDATE public.posts p
SET track_id = t.id
FROM public.tracks t
WHERE p.post_type = 'audio'
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id
  AND p.track_id IS NULL;

-- Verify all audio posts have track_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % audio posts without track_id', orphaned_count;
  END IF;
END $$;

COMMIT;
```

### Phase 3: Update Playlist References

```sql
-- Migration: 003_update_playlist_track_references.sql
-- This migration updates playlist_tracks to reference tracks instead of posts

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE track_post_mapping AS
SELECT 
  p.id as post_id,
  p.track_id
FROM public.posts p
WHERE p.post_type = 'audio'
  AND p.track_id IS NOT NULL;

-- Update playlist_tracks to reference tracks
UPDATE public.playlist_tracks pt
SET track_id = tpm.track_id
FROM track_post_mapping tpm
WHERE pt.track_id = tpm.post_id
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = tpm.post_id
      AND p.post_type = 'audio'
  );

-- Verify all playlist_tracks reference valid tracks
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = pt.track_id
  );
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % playlist_tracks with invalid track_id', invalid_count;
  END IF;
END $$;

-- Drop old foreign key and create new one
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE CASCADE;

COMMIT;
```

### Phase 4: Add Constraints and Cleanup

```sql
-- Migration: 004_finalize_tracks_posts_separation.sql
-- This migration adds final constraints and prepares for cleanup

BEGIN;

-- Add constraint: audio posts must have track_id
ALTER TABLE public.posts
  ADD CONSTRAINT audio_posts_must_have_track 
    CHECK (
      (post_type = 'audio' AND track_id IS NOT NULL) OR 
      (post_type = 'text' AND track_id IS NULL)
    );

-- Mark old audio columns as deprecated (keep for rollback)
COMMENT ON COLUMN public.posts.audio_url IS 'DEPRECATED: Use track.file_url via track_id';
COMMENT ON COLUMN public.posts.audio_filename IS 'DEPRECATED: Use track.title via track_id';
COMMENT ON COLUMN public.posts.audio_duration IS 'DEPRECATED: Use track.duration via track_id';
COMMENT ON COLUMN public.posts.audio_file_size IS 'DEPRECATED: Use track.file_size via track_id';
COMMENT ON COLUMN public.posts.audio_mime_type IS 'DEPRECATED: Use track.mime_type via track_id';

-- Add indexes for tracks table
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON public.tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON public.tracks(is_public) WHERE is_public = true;

COMMIT;
```

### Phase 5: Remove Deprecated Columns (Future)

```sql
-- Migration: 005_remove_deprecated_audio_columns.sql
-- This migration removes deprecated columns after verification period
-- ONLY RUN AFTER CONFIRMING ALL SYSTEMS USE NEW STRUCTURE

BEGIN;

-- Remove deprecated audio columns from posts table
ALTER TABLE public.posts
  DROP COLUMN IF EXISTS audio_url,
  DROP COLUMN IF EXISTS audio_filename,
  DROP COLUMN IF EXISTS audio_duration,
  DROP COLUMN IF EXISTS audio_file_size,
  DROP COLUMN IF EXISTS audio_mime_type;

COMMIT;
```

### Rollback Strategy

```sql
-- Rollback script if migration fails
-- Run these in reverse order

-- Rollback Phase 4
BEGIN;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS audio_posts_must_have_track;
COMMIT;

-- Rollback Phase 3
BEGIN;
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

-- Restore original references (if backup exists)
-- This requires having backed up the original playlist_tracks data
COMMIT;

-- Rollback Phase 2
BEGIN;
-- Remove track_id references from posts
UPDATE public.posts SET track_id = NULL WHERE post_type = 'audio';

-- Delete migrated tracks (only if they were created by migration)
DELETE FROM public.tracks
WHERE created_at >= (SELECT started_at FROM migration_log WHERE migration_name = '002_migrate_audio_posts_to_tracks');
COMMIT;

-- Rollback Phase 1
BEGIN;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_track_id_fkey;
ALTER TABLE public.posts DROP COLUMN IF EXISTS track_id;
ALTER TABLE public.tracks DROP COLUMN IF EXISTS file_size;
ALTER TABLE public.tracks DROP COLUMN IF EXISTS mime_type;
COMMIT;
```

### Migration Verification Queries

```sql
-- Verify migration success

-- 1. Check all audio posts have track_id
SELECT COUNT(*) as orphaned_audio_posts
FROM public.posts
WHERE post_type = 'audio'
  AND track_id IS NULL;
-- Expected: 0

-- 2. Check all tracks are referenced
SELECT COUNT(*) as unreferenced_tracks
FROM public.tracks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts p WHERE p.track_id = t.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.playlist_tracks pt WHERE pt.track_id = t.id
);
-- Expected: 0 or low number (user library tracks)

-- 3. Check playlist_tracks integrity
SELECT COUNT(*) as invalid_playlist_tracks
FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);
-- Expected: 0

-- 4. Compare counts before/after
SELECT 
  (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio') as audio_posts,
  (SELECT COUNT(*) FROM public.tracks) as tracks,
  (SELECT COUNT(*) FROM public.playlist_tracks) as playlist_tracks;
```



## Documentation Updates

### Files Requiring Updates

#### 1. Database Documentation

**Files to Update:**
- `supabase/migrations/README.md` (if exists)
- Any database schema diagrams
- API documentation referencing posts table structure

**Changes:**
- Document the new tracks-posts relationship
- Update ERD diagrams to show track_id foreign key
- Explain the separation of concerns

#### 2. Code Documentation

**Files to Update:**
- `client/src/types/index.ts` - Update Post interface comments
- `client/src/types/playlist.ts` - Update playlist type comments
- `client/src/utils/posts.ts` - Update function JSDoc comments
- `client/src/lib/playlists.ts` - Update function JSDoc comments
- Create new `client/src/lib/tracks.ts` with comprehensive documentation

**Example Updated JSDoc:**

```typescript
/**
 * Create an audio post that references a track
 * 
 * @param userId - The ID of the user creating the post
 * @param trackId - The ID of the track to reference (must exist in tracks table)
 * @param caption - Optional caption/description for the post
 * @returns Promise<Post> - The created post with track data joined
 * 
 * @throws {Error} If track doesn't exist or user doesn't have access
 * 
 * @example
 * ```typescript
 * // First upload a track
 * const { track } = await uploadTrack(userId, trackData);
 * 
 * // Then create a post referencing it
 * const post = await createAudioPost(userId, track.id, 'Check out my new track!');
 * ```
 * 
 * @remarks
 * This function replaces the old createAudioPost that accepted audio file data directly.
 * Now, tracks must be created separately before creating posts.
 */
export async function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post>
```

#### 3. Feature Documentation

**Files to Update:**
- `docs/features/audio-upload/` - Update to reflect two-step process
- `docs/features/playlists/` - Update to clarify tracks vs posts
- `docs/features/social-feed/` - Update to explain track references
- Any README files mentioning audio posts

**New Documentation to Create:**
- `docs/features/tracks/README.md` - Comprehensive track management guide
- `docs/features/tracks/guide-upload.md` - Track upload guide
- `docs/features/tracks/guide-library.md` - Track library management guide

#### 4. API Documentation

**Files to Update:**
- Any OpenAPI/Swagger specs
- GraphQL schema documentation (if applicable)
- Internal API reference docs

**Changes:**
- Document new track endpoints
- Update post creation endpoints
- Update playlist endpoints to clarify track references

#### 5. Architecture Documentation

**Files to Update:**
- `docs/architecture/database-schema.md` (if exists)
- `docs/architecture/data-flow.md` (if exists)
- System design documents

**Changes:**
- Update ERD diagrams
- Update data flow diagrams
- Document the separation rationale

### Documentation Standards

#### Terminology Guidelines

**Use Consistently:**
- **Track**: An audio file entity with metadata (title, duration, file URL)
- **Audio Post**: A social post that references a track
- **Post**: Generic social content (text or audio)
- **Playlist**: A collection of tracks (not posts)

**Avoid:**
- "Audio track" (redundant - just "track")
- "Track post" (confusing - use "audio post")
- "Post track" (ambiguous)

#### Code Comment Standards

```typescript
// ✅ GOOD: Clear and specific
/**
 * Fetches a track by ID from the tracks table.
 * Returns null if track doesn't exist or user doesn't have access.
 */
export async function getTrack(trackId: string): Promise<Track | null>

// ❌ BAD: Ambiguous terminology
/**
 * Gets audio post data
 */
export async function getTrack(trackId: string): Promise<Track | null>
```

#### Migration Guide for Developers

Create `docs/migrations/tracks-posts-separation.md`:

```markdown
# Migration Guide: Tracks vs Posts Separation

## Overview

This guide helps developers update their code to use the new tracks-posts separation.

## Breaking Changes

### 1. Audio Post Creation

**Before:**
```typescript
const post = await createAudioPost(
  userId,
  storagePath,
  description,
  fileSize,
  duration,
  mimeType,
  fileName
);
```

**After:**
```typescript
// Step 1: Upload track
const { track } = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  description: 'Track description',
  is_public: true,
});

// Step 2: Create post (optional)
const post = await createAudioPost(userId, track.id, 'Post caption');
```

### 2. Accessing Audio Data from Posts

**Before:**
```typescript
const audioUrl = post.audio_url;
const duration = post.audio_duration;
const filename = post.audio_filename;
```

**After:**
```typescript
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
const title = post.track?.title;
```

### 3. Adding to Playlists

**Before:**
```typescript
// Added post ID
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: post.id, // This was actually a post ID
});
```

**After:**
```typescript
// Add track ID (from post or directly)
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: post.track_id, // Actual track ID
});
```

## New Features Enabled

### Track Library

Users can now upload tracks without creating posts:

```typescript
const { track } = await uploadTrack(userId, trackData);
// Track is in user's library, no post created
```

### Track Reuse

Same track can be used in multiple posts:

```typescript
const post1 = await createAudioPost(userId, trackId, 'First post');
const post2 = await createAudioPost(userId, trackId, 'Second post');
// Both posts reference the same track
```

### Direct Playlist Management

Add tracks to playlists without posts:

```typescript
// Upload track
const { track } = await uploadTrack(userId, trackData);

// Add directly to playlist
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: track.id,
});
```

## Backward Compatibility

During the transition period, posts table retains audio_* columns.
These are deprecated and will be removed in a future release.

**Deprecated fields (still available but not recommended):**
- `post.audio_url` → Use `post.track.file_url`
- `post.audio_filename` → Use `post.track.title`
- `post.audio_duration` → Use `post.track.duration`
- `post.audio_file_size` → Use `post.track.file_size`
- `post.audio_mime_type` → Use `post.track.mime_type`

## Testing Your Code

1. Verify audio post creation works with new two-step process
2. Check playlist functionality uses track IDs
3. Ensure audio playback uses track data
4. Test track library features
5. Verify track reuse across posts
```



## Implementation Considerations

### Performance Implications

#### 1. Query Performance

**Before (Single Table):**
```sql
-- Simple query, all data in posts table
SELECT * FROM posts WHERE post_type = 'audio';
```

**After (With Join):**
```sql
-- Requires join with tracks table
SELECT p.*, t.* 
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio';
```

**Mitigation:**
- Add index on `posts.track_id` (already in design)
- Add index on `tracks.id` (primary key, already indexed)
- Use selective queries (only fetch track data when needed)
- Implement caching for frequently accessed tracks

#### 2. Storage Considerations

**Additional Storage:**
- Tracks table will store metadata separately
- Posts table retains audio_* columns temporarily (during migration)
- Estimated increase: ~5-10% during transition, then neutral after cleanup

**Optimization:**
- Remove deprecated columns after migration verification
- Implement track deduplication (same file used multiple times)
- Consider track versioning for future features

#### 3. Network Performance

**Potential Issues:**
- Additional join queries may increase response time
- More data transferred if track data always included

**Mitigation:**
```typescript
// Selective fetching - only get track data when needed
export async function fetchPostsLightweight(page: number, limit: number) {
  // Don't join tracks for initial load
  const { data } = await supabase
    .from('posts')
    .select('id, user_id, content, post_type, track_id, created_at')
    .range(offset, offset + limit - 1);
  
  return data;
}

export async function fetchPostWithTrack(postId: string) {
  // Only fetch track data when viewing specific post
  const { data } = await supabase
    .from('posts')
    .select(`
      *,
      track:tracks(*)
    `)
    .eq('id', postId)
    .single();
  
  return data;
}
```

### Security Considerations

#### 1. Row Level Security (RLS) Policies

**Tracks Table RLS:**
```sql
-- Public tracks viewable by everyone
CREATE POLICY "Public tracks are viewable by everyone" ON tracks
FOR SELECT USING (is_public = TRUE);

-- Users can view their own tracks
CREATE POLICY "Users can view their own tracks" ON tracks
FOR SELECT USING (auth.uid() = user_id);

-- Users can CRUD their own tracks
CREATE POLICY "Users can insert their own tracks" ON tracks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" ON tracks
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" ON tracks
FOR DELETE USING (auth.uid() = user_id);
```

**Posts Table RLS (Updated):**
```sql
-- Ensure users can only create audio posts with tracks they own or public tracks
CREATE POLICY "Users can create audio posts with accessible tracks" ON posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (
    post_type = 'text' OR
    (
      post_type = 'audio' AND
      EXISTS (
        SELECT 1 FROM tracks t
        WHERE t.id = track_id
        AND (t.user_id = auth.uid() OR t.is_public = TRUE)
      )
    )
  )
);
```

#### 2. Access Control

**Track Access Validation:**
```typescript
export async function validateTrackAccess(
  trackId: string,
  userId: string
): Promise<boolean> {
  const { data: track } = await supabase
    .from('tracks')
    .select('user_id, is_public')
    .eq('id', trackId)
    .single();

  if (!track) return false;
  
  // User owns track or track is public
  return track.user_id === userId || track.is_public;
}
```

#### 3. Data Privacy

**Considerations:**
- Private tracks should not be accessible via posts from other users
- Playlist tracks should respect track privacy settings
- Track metadata (title, description) should be sanitized

**Implementation:**
```typescript
// Sanitize track metadata
export function sanitizeTrackData(track: Track): Track {
  return {
    ...track,
    title: sanitizeHtml(track.title),
    description: track.description ? sanitizeHtml(track.description) : null,
  };
}
```

### Scalability Considerations

#### 1. Database Scaling

**Current Approach:**
- Single PostgreSQL instance via Supabase
- All tables in same database

**Future Considerations:**
- Track table may grow large with many uploads
- Consider partitioning tracks table by user_id or created_at
- Implement archiving for old/unused tracks

#### 2. Storage Scaling

**Current:**
- Audio files in Supabase Storage
- No deduplication

**Future Optimization:**
```typescript
// Check if file already exists before uploading
export async function uploadTrackWithDeduplication(
  userId: string,
  file: File
): Promise<TrackUploadResult> {
  // Calculate file hash
  const fileHash = await calculateFileHash(file);
  
  // Check if track with same hash exists
  const { data: existingTrack } = await supabase
    .from('tracks')
    .select('*')
    .eq('file_hash', fileHash)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existingTrack) {
    return {
      success: true,
      track: existingTrack,
      message: 'Track already exists in your library',
    };
  }
  
  // Upload new file
  // ...
}
```

#### 3. Caching Strategy

**Track Metadata Caching:**
```typescript
// Cache frequently accessed tracks
const trackCache = new Map<string, Track>();

export async function getTrackCached(trackId: string): Promise<Track | null> {
  // Check cache first
  if (trackCache.has(trackId)) {
    return trackCache.get(trackId)!;
  }
  
  // Fetch from database
  const track = await getTrack(trackId);
  
  if (track) {
    trackCache.set(trackId, track);
    
    // Expire after 5 minutes
    setTimeout(() => trackCache.delete(trackId), 5 * 60 * 1000);
  }
  
  return track;
}
```

### Backward Compatibility Strategy

#### 1. Transition Period

**Duration:** 2-4 weeks after deployment

**During Transition:**
- Keep audio_* columns in posts table
- Support both old and new API patterns
- Log usage of deprecated patterns
- Display warnings in development mode

#### 2. Deprecation Warnings

```typescript
/**
 * @deprecated Use uploadTrack() and createAudioPost() instead
 * This function will be removed in v2.0
 */
export async function createAudioPostLegacy(
  userId: string,
  storagePath: string,
  description?: string,
  // ... other params
): Promise<Post> {
  console.warn(
    'createAudioPostLegacy is deprecated. Use uploadTrack() and createAudioPost() instead.'
  );
  
  // Implement using new functions internally
  const { track } = await uploadTrack(userId, {
    file: /* ... */,
    title: description || 'Audio Track',
    is_public: true,
  });
  
  return await createAudioPost(userId, track.id, description);
}
```

#### 3. Migration Path for Existing Code

**Provide Compatibility Layer:**
```typescript
// client/src/lib/compatibility.ts

/**
 * Compatibility layer for old audio post access patterns
 */
export function getAudioDataFromPost(post: Post): {
  url: string;
  filename: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
} {
  // Try new structure first
  if (post.track) {
    return {
      url: post.track.file_url,
      filename: post.track.title,
      duration: post.track.duration || undefined,
      fileSize: post.track.file_size || undefined,
      mimeType: post.track.mime_type || undefined,
    };
  }
  
  // Fall back to old structure (deprecated)
  return {
    url: post.audio_url || '',
    filename: post.audio_filename || 'Audio Track',
    duration: post.audio_duration || undefined,
    fileSize: post.audio_file_size || undefined,
    mimeType: post.audio_mime_type || undefined,
  };
}
```

---

## Summary

This design document outlines a comprehensive approach to separating tracks from posts in the AI Music Community Platform. The key aspects include:

1. **Clear Architecture**: Tracks as independent entities, posts reference tracks
2. **Data Integrity**: Comprehensive migration strategy with rollback capabilities
3. **Performance**: Optimized queries with proper indexing and caching
4. **Security**: RLS policies and access control for track privacy
5. **Testing**: Unit, integration, and migration tests
6. **Documentation**: Systematic updates across all documentation
7. **Compatibility**: Transition period with deprecation warnings

The design enables future features like track libraries, track reuse, and improved playlist management while maintaining backward compatibility during the transition period.

---

*Design Document Version: 1.0*  
*Created: January 2025*  
*Status: Ready for Review*

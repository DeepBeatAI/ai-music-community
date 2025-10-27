# Design Document: Track Metadata Enhancements

## Document Information
- **Feature**: Track Metadata Enhancements
- **Version**: 1.0
- **Status**: Design Phase
- **Created**: January 2025
- **Dependencies**: Tracks-vs-posts separation (✅ Complete)

## Overview

This design document outlines the technical implementation for three enhancement features:
1. Track Description vs Post Caption Separation
2. Mandatory Track Author Field
3. Play Count Tracking & Analytics

### Design Goals

1. **Data Integrity**: Ensure track metadata and post captions are properly separated
2. **Performance**: Eliminate unnecessary JOINs with author field
3. **Immutability**: Enforce author field immutability at database and application levels
4. **Accuracy**: Track play counts reliably without race conditions
5. **Scalability**: Design analytics queries that perform well at scale
6. **User Experience**: Clear warnings and intuitive interfaces

### Non-Goals

- Changing audio playback mechanisms
- Modifying existing playlist functionality
- Altering authentication or authorization systems
- Changing storage or compression systems



## Architecture

### Current vs Proposed Data Model

#### Current State
```
tracks table:
- description (TEXT) ← Contains social commentary (WRONG)

posts table:
- content (TEXT) ← Often empty for audio posts (WRONG)

Display Logic:
- Playlists show track.description (social commentary)
- Feed shows post.content (often empty)
- Author requires JOIN with profiles table
```

#### Proposed State
```
tracks table:
- description (TEXT) ← Track metadata only (CORRECT)
- author (TEXT NOT NULL) ← Explicit author, immutable (NEW)

posts table:
- content (TEXT) ← Social commentary (CORRECT)

Display Logic:
- Playlists show track.description (track info)
- Feed shows post.content (social commentary)
- Author directly from track.author (no JOIN)
- Play count tracked and displayed
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Components                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  AudioUpload     │  │  PostItem        │               │
│  │  - Track Desc    │  │  - Post Caption  │               │
│  │  - Author Input  │  │  - Track Author  │               │
│  │  - Warnings      │  │  - Play Count    │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           ▼                     ▼                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           API Layer (Supabase Client)                │  │
│  │  - uploadTrack()                                     │  │
│  │  - createAudioPost()                                 │  │
│  │  - recordPlayEvent()                                 │  │
│  │  - getTrendingTracks()                               │  │
│  │  - getPopularCreators()                              │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              tracks table                             │  │
│  │  - id (UUID)                                          │  │
│  │  - user_id (FK → profiles.id)                        │  │
│  │  - title (TEXT NOT NULL)                             │  │
│  │  - author (TEXT NOT NULL) ✨ NEW                     │  │
│  │  - description (TEXT) ✨ CLARIFIED                   │  │
│  │  - file_url (TEXT NOT NULL)                          │  │
│  │  - play_count (INTEGER DEFAULT 0) ✨ ACTIVE          │  │
│  │  - duration, file_size, mime_type                    │  │
│  │  - created_at, updated_at                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │                                   │
│                          │ references                        │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              posts table                              │  │
│  │  - id (UUID)                                          │  │
│  │  - user_id (FK → profiles.id)                        │  │
│  │  - content (TEXT) ✨ CLARIFIED                       │  │
│  │  - post_type ('text' | 'audio')                      │  │
│  │  - track_id (FK → tracks.id)                         │  │
│  │  - created_at, updated_at                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Database Functions (NEW)                      │  │
│  │  - increment_play_count(track_id)                    │  │
│  │  - get_trending_tracks(days, limit)                  │  │
│  │  - get_popular_creators(days, limit)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```



## Components and Interfaces

### Priority 1: Track Description vs Post Caption

#### Database Schema Changes

```sql
-- No schema changes needed - fields already exist
-- Just need to clarify usage and migrate data

-- Add comments for clarity
COMMENT ON COLUMN tracks.description IS 'Description of the track itself (genre, inspiration, technical details). NOT social commentary.';
COMMENT ON COLUMN posts.content IS 'Social commentary or caption when sharing content. For audio posts, this is separate from track.description.';
```

#### Data Migration Script

```sql
-- Migration: Separate Track Description from Post Caption
-- File: supabase/migrations/YYYYMMDD_separate_track_description_post_caption.sql

BEGIN;

-- Step 1: For audio posts with tracks, copy track.description to post.content if post.content is empty
UPDATE posts p
SET content = t.description,
    updated_at = NOW()
FROM tracks t
WHERE p.track_id = t.id
  AND p.post_type = 'audio'
  AND (p.content IS NULL OR p.content = '')
  AND t.description IS NOT NULL
  AND t.description != '';

-- Step 2: Clear track.description for tracks that were migrated
UPDATE tracks t
SET description = NULL,
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM posts p
  WHERE p.track_id = t.id
    AND p.post_type = 'audio'
    AND p.content IS NOT NULL
    AND p.content != ''
);

-- Step 3: Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM posts p
  JOIN tracks t ON p.track_id = t.id
  WHERE p.post_type = 'audio'
    AND p.content IS NOT NULL
    AND p.content != '';
  
  RAISE NOTICE 'Migration complete: % audio posts updated', migrated_count;
END $$;

COMMIT;
```

#### TypeScript Type Updates

```typescript
// client/src/types/track.ts (NO CHANGES NEEDED - already correct)

export interface Track {
  id: string;
  user_id: string;
  title: string;
  description?: string | null; // Track metadata description
  file_url: string;
  duration?: number | null;
  // ... other fields
}

// client/src/types/index.ts (NO CHANGES NEEDED - already correct)

export interface Post {
  id: string;
  user_id: string;
  content: string; // Post caption/social commentary
  post_type: 'text' | 'audio';
  track_id?: string;
  track?: Track;
  // ... other fields
}
```

#### Component Updates

**AudioUpload Component**

```typescript
// client/src/components/AudioUpload.tsx

// Add track description field to upload form
<div className="space-y-4">
  {/* Track Title */}
  <input
    type="text"
    placeholder="Track Title *"
    value={trackTitle}
    onChange={(e) => setTrackTitle(e.target.value)}
    required
  />
  
  {/* Track Description (NEW - OPTIONAL) */}
  <textarea
    placeholder="Track Description (optional) - Describe your music, genre, inspiration..."
    value={trackDescription}
    onChange={(e) => setTrackDescription(e.target.value)}
    rows={3}
    className="w-full p-2 border rounded"
  />
  
  {/* ... other fields ... */}
</div>

// After track upload, show post creation option
{trackUploaded && (
  <div className="mt-4 p-4 border rounded">
    <h3>Create a Post? (Optional)</h3>
    <textarea
      placeholder="What's on your mind? Share your thoughts about this track..."
      value={postCaption}
      onChange={(e) => setPostCaption(e.target.value)}
      rows={2}
      className="w-full p-2 border rounded"
    />
    <button onClick={createPost}>Share as Post</button>
    <button onClick={skipPost}>Skip - Just Save Track</button>
  </div>
)}
```

**PostItem Component**

```typescript
// client/src/components/PostItem.tsx

// Display post.content for audio posts (social commentary)
{post.post_type === 'audio' && post.content && (
  <p className="text-gray-700 mb-2">{post.content}</p>
)}

// Display track.description in a separate section if available
{post.track?.description && (
  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
    <span className="font-semibold">About this track:</span>
    <p className="text-gray-600">{post.track.description}</p>
  </div>
)}
```

**Playlist Track Display**

```typescript
// client/src/components/PlaylistTrackItem.tsx

// Show track.description (NOT post.content)
<div className="track-info">
  <h4>{track.title}</h4>
  <p className="text-sm text-gray-600">{track.author}</p>
  {track.description && (
    <p className="text-xs text-gray-500 mt-1">{track.description}</p>
  )}
</div>
```



### Priority 2: Mandatory Track Author Field

#### Database Schema Changes

```sql
-- Migration: Add Mandatory Track Author Field
-- File: supabase/migrations/YYYYMMDD_add_track_author_field.sql

BEGIN;

-- Step 1: Add author column (nullable initially for migration)
ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS author TEXT;

-- Step 2: Backfill author from profiles.username
UPDATE tracks t
SET author = p.username,
    updated_at = NOW()
FROM profiles p
WHERE t.user_id = p.id
  AND t.author IS NULL;

-- Step 3: Handle any tracks where user was deleted (shouldn't happen with CASCADE, but safety check)
UPDATE tracks
SET author = 'Unknown Artist'
WHERE author IS NULL;

-- Step 4: Make author NOT NULL
ALTER TABLE tracks
ALTER COLUMN author SET NOT NULL;

-- Step 5: Add constraints
ALTER TABLE tracks
ADD CONSTRAINT track_author_not_empty CHECK (length(trim(author)) > 0);

ALTER TABLE tracks
ADD CONSTRAINT track_author_max_length CHECK (length(author) <= 100);

-- Step 6: Add index for search performance
CREATE INDEX IF NOT EXISTS idx_tracks_author ON tracks(author);

-- Step 7: Add comment
COMMENT ON COLUMN tracks.author IS 'Track author/artist name. Mandatory and immutable after creation. Default to username but can be customized for covers, remixes, collaborations.';

-- Step 8: Create trigger to prevent author updates
CREATE OR REPLACE FUNCTION prevent_author_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.author IS DISTINCT FROM NEW.author THEN
    RAISE EXCEPTION 'Track author cannot be modified after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_track_author_update
BEFORE UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION prevent_author_update();

COMMIT;
```

#### TypeScript Type Updates

```typescript
// client/src/types/track.ts

export interface Track {
  id: string;
  user_id: string;
  title: string;
  author: string; // NEW: Mandatory, immutable
  description?: string | null;
  file_url: string;
  duration?: number | null;
  file_size?: number | null;
  mime_type?: string | null;
  genre?: string | null;
  tags?: string | null;
  is_public: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrackFormData {
  title: string;
  author: string; // NEW: Mandatory
  description?: string;
  genre?: string;
  tags?: string;
  is_public: boolean;
}

export interface TrackUploadData extends TrackFormData {
  file: File;
}
```

#### API Function Updates

```typescript
// client/src/lib/tracks.ts

/**
 * Upload a new track with mandatory author field
 */
export async function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult> {
  try {
    // Validate author is provided
    if (!uploadData.author || uploadData.author.trim().length === 0) {
      return {
        success: false,
        error: 'Author is required',
      };
    }

    if (uploadData.author.length > 100) {
      return {
        success: false,
        error: 'Author name must be 100 characters or less',
      };
    }

    // ... existing upload logic ...

    // Create track record with author
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert({
        user_id: userId,
        title: uploadData.title,
        author: uploadData.author.trim(), // NEW: Mandatory author
        description: uploadData.description || null,
        file_url: publicUrl,
        // ... other fields ...
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
 * Update track metadata (author is NOT editable)
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<Omit<TrackFormData, 'author'>> // Exclude author from updates
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
```

#### Component Updates

**AudioUpload Component with Author Field**

```typescript
// client/src/components/AudioUpload.tsx

export function AudioUpload() {
  const [trackTitle, setTrackTitle] = useState('');
  const [trackAuthor, setTrackAuthor] = useState('');
  const [trackDescription, setTrackDescription] = useState('');
  const { user } = useAuth();

  // Pre-fill author with username on mount
  useEffect(() => {
    if (user?.username) {
      setTrackAuthor(user.username);
    }
  }, [user]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Track Title */}
      <div>
        <label>Track Title *</label>
        <input
          type="text"
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value)}
          required
        />
      </div>

      {/* Track Author - Mandatory with Warning */}
      <div>
        <label className="flex items-center gap-2">
          Track Author *
          <Tooltip content="Author cannot be changed after upload. To change, you must delete and re-upload the track.">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </Tooltip>
        </label>
        <input
          type="text"
          value={trackAuthor}
          onChange={(e) => setTrackAuthor(e.target.value)}
          maxLength={100}
          required
          className="w-full p-2 border rounded"
        />
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Warning: Author cannot be changed after upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Default is your username. Edit for covers, remixes, or collaborations.
        </p>
      </div>

      {/* Track Description - Optional */}
      <div>
        <label>Track Description (optional)</label>
        <textarea
          value={trackDescription}
          onChange={(e) => setTrackDescription(e.target.value)}
          rows={3}
          placeholder="Describe your music, genre, inspiration..."
        />
      </div>

      {/* ... other fields ... */}

      <button type="submit">Upload Track</button>
    </form>
  );
}
```

**Track Display Components**

```typescript
// All components that display tracks now use track.author directly

// client/src/components/PlaylistTrackItem.tsx
<div className="track-info">
  <h4>{track.title}</h4>
  <p className="text-sm text-gray-600">by {track.author}</p>
</div>

// client/src/components/PostItem.tsx (for audio posts)
<div className="audio-post">
  <h3>{post.track?.title}</h3>
  <p className="text-sm">by {post.track?.author}</p>
  {post.track?.author !== post.user_profiles?.username && (
    <p className="text-xs text-gray-500">
      Uploaded by {post.user_profiles?.username}
    </p>
  )}
</div>

// client/src/components/TrackCard.tsx
<div className="track-card">
  <h4>{track.title}</h4>
  <p>by {track.author}</p>
  <p className="text-xs">{track.play_count} plays</p>
</div>
```



### Priority 3: Play Count Tracking and Analytics

#### Database Schema Changes

```sql
-- Migration: Play Count Tracking and Analytics
-- File: supabase/migrations/YYYYMMDD_play_count_tracking.sql

BEGIN;

-- Step 1: Ensure play_count column exists and has default
-- (Already exists from initial schema, but verify)
ALTER TABLE tracks
ALTER COLUMN play_count SET DEFAULT 0;

-- Step 2: Add index for play_count queries
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count DESC);

-- Step 3: Add index for trending queries (composite)
CREATE INDEX IF NOT EXISTS idx_tracks_trending ON tracks(play_count DESC, created_at DESC);

-- Step 4: Create function to increment play count atomically
CREATE OR REPLACE FUNCTION increment_play_count(track_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE tracks
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = track_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO authenticated;

-- Step 6: Create function to get trending tracks
CREATE OR REPLACE FUNCTION get_trending_tracks(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  track_id UUID,
  title TEXT,
  author TEXT,
  play_count INTEGER,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as track_id,
    t.title,
    t.author,
    t.play_count,
    COUNT(DISTINCT pl.id) as like_count,
    (
      (t.play_count * 0.6) +
      (COUNT(DISTINCT pl.id) * 0.3) +
      (GREATEST(0, 100 - EXTRACT(DAY FROM NOW() - t.created_at)) * 0.1)
    ) as trending_score,
    t.created_at
  FROM tracks t
  LEFT JOIN posts p ON p.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  WHERE
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    AND t.is_public = true
  GROUP BY t.id, t.title, t.author, t.play_count, t.created_at
  ORDER BY trending_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get popular creators
CREATE OR REPLACE FUNCTION get_popular_creators(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_plays BIGINT,
  total_likes BIGINT,
  track_count BIGINT,
  creator_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.username,
    p.avatar_url,
    SUM(t.play_count) as total_plays,
    COUNT(DISTINCT pl.id) as total_likes,
    COUNT(DISTINCT t.id) as track_count,
    (
      (SUM(t.play_count) * 0.6) +
      (COUNT(DISTINCT pl.id) * 0.4)
    ) as creator_score
  FROM profiles p
  JOIN tracks t ON t.user_id = p.id
  LEFT JOIN posts po ON po.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = po.id
  WHERE
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    AND t.is_public = true
  GROUP BY p.id, p.username, p.avatar_url
  HAVING SUM(t.play_count) > 0 OR COUNT(DISTINCT pl.id) > 0
  ORDER BY creator_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_creators(INTEGER, INTEGER) TO authenticated;

COMMIT;
```

#### Play Event Tracking System

```typescript
// client/src/lib/playTracking.ts (NEW FILE)

interface PlayEvent {
  track_id: string;
  user_id: string;
  timestamp: number;
}

class PlayTracker {
  private playStartTimes: Map<string, number> = new Map();
  private recordedPlays: Set<string> = new Set();
  private readonly MINIMUM_PLAY_DURATION = 30000; // 30 seconds in ms
  private readonly DEBOUNCE_DURATION = 30000; // 30 seconds between plays

  /**
   * Called when track starts playing
   */
  onPlayStart(trackId: string): void {
    const now = Date.now();
    this.playStartTimes.set(trackId, now);
  }

  /**
   * Called periodically while track is playing (e.g., every 5 seconds)
   * Records play if minimum duration reached
   */
  async checkAndRecordPlay(trackId: string, userId: string): Promise<void> {
    const startTime = this.playStartTimes.get(trackId);
    if (!startTime) return;

    const playDuration = Date.now() - startTime;
    
    // Check if minimum duration reached
    if (playDuration < this.MINIMUM_PLAY_DURATION) return;

    // Check if already recorded recently (debounce)
    const playKey = `${trackId}-${userId}`;
    if (this.recordedPlays.has(playKey)) return;

    // Record the play
    await this.recordPlay(trackId, userId);
    
    // Mark as recorded
    this.recordedPlays.add(playKey);
    
    // Clear debounce after duration
    setTimeout(() => {
      this.recordedPlays.delete(playKey);
    }, this.DEBOUNCE_DURATION);
  }

  /**
   * Called when track stops playing
   */
  onPlayStop(trackId: string): void {
    this.playStartTimes.delete(trackId);
  }

  /**
   * Record play event to database
   */
  private async recordPlay(trackId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_play_count', {
        track_uuid: trackId,
      });

      if (error) {
        console.error('Failed to record play:', error);
        // Queue for retry
        this.queueFailedPlay({ track_id: trackId, user_id: userId, timestamp: Date.now() });
      } else {
        console.log('Play recorded for track:', trackId);
      }
    } catch (error) {
      console.error('Error recording play:', error);
      this.queueFailedPlay({ track_id: trackId, user_id: userId, timestamp: Date.now() });
    }
  }

  /**
   * Queue failed play events for retry
   */
  private queueFailedPlay(event: PlayEvent): void {
    const queue = this.getFailedPlaysQueue();
    queue.push(event);
    localStorage.setItem('failed_plays', JSON.stringify(queue));
  }

  /**
   * Get failed plays queue from localStorage
   */
  private getFailedPlaysQueue(): PlayEvent[] {
    try {
      const stored = localStorage.getItem('failed_plays');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retry failed play events
   */
  async retryFailedPlays(): Promise<void> {
    const queue = this.getFailedPlaysQueue();
    if (queue.length === 0) return;

    const successful: number[] = [];

    for (let i = 0; i < queue.length; i++) {
      const event = queue[i];
      try {
        const { error } = await supabase.rpc('increment_play_count', {
          track_uuid: event.track_id,
        });

        if (!error) {
          successful.push(i);
        }
      } catch {
        // Keep in queue for next retry
      }
    }

    // Remove successful retries from queue
    const remaining = queue.filter((_, i) => !successful.includes(i));
    localStorage.setItem('failed_plays', JSON.stringify(remaining));
  }
}

export const playTracker = new PlayTracker();
```

#### Integration with Audio Players

```typescript
// client/src/components/WavesurferPlayer.tsx

import { playTracker } from '@/lib/playTracking';

export function WavesurferPlayer({ track, user }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const checkPlayInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!wavesurfer) return;

    // On play start
    wavesurfer.on('play', () => {
      setIsPlaying(true);
      playTracker.onPlayStart(track.id);

      // Check every 5 seconds if play should be recorded
      checkPlayInterval.current = setInterval(() => {
        if (user?.id) {
          playTracker.checkAndRecordPlay(track.id, user.id);
        }
      }, 5000);
    });

    // On pause/stop
    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      playTracker.onPlayStop(track.id);
      if (checkPlayInterval.current) {
        clearInterval(checkPlayInterval.current);
      }
    });

    // On finish
    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      playTracker.onPlayStop(track.id);
      if (checkPlayInterval.current) {
        clearInterval(checkPlayInterval.current);
      }
    });

    return () => {
      if (checkPlayInterval.current) {
        clearInterval(checkPlayInterval.current);
      }
    };
  }, [wavesurfer, track.id, user?.id]);

  // ... rest of component
}
```



#### Analytics API Functions

```typescript
// client/src/lib/analytics.ts (NEW FILE)

export interface TrendingTrack {
  track_id: string;
  title: string;
  author: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
}

export interface PopularCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}

/**
 * Get trending tracks for last 7 days
 */
export async function getTrendingTracks7Days(): Promise<TrendingTrack[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_tracks', {
      days_back: 7,
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending tracks (7d):', error);
    return [];
  }
}

/**
 * Get trending tracks for all time
 */
export async function getTrendingTracksAllTime(): Promise<TrendingTrack[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_tracks', {
      days_back: 0, // 0 means all time
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending tracks (all time):', error);
    return [];
  }
}

/**
 * Get popular creators for last 7 days
 */
export async function getPopularCreators7Days(): Promise<PopularCreator[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 7,
      result_limit: 5,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular creators (7d):', error);
    return [];
  }
}

/**
 * Get popular creators for all time
 */
export async function getPopularCreatorsAllTime(): Promise<PopularCreator[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 0, // 0 means all time
      result_limit: 5,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular creators (all time):', error);
    return [];
  }
}

/**
 * Cache wrapper for analytics data (5 minute cache)
 */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

export async function getCachedAnalytics<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}
```

#### Analytics Dashboard Components

```typescript
// client/src/components/analytics/TrendingSection.tsx (NEW FILE)

export function TrendingSection() {
  const [trending7d, setTrending7d] = useState<TrendingTrack[]>([]);
  const [trendingAllTime, setTrendingAllTime] = useState<TrendingTrack[]>([]);
  const [creators7d, setCreators7d] = useState<PopularCreator[]>([]);
  const [creatorsAllTime, setCreatorsAllTime] = useState<PopularCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const [t7d, tAll, c7d, cAll] = await Promise.all([
        getCachedAnalytics('trending_7d', getTrendingTracks7Days),
        getCachedAnalytics('trending_all', getTrendingTracksAllTime),
        getCachedAnalytics('creators_7d', getPopularCreators7Days),
        getCachedAnalytics('creators_all', getPopularCreatorsAllTime),
      ]);

      setTrending7d(t7d);
      setTrendingAllTime(tAll);
      setCreators7d(c7d);
      setCreatorsAllTime(cAll);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Trending & Popular</h2>

      {/* Top 10 Trending Tracks (Last 7 Days) */}
      <section>
        <h3 className="text-xl font-semibold mb-4">
          🔥 Top 10 Trending Tracks (Last 7 Days)
        </h3>
        {trending7d.length > 0 ? (
          <div className="space-y-2">
            {trending7d.map((track, index) => (
              <TrendingTrackCard
                key={track.track_id}
                track={track}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No trending tracks in the last 7 days</p>
        )}
      </section>

      {/* Top 10 Trending Tracks (All Time) */}
      <section>
        <h3 className="text-xl font-semibold mb-4">
          ⭐ Top 10 Trending Tracks (All Time)
        </h3>
        {trendingAllTime.length > 0 ? (
          <div className="space-y-2">
            {trendingAllTime.map((track, index) => (
              <TrendingTrackCard
                key={track.track_id}
                track={track}
                rank={index + 1}
                showDate
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tracks yet</p>
        )}
      </section>

      {/* Top 5 Popular Creators (Last 7 Days) */}
      <section>
        <h3 className="text-xl font-semibold mb-4">
          🎵 Top 5 Popular Creators (Last 7 Days)
        </h3>
        {creators7d.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators7d.map((creator, index) => (
              <PopularCreatorCard
                key={creator.user_id}
                creator={creator}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No active creators in the last 7 days</p>
        )}
      </section>

      {/* Top 5 Popular Creators (All Time) */}
      <section>
        <h3 className="text-xl font-semibold mb-4">
          👑 Top 5 Popular Creators (All Time)
        </h3>
        {creatorsAllTime.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatorsAllTime.map((creator, index) => (
              <PopularCreatorCard
                key={creator.user_id}
                creator={creator}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No creators yet</p>
        )}
      </section>
    </div>
  );
}
```

```typescript
// client/src/components/analytics/TrendingTrackCard.tsx (NEW FILE)

interface Props {
  track: TrendingTrack;
  rank: number;
  showDate?: boolean;
}

export function TrendingTrackCard({ track, rank, showDate }: Props) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition">
      {/* Rank */}
      <div className="text-2xl font-bold text-gray-400 w-8">
        #{rank}
      </div>

      {/* Track Info */}
      <div className="flex-1">
        <h4 className="font-semibold">{track.title}</h4>
        <p className="text-sm text-gray-600">by {track.author}</p>
        {showDate && (
          <p className="text-xs text-gray-500">
            {new Date(track.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold">{track.play_count}</div>
          <div className="text-gray-500">plays</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{track.like_count}</div>
          <div className="text-gray-500">likes</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{track.trending_score.toFixed(1)}</div>
          <div className="text-gray-500">score</div>
        </div>
      </div>

      {/* Actions */}
      <button className="btn-primary">Play</button>
    </div>
  );
}
```

```typescript
// client/src/components/analytics/PopularCreatorCard.tsx (NEW FILE)

interface Props {
  creator: PopularCreator;
  rank: number;
}

export function PopularCreatorCard({ creator, rank }: Props) {
  return (
    <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition">
      {/* Rank Badge */}
      <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
        #{rank}
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={creator.avatar_url || '/default-avatar.png'}
          alt={creator.username}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h4 className="font-semibold">{creator.username}</h4>
          <p className="text-sm text-gray-600">{creator.track_count} tracks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="font-semibold">{creator.total_plays}</div>
          <div className="text-gray-500">Total Plays</div>
        </div>
        <div>
          <div className="font-semibold">{creator.total_likes}</div>
          <div className="text-gray-500">Total Likes</div>
        </div>
      </div>

      {/* Score */}
      <div className="mt-3 pt-3 border-t">
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">
            {creator.creator_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Creator Score</div>
        </div>
      </div>

      {/* Actions */}
      <button className="btn-secondary w-full mt-3">View Profile</button>
    </div>
  );
}
```



## Error Handling

### Priority 1: Track Description Migration Errors

**Error**: Migration fails to copy description to post.content
- **Handling**: Transaction rollback, log error details
- **Recovery**: Manual review of failed records, re-run migration

**Error**: Data loss during migration
- **Prevention**: Backup database before migration
- **Handling**: Restore from backup if data loss detected
- **Verification**: Count records before and after migration

### Priority 2: Track Author Field Errors

**Error**: User attempts to update author after creation
- **Handling**: Database trigger blocks update with error message
- **User Message**: "Track author cannot be modified after creation. To change, delete and re-upload the track."
- **Logging**: Log attempted author updates for monitoring

**Error**: Author field empty or too long
- **Handling**: Client-side validation before submission
- **User Message**: "Author is required" or "Author must be 100 characters or less"
- **Fallback**: Database constraints enforce validation

**Error**: Migration fails for deleted user accounts
- **Handling**: Set author to "Unknown Artist" for orphaned tracks
- **Logging**: Log tracks with missing user accounts
- **Manual Review**: Review and update manually if needed

### Priority 3: Play Count Tracking Errors

**Error**: Network failure during play event recording
- **Handling**: Queue event in localStorage for retry
- **Recovery**: Retry on next page load or network reconnection
- **Monitoring**: Track retry queue size

**Error**: Race condition on concurrent play count updates
- **Prevention**: Use database transaction with atomic increment
- **Handling**: Database handles concurrency automatically
- **Verification**: Monitor for unexpected play count values

**Error**: Play event recorded for non-existent track
- **Handling**: Validate track exists before incrementing
- **User Message**: Silent failure (don't disrupt playback)
- **Logging**: Log invalid track IDs for investigation

**Error**: Analytics query timeout
- **Handling**: Return cached results if available
- **User Message**: "Analytics temporarily unavailable"
- **Recovery**: Retry after cache expiration
- **Optimization**: Add database indexes, optimize queries



## Testing Strategy

### Priority 1: Track Description Testing

**Unit Tests:**
- Test migration script with sample data
- Test component displays correct field (description vs content)
- Test upload form saves to correct fields

**Integration Tests:**
- Upload track with description → Create post with caption → Verify both stored
- View playlist → Verify shows track.description
- View feed → Verify shows post.content
- Run migration → Verify data moved correctly

**Manual Testing:**
- Upload new track with description
- Create post with caption
- View in playlist (should show track description)
- View in feed (should show post caption)
- Verify no data loss after migration

### Priority 2: Track Author Testing

**Unit Tests:**
- Test author field validation (required, max length)
- Test author immutability enforcement
- Test migration backfills author correctly

**Integration Tests:**
- Upload track with default author → Verify uses username
- Upload track with custom author → Verify uses custom value
- Attempt to update author → Verify blocked with error
- View track in various contexts → Verify shows author

**Manual Testing:**
- Upload track without editing author (should use username)
- Upload track with custom author (e.g., "Artist A & Artist B")
- Try to edit author after upload (should be blocked)
- Upload cover song with original artist as author
- Verify warning message is clear and visible

### Priority 3: Play Count Testing

**Unit Tests:**
- Test play event tracking (30 second threshold)
- Test debounce logic (no duplicate counts)
- Test increment_play_count function
- Test trending score calculation
- Test popular creator score calculation

**Integration Tests:**
- Play track for 30+ seconds → Verify count increments
- Play track for < 30 seconds → Verify count doesn't increment
- Play same track twice → Verify both counted (after debounce)
- Concurrent plays → Verify no race conditions
- Network error → Verify queued for retry

**Manual Testing:**
- Play track for 30+ seconds → Check play_count in database
- Play track for < 30 seconds → Verify no increment
- Sort by "Most Popular" → Verify correct order
- View trending sections → Verify shows high-play tracks
- View analytics dashboard → Verify all 4 sections display
- View /discover/ page → Verify all 4 sections display
- Test on mobile → Verify responsive layout

### Performance Testing

**Database Query Performance:**
- Measure trending tracks query time (target: < 200ms)
- Measure popular creators query time (target: < 200ms)
- Test with 1,000+ tracks
- Test with 100+ concurrent users
- Verify indexes are used (EXPLAIN ANALYZE)

**Play Event Performance:**
- Measure play event recording time (target: < 50ms)
- Test concurrent play events (100+ simultaneous)
- Verify no impact on audio playback
- Monitor localStorage queue size

**Cache Performance:**
- Verify 5-minute cache works correctly
- Measure cache hit rate
- Test cache invalidation



## Implementation Checklist

### Priority 1: Track Description Separation (4-6 hours)

- [ ] **Database Migration** (30 min)
  - [ ] Create migration script
  - [ ] Test migration on development database
  - [ ] Verify data integrity
  - [ ] Add column comments

- [ ] **Component Updates** (2-3 hours)
  - [ ] Update AudioUpload component (add track description field)
  - [ ] Update PostItem component (show post.content for caption)
  - [ ] Update PlaylistTrackItem component (show track.description)
  - [ ] Update all trending sections
  - [ ] Update track detail modals

- [ ] **Testing** (1-2 hours)
  - [ ] Run TypeScript checks
  - [ ] Run ESLint
  - [ ] Unit tests for components
  - [ ] Integration tests for upload flow
  - [ ] Manual testing of all display contexts

- [ ] **Documentation** (30 min)
  - [ ] Update code comments
  - [ ] Update component documentation
  - [ ] Document migration process

### Priority 2: Track Author Field (6-8 hours)

- [ ] **Database Migration** (1 hour)
  - [ ] Create migration script
  - [ ] Add author column
  - [ ] Backfill from profiles
  - [ ] Add constraints and trigger
  - [ ] Test on development database

- [ ] **TypeScript Types** (30 min)
  - [ ] Update Track interface
  - [ ] Update TrackFormData interface
  - [ ] Regenerate database types

- [ ] **API Functions** (1 hour)
  - [ ] Update uploadTrack() function
  - [ ] Update updateTrack() function (exclude author)
  - [ ] Add author validation

- [ ] **Component Updates** (2-3 hours)
  - [ ] Update AudioUpload component (add author field with warning)
  - [ ] Update all track display components
  - [ ] Remove profile JOINs where possible
  - [ ] Add tooltip for warning

- [ ] **Testing** (1-2 hours)
  - [ ] Run TypeScript checks
  - [ ] Run ESLint
  - [ ] Test author validation
  - [ ] Test immutability enforcement
  - [ ] Test migration
  - [ ] Manual testing of upload flow

- [ ] **Documentation** (30 min)
  - [ ] Update API documentation
  - [ ] Document author field behavior
  - [ ] Update user guides

### Priority 3: Play Count Tracking (10-14 hours)

- [ ] **Database Migration** (2 hours)
  - [ ] Create migration script
  - [ ] Add indexes
  - [ ] Create increment_play_count function
  - [ ] Create get_trending_tracks function
  - [ ] Create get_popular_creators function
  - [ ] Test functions on development database

- [ ] **Play Tracking System** (3-4 hours)
  - [ ] Create playTracking.ts module
  - [ ] Implement PlayTracker class
  - [ ] Add 30-second threshold logic
  - [ ] Add debounce logic
  - [ ] Add retry queue
  - [ ] Integrate with WavesurferPlayer
  - [ ] Integrate with mini player

- [ ] **Analytics API** (1-2 hours)
  - [ ] Create analytics.ts module
  - [ ] Implement getTrendingTracks7Days()
  - [ ] Implement getTrendingTracksAllTime()
  - [ ] Implement getPopularCreators7Days()
  - [ ] Implement getPopularCreatorsAllTime()
  - [ ] Add caching layer

- [ ] **Analytics Components** (3-4 hours)
  - [ ] Create TrendingSection component
  - [ ] Create TrendingTrackCard component
  - [ ] Create PopularCreatorCard component
  - [ ] Add to /analytics/ page
  - [ ] Add to /discover/ page
  - [ ] Style for mobile responsiveness

- [ ] **Sorting/Filtering Updates** (1 hour)
  - [ ] Update "Most Popular" filter
  - [ ] Update "Most Relevant" filter
  - [ ] Update trending algorithms

- [ ] **Testing** (2-3 hours)
  - [ ] Run TypeScript checks
  - [ ] Run ESLint
  - [ ] Unit tests for play tracking
  - [ ] Unit tests for analytics functions
  - [ ] Integration tests for play events
  - [ ] Performance tests for queries
  - [ ] Manual testing of all features

- [ ] **Documentation** (1 hour)
  - [ ] Document play tracking system
  - [ ] Document analytics functions
  - [ ] Document trending algorithms
  - [ ] Update user guides

## Deployment Plan

### Pre-Deployment

1. **Backup Database**: Full backup before any migrations
2. **Test Migrations**: Run all migrations on staging/development
3. **Verify Data**: Check data integrity after migrations
4. **Performance Baseline**: Measure current query performance

### Deployment Order

1. **Priority 1**: Deploy track description separation
   - Run migration
   - Deploy component updates
   - Verify in production

2. **Priority 2**: Deploy track author field
   - Run migration
   - Deploy component updates
   - Verify in production

3. **Priority 3**: Deploy play count tracking
   - Run migration
   - Deploy tracking system
   - Deploy analytics components
   - Verify in production

### Post-Deployment

1. **Monitor Errors**: Watch for any errors in logs
2. **Verify Data**: Check database for data integrity
3. **Performance Check**: Measure query performance
4. **User Testing**: Test all features manually
5. **Analytics Review**: Check analytics data after 24 hours

---

*Design Document Version: 1.0*  
*Created: January 2025*  
*Status: Complete - Ready for Tasks Phase*  
*Total Estimated Effort: 20-28 hours*


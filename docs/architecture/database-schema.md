# Database Schema Documentation

## Overview

This document describes the database schema for the AI Music Community Platform, with emphasis on the tracks-posts separation architecture.

**Last Updated:** January 2025  
**Version:** 2.0  
**Database:** PostgreSQL 15.x via Supabase

---

## Entity Relationship Diagram

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

---

## Core Tables

### tracks

Stores audio track metadata and files.

```sql
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  duration INTEGER, -- seconds
  file_size INTEGER, -- bytes
  mime_type TEXT,
  genre TEXT,
  tags TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  play_count INTEGER DEFAULT 0,
  
  -- Compression metadata
  original_file_size INTEGER,
  compression_ratio DECIMAL(4,2),
  compression_applied BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT track_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT track_title_max_length CHECK (length(title) <= 255),
  CONSTRAINT track_file_url_not_empty CHECK (length(trim(file_url)) > 0),
  CONSTRAINT track_duration_positive CHECK (duration IS NULL OR duration > 0),
  CONSTRAINT track_file_size_positive CHECK (file_size IS NULL OR file_size > 0)
);
```

**Indexes:**
```sql
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_is_public ON tracks(is_public) WHERE is_public = TRUE;
```

**Purpose:** Central storage for audio assets, enabling track reuse and library features.

---

### posts

Stores social media posts (text and audio).

```sql
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'audio')),
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: audio posts must have track_id
  CONSTRAINT audio_posts_must_have_track 
    CHECK (
      (post_type = 'audio' AND track_id IS NOT NULL) OR 
      (post_type = 'text' AND track_id IS NULL)
    )
);
```

**Indexes:**
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_track_id ON posts(track_id);
CREATE INDEX idx_posts_post_type ON posts(post_type);
```

**Purpose:** Social content layer that references tracks for audio posts.

---

### playlists

Stores playlist metadata.

```sql
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT playlist_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT playlist_name_max_length CHECK (length(name) <= 255)
);
```

**Indexes:**
```sql
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_created_at ON playlists(created_at DESC);
```

**Purpose:** User-created collections of tracks.

---

### playlist_tracks

Junction table linking playlists to tracks.

```sql
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate tracks in same playlist
  UNIQUE(playlist_id, track_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(position);
```

**Purpose:** Many-to-many relationship between playlists and tracks.

---

## Supporting Tables

### post_likes

Stores post likes/favorites.

```sql
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate likes
  UNIQUE(post_id, user_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
```

---

### comments

Stores post comments with threading support.

```sql
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT comment_content_not_empty CHECK (length(trim(content)) > 0)
);
```

**Indexes:**
```sql
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
```

---

## Relationships

### Foreign Keys

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| tracks | user_id | auth.users(id) | CASCADE |
| posts | user_id | auth.users(id) | CASCADE |
| posts | track_id | tracks(id) | SET NULL |
| playlists | user_id | auth.users(id) | CASCADE |
| playlist_tracks | playlist_id | playlists(id) | CASCADE |
| playlist_tracks | track_id | tracks(id) | CASCADE |
| post_likes | post_id | posts(id) | CASCADE |
| post_likes | user_id | auth.users(id) | CASCADE |
| comments | post_id | posts(id) | CASCADE |
| comments | user_id | auth.users(id) | CASCADE |
| comments | parent_id | comments(id) | CASCADE |

### Cascade Behavior

**DELETE track:**
- Removes from all playlists (CASCADE)
- Sets track_id to NULL in posts (SET NULL)
- Posts remain but lose track reference

**DELETE post:**
- Removes all likes (CASCADE)
- Removes all comments (CASCADE)
- Track remains in tracks table

**DELETE playlist:**
- Removes all playlist_tracks entries (CASCADE)
- Tracks remain in tracks table

**DELETE user:**
- Removes all tracks (CASCADE)
- Removes all posts (CASCADE)
- Removes all playlists (CASCADE)
- Removes all likes (CASCADE)
- Removes all comments (CASCADE)

---

## Row Level Security (RLS)

### tracks Table

```sql
-- Public tracks viewable by everyone
CREATE POLICY "Public tracks are viewable by everyone" ON tracks
FOR SELECT USING (is_public = TRUE);

-- Users can view their own tracks
CREATE POLICY "Users can view their own tracks" ON tracks
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tracks
CREATE POLICY "Users can insert their own tracks" ON tracks
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tracks
CREATE POLICY "Users can update their own tracks" ON tracks
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tracks
CREATE POLICY "Users can delete their own tracks" ON tracks
FOR DELETE USING (auth.uid() = user_id);
```

### posts Table

```sql
-- All posts viewable by everyone
CREATE POLICY "Posts are viewable by everyone" ON posts
FOR SELECT USING (TRUE);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- Ensure users can only create audio posts with accessible tracks
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

### playlists Table

```sql
-- Public playlists viewable by everyone
CREATE POLICY "Public playlists are viewable by everyone" ON playlists
FOR SELECT USING (is_public = TRUE);

-- Users can view their own playlists
CREATE POLICY "Users can view their own playlists" ON playlists
FOR SELECT USING (auth.uid() = user_id);

-- Users can CRUD their own playlists
CREATE POLICY "Users can insert their own playlists" ON playlists
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON playlists
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON playlists
FOR DELETE USING (auth.uid() = user_id);
```

---

## Data Flow

### Audio Upload Flow

```
User uploads audio file
         │
         ▼
Apply compression
         │
         ▼
Upload to Supabase Storage
         │
         ▼
Create track record
         │
         ▼
Return track ID
         │
         ├─ Create post (optional)
         ├─ Add to playlist (optional)
         └─ Keep in library only
```

### Post Creation Flow

```
User creates audio post
         │
         ▼
Select/upload track
         │
         ▼
Verify track access
         │
         ▼
Create post with track_id
         │
         ▼
Return post with joined track data
```

### Playlist Management Flow

```
User adds track to playlist
         │
         ▼
Verify track exists
         │
         ▼
Check track access
         │
         ▼
Calculate position
         │
         ▼
Insert playlist_tracks record
```

---

## Performance Optimization

### Indexes

All foreign keys have indexes for fast lookups:
- User-based queries (user_id indexes)
- Chronological queries (created_at indexes)
- Relationship queries (FK indexes)

### Query Patterns

**Efficient:**
```sql
-- Fetch posts with tracks (single join)
SELECT p.*, t.*
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.user_id = $1
ORDER BY p.created_at DESC
LIMIT 15;
```

**Inefficient:**
```sql
-- N+1 query pattern (avoid)
SELECT * FROM posts WHERE user_id = $1;
-- Then for each post:
SELECT * FROM tracks WHERE id = $track_id;
```

---

## Migration History

### Version 2.0 (January 2025)

**Changes:**
- Activated tracks table
- Added track_id to posts
- Updated playlist_tracks foreign key
- Added compression metadata columns
- Added constraints and indexes

**Migrations:**
1. `001_prepare_tracks_posts_separation.sql`
2. `002_migrate_audio_posts_to_tracks.sql`
3. `003_update_playlist_track_references.sql`
4. `004_finalize_tracks_posts_separation.sql`

---

## Related Documentation

- [Data Flow Diagrams](./data-flow.md)
- [Migration Guide](../migrations/tracks-posts-separation.md)
- [API Reference](../api/tracks.md)
- [Design Document](../.kiro/specs/tracks-vs-posts-separation/design.md)

---

*Database Schema Version: 2.0*  
*Last Updated: January 2025*

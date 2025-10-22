# Data Flow Documentation

## Overview

This document describes the data flow patterns in the AI Music Community Platform, focusing on the tracks-posts separation architecture.

**Last Updated:** January 2025  
**Version:** 2.0

---

## Audio Upload and Post Creation Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Audio Upload Flow (NEW)                     │
└─────────────────────────────────────────────────────────────┘

User Action: Upload Audio File
         │
         ▼
┌─────────────────────┐
│  1. Validate File   │
│  - Size (< 50MB)    │
│  - Format (MP3/WAV) │
│  - Title present    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Apply           │
│  Compression        │
│  - Auto settings    │
│  - Fallback to orig │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Upload to       │
│  Supabase Storage   │
│  - Retry logic (3x) │
│  - Get public URL   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Create Track    │
│  Record in DB       │
│  - tracks table     │
│  - Compression meta │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. Track Analytics │
│  - Compression data │
│  - Link to track ID │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  6. User Choice:    │
│  - Create Post      │
│  - Add to Playlist  │
│  - Keep in Library  │
└──────────┬──────────┘
           │
           ├─────────────────────┬─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Create Post with   │  │  Add to Playlist    │  │  Library Only       │
│  track_id reference │  │  directly           │  │  (no action)        │
│  (posts table)      │  │  (playlist_tracks)  │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Step-by-Step Breakdown

#### Step 1: File Validation

**Input:** File object from user
**Process:**
- Check file size ≤ 50MB
- Verify format (MP3, WAV, FLAC)
- Validate title is non-empty

**Output:** Validation result
**Error Handling:** Return error code and user message

---

#### Step 2: Audio Compression

**Input:** Audio file
**Process:**
- Determine compression settings based on file type
- Apply compression using server API
- Compare compressed vs original size
- Use compressed if smaller, otherwise original

**Output:** File to upload + compression metadata
**Error Handling:** Fallback to original file if compression fails

---

#### Step 3: Storage Upload

**Input:** File to upload
**Process:**
- Generate unique filename (userId/timestamp.ext)
- Upload to Supabase Storage with retry logic
- Get public URL for uploaded file

**Output:** Public URL
**Error Handling:** Retry up to 3 times with 1s delay

---

#### Step 4: Database Record Creation

**Input:** Track metadata + file URL
**Process:**
- Insert record into tracks table
- Include compression metadata
- Set user_id, timestamps

**Output:** Track object with ID
**Error Handling:** Cleanup uploaded file if DB insert fails

---

#### Step 5: Analytics Tracking

**Input:** Track ID + compression data
**Process:**
- Record compression metrics
- Link analytics to track ID
- Track savings and ratios

**Output:** Analytics recorded
**Error Handling:** Log errors but don't fail upload

---

#### Step 6: User Action

**Input:** Track ID
**Options:**
1. Create post → Call createAudioPost()
2. Add to playlist → Call addTrackToPlaylist()
3. Keep in library → No action needed

---

## Post Creation Flow

### Audio Post Creation

```
┌─────────────────────────────────────────────────────────────┐
│              Create Audio Post Flow                          │
└─────────────────────────────────────────────────────────────┘

User Action: Create Post with Track
         │
         ▼
┌─────────────────────┐
│  1. Verify Track    │
│  Exists             │
│  - Query tracks     │
│  - Check not null   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Check Access    │
│  Permissions        │
│  - User owns track  │
│  - OR track public  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Create Post     │
│  Record             │
│  - posts table      │
│  - track_id FK      │
│  - post_type=audio  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Return Post     │
│  with Track Data    │
│  - Join tracks      │
│  - Join user profile│
└─────────────────────┘
```

### Text Post Creation

```
User Action: Create Text Post
         │
         ▼
┌─────────────────────┐
│  1. Validate        │
│  Content            │
│  - Not empty        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Create Post     │
│  Record             │
│  - posts table      │
│  - post_type=text   │
│  - track_id=NULL    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Return Post     │
│  with User Profile  │
└─────────────────────┘
```

---

## Playlist Management Flow

### Add Track to Playlist

```
┌─────────────────────────────────────────────────────────────┐
│              Add Track to Playlist Flow                      │
└─────────────────────────────────────────────────────────────┘

User Action: Add Track to Playlist
         │
         ▼
┌─────────────────────┐
│  1. Source Track ID │
│  - From post        │
│  - From library     │
│  - From search      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Verify Track    │
│  Exists             │
│  - Query tracks     │
│  - Check not null   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Check Access    │
│  - User owns track  │
│  - OR track public  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Check Duplicate │
│  - Query playlist_  │
│    tracks           │
│  - Prevent dupe     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. Calculate       │
│  Position           │
│  - Get max position │
│  - Add 1            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  6. Insert Record   │
│  - playlist_tracks  │
│  - track_id FK      │
│  - position         │
└─────────────────────┘
```

### Get Playlist with Tracks

```
User Action: View Playlist
         │
         ▼
┌─────────────────────┐
│  1. Query Playlist  │
│  - playlists table  │
│  - Check access     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Join Tracks     │
│  - playlist_tracks  │
│  - tracks table     │
│  - Order by position│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Return Playlist │
│  with Track List    │
│  - Sorted tracks    │
│  - Track metadata   │
└─────────────────────┘
```

---

## Feed and Discovery Flow

### Fetch Posts Feed

```
┌─────────────────────────────────────────────────────────────┐
│                  Fetch Posts Feed Flow                       │
└─────────────────────────────────────────────────────────────┘

User Action: Load Feed
         │
         ▼
┌─────────────────────┐
│  1. Query Posts     │
│  - Pagination       │
│  - Order by date    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Join Data       │
│  - User profiles    │
│  - Tracks (audio)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Get Interactions│
│  - Like counts      │
│  - User liked?      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Return Posts    │
│  with Full Data     │
│  - Profile          │
│  - Track (if audio) │
│  - Interactions     │
└─────────────────────┘
```

---

## Track Library Flow

### View User Library

```
User Action: View Track Library
         │
         ▼
┌─────────────────────┐
│  1. Query Tracks    │
│  - Filter by user   │
│  - Include private? │
│  - Order by date    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Return Tracks   │
│  - Track metadata   │
│  - Compression info │
│  - Usage stats      │
└─────────────────────┘
```

### Update Track Metadata

```
User Action: Edit Track
         │
         ▼
┌─────────────────────┐
│  1. Verify Ownership│
│  - Check user_id    │
│  - RLS enforcement  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Update Record   │
│  - tracks table     │
│  - Updated fields   │
│  - Auto timestamp   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Return Success  │
└─────────────────────┘
```

---

## Data Access Patterns

### Pattern 1: Post with Track Data

**Query:**
```sql
SELECT 
  p.*,
  t.*,
  u.username, u.avatar_url
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
LEFT JOIN user_profiles u ON p.user_id = u.user_id
WHERE p.id = $1;
```

**Result:**
```typescript
{
  id: 'post-uuid',
  content: 'Check out my track!',
  post_type: 'audio',
  track_id: 'track-uuid',
  track: {
    id: 'track-uuid',
    title: 'My Track',
    file_url: 'https://...',
    duration: 180,
    // ... other track fields
  },
  user_profiles: {
    username: 'artist123',
    avatar_url: 'https://...'
  }
}
```

---

### Pattern 2: Playlist with Tracks

**Query:**
```sql
SELECT 
  pl.*,
  pt.position,
  t.*
FROM playlists pl
LEFT JOIN playlist_tracks pt ON pl.id = pt.playlist_id
LEFT JOIN tracks t ON pt.track_id = t.id
WHERE pl.id = $1
ORDER BY pt.position ASC;
```

**Result:**
```typescript
{
  id: 'playlist-uuid',
  name: 'My Playlist',
  tracks: [
    {
      position: 0,
      track: {
        id: 'track-1',
        title: 'Track 1',
        // ... track fields
      }
    },
    {
      position: 1,
      track: {
        id: 'track-2',
        title: 'Track 2',
        // ... track fields
      }
    }
  ]
}
```

---

### Pattern 3: User Library

**Query:**
```sql
SELECT *
FROM tracks
WHERE user_id = $1
  AND (is_public = TRUE OR $2 = TRUE)
ORDER BY created_at DESC;
```

**Result:**
```typescript
[
  {
    id: 'track-1',
    title: 'Track 1',
    is_public: true,
    // ... track fields
  },
  {
    id: 'track-2',
    title: 'Track 2',
    is_public: false,
    // ... track fields
  }
]
```

---

## Error Handling Flows

### Upload Error Flow

```
Upload Attempt
         │
         ▼
    Error Occurs
         │
         ├─ FILE_TOO_LARGE
         │  └─ Return error message
         │
         ├─ INVALID_FORMAT
         │  └─ Return error message
         │
         ├─ STORAGE_FAILED
         │  ├─ Retry (up to 3x)
         │  └─ Return error if all fail
         │
         ├─ DATABASE_FAILED
         │  ├─ Cleanup uploaded file
         │  └─ Return error message
         │
         └─ NETWORK_ERROR
            └─ Return error message
```

### Permission Error Flow

```
Access Attempt
         │
         ▼
    Check Permissions
         │
         ├─ User owns resource
         │  └─ Allow
         │
         ├─ Resource is public
         │  └─ Allow
         │
         └─ Neither condition met
            └─ Deny with error
```

---

## Performance Optimization

### Caching Strategy

```
Request for Track Data
         │
         ▼
    Check Cache
         │
         ├─ Cache Hit
         │  └─ Return cached data
         │
         └─ Cache Miss
            ├─ Query database
            ├─ Store in cache
            └─ Return data
```

### Batch Operations

```
Multiple Track Requests
         │
         ▼
    Batch Query
         │
         ├─ Single DB query
         ├─ Fetch all tracks
         └─ Return results
```

---

## Related Documentation

- [Database Schema](./database-schema.md)
- [API Reference](../api/tracks.md)
- [Migration Guide](../migrations/tracks-posts-separation.md)
- [Design Document](../.kiro/specs/tracks-vs-posts-separation/design.md)

---

*Data Flow Documentation Version: 2.0*  
*Last Updated: January 2025*

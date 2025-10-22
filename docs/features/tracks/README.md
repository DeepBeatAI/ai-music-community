# Track Management System

## Overview

The Track Management System provides a comprehensive solution for handling audio tracks in the AI Music Community Platform. Tracks are reusable audio assets that can be referenced by posts and playlists, enabling features like track libraries, track reuse, and improved content organization.

## Key Concepts

### What is a Track?

A **track** is an independent audio file entity with associated metadata (title, description, duration, file URL, etc.). Tracks exist separately from social posts and can be:

- Uploaded to a user's library without creating a post
- Referenced by multiple posts
- Added directly to playlists
- Shared across the platform (if public)

### Tracks vs Posts

- **Tracks**: Reusable audio assets stored in the `tracks` table
- **Audio Posts**: Social media posts that reference a track via `track_id`
- **Separation**: Posts contain social context (caption, likes, comments), while tracks contain audio metadata

### Track Privacy

Tracks have an `is_public` flag that controls visibility:

- **Public tracks**: Visible to all users, can be used in posts by anyone
- **Private tracks**: Only visible to the owner, cannot be used by others

## Features

### 1. Track Upload

Upload audio files with automatic compression and metadata storage.

**Supported Formats:**
- MP3 (audio/mpeg)
- WAV (audio/wav)
- FLAC (audio/flac)

**File Size Limit:** 50MB per file

**Compression:**
- Automatic audio compression applied to reduce bandwidth costs
- Compression metadata stored with track (original size, compression ratio)
- Fallback to original file if compression fails

### 2. Track Library

Users can manage their personal track library:

- View all uploaded tracks
- Filter by public/private
- Update track metadata
- Delete tracks

### 3. Track Reuse

The same track can be referenced by multiple posts:

```typescript
// Upload track once
const { track } = await uploadTrack(userId, trackData);

// Create multiple posts with same track
const post1 = await createAudioPost(userId, track.id, 'First post');
const post2 = await createAudioPost(userId, track.id, 'Second post');
```

### 4. Direct Playlist Management

Add tracks to playlists without creating posts:

```typescript
// Upload track
const { track } = await uploadTrack(userId, trackData);

// Add directly to playlist
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: track.id,
});
```

## API Functions

### Track Upload

```typescript
import { uploadTrack } from '@/lib/tracks';

const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  description: 'Track description',
  genre: 'Electronic',
  tags: 'ambient, chill',
  is_public: true,
});

if (result.success) {
  console.log('Track uploaded:', result.track);
  console.log('Compression ratio:', result.compressionInfo?.compressionRatio);
} else {
  console.error('Upload failed:', result.error);
}
```

### Get Track

```typescript
import { getTrack } from '@/lib/tracks';

const track = await getTrack(trackId);
if (track) {
  console.log('Track title:', track.title);
  console.log('File URL:', track.file_url);
}
```

### Get User Tracks

```typescript
import { getUserTracks } from '@/lib/tracks';

// Get public tracks only
const publicTracks = await getUserTracks(userId);

// Get all tracks including private
const allTracks = await getUserTracks(userId, true);
```

### Update Track

```typescript
import { updateTrack } from '@/lib/tracks';

const success = await updateTrack(trackId, {
  title: 'Updated Title',
  description: 'New description',
  is_public: false,
});
```

### Delete Track

```typescript
import { deleteTrack } from '@/lib/tracks';

const success = await deleteTrack(trackId);
```

## Database Schema

### Tracks Table

```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships

- **Posts → Tracks**: Posts reference tracks via `track_id` foreign key
- **Playlists → Tracks**: Playlist tracks reference tracks via `track_id` foreign key
- **Users → Tracks**: Tracks belong to users via `user_id` foreign key

## Security

### Row Level Security (RLS)

Tracks table has RLS policies that enforce:

1. **Public tracks viewable by everyone**
2. **Users can view their own tracks** (including private)
3. **Users can CRUD their own tracks only**

### Access Control

When creating posts or adding to playlists:

- Users can use their own tracks (public or private)
- Users can use public tracks from other users
- Users cannot use private tracks from other users

## Error Handling

### Upload Errors

```typescript
enum TrackUploadError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  STORAGE_FAILED = 'STORAGE_FAILED',
  DATABASE_FAILED = 'DATABASE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```

### Error Messages

- **FILE_TOO_LARGE**: "File size exceeds 50MB limit"
- **INVALID_FORMAT**: "Invalid audio format. Supported: MP3, WAV, FLAC"
- **STORAGE_FAILED**: "Failed to upload file to storage"
- **DATABASE_FAILED**: "Failed to create track record"
- **NETWORK_ERROR**: "Network error occurred during upload"

## Performance Considerations

### Compression

- Automatic compression reduces file sizes by 2-5x on average
- Compression metadata tracked for analytics
- Fallback to original file if compression fails or doesn't reduce size

### Caching

- Track metadata can be cached for frequently accessed tracks
- Audio files cached by browser and CDN
- Use `getCachedAudioUrl()` for audio URL processing

### Query Optimization

- Indexes on `user_id`, `created_at`, and `is_public`
- Selective queries (only fetch track data when needed)
- Pagination for large track libraries

## Migration from Old Structure

### Before (Audio in Posts)

```typescript
// Old approach - audio data in posts table
const post = await createAudioPost(
  userId,
  storagePath,
  description,
  fileSize,
  duration,
  mimeType,
  fileName
);

// Access audio data
const audioUrl = post.audio_url;
const duration = post.audio_duration;
```

### After (Tracks Separated)

```typescript
// New approach - tracks separate from posts
const { track } = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  is_public: true,
});

const post = await createAudioPost(userId, track.id, 'Check out my track!');

// Access audio data
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
```

## Related Documentation

- [Track Upload Guide](./guides/guide-upload.md) - Detailed upload process
- [Track Library Guide](./guides/guide-library.md) - Managing track libraries
- [API Reference](../../api/tracks.md) - Complete API documentation
- [Migration Guide](../../migrations/tracks-posts-separation.md) - Migration details

## Support

For issues or questions:

1. Check the [troubleshooting guide](./guides/guide-troubleshooting.md)
2. Review [common errors](./guides/guide-errors.md)
3. Contact support with error details

---

*Last Updated: January 2025*  
*Version: 1.0*

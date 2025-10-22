# Tracks API Reference

## Overview

Complete API reference for track management functions in the AI Music Community Platform.

## Functions

### uploadTrack()

Upload a new track with audio file and metadata.

**Signature:**
```typescript
function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string` | Yes | UUID of the user uploading the track |
| `uploadData` | `TrackUploadData` | Yes | Track metadata and audio file |

**TrackUploadData Interface:**
```typescript
interface TrackUploadData extends TrackFormData {
  file: File; // Audio file (MP3, WAV, or FLAC)
}

interface TrackFormData {
  title: string;          // Track title (required, max 255 chars)
  description?: string;   // Track description (optional)
  genre?: string;         // Music genre (optional)
  tags?: string;          // Comma-separated tags (optional)
  is_public: boolean;     // Public visibility (required)
}
```

**Returns:**
```typescript
interface TrackUploadResult {
  success: boolean;
  track?: Track;
  error?: string;
  errorCode?: TrackUploadError;
  details?: any;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    compressionApplied: boolean;
    bitrate?: string;
    originalBitrate?: string;
  };
}
```

**Example:**
```typescript
const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  description: 'A great track',
  genre: 'Electronic',
  tags: 'ambient, chill',
  is_public: true,
});

if (result.success) {
  console.log('Track ID:', result.track.id);
  console.log('Compression ratio:', result.compressionInfo?.compressionRatio);
}
```

**Error Codes:**
- `FILE_TOO_LARGE`: File exceeds 50MB limit
- `INVALID_FORMAT`: Unsupported audio format
- `STORAGE_FAILED`: Failed to upload to storage
- `DATABASE_FAILED`: Failed to create database record
- `NETWORK_ERROR`: Network error during upload

---

### getTrack()

Fetch a single track by ID.

**Signature:**
```typescript
function getTrack(trackId: string): Promise<Track | null>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trackId` | `string` | Yes | UUID of the track to fetch |

**Returns:**
```typescript
Track | null
```

Returns the track object if found and accessible, or `null` if not found or user doesn't have access.

**Example:**
```typescript
const track = await getTrack('123e4567-e89b-12d3-a456-426614174000');

if (track) {
  console.log('Title:', track.title);
  console.log('Duration:', track.duration);
  console.log('File URL:', track.file_url);
}
```

---

### getUserTracks()

Fetch all tracks belonging to a user.

**Signature:**
```typescript
function getUserTracks(
  userId: string,
  includePrivate?: boolean
): Promise<Track[]>
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | `string` | Yes | - | UUID of the user |
| `includePrivate` | `boolean` | No | `false` | Include private tracks |

**Returns:**
```typescript
Track[]
```

Returns array of tracks (empty array if none found).

**Example:**
```typescript
// Get public tracks only
const publicTracks = await getUserTracks(userId);

// Get all tracks including private
const allTracks = await getUserTracks(userId, true);

console.log(`User has ${allTracks.length} tracks`);
```

---

### updateTrack()

Update track metadata.

**Signature:**
```typescript
function updateTrack(
  trackId: string,
  updates: Partial<TrackFormData>
): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trackId` | `string` | Yes | UUID of the track to update |
| `updates` | `Partial<TrackFormData>` | Yes | Fields to update |

**Updatable Fields:**
- `title`: string
- `description`: string
- `genre`: string
- `tags`: string
- `is_public`: boolean

**Returns:**
```typescript
boolean
```

Returns `true` if update succeeded, `false` otherwise.

**Example:**
```typescript
const success = await updateTrack(trackId, {
  title: 'Updated Title',
  description: 'New description',
  is_public: false,
});

if (success) {
  console.log('Track updated successfully');
}
```

**Notes:**
- Only track owner can update (enforced by RLS)
- Cannot update file_url or other system fields
- `updated_at` timestamp automatically updated

---

### deleteTrack()

Delete a track from the database.

**Signature:**
```typescript
function deleteTrack(trackId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trackId` | `string` | Yes | UUID of the track to delete |

**Returns:**
```typescript
boolean
```

Returns `true` if deletion succeeded, `false` otherwise.

**Example:**
```typescript
const success = await deleteTrack(trackId);

if (success) {
  console.log('Track deleted successfully');
}
```

**Side Effects:**
- Removes track from all playlists (CASCADE)
- Sets `track_id` to NULL in posts referencing it
- Does NOT delete audio file from storage

**Notes:**
- Only track owner can delete (enforced by RLS)
- Deletion is permanent and cannot be undone
- Consider implementing storage cleanup separately

---

## Type Definitions

### Track

Complete track object from database.

```typescript
interface Track {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  duration: number | null;
  file_size: number | null;
  mime_type: string | null;
  genre: string | null;
  tags: string | null;
  is_public: boolean;
  play_count: number;
  
  // Compression metadata
  original_file_size: number | null;
  compression_ratio: number | null;
  compression_applied: boolean | null;
  
  created_at: string;
  updated_at: string;
}
```

### TrackWithOwner

Track with joined owner profile data.

```typescript
interface TrackWithOwner extends Track {
  owner: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}
```

### TrackWithStats

Track with usage statistics.

```typescript
interface TrackWithStats extends Track {
  play_count: number;
  playlist_count: number;
  post_count: number;
}
```

### TrackWithCompression

Track with calculated compression savings.

```typescript
interface TrackWithCompression extends Track {
  original_file_size?: number | null;
  compression_ratio?: number | null;
  compression_applied?: boolean | null;
  compression_savings?: number; // Calculated: original_file_size - file_size
}
```

### TrackUploadError

Error codes for track upload failures.

```typescript
enum TrackUploadError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  STORAGE_FAILED = 'STORAGE_FAILED',
  DATABASE_FAILED = 'DATABASE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```

## Database Schema

### tracks Table

```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  duration INTEGER,
  file_size INTEGER,
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

-- Indexes
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_is_public ON tracks(is_public) WHERE is_public = TRUE;
```

### Row Level Security (RLS)

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

## Related APIs

### Posts API

Audio posts reference tracks via `track_id`:

```typescript
// Create audio post with track
const post = await createAudioPost(userId, trackId, caption);

// Access track data from post
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
```

See [Posts API Reference](./posts.md) for details.

### Playlists API

Playlists contain tracks via `playlist_tracks` junction table:

```typescript
// Add track to playlist
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: trackId,
});

// Get playlist with tracks
const playlist = await getPlaylistWithTracks(playlistId);
playlist.tracks.forEach(pt => {
  console.log(pt.track.title);
});
```

See [Playlists API Reference](./playlists.md) for details.

## Error Handling

### Common Patterns

```typescript
// Handle upload errors
const result = await uploadTrack(userId, trackData);

if (!result.success) {
  switch (result.errorCode) {
    case TrackUploadError.FILE_TOO_LARGE:
      alert('File is too large. Maximum size is 50MB.');
      break;
    case TrackUploadError.INVALID_FORMAT:
      alert('Invalid file format. Please use MP3, WAV, or FLAC.');
      break;
    case TrackUploadError.STORAGE_FAILED:
      alert('Upload failed. Please check your connection and try again.');
      break;
    case TrackUploadError.DATABASE_FAILED:
      alert('Failed to save track. Please try again.');
      break;
    case TrackUploadError.NETWORK_ERROR:
      alert('Network error. Please check your connection.');
      break;
    default:
      alert('An unexpected error occurred.');
  }
}

// Handle null returns
const track = await getTrack(trackId);
if (!track) {
  console.error('Track not found or access denied');
}

// Handle boolean returns
const success = await updateTrack(trackId, updates);
if (!success) {
  console.error('Update failed');
}
```

## Best Practices

### Performance

1. **Cache frequently accessed tracks** in memory
2. **Use pagination** for large track libraries
3. **Lazy load track details** when needed
4. **Batch operations** when possible

### Security

1. **Validate user permissions** before operations
2. **Sanitize user input** for metadata
3. **Check RLS policies** are enforced
4. **Verify track ownership** for updates/deletes

### Error Handling

1. **Always check return values** for null/false
2. **Handle all error codes** appropriately
3. **Provide user-friendly messages** for errors
4. **Log errors** for debugging

### Data Management

1. **Clean up unused tracks** periodically
2. **Monitor storage usage** for costs
3. **Track compression savings** for analytics
4. **Implement soft deletes** if needed

## Migration Notes

### From Old Structure

**Before (audio in posts):**
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

**After (tracks separated):**
```typescript
const { track } = await uploadTrack(userId, {
  file: audioFile,
  title: fileName,
  description,
  is_public: true,
});

const post = await createAudioPost(userId, track.id, description);
```

See [Migration Guide](../migrations/tracks-posts-separation.md) for complete details.

---

*Last Updated: January 2025*  
*Version: 1.0*

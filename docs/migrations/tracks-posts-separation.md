# Migration Guide: Tracks vs Posts Separation

## Overview

This guide helps developers update their code to use the new tracks-posts separation architecture. The migration separates audio tracks from social posts, enabling track reuse, track libraries, and better content organization.

**Migration Date:** January 2025  
**Version:** 2.0  
**Status:** Active

---

## What Changed

### High-Level Changes

1. **Tracks Table Activated**: Audio metadata now stored in separate `tracks` table
2. **Posts Reference Tracks**: Audio posts reference tracks via `track_id` foreign key
3. **Playlists Reference Tracks**: Playlists now correctly reference tracks (not posts)
4. **Two-Step Upload**: Audio upload now requires creating track first, then post

### Database Changes

**Before:**
```
posts table:
- audio_url
- audio_filename
- audio_duration
- audio_file_size
- audio_mime_type

playlist_tracks.track_id → posts.id (INCORRECT)
```

**After:**
```
tracks table:
- file_url
- title
- duration
- file_size
- mime_type
+ compression metadata

posts.track_id → tracks.id
playlist_tracks.track_id → tracks.id (CORRECT)
```

---

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

**Migration Steps:**
1. Replace single-step upload with two-step process
2. Update function signatures to accept `trackId` instead of audio metadata
3. Handle upload errors separately from post creation errors

---

### 2. Accessing Audio Data from Posts

**Before:**
```typescript
const audioUrl = post.audio_url;
const duration = post.audio_duration;
const filename = post.audio_filename;
const fileSize = post.audio_file_size;
const mimeType = post.audio_mime_type;
```

**After:**
```typescript
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
const title = post.track?.title;
const fileSize = post.track?.file_size;
const mimeType = post.track?.mime_type;
```

**Migration Steps:**
1. Update all references from `post.audio_*` to `post.track.*`
2. Add null checks for `post.track` (use optional chaining)
3. Update TypeScript types to reflect new structure

---

### 3. Adding to Playlists

**Before:**
```typescript
// Added post ID (incorrect)
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: post.id, // This was actually a post ID
});
```

**After:**
```typescript
// Add track ID (correct)
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: post.track_id, // Actual track ID from post
});

// Or add track directly
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: track.id, // Direct track ID
});
```

**Migration Steps:**
1. Update playlist operations to use `post.track_id` instead of `post.id`
2. Update UI to extract track ID from posts
3. Test playlist functionality with new structure

---

### 4. Fetching Posts with Audio

**Before:**
```typescript
const { data: posts } = await supabase
  .from('posts')
  .select('*')
  .eq('post_type', 'audio');

// Audio data directly in post
const audioUrl = posts[0].audio_url;
```

**After:**
```typescript
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    track:tracks(*)
  `)
  .eq('post_type', 'audio');

// Audio data in joined track
const audioUrl = posts[0].track?.file_url;
```

**Migration Steps:**
1. Update queries to join with tracks table
2. Update data access patterns to use `post.track`
3. Handle cases where track might be null (deleted tracks)

---

## New Features Enabled

### 1. Track Library

Users can now upload tracks without creating posts:

```typescript
const { track } = await uploadTrack(userId, trackData);
// Track is in user's library, no post created
```

**Use Cases:**
- Building a personal track library
- Uploading tracks for later use
- Managing audio assets separately from social content

---

### 2. Track Reuse

Same track can be used in multiple posts:

```typescript
const post1 = await createAudioPost(userId, trackId, 'First post');
const post2 = await createAudioPost(userId, trackId, 'Second post');
// Both posts reference the same track
```

**Benefits:**
- Storage efficiency (file stored once)
- Consistency (updates reflected everywhere)
- Flexibility (different contexts for same audio)

---

### 3. Direct Playlist Management

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

**Benefits:**
- Simplified workflow
- No unnecessary posts
- Better playlist organization

---

## Backward Compatibility

### Transition Period

During the transition period (2-4 weeks), the posts table retains deprecated `audio_*` columns for backward compatibility.

**Deprecated Fields:**
- `post.audio_url` → Use `post.track.file_url`
- `post.audio_filename` → Use `post.track.title`
- `post.audio_duration` → Use `post.track.duration`
- `post.audio_file_size` → Use `post.track.file_size`
- `post.audio_mime_type` → Use `post.track.mime_type`

### Compatibility Layer

Use the compatibility helper for gradual migration:

```typescript
import { getAudioDataFromPost } from '@/lib/compatibility';

// Works with both old and new structure
const audioData = getAudioDataFromPost(post);
console.log(audioData.url);
console.log(audioData.filename);
console.log(audioData.duration);
```

**Implementation:**
```typescript
export function getAudioDataFromPost(post: Post) {
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

## Migration Checklist

### Code Updates

- [ ] Update audio post creation to two-step process
- [ ] Replace `post.audio_*` with `post.track.*`
- [ ] Update playlist operations to use track IDs
- [ ] Add track joins to post queries
- [ ] Update TypeScript types
- [ ] Add null checks for `post.track`
- [ ] Update UI components to display track data
- [ ] Update error handling for new flow

### Testing

- [ ] Test audio upload flow
- [ ] Test post creation with tracks
- [ ] Test playlist functionality
- [ ] Test track reuse across posts
- [ ] Test track library features
- [ ] Test backward compatibility
- [ ] Test error scenarios
- [ ] Test permissions and access control

### Database

- [ ] Verify migration completed successfully
- [ ] Check all audio posts have track_id
- [ ] Verify playlist_tracks reference tracks
- [ ] Test RLS policies
- [ ] Verify indexes are in place
- [ ] Check foreign key constraints

---

## Common Migration Patterns

### Pattern 1: Audio Upload Component

**Before:**
```typescript
async function handleUpload(file: File) {
  const post = await createAudioPost(
    userId,
    storagePath,
    description,
    file.size,
    duration,
    file.type,
    file.name
  );
  
  // Post created with audio data
}
```

**After:**
```typescript
async function handleUpload(file: File, metadata: TrackFormData) {
  // Upload track
  const uploadResult = await uploadTrack(userId, {
    file,
    ...metadata,
  });
  
  if (!uploadResult.success) {
    handleError(uploadResult.error);
    return;
  }
  
  // Create post (optional)
  const post = await createAudioPost(
    userId,
    uploadResult.track.id,
    metadata.description
  );
}
```

---

### Pattern 2: Audio Player Component

**Before:**
```typescript
function AudioPlayer({ post }: { post: Post }) {
  const audioUrl = post.audio_url;
  const duration = post.audio_duration;
  
  return <WavesurferPlayer url={audioUrl} duration={duration} />;
}
```

**After:**
```typescript
function AudioPlayer({ post }: { post: Post }) {
  if (!post.track) {
    return <div>Audio not available</div>;
  }
  
  const audioUrl = post.track.file_url;
  const duration = post.track.duration;
  
  return <WavesurferPlayer url={audioUrl} duration={duration} />;
}
```

---

### Pattern 3: Playlist Add Button

**Before:**
```typescript
function AddToPlaylistButton({ post }: { post: Post }) {
  const handleAdd = async (playlistId: string) => {
    await addTrackToPlaylist({
      playlist_id: playlistId,
      track_id: post.id, // WRONG: post ID
    });
  };
  
  return <Button onClick={() => handleAdd(playlistId)}>Add</Button>;
}
```

**After:**
```typescript
function AddToPlaylistButton({ post }: { post: Post }) {
  if (!post.track_id) {
    return null; // Not an audio post
  }
  
  const handleAdd = async (playlistId: string) => {
    await addTrackToPlaylist({
      playlist_id: playlistId,
      track_id: post.track_id, // CORRECT: track ID
    });
  };
  
  return <Button onClick={() => handleAdd(playlistId)}>Add</Button>;
}
```

---

## Troubleshooting

### Issue: Posts missing track data

**Symptom:** `post.track` is null or undefined

**Solutions:**
1. Verify query includes track join: `track:tracks(*)`
2. Check track wasn't deleted
3. Verify track_id is set in posts table
4. Check RLS policies allow track access

---

### Issue: Playlist operations failing

**Symptom:** Cannot add tracks to playlists

**Solutions:**
1. Verify using track ID, not post ID
2. Check track exists in tracks table
3. Verify user has access to track
4. Check foreign key constraints

---

### Issue: Upload errors

**Symptom:** Track upload fails

**Solutions:**
1. Check file size (< 50MB)
2. Verify file format (MP3, WAV, FLAC)
3. Check storage permissions
4. Verify database connection
5. Review error logs

---

## Performance Considerations

### Query Optimization

**Selective Fetching:**
```typescript
// Don't always join tracks if not needed
const { data: posts } = await supabase
  .from('posts')
  .select('id, user_id, content, post_type, track_id')
  .range(0, 10);

// Fetch track data only when needed
if (posts[0].post_type === 'audio') {
  const track = await getTrack(posts[0].track_id);
}
```

### Caching

```typescript
// Cache frequently accessed tracks
const trackCache = new Map<string, Track>();

async function getTrackCached(trackId: string) {
  if (trackCache.has(trackId)) {
    return trackCache.get(trackId);
  }
  
  const track = await getTrack(trackId);
  if (track) {
    trackCache.set(trackId, track);
  }
  
  return track;
}
```

---

## Related Documentation

- [Track Management Overview](../features/tracks/README.md)
- [Track Upload Guide](../features/tracks/guides/guide-upload.md)
- [Track Library Guide](../features/tracks/guides/guide-library.md)
- [API Reference](../api/tracks.md)
- [Design Document](../.kiro/specs/tracks-vs-posts-separation/design.md)

---

## Support

For migration assistance:

1. Review this guide thoroughly
2. Check the [API Reference](../api/tracks.md)
3. Test changes in development environment
4. Contact support with specific issues

---

*Migration Guide Version: 1.0*  
*Last Updated: January 2025*

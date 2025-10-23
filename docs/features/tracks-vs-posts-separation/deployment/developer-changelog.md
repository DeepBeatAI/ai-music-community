# Developer Changelog: Tracks vs Posts Separation

## Breaking Changes

### Audio Post Creation
**Before:**
```typescript
const post = await createAudioPost(userId, storagePath, description, fileSize, duration, mimeType, fileName);
```

**After:**
```typescript
// Step 1: Upload track
const { track } = await uploadTrack(userId, { file: audioFile, title: 'My Track', description: 'Description', is_public: true });
// Step 2: Create post
const post = await createAudioPost(userId, track.id, 'Post caption');
```

### Accessing Audio Data
**Before:**
```typescript
const audioUrl = post.audio_url;
const duration = post.audio_duration;
```

**After:**
```typescript
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
```

### Playlist Operations
**Before:**
```typescript
await addTrackToPlaylist({ playlist_id: playlistId, track_id: post.id });
```

**After:**
```typescript
await addTrackToPlaylist({ playlist_id: playlistId, track_id: post.track_id });
```

## Migration Guide
See: docs/features/tracks-vs-posts-separation/deployment/guide-migration-execution.md

## Questions?
Contact: dev-team@company.com

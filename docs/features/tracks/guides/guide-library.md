# Track Library Management Guide

## Overview

This guide explains how to manage your personal track library in the AI Music Community Platform. The track library allows you to organize, update, and manage all your uploaded tracks in one place.

## What is a Track Library?

A track library is your personal collection of uploaded audio tracks. Unlike the old system where audio was tied to posts, tracks now exist independently and can be:

- Uploaded without creating a post
- Reused across multiple posts
- Added directly to playlists
- Managed separately from social content

## Viewing Your Library

### Get All Tracks

Fetch all your tracks (public and private):

```typescript
import { getUserTracks } from '@/lib/tracks';

const allTracks = await getUserTracks(userId, true);

console.log(`You have ${allTracks.length} tracks`);
allTracks.forEach(track => {
  console.log(`- ${track.title} (${track.is_public ? 'Public' : 'Private'})`);
});
```

### Get Public Tracks Only

Fetch only your public tracks:

```typescript
const publicTracks = await getUserTracks(userId, false);
// or
const publicTracks = await getUserTracks(userId);
```

### Track Information

Each track includes:

```typescript
interface Track {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_url: string;
  duration?: number;
  file_size?: number;
  mime_type?: string;
  genre?: string;
  tags?: string;
  is_public: boolean;
  play_count: number;
  
  // Compression metadata
  original_file_size?: number;
  compression_ratio?: number;
  compression_applied?: boolean;
  
  created_at: string;
  updated_at: string;
}
```

## Managing Tracks

### Update Track Metadata

Update track information without re-uploading:

```typescript
import { updateTrack } from '@/lib/tracks';

const success = await updateTrack(trackId, {
  title: 'Updated Track Title',
  description: 'New description',
  genre: 'Electronic',
  tags: 'ambient, chill, updated',
  is_public: false, // Make private
});

if (success) {
  console.log('Track updated successfully');
}
```

### Delete Track

Remove a track from your library:

```typescript
import { deleteTrack } from '@/lib/tracks';

const success = await deleteTrack(trackId);

if (success) {
  console.log('Track deleted successfully');
}
```

**Important**: Deleting a track will:
- Remove it from all playlists (CASCADE)
- Set `track_id` to NULL in posts referencing it
- NOT delete the audio file from storage (consider cleanup separately)

### Get Single Track

Fetch details for a specific track:

```typescript
import { getTrack } from '@/lib/tracks';

const track = await getTrack(trackId);

if (track) {
  console.log('Track:', track.title);
  console.log('Duration:', track.duration, 'seconds');
  console.log('File size:', track.file_size, 'bytes');
}
```

## Track Organization

### By Genre

Organize tracks by genre:

```typescript
const allTracks = await getUserTracks(userId, true);

const tracksByGenre = allTracks.reduce((acc, track) => {
  const genre = track.genre || 'Uncategorized';
  if (!acc[genre]) acc[genre] = [];
  acc[genre].push(track);
  return acc;
}, {} as Record<string, Track[]>);

Object.entries(tracksByGenre).forEach(([genre, tracks]) => {
  console.log(`${genre}: ${tracks.length} tracks`);
});
```

### By Tags

Filter tracks by tags:

```typescript
function filterByTag(tracks: Track[], tag: string): Track[] {
  return tracks.filter(track => 
    track.tags?.toLowerCase().includes(tag.toLowerCase())
  );
}

const ambientTracks = filterByTag(allTracks, 'ambient');
```

### By Date

Sort tracks by upload date:

```typescript
const sortedTracks = allTracks.sort((a, b) => 
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

console.log('Most recent tracks:');
sortedTracks.slice(0, 5).forEach(track => {
  console.log(`- ${track.title} (${track.created_at})`);
});
```

## Track Usage

### Create Post from Library Track

Use an existing track to create a new post:

```typescript
import { createAudioPost } from '@/utils/posts';

// Select track from library
const track = await getTrack(trackId);

// Create post
const post = await createAudioPost(
  userId,
  track.id,
  'Sharing this track again with a new caption!'
);
```

### Add to Playlist

Add a library track to a playlist:

```typescript
import { addTrackToPlaylist } from '@/lib/playlists';

const result = await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: trackId,
});

if (result.success) {
  console.log('Track added to playlist');
}
```

### Track Reuse

The same track can be used multiple times:

```typescript
// Create multiple posts with same track
const post1 = await createAudioPost(userId, trackId, 'First post');
const post2 = await createAudioPost(userId, trackId, 'Second post');

// Add to multiple playlists
await addTrackToPlaylist({ playlist_id: playlist1, track_id: trackId });
await addTrackToPlaylist({ playlist_id: playlist2, track_id: trackId });
```

## Privacy Management

### Make Track Public

Allow others to see and use your track:

```typescript
await updateTrack(trackId, {
  is_public: true,
});
```

**Public tracks can be:**
- Viewed by all users
- Used in posts by other users
- Added to playlists by other users

### Make Track Private

Restrict track to yourself only:

```typescript
await updateTrack(trackId, {
  is_public: false,
});
```

**Private tracks can only be:**
- Viewed by you
- Used in your posts
- Added to your playlists

### Bulk Privacy Update

Update privacy for multiple tracks:

```typescript
async function updateTrackPrivacy(
  trackIds: string[],
  isPublic: boolean
): Promise<void> {
  for (const trackId of trackIds) {
    await updateTrack(trackId, { is_public: isPublic });
  }
}

// Make all tracks private
const allTracks = await getUserTracks(userId, true);
const trackIds = allTracks.map(t => t.id);
await updateTrackPrivacy(trackIds, false);
```

## Analytics and Insights

### Track Statistics

View statistics for your tracks:

```typescript
const allTracks = await getUserTracks(userId, true);

const stats = {
  totalTracks: allTracks.length,
  publicTracks: allTracks.filter(t => t.is_public).length,
  privateTracks: allTracks.filter(t => !t.is_public).length,
  totalSize: allTracks.reduce((sum, t) => sum + (t.file_size || 0), 0),
  totalPlays: allTracks.reduce((sum, t) => sum + t.play_count, 0),
  compressed: allTracks.filter(t => t.compression_applied).length,
};

console.log('Library Statistics:');
console.log(`- Total tracks: ${stats.totalTracks}`);
console.log(`- Public: ${stats.publicTracks}`);
console.log(`- Private: ${stats.privateTracks}`);
console.log(`- Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`- Total plays: ${stats.totalPlays}`);
console.log(`- Compressed: ${stats.compressed}`);
```

### Compression Savings

Calculate bandwidth savings from compression:

```typescript
const compressedTracks = allTracks.filter(t => t.compression_applied);

const savings = compressedTracks.reduce((total, track) => {
  const original = track.original_file_size || 0;
  const compressed = track.file_size || 0;
  return total + (original - compressed);
}, 0);

console.log(`Compression saved: ${(savings / 1024 / 1024).toFixed(2)} MB`);
```

### Most Popular Tracks

Find your most played tracks:

```typescript
const popularTracks = allTracks
  .sort((a, b) => b.play_count - a.play_count)
  .slice(0, 10);

console.log('Top 10 tracks:');
popularTracks.forEach((track, index) => {
  console.log(`${index + 1}. ${track.title} (${track.play_count} plays)`);
});
```

## Best Practices

### Organization

1. **Use descriptive titles** for easy identification
2. **Add genres** to categorize tracks
3. **Use consistent tags** for filtering
4. **Write descriptions** for context
5. **Review library regularly** to remove unused tracks

### Privacy

1. **Default to private** for work-in-progress tracks
2. **Make public** only when ready to share
3. **Review public tracks** periodically
4. **Consider licensing** before making public

### Maintenance

1. **Delete unused tracks** to save storage
2. **Update metadata** to keep library organized
3. **Check compression** to optimize bandwidth
4. **Monitor play counts** to identify popular tracks

### Performance

1. **Paginate large libraries** for better performance
2. **Cache frequently accessed tracks** in UI
3. **Lazy load track details** when needed
4. **Use indexes** for filtering and sorting

## Advanced Features

### Bulk Operations

Perform operations on multiple tracks:

```typescript
async function bulkUpdateTracks(
  trackIds: string[],
  updates: Partial<TrackFormData>
): Promise<void> {
  for (const trackId of trackIds) {
    await updateTrack(trackId, updates);
  }
}

// Add genre to multiple tracks
await bulkUpdateTracks(
  ['track-id-1', 'track-id-2', 'track-id-3'],
  { genre: 'Electronic' }
);
```

### Track Search

Search tracks by title or description:

```typescript
function searchTracks(tracks: Track[], query: string): Track[] {
  const lowerQuery = query.toLowerCase();
  return tracks.filter(track =>
    track.title.toLowerCase().includes(lowerQuery) ||
    track.description?.toLowerCase().includes(lowerQuery) ||
    track.tags?.toLowerCase().includes(lowerQuery)
  );
}

const results = searchTracks(allTracks, 'ambient');
```

### Export Library

Export track metadata to JSON:

```typescript
async function exportLibrary(userId: string): Promise<string> {
  const tracks = await getUserTracks(userId, true);
  
  const exportData = tracks.map(track => ({
    title: track.title,
    description: track.description,
    genre: track.genre,
    tags: track.tags,
    duration: track.duration,
    created_at: track.created_at,
  }));
  
  return JSON.stringify(exportData, null, 2);
}

const json = await exportLibrary(userId);
console.log(json);
```

## Troubleshooting

### Track Not Found

If `getTrack()` returns null:

1. Verify track ID is correct
2. Check user has access (RLS policies)
3. Confirm track wasn't deleted
4. Check database connection

### Update Failed

If `updateTrack()` returns false:

1. Verify user owns the track
2. Check update data is valid
3. Confirm database connection
4. Review RLS policies

### Delete Failed

If `deleteTrack()` returns false:

1. Verify user owns the track
2. Check for database constraints
3. Confirm database connection
4. Review error logs

## Examples

### Complete Library Management

```typescript
// Get all tracks
const tracks = await getUserTracks(userId, true);

// Update a track
await updateTrack(tracks[0].id, {
  title: 'Updated Title',
  is_public: true,
});

// Create post from track
await createAudioPost(userId, tracks[0].id, 'Check this out!');

// Add to playlist
await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: tracks[0].id,
});

// Delete old track
await deleteTrack(tracks[tracks.length - 1].id);
```

### Library Dashboard

```typescript
async function getLibraryDashboard(userId: string) {
  const tracks = await getUserTracks(userId, true);
  
  return {
    totalTracks: tracks.length,
    publicTracks: tracks.filter(t => t.is_public).length,
    privateTracks: tracks.filter(t => !t.is_public).length,
    totalSize: tracks.reduce((sum, t) => sum + (t.file_size || 0), 0),
    totalPlays: tracks.reduce((sum, t) => sum + t.play_count, 0),
    recentTracks: tracks.slice(0, 5),
    popularTracks: tracks.sort((a, b) => b.play_count - a.play_count).slice(0, 5),
  };
}

const dashboard = await getLibraryDashboard(userId);
console.log('Library Dashboard:', dashboard);
```

## Related Documentation

- [Track Management Overview](../README.md)
- [Track Upload Guide](./guide-upload.md)
- [API Reference](../../../api/tracks.md)
- [Migration Guide](../../../migrations/tracks-posts-separation.md)

---

*Last Updated: January 2025*  
*Version: 1.0*

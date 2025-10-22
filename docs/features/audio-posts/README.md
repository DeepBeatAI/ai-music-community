# Audio Posts Feature

## Overview

Audio posts are social media posts that include audio content. In the AI Music Community Platform, audio posts reference tracks from the tracks table, enabling track reuse and better content organization.

**Status:** ✅ Active  
**Version:** 2.0 (Updated with tracks-posts separation)  
**Last Updated:** January 2025

---

## Key Concepts

### Audio Posts vs Tracks

- **Tracks**: Reusable audio assets stored in the `tracks` table with metadata (title, duration, file URL, etc.)
- **Audio Posts**: Social media posts that reference a track via `track_id` foreign key
- **Separation**: Posts contain social context (caption, likes, comments), while tracks contain audio metadata

### Benefits of Separation

1. **Track Reuse**: Same track can be referenced by multiple posts
2. **Track Libraries**: Users can upload tracks without creating posts
3. **Direct Playlist Management**: Tracks can be added to playlists without posts
4. **Better Organization**: Clear separation between social content and audio assets

---

## Creating Audio Posts

### Two-Step Process

Audio posts now require a two-step process:

#### Step 1: Upload Track

```typescript
import { uploadTrack } from '@/lib/tracks';

const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'My New Track',
  description: 'A great track',
  is_public: true,
});

if (!result.success) {
  console.error('Upload failed:', result.error);
  return;
}

const trackId = result.track.id;
```

#### Step 2: Create Post

```typescript
import { createAudioPost } from '@/utils/posts';

const post = await createAudioPost(
  userId,
  trackId,
  'Check out my new track! 🎵'
);
```

### Complete Example

```typescript
// Upload audio file
const uploadResult = await uploadTrack(userId, {
  file: audioFile,
  title: 'Ambient Dreams',
  description: 'A relaxing ambient track',
  genre: 'Ambient',
  tags: 'ambient, meditation, relaxing',
  is_public: true,
});

if (uploadResult.success) {
  // Create post with track
  const post = await createAudioPost(
    userId,
    uploadResult.track.id,
    'Just released my new ambient track! Perfect for meditation 🧘‍♀️'
  );
  
  console.log('Post created:', post.id);
  console.log('Track URL:', post.track?.file_url);
}
```

---

## Accessing Audio Data

### From Post Object

Audio data is accessed via the joined `track` object:

```typescript
// Fetch posts with track data
const { posts } = await fetchPosts(1, 15, userId);

posts.forEach(post => {
  if (post.post_type === 'audio') {
    console.log('Track title:', post.track?.title);
    console.log('Track URL:', post.track?.file_url);
    console.log('Duration:', post.track?.duration);
    console.log('File size:', post.track?.file_size);
  }
});
```

### Backward Compatibility

During the transition period, posts table retains deprecated `audio_*` columns:

```typescript
// OLD (deprecated)
const audioUrl = post.audio_url;
const duration = post.audio_duration;

// NEW (recommended)
const audioUrl = post.track?.file_url;
const duration = post.track?.duration;
```

**Note:** The `audio_*` columns will be removed in a future release. Use `post.track` instead.

---

## Track Reuse

### Multiple Posts with Same Track

The same track can be referenced by multiple posts:

```typescript
// Upload track once
const { track } = await uploadTrack(userId, trackData);

// Create multiple posts with same track
const post1 = await createAudioPost(
  userId,
  track.id,
  'First post about this track'
);

const post2 = await createAudioPost(
  userId,
  track.id,
  'Sharing this track again with a different caption'
);

// Both posts reference the same track
console.log(post1.track_id === post2.track_id); // true
```

### Benefits

- **Storage Efficiency**: Audio file stored once, referenced multiple times
- **Consistency**: Updates to track metadata reflected in all posts
- **Flexibility**: Different captions/contexts for same audio content

---

## Permissions

### Track Access Control

When creating audio posts, users can reference:

1. **Their own tracks** (public or private)
2. **Public tracks from other users**

Users **cannot** reference:
- Private tracks from other users

### Validation

The `createAudioPost()` function validates track access:

```typescript
// Verify track exists and user has permission
const { data: track } = await supabase
  .from('tracks')
  .select('id, user_id, is_public')
  .eq('id', trackId)
  .single();

if (!track) {
  throw new Error('Track not found');
}

if (track.user_id !== userId && !track.is_public) {
  throw new Error('You do not have permission to use this track');
}
```

---

## Database Schema

### Posts Table

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
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

-- Index for track lookups
CREATE INDEX idx_posts_track_id ON posts(track_id);
```

### Relationships

- `posts.track_id` → `tracks.id` (foreign key with SET NULL on delete)
- `posts.user_id` → `auth.users.id` (foreign key)

---

## API Functions

### createAudioPost()

Create an audio post that references a track.

```typescript
function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post>
```

**Parameters:**
- `userId`: User creating the post
- `trackId`: ID of track to reference (must exist in tracks table)
- `caption`: Optional caption/description for the post

**Returns:** Promise resolving to created post with joined track data

**Throws:**
- Error if track doesn't exist
- Error if user doesn't have permission to use track

### fetchPosts()

Fetch posts with track data for audio posts.

```typescript
function fetchPosts(
  page: number,
  limit: number,
  userId?: string
): Promise<{ posts: PostWithProfile[]; hasMore: boolean }>
```

**Returns:** Posts with joined track data via `post.track`

### updatePost()

Update post content/caption.

```typescript
function updatePost(
  postId: string,
  content: string,
  userId: string,
  postType?: 'text' | 'audio'
): Promise<UpdatePostResult>
```

**Note:** For audio posts, this updates the caption only. The track reference cannot be changed after post creation.

---

## Migration from Old Structure

### Before (Audio in Posts)

```typescript
// Old approach - audio data stored in posts table
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

---

## Related Documentation

- [Track Management](../tracks/README.md) - Complete track management guide
- [Track Upload Guide](../tracks/guides/guide-upload.md) - Detailed upload process
- [Track Library Guide](../tracks/guides/guide-library.md) - Managing track libraries
- [Migration Guide](../../migrations/tracks-posts-separation.md) - Migration details
- [API Reference](../../api/tracks.md) - Complete API documentation

---

## Support

For issues or questions:

1. Check the [Track Management documentation](../tracks/README.md)
2. Review the [Migration Guide](../../migrations/tracks-posts-separation.md)
3. Consult the [API Reference](../../api/tracks.md)
4. Contact support with error details

---

*Last Updated: January 2025*  
*Version: 2.0*

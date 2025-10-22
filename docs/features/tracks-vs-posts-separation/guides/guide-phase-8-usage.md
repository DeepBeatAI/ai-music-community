# Phase 8 Implementation Guide: Using the New Features

## Quick Reference

This guide shows you how to use the new features added in Phase 8 of the tracks-posts separation.

## 1. Error Handling

### Basic Usage

```typescript
import { uploadTrack } from '@/lib/tracks';
import { getUserFriendlyErrorMessage } from '@/lib/trackErrorHandling';

async function handleUpload(file: File) {
  const result = await uploadTrack(userId, {
    file,
    title: 'My Track',
    is_public: true,
  });

  if (!result.success) {
    // Show user-friendly error message
    toast.error(result.error);
    
    // Log technical details for debugging
    console.error('Upload failed:', result.errorCode, result.details);
    
    return;
  }

  // Success!
  console.log('Track uploaded:', result.track);
}
```

### With Retry Logic

```typescript
import { retryTrackOperation } from '@/lib/trackErrorHandling';

async function uploadWithRetry(file: File) {
  try {
    const result = await retryTrackOperation(
      () => uploadTrack(userId, { file, title: 'My Track', is_public: true }),
      { maxAttempts: 3, delayMs: 1000 },
      (attempt) => {
        console.log(`Retry attempt ${attempt}`);
        toast.info(`Retrying upload... (${attempt}/3)`);
      }
    );
    
    return result;
  } catch (error) {
    toast.error('Upload failed after 3 attempts');
    throw error;
  }
}
```

### Validation Before Upload

```typescript
import { validateTrackUpload } from '@/lib/trackErrorHandling';

function handleFileSelect(file: File, title: string) {
  // Validate before attempting upload
  const validation = validateTrackUpload(file, title);
  
  if (!validation.success) {
    // Show validation error immediately
    toast.error(validation.error?.userMessage);
    return;
  }

  // Proceed with upload
  uploadTrack(userId, { file, title, is_public: true });
}
```

### Progress Tracking

```typescript
import { createProgressTracker } from '@/lib/trackErrorHandling';

function uploadWithProgress(file: File) {
  const progress = createProgressTracker((p) => {
    console.log(`${p.stage}: ${p.percentage}%`);
    setUploadProgress(p.percentage);
    setUploadMessage(p.message);
  });

  progress.validating();
  // ... validation
  
  progress.compressing(25);
  // ... compression
  
  progress.uploading(50);
  // ... upload
  
  progress.saving();
  // ... save to database
  
  progress.complete();
}
```

## 2. Backward Compatibility Layer

### Accessing Audio Data (Old vs New)

```typescript
import { getAudioDataFromPost } from '@/lib/compatibility';

// Works with both old and new post structures
function displayAudioPost(post: Post) {
  const audioData = getAudioDataFromPost(post);
  
  return (
    <div>
      <h3>{audioData.title}</h3>
      <audio src={audioData.url} />
      <p>Duration: {audioData.duration}s</p>
      <p>Size: {audioData.fileSize} bytes</p>
    </div>
  );
}
```

### Migration Status Checking

```typescript
import { checkPostMigrationStatus, checkBatchMigrationStatus } from '@/lib/compatibility';

// Check single post
function checkPost(post: Post) {
  const status = checkPostMigrationStatus(post);
  
  if (!status.isMigrated) {
    console.warn('Post needs migration:', status.reason);
  }
}

// Check multiple posts
function checkPosts(posts: Post[]) {
  const summary = checkBatchMigrationStatus(posts);
  
  console.log(`Migration progress: ${summary.migrationPercentage.toFixed(1)}%`);
  console.log(`Migrated: ${summary.migratedCount}/${summary.totalAudioPosts}`);
  
  // Show posts that need migration
  summary.details
    .filter(d => !d.status.isMigrated)
    .forEach(d => {
      console.log(`Post ${d.postId}: ${d.status.reason}`);
    });
}
```

### Type Guards

```typescript
import { isAudioPost, hasTrackData } from '@/lib/compatibility';

function renderPost(post: Post) {
  if (isAudioPost(post)) {
    // TypeScript knows post.post_type === 'audio'
    if (hasTrackData(post)) {
      // TypeScript knows post.track is defined
      return <AudioPlayer track={post.track} />;
    }
  }
  
  return <TextPost content={post.content} />;
}
```

## 3. Database Helper Functions

### Get Track Usage Statistics

```sql
-- Find how many posts and playlists use a track
SELECT * FROM get_track_usage_stats('track-uuid-here');

-- Returns:
-- post_count | playlist_count | total_usage
-- -----------+----------------+-------------
--          3 |              2 |           5
```

### Find Orphaned Tracks

```sql
-- Find tracks not used in any posts or playlists (user library tracks)
SELECT * FROM find_orphaned_tracks();

-- Returns tracks that are only in user's library
-- track_id | title | user_id | created_at
```

### Usage in Application

```typescript
// Get track usage stats
const { data } = await supabase.rpc('get_track_usage_stats', {
  track_uuid: trackId
});

console.log(`Track used in ${data.post_count} posts and ${data.playlist_count} playlists`);

// Find orphaned tracks
const { data: orphanedTracks } = await supabase.rpc('find_orphaned_tracks');
console.log(`Found ${orphanedTracks.length} tracks in user libraries`);
```

## 4. Error Display Components

### Creating Error Display

```typescript
import { createErrorDisplay } from '@/lib/trackErrorHandling';

function ErrorMessage({ error }: { error: TrackErrorDetails }) {
  const display = createErrorDisplay(error);
  
  return (
    <div className={`alert alert-${display.severity}`}>
      <h3>{display.title}</h3>
      <p>{display.message}</p>
      {display.action && <p className="text-sm">{display.action}</p>}
      {display.retryable && (
        <button onClick={handleRetry}>Try Again</button>
      )}
    </div>
  );
}
```

### User-Friendly Error Messages

```typescript
import { getUserFriendlyErrorMessage } from '@/lib/trackErrorHandling';

try {
  await uploadTrack(userId, data);
} catch (error) {
  // Automatically converts any error to user-friendly message
  const message = getUserFriendlyErrorMessage(error);
  toast.error(message);
}
```

## 5. Formatting Utilities

### File Size Formatting

```typescript
import { formatFileSize } from '@/lib/trackErrorHandling';

console.log(formatFileSize(1024));        // "1.0 KB"
console.log(formatFileSize(1048576));     // "1.0 MB"
console.log(formatFileSize(2500000));     // "2.4 MB"
```

### Duration Formatting

```typescript
import { formatDuration } from '@/lib/trackErrorHandling';

console.log(formatDuration(45));    // "0:45"
console.log(formatDuration(125));   // "2:05"
console.log(formatDuration(3665));  // "61:05"
```

## 6. Testing

### Running Integration Tests

```bash
# Run all integration tests
npm test -- tracks-posts-separation.test.ts

# Run specific test suite
npm test -- tracks-posts-separation.test.ts -t "Complete Upload"

# Run with coverage
npm test -- tracks-posts-separation.test.ts --coverage
```

### Writing Custom Tests

```typescript
import { uploadTrack, getTrack } from '@/lib/tracks';
import { createMockAudioFile } from '@/__tests__/helpers';

describe('My Custom Tests', () => {
  it('should upload and retrieve track', async () => {
    const file = createMockAudioFile('test.mp3');
    const result = await uploadTrack(userId, {
      file,
      title: 'Test Track',
      is_public: true,
    });

    expect(result.success).toBe(true);
    
    const track = await getTrack(result.track!.id);
    expect(track?.title).toBe('Test Track');
  });
});
```

## 7. Migration Verification

### Check Migration Status

```sql
-- Verify migration ran successfully
SELECT * FROM migration_log WHERE migration_name = '004_finalize_tracks_posts_separation';

-- Check all audio posts have track_id
SELECT COUNT(*) as orphaned_posts
FROM posts
WHERE post_type = 'audio' AND track_id IS NULL;
-- Should return 0

-- Check all constraints exist
SELECT conname FROM pg_constraint 
WHERE conname IN (
  'audio_posts_must_have_track',
  'track_title_not_empty',
  'track_title_max_length'
);
```

### Verify Indexes

```sql
-- Check all indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'tracks'
ORDER BY indexname;

-- Should include:
-- idx_tracks_created_at
-- idx_tracks_genre
-- idx_tracks_is_public
-- idx_tracks_title_trgm
-- idx_tracks_user_id
-- idx_tracks_user_public
```

## 8. Common Patterns

### Upload with Full Error Handling

```typescript
async function uploadTrackWithFullHandling(file: File, title: string) {
  // 1. Validate
  const validation = validateTrackUpload(file, title);
  if (!validation.success) {
    toast.error(validation.error?.userMessage);
    return null;
  }

  // 2. Upload with retry
  try {
    const result = await retryTrackOperation(
      () => uploadTrack(userId, { file, title, is_public: true }),
      { maxAttempts: 3 },
      (attempt) => toast.info(`Retrying... (${attempt}/3)`)
    );

    if (!result.success) {
      toast.error(result.error);
      return null;
    }

    // 3. Success
    toast.success('Track uploaded successfully!');
    return result.track;
  } catch (error) {
    toast.error(getUserFriendlyErrorMessage(error));
    return null;
  }
}
```

### Gradual Migration from Old to New

```typescript
// Step 1: Use compatibility layer
import { getAudioDataFromPost } from '@/lib/compatibility';

function AudioPostOld(post: Post) {
  const audio = getAudioDataFromPost(post); // Works with both
  return <audio src={audio.url} />;
}

// Step 2: Migrate to new structure
function AudioPostNew(post: Post) {
  if (!post.track) return null;
  return <audio src={post.track.file_url} />;
}

// Step 3: Remove compatibility layer usage
```

## Best Practices

1. **Always validate before upload**: Use `validateTrackUpload()` to catch errors early
2. **Use retry logic for uploads**: Network issues are common, retry automatically
3. **Show user-friendly errors**: Use `getUserFriendlyErrorMessage()` for all errors
4. **Track progress**: Use `createProgressTracker()` for better UX
5. **Check migration status**: Use compatibility layer during transition period
6. **Log errors properly**: Use `logTrackError()` for debugging
7. **Test error scenarios**: Write tests for all error paths
8. **Monitor performance**: Check query times stay under 100ms

## Troubleshooting

### Upload Fails with "FILE_TOO_LARGE"
- Check file size: `console.log(file.size / 1024 / 1024, 'MB')`
- Compress file before upload
- Split large files if necessary

### Upload Fails with "STORAGE_FAILED"
- Check internet connection
- Verify Supabase storage bucket exists
- Check storage quota
- Retry with exponential backoff

### Posts Missing Track Data
- Verify migration ran: Check `migration_log` table
- Check post has `track_id`: `SELECT track_id FROM posts WHERE id = ?`
- Verify track exists: `SELECT * FROM tracks WHERE id = ?`
- Check RLS policies allow access

### Performance Issues
- Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'tracks'`
- Check query plans: `EXPLAIN ANALYZE SELECT ...`
- Monitor slow queries
- Consider adding more indexes if needed

---

**Last Updated**: January 22, 2025  
**Phase**: 8 - Final Database Constraints and Cleanup  
**Status**: Production Ready

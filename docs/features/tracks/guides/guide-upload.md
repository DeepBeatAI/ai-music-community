# Track Upload Guide

## Overview

This guide explains how to upload audio tracks to the AI Music Community Platform. The upload process includes automatic compression, metadata storage, and error handling.

## Prerequisites

- User must be authenticated
- Audio file must be in supported format (MP3, WAV, FLAC)
- File size must be under 50MB

## Upload Process

### Step 1: Prepare Track Data

```typescript
import { uploadTrack } from '@/lib/tracks';

const trackData = {
  file: audioFile, // File object from input
  title: 'My New Track',
  description: 'A great track I made',
  genre: 'Electronic',
  tags: 'ambient, chill, instrumental',
  is_public: true, // Make track publicly visible
};
```

### Step 2: Upload Track

```typescript
const result = await uploadTrack(userId, trackData);

if (result.success) {
  console.log('Track uploaded successfully!');
  console.log('Track ID:', result.track.id);
  console.log('Track URL:', result.track.file_url);
  
  // Check compression info
  if (result.compressionInfo) {
    console.log('Original size:', result.compressionInfo.originalSize);
    console.log('Compressed size:', result.compressionInfo.compressedSize);
    console.log('Compression ratio:', result.compressionInfo.compressionRatio);
  }
} else {
  console.error('Upload failed:', result.error);
  console.error('Error code:', result.errorCode);
}
```

### Step 3: Create Post (Optional)

After uploading a track, you can optionally create a post:

```typescript
import { createAudioPost } from '@/utils/posts';

const post = await createAudioPost(
  userId,
  result.track.id,
  'Check out my new track! 🎵'
);
```

Or add directly to a playlist:

```typescript
import { addTrackToPlaylist } from '@/lib/playlists';

await addTrackToPlaylist({
  playlist_id: playlistId,
  track_id: result.track.id,
});
```

## Upload Flow Diagram

```
User selects audio file
         │
         ▼
Validate file (size, format)
         │
         ▼
Apply audio compression
         │
         ├─ Success → Use compressed file
         └─ Failure → Use original file
         │
         ▼
Upload to Supabase Storage
         │
         ▼
Create track record in database
         │
         ▼
Track compression analytics
         │
         ▼
Return track data to user
```

## Compression Details

### Automatic Compression

The upload process automatically compresses audio files to reduce bandwidth costs:

1. **Compression Settings**: Automatically determined based on file type
2. **Quality**: Medium quality (good balance of size and quality)
3. **Bitrate**: Typically 128-192 kbps for compressed files
4. **Fallback**: Uses original file if compression fails or doesn't reduce size

### Compression Metadata

Compression information is stored with each track:

```typescript
interface CompressionInfo {
  originalSize: number;        // Original file size in bytes
  compressedSize: number;      // Compressed file size in bytes
  compressionRatio: number;    // Ratio (e.g., 2.5 = 2.5x smaller)
  compressionApplied: boolean; // Whether compression was used
  bitrate?: string;            // Compressed bitrate
  originalBitrate?: string;    // Original bitrate
}
```

### Compression Benefits

- **Reduced Storage Costs**: 2-5x smaller files on average
- **Faster Uploads**: Smaller files upload faster
- **Lower Bandwidth**: Reduced egress costs
- **Better Performance**: Faster audio loading for users

## Error Handling

### Common Errors

#### FILE_TOO_LARGE

**Error**: "File size exceeds 50MB limit"

**Solution**: 
- Compress the file before uploading
- Use a lower bitrate or sample rate
- Split long tracks into multiple parts

#### INVALID_FORMAT

**Error**: "Invalid audio format. Supported: MP3, WAV, FLAC"

**Solution**:
- Convert file to supported format
- Check file extension matches actual format
- Ensure file is not corrupted

#### STORAGE_FAILED

**Error**: "Failed to upload file to storage"

**Solution**:
- Check internet connection
- Retry the upload
- Contact support if issue persists

#### DATABASE_FAILED

**Error**: "Failed to create track record"

**Solution**:
- Check database connection
- Verify user permissions
- Contact support with error details

#### NETWORK_ERROR

**Error**: "Network error occurred during upload"

**Solution**:
- Check internet connection
- Retry the upload
- Try again later if server is down

### Retry Logic

The upload function includes automatic retry logic for storage uploads:

- **Max Attempts**: 3
- **Delay**: 1 second between retries
- **Exponential Backoff**: Not implemented (constant delay)

### Error Response Format

```typescript
interface TrackUploadResult {
  success: boolean;
  track?: Track;
  error?: string;
  errorCode?: TrackUploadError;
  details?: any;
  compressionInfo?: CompressionInfo;
}
```

## Validation

### File Validation

Before upload, files are validated for:

1. **Size**: Must be ≤ 50MB
2. **Format**: Must be MP3, WAV, or FLAC
3. **Title**: Must be non-empty

### Metadata Validation

Track metadata is validated:

- **Title**: Required, max 255 characters
- **Description**: Optional, no length limit
- **Genre**: Optional, free text
- **Tags**: Optional, comma-separated
- **is_public**: Boolean, defaults to true

## Best Practices

### File Preparation

1. **Use MP3 format** for best compatibility
2. **Normalize audio levels** before upload
3. **Add ID3 tags** for better metadata
4. **Test playback** before uploading

### Metadata

1. **Use descriptive titles** for better discoverability
2. **Add relevant tags** for search optimization
3. **Include genre** for categorization
4. **Write clear descriptions** for context

### Privacy

1. **Set is_public appropriately**:
   - `true`: Track visible to all users
   - `false`: Track only visible to you
2. **Consider licensing** before making public
3. **Review content** before publishing

### Performance

1. **Upload during off-peak hours** for faster speeds
2. **Use wired connection** for large files
3. **Close other applications** to free bandwidth
4. **Monitor upload progress** for issues

## Advanced Usage

### Batch Upload

Upload multiple tracks in sequence:

```typescript
async function uploadMultipleTracks(userId: string, files: File[]) {
  const results = [];
  
  for (const file of files) {
    const result = await uploadTrack(userId, {
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      is_public: true,
    });
    
    results.push(result);
    
    // Add delay between uploads to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
```

### Progress Tracking

Track upload progress (requires custom implementation):

```typescript
function uploadWithProgress(
  userId: string,
  trackData: TrackUploadData,
  onProgress: (percent: number) => void
) {
  // Implementation would require modifying uploadTrack
  // to emit progress events during upload
}
```

### Custom Compression Settings

Currently, compression settings are automatic. Future versions may support custom settings:

```typescript
// Future API (not yet implemented)
const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  compressionSettings: {
    quality: 'high',
    bitrate: 256,
    format: 'mp3',
  },
});
```

## Troubleshooting

### Upload Hangs

If upload appears to hang:

1. Check browser console for errors
2. Verify internet connection
3. Try smaller file first
4. Clear browser cache
5. Try different browser

### Compression Issues

If compression fails repeatedly:

1. Check file format is supported
2. Verify file is not corrupted
3. Try uploading without compression (future feature)
4. Contact support with file details

### Database Errors

If track record creation fails:

1. Check user authentication
2. Verify database connection
3. Check RLS policies
4. Contact support with error details

## Examples

### Basic Upload

```typescript
const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'My Track',
  is_public: true,
});
```

### Upload with Full Metadata

```typescript
const result = await uploadTrack(userId, {
  file: audioFile,
  title: 'Ambient Dreams',
  description: 'A relaxing ambient track perfect for meditation',
  genre: 'Ambient',
  tags: 'ambient, meditation, relaxing, instrumental',
  is_public: true,
});
```

### Upload and Create Post

```typescript
// Upload track
const uploadResult = await uploadTrack(userId, {
  file: audioFile,
  title: 'My New Track',
  is_public: true,
});

if (uploadResult.success) {
  // Create post
  const post = await createAudioPost(
    userId,
    uploadResult.track.id,
    'Just released my new track! Let me know what you think 🎵'
  );
  
  console.log('Post created:', post.id);
}
```

### Upload and Add to Playlist

```typescript
// Upload track
const uploadResult = await uploadTrack(userId, {
  file: audioFile,
  title: 'My New Track',
  is_public: false, // Keep private
});

if (uploadResult.success) {
  // Add to playlist
  await addTrackToPlaylist({
    playlist_id: myPlaylistId,
    track_id: uploadResult.track.id,
  });
  
  console.log('Track added to playlist');
}
```

## Related Documentation

- [Track Management Overview](../README.md)
- [Track Library Guide](./guide-library.md)
- [API Reference](../../../api/tracks.md)
- [Error Handling Guide](./guide-errors.md)

---

*Last Updated: January 2025*  
*Version: 1.0*

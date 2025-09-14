# Server-Side Audio Compression Setup Guide

## 🎯 Overview
This implements **real audio compression** using FFmpeg server-side processing that:
- ✅ **Preserves full audio content** (no truncation or missing parts)
- ✅ **Reduces file size** through professional bitrate reduction
- ✅ **Maintains audio quality** using industry-standard algorithms
- ✅ **Uploads to Supabase** automatically after compression

## 📋 Prerequisites & Installation

### 1. Install Dependencies
```bash
cd client
npm install fluent-ffmpeg @types/fluent-ffmpeg multer @types/multer
```

### 2. Install FFmpeg System Binary

**Windows:**
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH environment variable
4. Verify installation: `ffmpeg -version`

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### 3. Environment Variables
Add to your `.env.local`:
```env
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: FFmpeg path (if not in system PATH)
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

## 🚀 How It Works

### API Endpoint: `/api/audio/compress`
- **Input:** Audio file + compression options
- **Processing:** FFmpeg converts to lower bitrate MP3
- **Output:** Compressed file + Supabase URL

### Compression Process:
1. **Upload** audio file via form data
2. **Save** to temporary file on server
3. **Process** with FFmpeg (bitrate reduction)
4. **Upload** compressed result to Supabase storage
5. **Return** compression statistics and URL

### Quality Levels:
- **HIGH:** 160-256kbps (15MB+ threshold)
- **MEDIUM:** 112-192kbps (10MB+ threshold)  
- **LOW:** 80-128kbps (5MB+ threshold)

## 🧪 Testing

### 1. Test the Implementation
Navigate to: `http://localhost:3000/test-audio-compression`

### 2. Expected Results
```
🎵 Testing SERVER-SIDE compression: song.mp3
Original size: 21.43 MB

📊 Testing MEDIUM quality compression:
Preview - Should compress: true
Preview - Target bitrate: 128k
🔄 Performing actual compression with FFmpeg...

Results:
  - Success: true
  - Original: 21.43 MB
  - Compressed: 8.15 MB
  - Compression ratio: 2.63x
  - Duration: 185.4 seconds (FULL DURATION PRESERVED)
  - Bitrate: 128k
  - Supabase URL: Generated ✅

🎉 REAL compression achieved! Full audio preserved with 128k bitrate
```

### 3. Quality Verification
- ✅ **File size reduced** (typically 2-4x compression)
- ✅ **Duration preserved** (no missing audio parts)
- ✅ **Audio playable** (proper MP3 format maintained)
- ✅ **Supabase upload** (ready for production use)

## 🔧 Integration with Your App

### 1. Replace Client-Side Compression
Update your audio upload components to use:
```typescript
import { serverAudioCompressor } from '@/utils/serverAudioCompression';

// In your upload handler
const result = await serverAudioCompressor.compressAudio(audioFile, {
  quality: 'medium'
});

if (result.success) {
  // Use result.supabaseUrl for the compressed file
  console.log(`Compressed: ${result.compressionRatio.toFixed(2)}x reduction`);
  console.log(`URL: ${result.supabaseUrl}`);
}
```

### 2. Add to Post Creation Flow
```typescript
// In your post creation component
const handleAudioUpload = async (file: File) => {
  // Get recommended compression settings
  const options = serverAudioCompressor.getRecommendedSettings(file);
  
  // Compress the audio
  const result = await serverAudioCompressor.compressAudio(file, options);
  
  if (result.success) {
    // Save post with compressed audio URL
    await createPost({
      audio_url: result.supabaseUrl,
      audio_file_size: result.compressedSize,
      audio_duration: result.duration
    });
  }
};
```

## 📊 Production Considerations

### Performance
- **Processing Time:** 30-60 seconds for large files
- **Server Resources:** CPU intensive during compression
- **Storage:** Temporary files cleaned up automatically

### Scalability
- Consider **queue system** for high volume
- Use **dedicated compression workers** for production
- Implement **progress tracking** for long compressions

### Error Handling
- **FFmpeg failures** fall back gracefully
- **Temporary file cleanup** always runs
- **Supabase upload errors** properly reported

## 🔒 Security Notes

- **File validation** ensures audio files only
- **Temporary files** stored in secure system temp directory
- **File size limits** can be configured per quality level
- **Service role key** used for Supabase uploads

## 🎯 Benefits Over Client-Side Compression

1. **Real Compression:** Uses professional FFmpeg algorithms
2. **Full Audio Preserved:** No truncation or missing parts
3. **Consistent Results:** Server processing ensures reliability
4. **Better Quality:** Advanced encoding options available
5. **No Browser Limitations:** Full codec support

## ⚠️ Important Notes

- **FFmpeg Required:** Must be installed on server/deployment environment
- **Processing Time:** Real compression takes time (worth the quality)
- **Server Resources:** CPU-intensive operation
- **Vercel Limitations:** May need serverless function timeout adjustments

This implementation provides **production-ready audio compression** that maintains professional quality while significantly reducing file sizes.

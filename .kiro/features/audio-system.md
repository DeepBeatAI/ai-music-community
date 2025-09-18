# Audio System Feature Specification

## Feature Overview
**Feature Name:** Comprehensive Audio Handling System  
**Priority:** High (Core MVP Feature)  
**Status:** Partially Implemented (Basic upload/playback complete)  
**Complexity:** High  
**Dependencies:** Supabase Storage, FFmpeg, Wavesurfer.js  

## Business Context

### Problem Statement
AI music creators need a dedicated platform to share, discover, and showcase their creations with proper audio quality, visualization, and metadata support. Current general music platforms don't cater specifically to AI-generated content or provide the specialized tools creators need.

### Success Criteria
- **User Adoption:** 80% of creators successfully upload and share audio content
- **Quality Experience:** 95% successful audio playback attempts across devices
- **Performance:** Audio streaming starts within 2 seconds on average
- **Storage Efficiency:** 60-80% file size reduction through compression without quality loss

## User Stories & Acceptance Criteria

### Epic: Audio Upload & Processing

#### US-001: Audio File Upload
**As a** music creator  
**I want to** upload audio files to the platform  
**So that** I can share my AI-generated music with the community  

**Acceptance Criteria:**
- [x] Support for MP3, WAV, FLAC formats
- [x] Maximum file size: 50MB per track
- [x] Real-time upload progress indication
- [ ] Drag-and-drop upload interface
- [ ] Multiple file upload support (batch upload)
- [ ] Upload cancellation capability
- [x] Automatic file validation (type, size, content)
- [x] Error handling with clear user feedback
- [ ] Mobile upload support (camera roll access)
- [x] Metadata extraction (title, duration, artist)

**Technical Requirements:**
```typescript
interface AudioUploadRequest {
  file: File
  title?: string
  description?: string
  aiTool?: string
  aiToolVersion?: string
  tags?: string[]
  isPublic: boolean
}

interface AudioUploadResponse {
  id: string
  url: string
  duration: number
  size: number
  format: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
}
```

#### US-002: Audio Processing Pipeline
**As a** platform administrator  
**I want to** automatically process uploaded audio files  
**So that** storage costs are optimized and playback quality is consistent  

**Acceptance Criteria:**
- [x] Automatic compression to reduce file size
- [ ] Volume normalization across all tracks
- [x] Format standardization (convert to MP3 for web)
- [x] Waveform data generation for visualization
- [ ] Duplicate detection and prevention
- [ ] Audio quality analysis and reporting
- [ ] Processing status tracking and notifications
- [x] Error handling for corrupted files
- [ ] Batch processing for multiple uploads
- [ ] Processing queue management

**Technical Implementation:**
```typescript
interface AudioProcessingJob {
  id: string
  originalUrl: string
  userId: string
  compressionSettings: {
    bitrate: 128 | 192 | 256 | 320
    format: 'mp3' | 'aac'
    quality: 'low' | 'medium' | 'high'
    normalize: boolean
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processedUrl?: string
  waveformData?: number[]
  metadata: AudioMetadata
  processingStarted?: Date
  processingCompleted?: Date
  error?: string
}
```

### Epic: Audio Playback & Visualization

#### US-003: Interactive Audio Player
**As a** platform user  
**I want to** play audio tracks with visual waveform feedback  
**So that** I can preview and enjoy the music content effectively  

**Acceptance Criteria:**
- [x] Waveform visualization during playback
- [x] Standard playback controls (play/pause/stop)
- [x] Seek functionality with waveform interaction
- [x] Volume control and mute functionality
- [ ] Playback speed adjustment (0.5x, 1x, 1.25x, 1.5x, 2x)
- [ ] Keyboard shortcuts support (spacebar, arrow keys)
- [x] Mobile-friendly touch controls
- [x] Progress indication and time display
- [ ] Repeat and loop functionality
- [ ] Playlist/queue support
- [ ] Crossfade between tracks (future)

**Player Component Interface:**
```typescript
interface AudioPlayerProps {
  audioUrl: string
  waveformData?: number[]
  autoPlay?: boolean
  showControls?: boolean
  showWaveform?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onSeek?: (time: number) => void
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  loading: boolean
  error?: string
}
```

#### US-004: Continuous Playback Experience
**As a** music enthusiast  
**I want to** experience uninterrupted audio playback while navigating the platform  
**So that** I can discover music without interruption  

**Acceptance Criteria:**
- [ ] Audio continues playing during page navigation
- [ ] Global player component in layout
- [ ] Queue management (next/previous track)
- [ ] Background audio loading and preloading
- [ ] Seamless transition between tracks
- [ ] Player state persistence across sessions
- [ ] Mini player when browsing other content
- [ ] Share current track functionality
- [ ] Add to favorites/playlist from player
- [ ] Social features integration (like from player)

## Technical Architecture

### Audio Storage Strategy
```typescript
// Supabase Storage bucket configuration
const audioStorageConfig = {
  bucket: 'audio-files',
  allowedMimeTypes: [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav', 
    'audio/flac',
    'audio/x-flac'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  publicAccess: false, // Use signed URLs
  cacheControl: '3600', // 1 hour cache
}

// File naming convention
const generateAudioFileName = (userId: string, originalName: string): string => {
  const timestamp = Date.now()
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${userId}/${timestamp}_${sanitizedName}`
}
```

### Audio Processing Pipeline
```typescript
// Server-side audio processing workflow
class AudioProcessor {
  async processAudio(job: AudioProcessingJob): Promise<ProcessingResult> {
    try {
      // 1. Download original file
      const originalFile = await this.downloadFile(job.originalUrl)
      
      // 2. Validate audio file
      await this.validateAudioFile(originalFile)
      
      // 3. Extract metadata
      const metadata = await this.extractMetadata(originalFile)
      
      // 4. Normalize volume
      const normalizedFile = await this.normalizeVolume(originalFile)
      
      // 5. Compress audio
      const compressedFile = await this.compressAudio(normalizedFile, job.compressionSettings)
      
      // 6. Generate waveform data
      const waveformData = await this.generateWaveform(compressedFile)
      
      // 7. Upload processed file
      const processedUrl = await this.uploadProcessedFile(compressedFile)
      
      // 8. Update database
      await this.updateJobStatus(job.id, {
        status: 'completed',
        processedUrl,
        waveformData,
        metadata
      })
      
      return { success: true, processedUrl, waveformData, metadata }
      
    } catch (error) {
      await this.updateJobStatus(job.id, {
        status: 'failed',
        error: error.message
      })
      
      throw error
    }
  }
}
```

### Audio Caching System
```typescript
// Multi-layer audio caching strategy
class AudioCache {
  private memoryCache = new Map<string, string>()
  private indexedDBCache = new IndexedDBCache('audio-cache')
  
  async getCachedAudioUrl(audioUrl: string): Promise<string> {
    // 1. Check memory cache
    if (this.memoryCache.has(audioUrl)) {
      return this.memoryCache.get(audioUrl)!
    }
    
    // 2. Check IndexedDB cache
    const cachedUrl = await this.indexedDBCache.get(audioUrl)
    if (cachedUrl && !this.isExpired(cachedUrl)) {
      this.memoryCache.set(audioUrl, cachedUrl)
      return cachedUrl
    }
    
    // 3. Generate new signed URL
    const signedUrl = await this.generateSignedUrl(audioUrl, 3600) // 1 hour expiry
    
    // 4. Cache in both layers
    this.memoryCache.set(audioUrl, signedUrl)
    await this.indexedDBCache.set(audioUrl, {
      url: signedUrl,
      expiry: Date.now() + 3600 * 1000
    })
    
    return signedUrl
  }
  
  private isExpired(cachedData: CachedUrl): boolean {
    return Date.now() > cachedData.expiry
  }
}
```

### Waveform Generation
```typescript
// Client-side waveform processing
class WaveformGenerator {
  async generateWaveform(audioBuffer: AudioBuffer, width: number = 1000): Promise<number[]> {
    const data = audioBuffer.getChannelData(0) // Get first channel
    const blockSize = Math.floor(data.length / width)
    const waveform: number[] = []
    
    for (let i = 0; i < width; i++) {
      const start = i * blockSize
      const end = start + blockSize
      let sum = 0
      
      for (let j = start; j < end; j++) {
        sum += Math.abs(data[j])
      }
      
      waveform.push(sum / blockSize)
    }
    
    // Normalize waveform data
    const max = Math.max(...waveform)
    return waveform.map(value => value / max)
  }
  
  async processAudioFile(file: File): Promise<{
    waveform: number[]
    duration: number
    metadata: AudioFileMetadata
  }> {
    const audioContext = new AudioContext()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const waveform = await this.generateWaveform(audioBuffer)
    const duration = audioBuffer.duration
    
    return {
      waveform,
      duration,
      metadata: {
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      }
    }
  }
}
```

## Database Schema Extensions

### Audio-Related Tables
```sql
-- Enhanced posts table for audio content
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_size INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_format TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_bitrate INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS waveform_data JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed';

-- Audio processing jobs table
CREATE TABLE audio_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    processed_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    compression_settings JSONB,
    waveform_data JSONB,
    metadata JSONB,
    error_message TEXT,
    processing_started TIMESTAMPTZ,
    processing_completed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio playback analytics
CREATE TABLE audio_play_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    duration_played INTEGER, -- in seconds
    total_duration INTEGER,  -- total track length
    play_percentage DECIMAL(5,2), -- percentage played
    device_type TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio quality metrics
CREATE TABLE audio_quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    original_size INTEGER,
    compressed_size INTEGER,
    compression_ratio DECIMAL(5,2),
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    processing_time INTEGER, -- in milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance
```sql
-- Indexes for audio-related queries
CREATE INDEX IF NOT EXISTS idx_posts_audio_url ON posts(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_duration ON posts(audio_duration) WHERE audio_duration IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_user ON audio_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_play_events_post ON audio_play_events(post_id);
CREATE INDEX IF NOT EXISTS idx_play_events_user ON audio_play_events(user_id);
```

## Performance Requirements

### Audio Streaming Performance
- **Initial Buffer Time:** < 2 seconds for playback start
- **Seek Performance:** < 500ms for seek operations
- **Waveform Rendering:** < 1 second for visualization load
- **Concurrent Streams:** Support 100+ simultaneous users
- **Mobile Performance:** Optimized for 3G/4G networks

### Processing Performance
- **Upload Processing:** < 30 seconds for compression and optimization
- **Waveform Generation:** < 5 seconds for typical track lengths
- **Metadata Extraction:** < 2 seconds per file
- **Batch Processing:** Handle 10+ files simultaneously
- **Error Recovery:** < 1 minute for failed job retry

### Storage Efficiency
- **Compression Ratio:** 60-80% size reduction target
- **Quality Preservation:** Minimal perceptible quality loss
- **Format Optimization:** Standardize to web-optimized formats
- **CDN Distribution:** Global edge caching for faster delivery

## Security Considerations

### File Upload Security
```typescript
// Audio file validation
class AudioValidator {
  private readonly allowedMimeTypes = [
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
    'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/ogg'
  ]
  
  private readonly maxFileSize = 50 * 1024 * 1024 // 50MB
  private readonly maxDuration = 600 // 10 minutes
  
  async validateFile(file: File): Promise<ValidationResult> {
    // 1. Check file type
    if (!this.allowedMimeTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only audio files are allowed.')
    }
    
    // 2. Check file size
    if (file.size > this.maxFileSize) {
      throw new Error('File size too large. Maximum 50MB allowed.')
    }
    
    // 3. Validate file signature (magic numbers)
    const signature = await this.getFileSignature(file)
    if (!this.isValidAudioSignature(signature)) {
      throw new Error('Invalid audio file format.')
    }
    
    // 4. Check audio duration
    const duration = await this.getAudioDuration(file)
    if (duration > this.maxDuration) {
      throw new Error('Audio duration too long. Maximum 10 minutes allowed.')
    }
    
    // 5. Basic malware scanning
    if (await this.containsSuspiciousPatterns(file)) {
      throw new Error('File failed security scan.')
    }
    
    return { valid: true, duration, size: file.size }
  }
  
  private async getFileSignature(file: File): Promise<Uint8Array> {
    const buffer = await file.slice(0, 12).arrayBuffer()
    return new Uint8Array(buffer)
  }
  
  private isValidAudioSignature(signature: Uint8Array): boolean {
    // MP3 signature
    if (signature[0] === 0xFF && (signature[1] & 0xE0) === 0xE0) return true
    
    // WAV signature
    if (signature[0] === 0x52 && signature[1] === 0x49 && 
        signature[2] === 0x46 && signature[3] === 0x46) return true
    
    // FLAC signature
    if (signature[0] === 0x66 && signature[1] === 0x4C && 
        signature[2] === 0x61 && signature[3] === 0x43) return true
    
    return false
  }
}
```

### Content Protection
- **Digital Rights Management (DRM):** Future implementation for premium content
- **Watermarking:** Audio watermarking for copyright protection
- **Content ID:** Duplicate detection and copyright matching
- **Usage Analytics:** Track unauthorized usage and downloads

### Privacy Protection
- **Metadata Stripping:** Remove sensitive metadata from uploaded files
- **Anonymous Analytics:** Aggregate playback data without personal identification
- **GDPR Compliance:** User data protection and right to deletion
- **Secure Storage:** Encrypted storage for sensitive audio content

## Testing Strategy

### Unit Tests
```typescript
// Audio processing unit tests
describe('AudioProcessor', () => {
  it('should compress audio file while maintaining quality', async () => {
    const processor = new AudioProcessor()
    const mockFile = createMockAudioFile()
    
    const result = await processor.compressAudio(mockFile, {
      bitrate: 192,
      format: 'mp3',
      quality: 'high',
      normalize: true
    })
    
    expect(result.size).toBeLessThan(mockFile.size * 0.8)
    expect(result.qualityScore).toBeGreaterThan(0.85)
  })
  
  it('should generate accurate waveform data', async () => {
    const generator = new WaveformGenerator()
    const mockAudioBuffer = createMockAudioBuffer()
    
    const waveform = await generator.generateWaveform(mockAudioBuffer, 1000)
    
    expect(waveform).toHaveLength(1000)
    expect(Math.max(...waveform)).toBeLessThanOrEqual(1)
    expect(Math.min(...waveform)).toBeGreaterThanOrEqual(0)
  })
})
```

### Integration Tests
```typescript
// Audio upload integration tests
describe('Audio Upload Flow', () => {
  it('should handle complete upload and processing workflow', async () => {
    // 1. Upload file
    const uploadResponse = await request(app)
      .post('/api/audio/upload')
      .attach('audio', 'test-files/sample.mp3')
      .expect(200)
    
    // 2. Verify processing job created
    const job = await AudioProcessingJob.findById(uploadResponse.body.jobId)
    expect(job.status).toBe('pending')
    
    // 3. Wait for processing completion
    await waitForJobCompletion(job.id)
    
    // 4. Verify processed audio available
    const processedAudio = await request(app)
      .get(`/api/audio/${uploadResponse.body.id}/stream`)
      .expect(200)
    
    expect(processedAudio.headers['content-type']).toBe('audio/mpeg')
  })
})
```

### Performance Tests
```typescript
// Audio streaming performance tests
describe('Audio Streaming Performance', () => {
  it('should start playback within 2 seconds', async () => {
    const startTime = Date.now()
    const player = new AudioPlayer()
    
    await player.load('https://example.com/audio.mp3')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(2000)
  })
  
  it('should handle 100 concurrent streams', async () => {
    const concurrentStreams = Array(100).fill(null).map(() => 
      new AudioPlayer().load('https://example.com/audio.mp3')
    )
    
    const results = await Promise.allSettled(concurrentStreams)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    expect(successful).toBeGreaterThan(95) // 95% success rate
  })
})
```

## Monitoring & Analytics

### Audio Performance Metrics
```typescript
// Audio analytics tracking
interface AudioAnalytics {
  uploadMetrics: {
    totalUploads: number
    successRate: number
    averageProcessingTime: number
    compressionEfficiency: number
  }
  
  playbackMetrics: {
    totalPlays: number
    averagePlayDuration: number
    completionRate: number
    errorRate: number
  }
  
  performanceMetrics: {
    averageLoadTime: number
    bufferUnderrunRate: number
    seekPerformance: number
    mobilePerformance: number
  }
}

// Real-time monitoring
class AudioMonitoring {
  async trackUploadEvent(event: AudioUploadEvent) {
    await this.analytics.track('audio_upload', {
      userId: event.userId,
      fileSize: event.fileSize,
      duration: event.duration,
      format: event.format,
      processingTime: event.processingTime
    })
  }
  
  async trackPlaybackEvent(event: AudioPlayEvent) {
    await this.analytics.track('audio_play', {
      postId: event.postId,
      userId: event.userId,
      duration: event.duration,
      completion: event.completion,
      quality: event.quality
    })
  }
}
```

### Quality Assurance Monitoring
- **Automated Testing:** Continuous integration tests for audio functionality
- **Performance Monitoring:** Real-time performance metrics and alerting
- **Error Tracking:** Comprehensive error logging and analysis
- **User Feedback:** In-app feedback collection for audio experience
- **A/B Testing:** Test different compression and playback settings

## Future Enhancements

### Phase 2 Audio Features
- **Advanced Audio Effects:** Reverb, EQ, filters for playback
- **Collaborative Playlists:** User-created and shared playlists
- **Audio Comments:** Leave audio comments on tracks
- **Live Streaming:** Real-time audio streaming capabilities
- **Advanced Analytics:** Detailed creator analytics dashboard

### Phase 3 Audio Features
- **AI Audio Analysis:** Automatic genre, mood, and key detection
- **Smart Recommendations:** ML-powered content discovery
- **Audio Collaboration:** Multi-user real-time audio editing
- **Spatial Audio:** 3D audio experience for immersive listening
- **Voice Integration:** Voice commands for audio control

### Technical Roadmap
- **WebRTC Integration:** Real-time communication for collaboration
- **Edge Computing:** Audio processing at edge locations
- **Advanced Compression:** AI-powered audio compression
- **Blockchain Integration:** Decentralized audio storage and rights management

---

*Audio System Specification Version: 2.0*  
*Last Updated: September 2025*  
*Next Review: October 2025*  
*Status: Partially Implemented*
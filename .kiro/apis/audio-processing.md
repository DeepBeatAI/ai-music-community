# Audio Processing API Specification

## Overview
Audio processing and streaming endpoints for handling audio file uploads, compression, format conversion, waveform generation, and optimized delivery.

## Base Configuration
```typescript
const API_BASE = '/api/audio'

interface AudioMetadata {
  duration: number          // Duration in seconds
  format: string           // Original format (mp3, wav, flac)
  bitrate: number          // Bitrate in kbps
  sampleRate: number       // Sample rate in Hz
  channels: number         // Number of audio channels
  size: number            // File size in bytes
  codec: string           // Audio codec used
}

interface ProcessingJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number         // Processing progress (0-100)
  originalUrl: string
  processedUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}
```

## Audio Upload Endpoints

### POST /api/audio/upload
**Purpose:** Upload raw audio file for processing

#### Request Headers
```typescript
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body
```typescript
interface AudioUploadRequest {
  audioFile: File          // Audio file (max 50MB)
  postId?: string         // Optional post ID to associate with
  quality?: 'low' | 'medium' | 'high'  // Target compression quality
  generateWaveform?: boolean  // Generate waveform data
}
```

#### Response
```typescript
interface AudioUploadResponse {
  success: boolean
  data?: {
    uploadId: string
    originalUrl: string
    metadata: AudioMetadata
    processingJob: ProcessingJob
  }
  error?: string
}
```

#### Example Usage
```typescript
// Upload audio file
const formData = new FormData()
formData.append('audioFile', audioFile)
formData.append('postId', 'post-123')
formData.append('quality', 'high')
formData.append('generateWaveform', 'true')

const response = await fetch('/api/audio/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
})

// Success Response (201)
{
  "success": true,
  "data": {
    "uploadId": "upload-789",
    "originalUrl": "https://storage.supabase.co/audio/originals/file789.wav",
    "metadata": {
      "duration": 180.5,
      "format": "wav",
      "bitrate": 1411,
      "sampleRate": 44100,
      "channels": 2,
      "size": 15728640,
      "codec": "pcm_s16le"
    },
    "processingJob": {
      "id": "job-456",
      "status": "queued",
      "progress": 0,
      "originalUrl": "https://storage.supabase.co/audio/originals/file789.wav",
      "createdAt": "2025-09-18T10:30:00Z"
    }
  }
}
```

## Audio Processing Endpoints

### POST /api/audio/process
**Purpose:** Process existing audio file with specific parameters

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Request Body
```typescript
interface AudioProcessRequest {
  audioUrl: string         // Source audio URL
  operations: {
    compress?: {
      quality: 'low' | 'medium' | 'high'
      targetBitrate?: number
      format?: 'mp3' | 'aac'
    }
    normalize?: {
      targetLUFS: number   // Target loudness (-23 to -14 LUFS)
      peakLimit: number    // Peak limiter threshold
    }
    convert?: {
      format: 'mp3' | 'wav' | 'aac'
      sampleRate?: number
      channels?: 1 | 2
    }
    waveform?: {
      resolution: number   // Waveform resolution (default: 1000)
      peaks: boolean      // Generate peak data
    }
  }
}
```

#### Response
```typescript
interface AudioProcessResponse {
  success: boolean
  data?: {
    processingJob: ProcessingJob
    estimatedTime: number  // Estimated completion time in seconds
  }
  error?: string
}
```

## Audio Streaming Endpoints

### GET /api/audio/[id]/stream
**Purpose:** Stream audio file with range request support

#### Path Parameters
```typescript
interface StreamParams {
  id: string                 // Audio file ID or post ID
}
```

#### Query Parameters
```typescript
interface StreamQuery {
  quality?: 'low' | 'medium' | 'high'  // Stream quality
  format?: 'mp3' | 'aac'    // Audio format preference
  start?: number            // Start time in seconds
  end?: number              // End time in seconds
}
```

#### Response Headers
```typescript
Content-Type: audio/mpeg | audio/aac
Content-Length: 1234567
Accept-Ranges: bytes
Cache-Control: public, max-age=31536000
ETag: "audio-version-hash"
Last-Modified: Wed, 18 Sep 2025 10:30:00 GMT
```

### GET /api/audio/[id]/waveform
**Purpose:** Get waveform visualization data

#### Response
```typescript
interface WaveformResponse {
  success: boolean
  data?: {
    waveform: {
      peaks: number[]        // Peak amplitude values
      rms?: number[]         // RMS amplitude values
      duration: number       // Audio duration in seconds
      sampleRate: number     // Sample rate used for analysis
      resolution: number     // Number of data points
    }
    metadata: {
      maxAmplitude: number
      averageAmplitude: number
      dynamicRange: number
    }
  }
  error?: string
}
```

## Error Handling

### Audio Processing Errors
```typescript
interface AudioErrorCodes {
  INVALID_AUDIO_FILE: 'Audio file format not supported or corrupted'
  FILE_TOO_LARGE: 'Audio file exceeds maximum size limit'
  PROCESSING_FAILED: 'Audio processing failed due to technical error'
  INSUFFICIENT_QUALITY: 'Source audio quality too low for processing'
  UNSUPPORTED_FORMAT: 'Audio format not supported for this operation'
  PROCESSING_TIMEOUT: 'Audio processing exceeded time limit'
  STORAGE_ERROR: 'Failed to store processed audio file'
  WAVEFORM_GENERATION_FAILED: 'Could not generate waveform data'
  RATE_LIMIT_EXCEEDED: 'Too many processing requests'
  INVALID_PARAMETERS: 'Processing parameters are invalid'
}
```

## Performance Specifications

### Processing Performance Targets
```typescript
interface PerformanceTargets {
  upload: 'Complete upload within 30 seconds for 50MB file'
  compression: 'Process and compress within 60 seconds per minute of audio'
  waveform: 'Generate waveform data within 15 seconds'
  streaming: 'Start streaming within 2 seconds of request'
  conversion: 'Format conversion within 45 seconds per minute of audio'
  
  concurrency: {
    maxConcurrentUploads: 10
    maxConcurrentProcessing: 5
    maxConcurrentStreams: 100
  }
  
  quality: {
    compressionRatio: '60-80% size reduction'
    qualityRetention: '95%+ perceptual quality'
    waveformAccuracy: '99%+ peak detection accuracy'
  }
}
```

## Rate Limiting

### Audio Operation Limits
```typescript
interface AudioRateLimits {
  upload: '10 files per hour per user'
  processing: '20 jobs per hour per user'
  streaming: '1000 requests per hour per IP'
  waveformGeneration: '50 generations per hour per user'
  conversion: '30 conversions per hour per user'
}
```

---

*API Specification Version: 1.0*  
*Last Updated: September 2025*  
*Compatible with: FFmpeg 5.0+, Supabase Storage, CDN optimization*

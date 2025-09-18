# Post Management API Specification

## Overview
Content creation and management endpoints for posts, including text posts and audio posts with file uploads, metadata handling, and content operations.

## Base Configuration
```typescript
const API_BASE = '/api/posts'

interface Post {
  id: string
  userId: string
  title: string
  content: string | null
  postType: 'text' | 'audio'
  audioUrl: string | null
  audioDuration: number | null
  audioSize: number | null
  audioFormat: string | null
  waveformData: number[] | null
  aiTool: string | null
  aiToolVersion: string | null
  tags: string[]
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  user: UserProfile
  stats: PostStats
}

interface PostStats {
  likesCount: number
  commentsCount: number
  playsCount: number
  sharesCount: number
}
```

## Post Creation Endpoints

### POST /api/posts
**Purpose:** Create a new text or audio post

#### Request Headers
```typescript
Authorization: Bearer <access_token>
Content-Type: application/json | multipart/form-data
```

#### Request Body (Text Post)
```typescript
interface CreateTextPostRequest {
  title: string              // Post title (required, 1-200 characters)
  content: string            // Post content (required, 1-5000 characters)
  tags?: string[]           // Optional tags (max 10 tags, 30 chars each)
  aiTool?: string           // AI tool used (optional)
  aiToolVersion?: string    // AI tool version (optional)
}
```

#### Request Body (Audio Post - Multipart)
```typescript
interface CreateAudioPostRequest {
  title: string              // Post title (required)
  content?: string          // Optional description
  audioFile: File          // Audio file (required, max 50MB)
  tags?: string[]          // Optional tags
  aiTool?: string          // AI tool used
  aiToolVersion?: string   // AI tool version
}
```

#### Response
```typescript
interface CreatePostResponse {
  success: boolean
  data?: {
    post: Post
    uploadStatus?: {
      uploaded: boolean
      processing: boolean
      waveformGenerated: boolean
    }
  }
  error?: string
}
```

#### Example Usage
```typescript
// Create audio post
const formData = new FormData()
formData.append('title', 'AI Jazz Fusion Experiment')
formData.append('content', 'Created with GPT-4 music prompts and AIVA')
formData.append('audioFile', audioFile)
formData.append('aiTool', 'AIVA')
formData.append('tags', JSON.stringify(['jazz', 'ai-generated', 'experimental']))

const response = await fetch('/api/posts', {
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
    "post": {
      "id": "post-456",
      "title": "AI Jazz Fusion Experiment",
      "content": "Created with GPT-4 music prompts and AIVA",
      "postType": "audio",
      "audioUrl": "https://storage.supabase.co/audio/user123/track456.mp3",
      "aiTool": "AIVA",
      "tags": ["jazz", "ai-generated", "experimental"],
      "createdAt": "2025-09-18T10:30:00Z"
    },
    "uploadStatus": {
      "uploaded": true,
      "processing": true,
      "waveformGenerated": false
    }
  }
}
```

### POST /api/posts/[id]/process
**Purpose:** Trigger audio processing for uploaded audio post

#### Path Parameters
```typescript
interface ProcessParams {
  id: string                 // Post ID
}
```

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface ProcessResponse {
  success: boolean
  data?: {
    processingId: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    estimatedTime: number     // Estimated processing time in seconds
  }
  error?: string
}
```

## Post Retrieval Endpoints

### GET /api/posts
**Purpose:** Get paginated list of posts with filtering and sorting

#### Query Parameters
```typescript
interface PostsQuery {
  page?: number             // Page number (default: 1)
  limit?: number            // Posts per page (default: 10, max: 50)
  type?: 'all' | 'audio' | 'text'  // Post type filter
  sort?: 'recent' | 'popular' | 'trending' | 'plays'  // Sort order
  tags?: string[]           // Filter by tags
  aiTool?: string          // Filter by AI tool
  userId?: string          // Filter by user ID
  following?: boolean      // Show only posts from followed users (requires auth)
  featured?: boolean       // Filter featured posts only
}
```

#### Response
```typescript
interface PostsResponse {
  success: boolean
  data?: {
    posts: Post[]
    pagination: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrevious: boolean
    }
    filters: {
      appliedFilters: PostsQuery
      availableFilters: {
        tags: string[]
        aiTools: string[]
      }
    }
  }
  error?: string
}
```

#### Example Usage
```typescript
// Get trending audio posts with jazz tag
const response = await fetch('/api/posts?type=audio&sort=trending&tags=jazz&limit=20')

// Success Response (200)
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-456",
        "title": "AI Jazz Fusion Experiment",
        "postType": "audio",
        "audioUrl": "https://storage.supabase.co/audio/user123/track456.mp3",
        "audioDuration": 180,
        "user": {
          "username": "ai_creator_123",
          "displayName": "AI Music Creator",
          "avatarUrl": "https://storage.supabase.co/avatars/user123.jpg"
        },
        "stats": {
          "likesCount": 45,
          "commentsCount": 12,
          "playsCount": 234
        },
        "tags": ["jazz", "ai-generated", "experimental"],
        "createdAt": "2025-09-18T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### GET /api/posts/[id]
**Purpose:** Get single post by ID with full details

#### Path Parameters
```typescript
interface PostParams {
  id: string                 // Post UUID
}
```

#### Query Parameters
```typescript
interface PostDetailQuery {
  include?: string[]         // Optional: ['comments', 'related']
}
```

#### Response
```typescript
interface PostResponse {
  success: boolean
  data?: {
    post: Post
    comments?: Comment[]     // If include=comments
    related?: Post[]         // If include=related
    userInteraction?: {      // Only if authenticated
      liked: boolean
      bookmarked: boolean
      played: boolean
    }
  }
  error?: string
}
```

### GET /api/posts/trending
**Purpose:** Get trending posts based on engagement metrics

#### Query Parameters
```typescript
interface TrendingQuery {
  period?: 'day' | 'week' | 'month'  // Trending period (default: week)
  limit?: number            // Number of posts (default: 10, max: 50)
  type?: 'all' | 'audio' | 'text'  // Post type filter
}
```

### GET /api/posts/feed
**Purpose:** Get personalized feed for authenticated user

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Query Parameters
```typescript
interface FeedQuery {
  page?: number             // Page number (default: 1)
  limit?: number            // Posts per page (default: 10, max: 50)
  algorithm?: 'chronological' | 'recommended'  // Feed algorithm
}
```

## Post Update Endpoints

### PUT /api/posts/[id]
**Purpose:** Update post content and metadata

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Request Body
```typescript
interface UpdatePostRequest {
  title?: string            // Updated title
  content?: string          // Updated content/description
  tags?: string[]          // Updated tags
  aiTool?: string          // Updated AI tool
  aiToolVersion?: string   // Updated AI tool version
}
```

#### Response
```typescript
interface UpdatePostResponse {
  success: boolean
  data?: {
    post: Post
  }
  error?: string
}
```

### DELETE /api/posts/[id]
**Purpose:** Delete post and associated files

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface DeletePostResponse {
  success: boolean
  data?: {
    deletedPostId: string
    filesDeleted: string[]   // List of deleted file URLs
  }
  error?: string
}
```

## Post Audio Endpoints

### GET /api/posts/[id]/audio
**Purpose:** Get audio file with streaming support

#### Path Parameters
```typescript
interface AudioParams {
  id: string                 // Post ID
}
```

#### Query Parameters
```typescript
interface AudioQuery {
  quality?: 'low' | 'medium' | 'high'  // Audio quality (default: medium)
  format?: 'mp3' | 'wav'    // Audio format (default: mp3)
}
```

#### Response Headers
```typescript
Content-Type: audio/mpeg | audio/wav
Accept-Ranges: bytes       // Support for range requests
Cache-Control: public, max-age=31536000
```

### GET /api/posts/[id]/waveform
**Purpose:** Get waveform data for audio visualization

#### Response
```typescript
interface WaveformResponse {
  success: boolean
  data?: {
    waveform: number[]       // Waveform peak data
    duration: number         // Audio duration in seconds
    sampleRate: number       // Sample rate used for waveform
    peaks: number[]          // Peak values for visualization
  }
  error?: string
}
```

### POST /api/posts/[id]/play
**Purpose:** Record audio play event for analytics

#### Request Headers
```typescript
Authorization?: Bearer <access_token>  // Optional for anonymous plays
```

#### Request Body
```typescript
interface PlayEventRequest {
  playPosition?: number     // Play position when started (seconds)
  duration?: number        // How long played (seconds)
  completed?: boolean      // Whether play completed
}
```

#### Response
```typescript
interface PlayEventResponse {
  success: boolean
  data?: {
    totalPlays: number      // Updated total play count
    userPlays?: number      // User's play count (if authenticated)
  }
}
```

## Post Interaction Endpoints

### POST /api/posts/[id]/like
**Purpose:** Like or unlike a post

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface LikeResponse {
  success: boolean
  data?: {
    liked: boolean          // Current like status
    likesCount: number      // Updated like count
  }
  error?: string
}
```

### POST /api/posts/[id]/bookmark
**Purpose:** Bookmark or unbookmark a post

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface BookmarkResponse {
  success: boolean
  data?: {
    bookmarked: boolean     // Current bookmark status
    bookmarkCount: number   // User's total bookmarks
  }
  error?: string
}
```

### POST /api/posts/[id]/share
**Purpose:** Record share event and get share URL

#### Request Body
```typescript
interface ShareRequest {
  platform?: 'twitter' | 'facebook' | 'discord' | 'link'  // Share platform
  customMessage?: string   // Optional custom share message
}
```

#### Response
```typescript
interface ShareResponse {
  success: boolean
  data?: {
    shareUrl: string        // Optimized share URL
    shareCount: number      // Updated share count
    socialMeta: {          // Open Graph metadata
      title: string
      description: string
      image: string
      audio?: string
    }
  }
  error?: string
}
```

## Error Handling

### Post Management Errors
```typescript
interface PostErrorCodes {
  POST_NOT_FOUND: 'Post not found'
  UNAUTHORIZED_ACCESS: 'Not authorized to access this post'
  INVALID_FILE_TYPE: 'Audio file type not supported'
  FILE_TOO_LARGE: 'Audio file exceeds maximum size limit'
  PROCESSING_FAILED: 'Audio processing failed'
  INVALID_TAGS: 'One or more tags are invalid'
  TITLE_TOO_LONG: 'Post title exceeds maximum length'
  CONTENT_TOO_LONG: 'Post content exceeds maximum length'
  RATE_LIMIT_EXCEEDED: 'Too many posts created recently'
  DUPLICATE_CONTENT: 'Similar content already exists'
}
```

## Validation Rules

### Post Validation
```typescript
interface PostValidation {
  title: {
    minLength: 1
    maxLength: 200
    pattern: '^[^<>]*$'     // No HTML tags
  }
  content: {
    maxLength: 5000
    pattern: '^[^<>]*$'     // No HTML tags
  }
  tags: {
    maxCount: 10
    maxLength: 30
    pattern: '^[a-zA-Z0-9_-]+$'  // Alphanumeric, underscore, hyphen
  }
  audioFile: {
    maxSize: 52428800       // 50MB in bytes
    allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/flac']
    maxDuration: 600        // 10 minutes in seconds
  }
}
```

## Rate Limiting

### Post Operation Limits
```typescript
interface PostRateLimits {
  createPost: '5 posts per hour per user'
  updatePost: '10 updates per hour per post'
  deletePost: '3 deletions per hour per user'
  likePost: '100 likes per hour per user'
  playAudio: '1000 plays per hour per IP'
  reportPost: '5 reports per day per user'
}
```

---

*API Specification Version: 1.0*  
*Last Updated: September 2025*  
*Compatible with: Supabase v2, Next.js 15, FFmpeg audio processing*

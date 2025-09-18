# User Management API Specification

## Overview
User profile and account management endpoints for AI Music Community Platform. Handles user profiles, statistics, preferences, and account operations.

## Base Configuration
```typescript
const API_BASE = '/api/users'

interface UserProfile {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  websiteUrl: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

interface UserStats {
  postsCount: number
  followersCount: number
  followingCount: number
  likesReceived: number
  totalPlays: number
}
```

## User Profile Endpoints

### GET /api/users/[id]
**Purpose:** Get user profile by ID with public information

#### Path Parameters
```typescript
interface UserParams {
  id: string                 // User UUID or username
}
```

#### Query Parameters
```typescript
interface UserQuery {
  include?: string[]         // Optional: ['stats', 'posts', 'followers']
  limit?: number            // Limit for included data (default: 10)
}
```

#### Response
```typescript
interface UserResponse {
  success: boolean
  data?: {
    profile: UserProfile
    stats: UserStats
    posts?: Post[]           // If include=posts
    followers?: UserProfile[] // If include=followers
    following?: UserProfile[] // If include=following
  }
  error?: string
}
```

#### Example Usage
```typescript
// Get user with stats and recent posts
const response = await fetch('/api/users/ai_creator_123?include=stats,posts&limit=5')

// Success Response (200)
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "ai_creator_123",
      "displayName": "AI Music Creator",
      "bio": "Creating the future of music with AI",
      "avatarUrl": "https://storage.supabase.co/avatars/user123.jpg",
      "websiteUrl": "https://aimusic.example.com",
      "location": "Tokyo, Japan",
      "createdAt": "2025-09-01T10:00:00Z",
      "updatedAt": "2025-09-18T10:30:00Z"
    },
    "stats": {
      "postsCount": 25,
      "followersCount": 150,
      "followingCount": 89,
      "likesReceived": 342,
      "totalPlays": 1250
    },
    "posts": [
      {
        "id": "post-123",
        "title": "AI-Generated Jazz Fusion",
        "audioUrl": "https://storage.supabase.co/audio/track123.mp3",
        "createdAt": "2025-09-18T08:00:00Z"
      }
    ]
  }
}
```

### PUT /api/users/profile
**Purpose:** Update current user's profile information

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Request Body
```typescript
interface UpdateProfileRequest {
  username?: string         // Unique username (3-30 characters)
  displayName?: string      // Display name (1-50 characters)
  bio?: string             // Biography (max 500 characters)
  websiteUrl?: string      // Website URL (valid URL format)
  location?: string        // Location (max 100 characters)
}
```

#### Response
```typescript
interface UpdateProfileResponse {
  success: boolean
  data?: {
    profile: UserProfile
  }
  error?: string
}
```

#### Example Usage
```typescript
// Update user profile
const response = await fetch('/api/users/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    displayName: 'AI Music Producer',
    bio: 'Professional AI music creator specializing in electronic genres',
    location: 'Tokyo, Japan'
  })
})
```

### POST /api/users/avatar
**Purpose:** Upload and update user avatar image

#### Request Headers
```typescript
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body
```typescript
interface AvatarUploadRequest {
  avatar: File               // Image file (max 5MB, JPEG/PNG/WebP)
}
```

#### Response
```typescript
interface AvatarUploadResponse {
  success: boolean
  data?: {
    avatarUrl: string        // New avatar URL
    profile: UserProfile
  }
  error?: string
}
```

### DELETE /api/users/avatar
**Purpose:** Remove user avatar image

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface AvatarDeleteResponse {
  success: boolean
  data?: {
    profile: UserProfile
  }
  error?: string
}
```

## User Statistics Endpoints

### GET /api/users/[id]/stats
**Purpose:** Get detailed user statistics and analytics

#### Path Parameters
```typescript
interface StatsParams {
  id: string                 // User UUID or username
}
```

#### Query Parameters
```typescript
interface StatsQuery {
  period?: 'week' | 'month' | 'year' | 'all'  // Time period (default: all)
  detailed?: boolean         // Include detailed breakdown
}
```

#### Response
```typescript
interface UserStatsResponse {
  success: boolean
  data?: {
    overview: UserStats
    detailed?: {
      playsOverTime: Array<{ date: string; plays: number }>
      topPosts: Array<{ id: string; title: string; plays: number }>
      engagement: {
        averageLikesPerPost: number
        averageCommentsPerPost: number
        engagementRate: number
      }
    }
  }
  error?: string
}
```

### GET /api/users/[id]/posts
**Purpose:** Get user's posts with pagination

#### Path Parameters
```typescript
interface UserPostsParams {
  id: string                 // User UUID or username
}
```

#### Query Parameters
```typescript
interface UserPostsQuery {
  page?: number             // Page number (default: 1)
  limit?: number            // Posts per page (default: 10, max: 50)
  type?: 'all' | 'audio' | 'text'  // Post type filter
  sort?: 'recent' | 'popular' | 'plays'  // Sort order
}
```

#### Response
```typescript
interface UserPostsResponse {
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
  }
  error?: string
}
```

## Social Relationship Endpoints

### GET /api/users/[id]/followers
**Purpose:** Get user's followers list

#### Response
```typescript
interface FollowersResponse {
  success: boolean
  data?: {
    followers: UserProfile[]
    pagination: PaginationInfo
  }
  error?: string
}
```

### GET /api/users/[id]/following
**Purpose:** Get list of users that this user follows

#### Response
```typescript
interface FollowingResponse {
  success: boolean
  data?: {
    following: UserProfile[]
    pagination: PaginationInfo
  }
  error?: string
}
```

### POST /api/users/[id]/follow
**Purpose:** Follow another user

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Path Parameters
```typescript
interface FollowParams {
  id: string                 // User ID to follow
}
```

#### Response
```typescript
interface FollowResponse {
  success: boolean
  data?: {
    following: boolean       // Current follow status
    followerCount: number    // Updated follower count for target user
  }
  error?: string
}
```

### DELETE /api/users/[id]/follow
**Purpose:** Unfollow a user

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface UnfollowResponse {
  success: boolean
  data?: {
    following: boolean       // Current follow status (false)
    followerCount: number    // Updated follower count for target user
  }
  error?: string
}
```

## User Search Endpoints

### GET /api/users/search
**Purpose:** Search for users by username, display name, or bio

#### Query Parameters
```typescript
interface UserSearchQuery {
  q: string                 // Search query (minimum 2 characters)
  limit?: number            // Results limit (default: 10, max: 50)
  offset?: number           // Results offset for pagination
  sort?: 'relevance' | 'followers' | 'recent'  // Sort order
}
```

#### Response
```typescript
interface UserSearchResponse {
  success: boolean
  data?: {
    users: Array<{
      profile: UserProfile
      stats: UserStats
      relevanceScore: number
    }>
    total: number
    query: string
  }
  error?: string
}
```

#### Example Usage
```typescript
// Search for users
const response = await fetch('/api/users/search?q=ai+music&limit=20&sort=followers')

// Success Response (200)
{
  "success": true,
  "data": {
    "users": [
      {
        "profile": {
          "username": "ai_creator_123",
          "displayName": "AI Music Creator",
          "bio": "Creating the future of music with AI"
        },
        "stats": {
          "followersCount": 150,
          "postsCount": 25
        },
        "relevanceScore": 0.95
      }
    ],
    "total": 45,
    "query": "ai music"
  }
}
```

## Account Management Endpoints

### GET /api/users/me
**Purpose:** Get current user's complete profile and private information

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface CurrentUserResponse {
  success: boolean
  data?: {
    profile: UserProfile
    stats: UserStats
    preferences: UserPreferences
    account: {
      email: string
      emailVerified: boolean
      createdAt: string
      lastLoginAt: string
    }
  }
  error?: string
}
```

### PUT /api/users/preferences
**Purpose:** Update user preferences and privacy settings

#### Request Body
```typescript
interface UpdatePreferencesRequest {
  privacy: {
    profileVisibility: 'public' | 'followers' | 'private'
    showStats: boolean
    showFollowers: boolean
    allowMessages: 'everyone' | 'followers' | 'none'
  }
  notifications: {
    email: boolean
    push: boolean
    likes: boolean
    comments: boolean
    follows: boolean
    mentions: boolean
  }
}
```

### DELETE /api/users/account
**Purpose:** Delete user account and all associated data

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Request Body
```typescript
interface DeleteAccountRequest {
  password: string           // Confirm password for security
  confirmation: 'DELETE_MY_ACCOUNT'  // Explicit confirmation
}
```

## Error Handling

### User Management Errors
```typescript
interface UserErrorCodes {
  USER_NOT_FOUND: 'User not found'
  USERNAME_TAKEN: 'Username is already taken'
  INVALID_USERNAME: 'Username contains invalid characters'
  UNAUTHORIZED: 'Not authorized to perform this action'
  SELF_FOLLOW: 'Cannot follow yourself'
  ALREADY_FOLLOWING: 'Already following this user'
  FILE_TOO_LARGE: 'Avatar file exceeds maximum size limit'
  INVALID_FILE_TYPE: 'Avatar file type not supported'
}
```

## Validation Rules

### Profile Validation
```typescript
interface ValidationRules {
  username: {
    pattern: '^[a-zA-Z0-9_]{3,30}$'  // Alphanumeric and underscore, 3-30 chars
    reserved: ['admin', 'api', 'www', 'support']  // Reserved usernames
  }
  displayName: {
    minLength: 1
    maxLength: 50
    pattern: '^[^<>]*$'  // No HTML tags
  }
  bio: {
    maxLength: 500
    pattern: '^[^<>]*$'  // No HTML tags
  }
  websiteUrl: {
    pattern: '^https?://.+$'  // Valid HTTP/HTTPS URL
  }
}
```

---

*API Specification Version: 1.0*  
*Last Updated: September 2025*  
*Compatible with: Supabase v2, Next.js 15*

# Social Features API Specification

## Overview

The Social Features API handles all social interactions within the AI Music Community Platform, including likes, comments, follows, and social engagement metrics.

## Authentication

All social features endpoints require authentication via Supabase Auth JWT token:
```
Authorization: Bearer <jwt_token>
```

## Core Entities

### Like Entity
```typescript
interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}
```

### Comment Entity
```typescript
interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    avatar_url?: string
  }
}
```

### Follow Entity
```typescript
interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}
```

## Likes Endpoints

### POST /api/likes
Toggle like on a post.

**Request Body:**
```json
{
  "post_id": "uuid"
}
```

**Response:**
```json
{
  "liked": boolean,
  "like_count": number
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 404: Post not found

### GET /api/posts/:postId/likes
Get likes for a specific post.

**Query Parameters:**
- `limit` (optional): Number of likes to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "likes": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string"
      },
      "created_at": "timestamp"
    }
  ],
  "total_count": number
}
```

## Comments Endpoints

### POST /api/comments
Create a new comment on a post.

**Request Body:**
```json
{
  "post_id": "uuid",
  "content": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "string",
  "created_at": "timestamp",
  "user": {
    "id": "uuid",
    "username": "string",
    "avatar_url": "string"
  }
}
```

**Status Codes:**
- 201: Created
- 400: Invalid content
- 401: Unauthorized
- 404: Post not found

### GET /api/posts/:postId/comments
Get comments for a specific post.

**Query Parameters:**
- `limit` (optional): Number of comments to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort order ("newest", "oldest") (default: "newest")

**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "content": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "user": {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string"
      }
    }
  ],
  "total_count": number
}
```

### PUT /api/comments/:commentId
Update a comment (only by comment author).

**Request Body:**
```json
{
  "content": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "string",
  "updated_at": "timestamp"
}
```

### DELETE /api/comments/:commentId
Delete a comment (only by comment author or post owner).

**Response:**
```json
{
  "success": true
}
```

## Follows Endpoints

### POST /api/follows
Follow or unfollow a user.

**Request Body:**
```json
{
  "following_id": "uuid"
}
```

**Response:**
```json
{
  "following": boolean,
  "follower_count": number,
  "following_count": number
}
```

**Status Codes:**
- 200: Success
- 400: Cannot follow yourself
- 401: Unauthorized
- 404: User not found

### GET /api/users/:userId/followers
Get user's followers.

**Query Parameters:**
- `limit` (optional): Number of followers to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "followers": [
    {
      "id": "uuid",
      "username": "string",
      "avatar_url": "string",
      "followed_at": "timestamp"
    }
  ],
  "total_count": number
}
```

### GET /api/users/:userId/following
Get users that this user follows.

**Query Parameters:**
- `limit` (optional): Number of following to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "following": [
    {
      "id": "uuid",
      "username": "string",
      "avatar_url": "string",
      "followed_at": "timestamp"
    }
  ],
  "total_count": number
}
```

## Social Metrics Endpoints

### GET /api/posts/:postId/metrics
Get comprehensive social metrics for a post.

**Response:**
```json
{
  "like_count": number,
  "comment_count": number,
  "share_count": number,
  "engagement_rate": number,
  "user_has_liked": boolean,
  "user_has_commented": boolean
}
```

### GET /api/users/:userId/social-stats
Get social statistics for a user.

**Response:**
```json
{
  "follower_count": number,
  "following_count": number,
  "total_likes_received": number,
  "total_comments_received": number,
  "total_posts": number,
  "engagement_rate": number
}
```

## Feed Endpoints

### GET /api/feed
Get social feed for authenticated user.

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Feed type ("following", "discover", "trending") (default: "following")

**Response:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "audio_url": "string",
      "cover_url": "string",
      "created_at": "timestamp",
      "user": {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string"
      },
      "metrics": {
        "like_count": number,
        "comment_count": number,
        "user_has_liked": boolean
      }
    }
  ],
  "total_count": number,
  "next_cursor": "string"
}
```

## Activity Endpoints

### GET /api/activities
Get activity feed for authenticated user.

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `types` (optional): Activity types to include ("like", "comment", "follow") (default: all)

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "like|comment|follow",
      "actor": {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string"
      },
      "target": {
        "type": "post|user",
        "id": "uuid",
        "title": "string"
      },
      "created_at": "timestamp"
    }
  ],
  "unread_count": number
}
```

### PUT /api/activities/mark-read
Mark activities as read.

**Request Body:**
```json
{
  "activity_ids": ["uuid"]
}
```

**Response:**
```json
{
  "success": true,
  "marked_count": number
}
```

## Real-time Features

### WebSocket Events

The social features support real-time updates via WebSocket connections:

**Connection:**
```javascript
const socket = io('/social', {
  auth: {
    token: jwt_token
  }
})
```

**Events:**
- `post_liked`: When a post receives a like
- `post_commented`: When a post receives a comment
- `user_followed`: When a user receives a follow
- `activity_created`: When a new activity is created

**Event Format:**
```json
{
  "type": "post_liked",
  "data": {
    "post_id": "uuid",
    "like_count": number,
    "liker": {
      "id": "uuid",
      "username": "string"
    }
  },
  "timestamp": "timestamp"
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMITED`: Too many requests
- `CONTENT_BLOCKED`: Content violates community guidelines

## Rate Limiting

Social features are rate-limited to prevent spam:
- **Likes**: 100 per minute per user
- **Comments**: 30 per minute per user
- **Follows**: 50 per minute per user
- **Activity Queries**: 200 per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Data Validation

### Comment Content
- Maximum length: 500 characters
- Minimum length: 1 character
- Prohibited content: spam, harassment, explicit content
- Automatic moderation via content filtering

### Content Moderation
- Automatic detection of inappropriate content
- Community reporting system
- Admin review queue for flagged content
- Automated actions for repeated violations

## Database Schema

### Tables Required
```sql
-- Likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  activity_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);
```

### Indexes for Performance
```sql
-- Optimize likes queries
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- Optimize comments queries
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Optimize follows queries
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- Optimize activities queries
CREATE INDEX idx_activities_actor_id ON activities(actor_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_read_at ON activities(read_at) WHERE read_at IS NULL;
```

---

*API Version: 1.0*  
*Last Updated: September 2025*  
*Next Review: With each major feature release*
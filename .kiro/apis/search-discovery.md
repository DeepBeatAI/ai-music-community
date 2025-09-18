# Search & Discovery API Specification

## Overview

The Search & Discovery API provides comprehensive search functionality across the AI Music Community Platform, enabling users to find music, artists, and content through various search methods and discovery algorithms.

## Authentication

All search endpoints support both authenticated and anonymous access:
- **Authenticated**: Provides personalized results and search history
- **Anonymous**: Provides general search results without personalization

```
Authorization: Bearer <jwt_token> (optional)
```

## Core Search Entities

### Search Result Entity
```typescript
interface SearchResult {
  type: 'post' | 'user' | 'genre' | 'tag'
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  created_at: string
  relevance_score: number
  metadata: {
    [key: string]: any
  }
}
```

### Search Query Entity
```typescript
interface SearchQuery {
  query: string
  filters: {
    type?: string[]
    genre?: string[]
    duration?: { min?: number, max?: number }
    date_range?: { start?: string, end?: string }
    user_id?: string
  }
  sort: 'relevance' | 'newest' | 'oldest' | 'popular' | 'trending'
  limit: number
  offset: number
}
```

## Universal Search Endpoints

### GET /api/search
Perform universal search across all content types.

**Query Parameters:**
- `q` (required): Search query string
- `type` (optional): Content types to search ("posts", "users", "genres", "tags")
- `limit` (optional): Number of results per type (default: 10, max: 50)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort order ("relevance", "newest", "popular") (default: "relevance")

**Response:**
```json
{
  "query": "string",
  "total_results": number,
  "search_time_ms": number,
  "results": {
    "posts": {
      "total": number,
      "results": [
        {
          "id": "uuid",
          "title": "string",
          "description": "string",
          "audio_url": "string",
          "cover_url": "string",
          "duration": number,
          "genre": "string",
          "tags": ["string"],
          "user": {
            "id": "uuid",
            "username": "string",
            "avatar_url": "string"
          },
          "metrics": {
            "like_count": number,
            "play_count": number,
            "comment_count": number
          },
          "relevance_score": number,
          "created_at": "timestamp"
        }
      ]
    },
    "users": {
      "total": number,
      "results": [
        {
          "id": "uuid",
          "username": "string",
          "display_name": "string",
          "bio": "string",
          "avatar_url": "string",
          "follower_count": number,
          "post_count": number,
          "verified": boolean,
          "relevance_score": number
        }
      ]
    },
    "genres": {
      "total": number,
      "results": [
        {
          "name": "string",
          "post_count": number,
          "trending_score": number
        }
      ]
    },
    "tags": {
      "total": number,
      "results": [
        {
          "name": "string",
          "usage_count": number,
          "trending_score": number
        }
      ]
    }
  },
  "suggestions": [
    {
      "query": "string",
      "type": "correction|completion|related"
    }
  ]
}
```

## Content-Specific Search Endpoints

### GET /api/search/posts
Search specifically for music posts.

**Query Parameters:**
- `q` (required): Search query
- `genre` (optional): Filter by genre(s)
- `tags` (optional): Filter by tag(s)
- `duration_min` (optional): Minimum duration in seconds
- `duration_max` (optional): Maximum duration in seconds
- `date_from` (optional): Filter posts from date (ISO 8601)
- `date_to` (optional): Filter posts to date (ISO 8601)
- `user_id` (optional): Filter by specific user
- `sort` (optional): Sort order ("relevance", "newest", "popular", "trending")
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset

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
      "duration": number,
      "genre": "string",
      "tags": ["string"],
      "bpm": number,
      "key": "string",
      "user": {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string",
        "verified": boolean
      },
      "metrics": {
        "like_count": number,
        "play_count": number,
        "comment_count": number,
        "share_count": number
      },
      "ai_features": {
        "mood": "string",
        "energy_level": number,
        "danceability": number,
        "instrumentalness": number
      },
      "relevance_score": number,
      "created_at": "timestamp"
    }
  ],
  "total_count": number,
  "facets": {
    "genres": [
      { "name": "string", "count": number }
    ],
    "tags": [
      { "name": "string", "count": number }
    ],
    "duration_ranges": [
      { "range": "0-60", "count": number },
      { "range": "60-180", "count": number },
      { "range": "180+", "count": number }
    ]
  }
}
```

### GET /api/search/users
Search for users/artists.

**Query Parameters:**
- `q` (required): Search query
- `verified` (optional): Filter by verification status
- `min_followers` (optional): Minimum follower count
- `has_posts` (optional): Only users with posts
- `sort` (optional): Sort order ("relevance", "followers", "newest")
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "display_name": "string",
      "bio": "string",
      "avatar_url": "string",
      "cover_url": "string",
      "follower_count": number,
      "following_count": number,
      "post_count": number,
      "verified": boolean,
      "badges": ["string"],
      "genres": ["string"],
      "social_links": {
        "spotify": "string",
        "soundcloud": "string",
        "youtube": "string"
      },
      "relevance_score": number,
      "last_active": "timestamp"
    }
  ],
  "total_count": number
}
```

## Discovery Endpoints

### GET /api/discover/trending
Get trending content across the platform.

**Query Parameters:**
- `period` (optional): Time period ("hour", "day", "week", "month") (default: "day")
- `category` (optional): Content category ("all", "posts", "users", "genres")
- `limit` (optional): Number of results (default: 20, max: 100)

**Response:**
```json
{
  "trending": {
    "posts": [
      {
        "id": "uuid",
        "title": "string",
        "user": {
          "id": "uuid",
          "username": "string",
          "avatar_url": "string"
        },
        "trending_score": number,
        "growth_rate": number,
        "metrics": {
          "play_count": number,
          "like_count": number,
          "share_count": number
        }
      }
    ],
    "users": [
      {
        "id": "uuid",
        "username": "string",
        "avatar_url": "string",
        "trending_score": number,
        "follower_growth": number
      }
    ],
    "genres": [
      {
        "name": "string",
        "post_count": number,
        "growth_rate": number
      }
    ],
    "tags": [
      {
        "name": "string",
        "usage_count": number,
        "growth_rate": number
      }
    ]
  }
}
```

### GET /api/discover/recommended
Get personalized recommendations for authenticated users.

**Query Parameters:**
- `type` (optional): Recommendation type ("posts", "users", "genres")
- `limit` (optional): Number of results (default: 20)
- `refresh` (optional): Force refresh recommendations

**Response:**
```json
{
  "recommendations": {
    "posts": [
      {
        "id": "uuid",
        "title": "string",
        "reason": "Based on your likes|Similar to your uploads|Popular in your network",
        "confidence_score": number,
        "post_details": {
          // Full post object
        }
      }
    ],
    "users": [
      {
        "id": "uuid",
        "username": "string",
        "reason": "Similar music taste|Followed by users you follow|Rising artist",
        "confidence_score": number,
        "user_details": {
          // Full user object
        }
      }
    ]
  },
  "next_refresh": "timestamp"
}
```

### GET /api/discover/similar/:postId
Get posts similar to a specific post.

**Query Parameters:**
- `limit` (optional): Number of results (default: 10, max: 50)
- `algorithm` (optional): Similarity algorithm ("audio", "metadata", "collaborative")

**Response:**
```json
{
  "similar_posts": [
    {
      "id": "uuid",
      "title": "string",
      "similarity_score": number,
      "similarity_reasons": [
        "Same genre",
        "Similar BPM",
        "Liked by similar users"
      ],
      "post_details": {
        // Full post object
      }
    }
  ],
  "algorithm_used": "string"
}
```

## Auto-Complete & Suggestions

### GET /api/search/autocomplete
Get search suggestions as user types.

**Query Parameters:**
- `q` (required): Partial search query (minimum 2 characters)
- `type` (optional): Suggestion types ("all", "posts", "users", "genres", "tags")
- `limit` (optional): Number of suggestions (default: 10, max: 20)

**Response:**
```json
{
  "suggestions": [
    {
      "text": "string",
      "type": "post|user|genre|tag|query",
      "completion": "string",
      "frequency": number,
      "metadata": {
        "id": "uuid",
        "thumbnail": "string"
      }
    }
  ]
}
```

### GET /api/search/popular-queries
Get popular search queries.

**Query Parameters:**
- `period` (optional): Time period ("day", "week", "month") (default: "week")
- `limit` (optional): Number of queries (default: 10)

**Response:**
```json
{
  "popular_queries": [
    {
      "query": "string",
      "search_count": number,
      "trend_direction": "up|down|stable"
    }
  ]
}
```

## Search Analytics

### GET /api/search/history
Get search history for authenticated user.

**Query Parameters:**
- `limit` (optional): Number of searches (default: 20, max: 100)
- `date_from` (optional): History from date

**Response:**
```json
{
  "search_history": [
    {
      "query": "string",
      "timestamp": "timestamp",
      "results_count": number,
      "clicked_result": {
        "type": "string",
        "id": "uuid"
      }
    }
  ]
}
```

### DELETE /api/search/history
Clear search history for authenticated user.

**Response:**
```json
{
  "success": true,
  "cleared_count": number
}
```

## Advanced Search Features

### GET /api/search/audio-similarity
Search for music using audio similarity (upload sample).

**Request:** Multipart form with audio file
**Form Data:**
- `audio_file`: Audio file (max 30 seconds, mp3/wav)
- `similarity_threshold` (optional): Minimum similarity score (0-1)
- `limit` (optional): Number of results

**Response:**
```json
{
  "matches": [
    {
      "post_id": "uuid",
      "similarity_score": number,
      "matching_segments": [
        {
          "start_time": number,
          "end_time": number,
          "confidence": number
        }
      ],
      "post_details": {
        // Full post object
      }
    }
  ]
}
```

### GET /api/search/lyrics
Search posts by lyrics content.

**Query Parameters:**
- `q` (required): Lyrics search query
- `exact_match` (optional): Require exact phrase match
- `limit` (optional): Number of results

**Response:**
```json
{
  "matches": [
    {
      "post_id": "uuid",
      "matched_lyrics": [
        {
          "text": "string",
          "start_time": number,
          "end_time": number
        }
      ],
      "match_score": number,
      "post_details": {
        // Full post object
      }
    }
  ]
}
```

## Search Filters & Faceting

### Advanced Filter Options
```typescript
interface SearchFilters {
  // Content filters
  content_type: 'original' | 'remix' | 'cover' | 'collaboration'
  has_lyrics: boolean
  is_instrumental: boolean
  
  // Quality filters
  audio_quality: 'standard' | 'high' | 'lossless'
  min_duration: number
  max_duration: number
  
  // Engagement filters
  min_likes: number
  min_plays: number
  min_comments: number
  
  // User filters
  verified_only: boolean
  following_only: boolean
  
  // AI-generated filters
  mood: string[]
  energy_level: { min: number, max: number }
  danceability: { min: number, max: number }
  
  // Date filters
  date_range: {
    start: string
    end: string
  }
  
  // Location filters (if user permission granted)
  location: {
    country: string
    city: string
    radius_km: number
  }
}
```

## Real-time Search

### WebSocket Events
```javascript
const socket = io('/search', {
  auth: { token: jwt_token }
})

// Real-time search suggestions
socket.emit('search_typing', { query: 'partial query' })
socket.on('suggestions', (data) => {
  // Handle real-time suggestions
})

// Live trending updates
socket.on('trending_update', (data) => {
  // Handle trending content updates
})
```

## Error Handling

### Search Error Codes
- `QUERY_TOO_SHORT`: Query must be at least 2 characters
- `QUERY_TOO_LONG`: Query exceeds maximum length
- `INVALID_FILTERS`: Invalid filter parameters
- `RATE_LIMITED`: Too many search requests
- `SEARCH_TIMEOUT`: Search request timed out
- `INDEX_UNAVAILABLE`: Search index temporarily unavailable

### Error Response Format
```json
{
  "error": {
    "code": "QUERY_TOO_SHORT",
    "message": "Search query must be at least 2 characters long",
    "suggestion": "Try adding more characters to your search"
  }
}
```

## Performance & Caching

### Response Times
- Basic search: < 200ms
- Advanced search with filters: < 500ms
- Audio similarity search: < 2s
- Auto-complete: < 100ms

### Caching Strategy
- Popular queries cached for 5 minutes
- User search history cached for 1 hour
- Trending data cached for 15 minutes
- Auto-complete suggestions cached for 30 minutes

### Rate Limiting
- Anonymous users: 60 requests per minute
- Authenticated users: 200 requests per minute
- Audio similarity: 10 requests per minute
- Auto-complete: 300 requests per minute

## Search Analytics & Insights

### Search Metrics Tracked
- Query frequency and patterns
- Result click-through rates
- Search-to-action conversion
- Popular content discovery paths
- User search behavior patterns

### Business Intelligence
- Search trends and insights
- Content discovery optimization
- User engagement analytics
- Revenue attribution from search

---

*API Version: 1.0*  
*Last Updated: September 2025*  
*Next Review: With each major feature release*
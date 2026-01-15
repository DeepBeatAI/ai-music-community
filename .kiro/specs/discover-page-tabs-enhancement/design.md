# Design Document: Discover Page Tabs Enhancement

## Overview

This design document specifies the architecture and implementation approach for enhancing the Discover page with a tabbed interface that includes Tracks, Albums, Playlists, and Creators sections. The enhancement builds upon existing infrastructure including the trending analytics system, like functionality, and play tracking mechanisms.

### Goals

1. **Extend Like System**: Add like functionality for albums and playlists, mirroring the existing post like system
2. **Extend Play Tracking**: Add play count tracking for albums and playlists with 30-second minimum playback
3. **Create Trending Analytics**: Implement trending calculations for albums and playlists using the same formula as tracks
4. **Build Tab Interface**: Create a responsive tab component for navigating between content types
5. **Maintain Performance**: Ensure 5-minute caching and concurrent data loading for optimal user experience

### Non-Goals

- Moderation system changes (albums and playlists already supported via existing report_type field)
- Changes to existing track trending analytics
- Changes to existing creator popularity analytics
- Personalized recommendations (separate from objective trending metrics)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────━E
━E                        Discover Page                                ━E
━E                                                                      ━E
━E ┌─────────────────────────────────────────────────────────────━E  ━E
━E ━E                   Tab Component                             ━E  ━E
━E ━E [Tracks] [Albums] [Playlists] [Creators]                   ━E  ━E
━E └─────────────────────────────────────────────────────────────━E  ━E
━E                                                                      ━E
━E ┌──────────────┬──────────────┬──────────────┬──────────────━E   ━E
━E ━ETracks Tab   ━EAlbums Tab   │Playlists Tab ━ECreators Tab ━E   ━E
━E ━E             ━E             ━E             ━E             ━E   ━E
━E ━ETrending     ━ETrending     ━ETrending     ━ESuggested    ━E   ━E
━E ━ETracks       ━EAlbums       ━EPlaylists    ━EFor You      ━E   ━E
━E ━E(7d + All)   ━E(7d + All)   ━E(7d + All)   ━E             ━E   ━E
━E ━E             ━E             ━E             ━EPopular      ━E   ━E
━E ━E             ━E             ━E             ━ECreators     ━E   ━E
━E ━E             ━E             ━E             ━E(7d + All)   ━E   ━E
━E └──────────────┴──────────────┴──────────────┴──────────────━E   ━E
└─────────────────────────────────────────────────────────────────────━E
                              ↁE
┌─────────────────────────────────────────────────────────────────────━E
━E                   Trending Analytics Layer                          ━E
━E                                                                      ━E
━E ┌──────────────────━E ┌──────────────────━E ┌──────────────────━E━E
━E ━EgetTrendingTracks━E ━EgetTrendingAlbums━E │getTrendingPlaylists━E
━E ━E(existing)       ━E ━E(new)            ━E ━E(new)             ━E━E
━E └──────────────────━E └──────────────────━E └──────────────────━E━E
━E                                                                      ━E
━E ┌──────────────────────────────────────────────────────────────━E ━E
━E ━E             Cache Layer (5-minute TTL)                       ━E ━E
━E └──────────────────────────────────────────────────────────────━E ━E
└─────────────────────────────────────────────────────────────────────━E
                              ↁE
┌─────────────────────────────────────────────────────────────────────━E
━E                        Database Layer                               ━E
━E                                                                      ━E
━E ┌──────────────━E ┌──────────────━E ┌──────────────━E            ━E
━E ━Ealbum_likes  ━E │playlist_likes━E ━Ealbum_plays  ━E            ━E
━E ━E(new table)  ━E ━E(new table)  ━E ━E(new table)  ━E            ━E
━E └──────────────━E └──────────────━E └──────────────━E            ━E
━E                                                                      ━E
━E ┌──────────────━E ┌──────────────━E                               ━E
━E │playlist_plays━E ━E  albums     ━E                               ━E
━E ━E(new table)  ━E ━E  playlists  ━E                               ━E
━E └──────────────━E └──────────────━E                               ━E
━E                                                                      ━E
━E Database Functions:                                                 ━E
━E - get_trending_albums(days_back, limit)                            ━E
━E - get_trending_playlists(days_back, limit)                         ━E
━E - increment_album_play_count(album_uuid, user_uuid)                ━E
━E - increment_playlist_play_count(playlist_uuid, user_uuid)          ━E
└─────────────────────────────────────────────────────────────────────━E
```

### Data Flow

1. **User visits Discover page** ↁETab component renders with Tracks tab active by default
2. **User switches tabs** ↁEReact state updates, corresponding content section displays
3. **Tab content loads** ↁECalls trending analytics functions with caching
4. **Analytics functions** ↁECheck cache (5-min TTL), fetch from database if needed
5. **Database functions** ↁECalculate trending scores, apply filters, return sorted results
6. **User interacts with content** ↁELike buttons toggle, play tracking records events



## Components and Interfaces

### Frontend Components

#### 1. DiscoverTabs Component (New)

**Purpose**: Main tab navigation component for the Discover page

**Props**:
```typescript
interface DiscoverTabsProps {
  defaultTab?: 'tracks' | 'albums' | 'playlists' | 'creators';
}
```

**State**:
```typescript
interface DiscoverTabsState {
  activeTab: 'tracks' | 'albums' | 'playlists' | 'creators';
  scrollPositions: Record<string, number>;
}
```

**Behavior**:
- Renders four tab buttons with active state styling
- Manages active tab state
- Preserves scroll position per tab
- Renders corresponding content component based on active tab

#### 2. TrendingAlbumsSection Component (New)

**Purpose**: Displays trending albums for 7 days and all time

**Props**:
```typescript
interface TrendingAlbumsSectionProps {
  // No props needed - fetches data internally
}
```

**State**:
```typescript
interface TrendingAlbumsSectionState {
  albums7d: TrendingAlbum[];
  albumsAllTime: TrendingAlbum[];
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches trending albums on mount using getCachedAnalytics
- Displays loading skeletons while fetching
- Shows error state with retry button on failure
- Renders TrendingAlbumCard for each album

#### 3. TrendingPlaylistsSection Component (New)

**Purpose**: Displays trending playlists for 7 days and all time

**Props**:
```typescript
interface TrendingPlaylistsSectionProps {
  // No props needed - fetches data internally
}
```

**State**:
```typescript
interface TrendingPlaylistsSectionState {
  playlists7d: TrendingPlaylist[];
  playlistsAllTime: TrendingPlaylist[];
  loading: boolean;
  error: string | null;
}
```

**Behavior**:
- Fetches trending playlists on mount using getCachedAnalytics
- Displays loading skeletons while fetching
- Shows error state with retry button on failure
- Renders TrendingPlaylistCard for each playlist

#### 4. TrendingAlbumCard Component (New)

**Purpose**: Displays a single trending album with stats

**Props**:
```typescript
interface TrendingAlbumCardProps {
  album: TrendingAlbum;
  rank: number;
  showDate?: boolean;
}
```

**Behavior**:
- Displays rank badge, album name, creator username
- Shows play count, like count, trending score
- Includes like button component
- Navigates to album detail page on click

#### 5. TrendingPlaylistCard Component (New)

**Purpose**: Displays a single trending playlist with stats

**Props**:
```typescript
interface TrendingPlaylistCardProps {
  playlist: TrendingPlaylist;
  rank: number;
  showDate?: boolean;
}
```

**Behavior**:
- Displays rank badge, playlist name, creator username
- Shows play count, like count, trending score
- Includes like button component
- Navigates to playlist detail page on click

#### 6. AlbumLikeButton Component (New)

**Purpose**: Like button for albums (reuses LikeButton pattern)

**Props**:
```typescript
interface AlbumLikeButtonProps {
  albumId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
}
```

**Behavior**:
- Fetches initial like status on mount
- Toggles like status with optimistic UI updates
- Calls toggleAlbumLike API function
- Shows sign-in prompt for unauthenticated users

#### 7. PlaylistLikeButton Component (New)

**Purpose**: Like button for playlists (reuses LikeButton pattern)

**Props**:
```typescript
interface PlaylistLikeButtonProps {
  playlistId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
}
```

**Behavior**:
- Fetches initial like status on mount
- Toggles like status with optimistic UI updates
- Calls togglePlaylistLike API function
- Shows sign-in prompt for unauthenticated users

### Backend API Functions

#### 1. Album Like Functions (New)

```typescript
// Toggle album like status
export async function toggleAlbumLike(
  albumId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }>;

// Get album like status
export async function getAlbumLikeStatus(
  albumId: string,
  userId: string
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }>;
```

#### 2. Playlist Like Functions (New)

```typescript
// Toggle playlist like status
export async function togglePlaylistLike(
  playlistId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }>;

// Get playlist like status
export async function getPlaylistLikeStatus(
  playlistId: string,
  userId: string
): Promise<{ data: { liked: boolean; likeCount: number } | null; error: string | null }>;
```

#### 3. Trending Analytics Functions (New)

```typescript
// Get trending albums for last 7 days
export async function getTrendingAlbums7Days(): Promise<TrendingAlbum[]>;

// Get trending albums for all time
export async function getTrendingAlbumsAllTime(): Promise<TrendingAlbum[]>;

// Get trending playlists for last 7 days
export async function getTrendingPlaylists7Days(): Promise<TrendingPlaylist[]>;

// Get trending playlists for all time
export async function getTrendingPlaylistsAllTime(): Promise<TrendingPlaylist[]>;
```

#### 4. Play Tracking Functions (New)

```typescript
// Record album play (called by playTracker)
export async function recordAlbumPlay(
  albumId: string,
  userId: string
): Promise<{ success: boolean; error?: string }>;

// Record playlist play (called by playTracker)
export async function recordPlaylistPlay(
  playlistId: string,
  userId: string
): Promise<{ success: boolean; error?: string }>;
```



## Data Models

### TypeScript Interfaces

#### TrendingAlbum

```typescript
export interface TrendingAlbum {
  album_id: string;
  name: string;
  creator_username: string;
  creator_user_id: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  cover_image_url: string | null;
  track_count: number;
}
```

#### TrendingPlaylist

```typescript
export interface TrendingPlaylist {
  playlist_id: string;
  name: string;
  creator_username: string;
  creator_user_id: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  cover_image_url: string | null;
  track_count: number;
}
```

### Database Schema

#### album_likes Table (New)

```sql
CREATE TABLE album_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate likes
  CONSTRAINT unique_album_like UNIQUE (album_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_album_likes_album_id ON album_likes(album_id);
CREATE INDEX idx_album_likes_user_id ON album_likes(user_id);
CREATE INDEX idx_album_likes_created_at ON album_likes(created_at DESC);
```

#### playlist_likes Table (New)

```sql
CREATE TABLE playlist_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate likes
  CONSTRAINT unique_playlist_like UNIQUE (playlist_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);
CREATE INDEX idx_playlist_likes_user_id ON playlist_likes(user_id);
CREATE INDEX idx_playlist_likes_created_at ON playlist_likes(created_at DESC);
```

#### album_plays Table (New)

```sql
CREATE TABLE album_plays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_album_plays_album_id ON album_plays(album_id);
CREATE INDEX idx_album_plays_user_id ON album_plays(user_id);
CREATE INDEX idx_album_plays_created_at ON album_plays(created_at DESC);
```

#### playlist_plays Table (New)

```sql
CREATE TABLE playlist_plays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_playlist_plays_playlist_id ON playlist_plays(playlist_id);
CREATE INDEX idx_playlist_plays_user_id ON playlist_plays(user_id);
CREATE INDEX idx_playlist_plays_created_at ON playlist_plays(created_at DESC);
```

#### Albums Table Updates (Existing)

```sql
-- Add play_count column to albums table
ALTER TABLE albums ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Add index for play_count
CREATE INDEX IF NOT EXISTS idx_albums_play_count ON albums(play_count DESC);
```

#### Playlists Table Updates (Existing)

```sql
-- Add play_count column to playlists table
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Add index for play_count
CREATE INDEX IF NOT EXISTS idx_playlists_play_count ON playlists(play_count DESC);
```

### Database Functions

#### get_trending_albums Function (New)

```sql
CREATE OR REPLACE FUNCTION get_trending_albums(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  album_id UUID,
  name TEXT,
  creator_username TEXT,
  creator_user_id UUID,
  play_count BIGINT,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  cover_image_url TEXT,
  track_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS album_id,
    a.name,
    up.username AS creator_username,
    a.user_id AS creator_user_id,
    COALESCE(COUNT(DISTINCT ap.id), 0) AS play_count,
    COALESCE(COUNT(DISTINCT al.id), 0) AS like_count,
    (COALESCE(COUNT(DISTINCT ap.id), 0) * 0.7 + COALESCE(COUNT(DISTINCT al.id), 0) * 0.3) AS trending_score,
    a.created_at,
    a.cover_image_url,
    COALESCE(COUNT(DISTINCT at.id), 0) AS track_count
  FROM albums a
  JOIN user_profiles up ON up.user_id = a.user_id
  LEFT JOIN album_plays ap ON ap.album_id = a.id
  LEFT JOIN album_likes al ON al.album_id = a.id
  LEFT JOIN album_tracks at ON at.album_id = a.id
  WHERE
    a.is_public = true
    AND (days_back = 0 OR a.created_at >= NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY a.id, a.name, up.username, a.user_id, a.created_at, a.cover_image_url
  ORDER BY trending_score DESC, a.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### get_trending_playlists Function (New)

```sql
CREATE OR REPLACE FUNCTION get_trending_playlists(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  playlist_id UUID,
  name TEXT,
  creator_username TEXT,
  creator_user_id UUID,
  play_count BIGINT,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  cover_image_url TEXT,
  track_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS playlist_id,
    p.name,
    up.username AS creator_username,
    p.user_id AS creator_user_id,
    COALESCE(COUNT(DISTINCT pp.id), 0) AS play_count,
    COALESCE(COUNT(DISTINCT pl.id), 0) AS like_count,
    (COALESCE(COUNT(DISTINCT pp.id), 0) * 0.7 + COALESCE(COUNT(DISTINCT pl.id), 0) * 0.3) AS trending_score,
    p.created_at,
    p.cover_image_url,
    COALESCE(COUNT(DISTINCT pt.id), 0) AS track_count
  FROM playlists p
  JOIN user_profiles up ON up.user_id = p.user_id
  LEFT JOIN playlist_plays pp ON pp.playlist_id = p.id
  LEFT JOIN playlist_likes pl ON pl.playlist_id = p.id
  LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
  WHERE
    p.is_public = true
    AND (days_back = 0 OR p.created_at >= NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY p.id, p.name, up.username, p.user_id, p.created_at, p.cover_image_url
  ORDER BY trending_score DESC, p.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### increment_album_play_count Function (New)

```sql
CREATE OR REPLACE FUNCTION increment_album_play_count(
  album_uuid UUID,
  user_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  album_owner_id UUID;
  album_is_public BOOLEAN;
BEGIN
  -- Get album owner and public status
  SELECT user_id, is_public INTO album_owner_id, album_is_public
  FROM albums
  WHERE id = album_uuid;
  
  -- Only increment if album is public and user is not the owner
  IF album_is_public AND album_owner_id != user_uuid THEN
    -- Insert play record
    INSERT INTO album_plays (album_id, user_id)
    VALUES (album_uuid, user_uuid);
    
    -- Increment play count on album
    UPDATE albums
    SET play_count = play_count + 1
    WHERE id = album_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### increment_playlist_play_count Function (New)

```sql
CREATE OR REPLACE FUNCTION increment_playlist_play_count(
  playlist_uuid UUID,
  user_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  playlist_owner_id UUID;
  playlist_is_public BOOLEAN;
BEGIN
  -- Get playlist owner and public status
  SELECT user_id, is_public INTO playlist_owner_id, playlist_is_public
  FROM playlists
  WHERE id = playlist_uuid;
  
  -- Only increment if playlist is public and user is not the owner
  IF playlist_is_public AND playlist_owner_id != user_uuid THEN
    -- Insert play record
    INSERT INTO playlist_plays (playlist_id, user_id)
    VALUES (playlist_uuid, user_uuid);
    
    -- Increment play count on playlist
    UPDATE playlists
    SET play_count = play_count + 1
    WHERE id = playlist_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

Based on the prework analysis of all 65 acceptance criteria across 13 requirements, the following correctness properties have been identified. After property reflection to eliminate redundancies, these properties provide comprehensive validation coverage.

### Like System Properties

**Property 1: Like Toggle Consistency**
*For any* album or playlist and any authenticated user, toggling the like status twice should return the content to its original like state (liked ↁEunliked ↁEliked or unliked ↁEliked ↁEunliked).
**Validates: Requirements 1.2, 2.2**

**Property 2: Duplicate Like Prevention**
*For any* album or playlist and any user, attempting to like the same content multiple times should result in only one like record in the database.
**Validates: Requirements 1.6, 2.6, 13.1**

**Property 3: Like Count Accuracy**
*For any* album or playlist, the displayed like count should equal the number of distinct users who have liked that content.
**Validates: Requirements 1.1, 1.4, 2.1, 2.4**

**Property 4: Cascade Delete for Likes**
*For any* album or playlist, when the content is deleted, all associated like records should be automatically removed from the database.
**Validates: Requirements 1.7, 2.7, 13.2**

### Play Tracking Properties

**Property 5: Owner Play Exclusion**
*For any* public album or playlist, when the owner plays their own content, the play count should not increment.
**Validates: Requirements 3.2, 4.2, 13.4**

**Property 6: Private Content Play Exclusion**
*For any* private album or playlist, playing the content should not increment the play count regardless of who plays it.
**Validates: Requirements 3.3, 4.3, 13.4**

**Property 7: 30-Second Minimum Playback**
*For any* track from a public album or playlist, the play count should only increment if the track is played for at least 30 seconds by a non-owner user.
**Validates: Requirements 3.1, 4.1**

**Property 8: Debouncing Within 30 Seconds**
*For any* album or playlist, if a user plays multiple tracks from the same content within 30 seconds, it should count as a single play.
**Validates: Requirements 3.5, 4.5**

**Property 9: Play Event Recording**
*For any* valid play (public content, non-owner, 30+ seconds), a play record should be created with timestamp and user_id.
**Validates: Requirements 3.4, 4.4**

### Trending Analytics Properties

**Property 10: Trending Score Formula Consistency**
*For any* album, playlist, or track, the trending score should be calculated using the formula: (play_count ÁE0.7) + (like_count ÁE0.3).
**Validates: Requirements 5.1, 6.1, 13.3**

**Property 11: 7-Day Time Window Filter**
*For any* trending calculation with "last 7 days" filter, only content created within the last 7 days should be included in results.
**Validates: Requirements 5.2, 6.2**

**Property 12: All-Time Inclusion**
*For any* trending calculation with "all time" filter, all public content should be included regardless of creation date.
**Validates: Requirements 5.3, 6.3**

**Property 13: Public Content Only**
*For any* trending calculation, only content with is_public=true should be included in the results.
**Validates: Requirements 5.4, 6.4, 13.5**

**Property 14: Top 10 Limit and Sorting**
*For any* trending section, exactly 10 items (or fewer if less than 10 exist) should be displayed, sorted by trending score in descending order.
**Validates: Requirements 5.5, 6.5**

**Property 15: Trending Display Information**
*For any* trending album or playlist card, the displayed information should include name, creator username, play count, like count, and trending score.
**Validates: Requirements 5.6, 6.6**

### UI Navigation Properties

**Property 16: Tab Visibility**
*For any* user visiting the Discover page, all four tabs (Tracks, Albums, Playlists, Creators) should be visible and accessible.
**Validates: Requirements 7.1**

**Property 17: Default Tab Selection**
*For any* initial page load of the Discover page, the Tracks tab should be active by default.
**Validates: Requirements 7.2**

**Property 18: Tab Content Display**
*For any* tab selection, clicking the tab should display the corresponding content section and hide other sections.
**Validates: Requirements 7.3**

**Property 19: Scroll Position Preservation**
*For any* tab, switching away and then returning to that tab should restore the previous scroll position.
**Validates: Requirements 7.4**

**Property 20: Active Tab Indication**
*For any* active tab, there should be a visual indicator distinguishing it from inactive tabs.
**Validates: Requirements 7.5**

**Property 21: Responsive Design**
*For any* viewport size (mobile or desktop), the tab interface should maintain usability and proper layout.
**Validates: Requirements 7.6**

### Content Display Properties

**Property 22: Tracks Tab Sections**
*For any* user viewing the Tracks tab, both "🔥 Top 10 Trending Tracks (Last 7 Days)" and "⭁ETop 10 Trending Tracks (All Time)" sections should be displayed.
**Validates: Requirements 8.1, 8.2**

**Property 23: Albums Tab Sections**
*For any* user viewing the Albums tab, both "🔥 Top 10 Trending Albums (Last 7 Days)" and "⭁ETop 10 Trending Albums (All Time)" sections should be displayed.
**Validates: Requirements 9.1, 9.2**

**Property 24: Playlists Tab Sections**
*For any* user viewing the Playlists tab, both "🔥 Top 10 Trending Playlists (Last 7 Days)" and "⭁ETop 10 Trending Playlists (All Time)" sections should be displayed.
**Validates: Requirements 10.1, 10.2**

**Property 25: Creators Tab Sections**
*For any* authenticated user viewing the Creators tab, the "✨ Suggested for You" section should be displayed along with "🎵 Top 5 Popular Creators (Last 7 Days)" and "👑 Top 5 Popular Creators (All Time)" sections.
**Validates: Requirements 11.1, 11.2, 11.3**

### Performance Properties

**Property 26: Cache Duration**
*For any* trending data fetch, the results should be cached for 5 minutes before requiring a fresh database query.
**Validates: Requirements 12.1, 12.2**

**Property 27: Tab Load Performance**
*For any* tab switch, the content should load and display within 1 second.
**Validates: Requirements 12.5**

### Authentication Properties

**Property 28: Unauthenticated Like Attempt**
*For any* unauthenticated user attempting to like an album or playlist, a sign-in prompt should be displayed and no like should be recorded.
**Validates: Requirements 1.3, 2.3**

## Error Handling

### Frontend Error Handling

#### Like Button Errors

**Network Failures:**
- Display toast notification: "Failed to update like. Please try again."
- Revert optimistic UI update to previous state
- Provide retry button in notification
- Log error to console for debugging

**Authentication Errors:**
- Display modal: "Please sign in to like this content"
- Provide "Sign In" and "Cancel" buttons
- Redirect to sign-in page on "Sign In" click
- Preserve current page context for return after sign-in

**Rate Limiting:**
- Display toast: "Too many requests. Please wait a moment."
- Disable like button temporarily (5 seconds)
- Re-enable button after cooldown period

#### Trending Data Fetch Errors

**Network Failures:**
- Display error state with message: "Failed to load trending content"
- Show retry button
- Preserve loading skeleton structure
- Log error details for debugging

**Empty Results:**
- Display friendly message: "No trending content available yet"
- Show placeholder illustration
- Suggest checking back later
- Do not show error state (this is valid empty state)

**Timeout Errors:**
- Display message: "Loading is taking longer than expected"
- Show retry button
- Implement exponential backoff for retries (1s, 2s, 4s)
- Fall back to cached data if available

#### Tab Navigation Errors

**Content Load Failures:**
- Display error within tab content area
- Keep tab navigation functional
- Allow switching to other tabs
- Provide retry button for failed tab

**Scroll Position Restoration Failures:**
- Gracefully degrade to top of content
- Log warning but do not show user error
- Continue with normal tab functionality

### Backend Error Handling

#### Database Function Errors

**Connection Failures:**
- Return error response with status 500
- Log detailed error information
- Include retry-after header (30 seconds)
- Return cached data if available

**Query Timeout:**
- Set query timeout to 5 seconds
- Return partial results if possible
- Log slow query for optimization
- Return error response if no partial results

**Invalid Parameters:**
- Validate all input parameters
- Return 400 Bad Request with descriptive message
- Log validation errors
- Do not execute query with invalid parameters

#### Like Toggle Errors

**Duplicate Like Constraint Violation:**
- Catch unique constraint error
- Return current like status without error
- Log occurrence for monitoring
- Treat as successful operation (idempotent)

**Foreign Key Violations:**
- Return 404 Not Found: "Content not found"
- Log error with content ID
- Do not expose internal error details
- Suggest refreshing page

**Cascade Delete Failures:**
- Log critical error
- Attempt manual cleanup
- Alert system administrators
- Return 500 Internal Server Error

#### Play Tracking Errors

**Debouncing Logic Failures:**
- Log error but continue operation
- Default to recording play (favor over-counting)
- Monitor for patterns indicating systematic issues
- Alert if error rate exceeds threshold

**Owner Check Failures:**
- Default to not incrementing (favor under-counting)
- Log error with user and content IDs
- Continue without blocking user experience
- Alert if error rate exceeds threshold

**Public Status Check Failures:**
- Default to not incrementing (favor privacy)
- Log error with content ID
- Continue without blocking playback
- Alert if error rate exceeds threshold

### Caching Error Handling

**Cache Miss:**
- Fetch fresh data from database
- Update cache with new data
- Log cache miss rate for monitoring
- No user-facing error

**Cache Corruption:**
- Clear corrupted cache entry
- Fetch fresh data from database
- Log corruption incident
- Update cache with fresh data

**Cache Expiration During Read:**
- Return stale data to user
- Trigger background refresh
- Update cache asynchronously
- No user-facing error

### Error Monitoring and Alerting

**Critical Errors (Immediate Alert):**
- Database connection failures
- Cascade delete failures
- Authentication system failures
- Cache system complete failure

**Warning Errors (Daily Summary):**
- High rate of like toggle failures
- Slow query performance
- Cache miss rate above threshold
- Play tracking validation failures

**Info Errors (Weekly Summary):**
- Empty trending results
- Individual network timeouts
- Scroll position restoration failures
- Individual cache misses

### Error Recovery Strategies

**Automatic Retry:**
- Network failures: 3 retries with exponential backoff
- Database timeouts: 2 retries with 1-second delay
- Cache failures: 1 retry immediately

**Graceful Degradation:**
- Use cached data when database unavailable
- Show partial results when some queries fail
- Disable like buttons when auth service unavailable
- Continue playback even if tracking fails

**User Notification:**
- Toast notifications for transient errors
- Modal dialogs for authentication required
- Inline error messages for content load failures
- Status indicators for system-wide issues

## Testing Strategy

### Overview

This feature will be validated using a dual testing approach that combines unit tests for specific examples and edge cases with property-based tests for universal correctness properties. Both testing approaches are complementary and necessary for comprehensive coverage.

### Property-Based Testing

**Testing Library:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: discover-page-tabs-enhancement, Property {number}: {property_text}`

**Property Test Implementation:**

Each correctness property from the design document will be implemented as a property-based test. The tests will generate random valid inputs and verify that the property holds across all generated cases.

**Example Property Test Structure:**
```typescript
import fc from 'fast-check';

describe('Feature: discover-page-tabs-enhancement', () => {
  it('Property 1: Like Toggle Consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          contentId: fc.uuid(),
          userId: fc.uuid(),
          contentType: fc.constantFrom('album', 'playlist'),
        }),
        async ({ contentId, userId, contentType }) => {
          // Toggle like twice
          const firstToggle = await toggleLike(contentId, userId, contentType, false);
          const secondToggle = await toggleLike(contentId, userId, contentType, true);
          
          // Should return to original state
          expect(secondToggle.liked).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Coverage:**

1. **Like System Properties (Properties 1-4):**
   - Generate random albums, playlists, and users
   - Test like toggle, duplicate prevention, count accuracy, cascade deletes
   - Verify database state after operations

2. **Play Tracking Properties (Properties 5-9):**
   - Generate random content with various ownership and privacy states
   - Test owner exclusion, private content exclusion, 30-second minimum
   - Test debouncing logic with various timing scenarios
   - Verify play records and counts

3. **Trending Analytics Properties (Properties 10-15):**
   - Generate random content with various play/like counts and creation dates
   - Test formula calculation, time window filtering, public content filtering
   - Test sorting and limiting logic
   - Verify displayed information completeness

4. **UI Navigation Properties (Properties 16-21):**
   - Generate random tab sequences and scroll positions
   - Test tab visibility, default selection, content display
   - Test scroll preservation across tab switches
   - Verify responsive behavior (requires visual regression testing)

5. **Content Display Properties (Properties 22-25):**
   - Generate random content sets
   - Test section visibility for each tab
   - Verify correct content rendering

6. **Performance Properties (Properties 26-27):**
   - Generate random cache scenarios
   - Test cache duration and hit rates
   - Measure tab load times across multiple runs

7. **Authentication Properties (Property 28):**
   - Generate random authenticated and unauthenticated states
   - Test sign-in prompt display
   - Verify no likes recorded for unauthenticated attempts

### Unit Testing

**Testing Framework:** Jest with React Testing Library

**Unit Test Focus Areas:**

1. **Component Rendering:**
   - Test that DiscoverTabs renders all four tabs
   - Test that TrendingAlbumsSection renders loading, error, and success states
   - Test that TrendingPlaylistsSection renders loading, error, and success states
   - Test that AlbumLikeButton and PlaylistLikeButton render correctly

2. **User Interactions:**
   - Test tab clicking updates active tab state
   - Test like button clicking toggles like status
   - Test clicking album/playlist cards navigates correctly
   - Test retry button on error states

3. **Edge Cases:**
   - Empty trending results (no content available)
   - Network timeout scenarios
   - Authentication failures
   - Duplicate like attempts
   - Content deletion during interaction

4. **Error Handling:**
   - Network failure error states
   - Authentication error prompts
   - Rate limiting responses
   - Invalid parameter handling

5. **Integration Points:**
   - Test getCachedAnalytics integration
   - Test toggleAlbumLike/togglePlaylistLike API calls
   - Test recordAlbumPlay/recordPlaylistPlay integration
   - Test navigation integration

**Example Unit Test:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiscoverTabs } from '@/components/discover/DiscoverTabs';

describe('DiscoverTabs Component', () => {
  it('renders all four tabs', () => {
    render(<DiscoverTabs />);
    
    expect(screen.getByText('Tracks')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Creators')).toBeInTheDocument();
  });

  it('displays Tracks tab by default', () => {
    render(<DiscoverTabs />);
    
    const tracksTab = screen.getByText('Tracks');
    expect(tracksTab).toHaveClass('active');
  });

  it('switches to Albums tab when clicked', async () => {
    render(<DiscoverTabs />);
    
    const albumsTab = screen.getByText('Albums');
    fireEvent.click(albumsTab);
    
    await waitFor(() => {
      expect(albumsTab).toHaveClass('active');
      expect(screen.getByText('🔥 Top 10 Trending Albums (Last 7 Days)')).toBeInTheDocument();
    });
  });
});
```

### Database Testing

**Testing Approach:** Direct database function testing using Supabase test client

**Database Test Coverage:**

1. **Database Functions:**
   - Test get_trending_albums with various parameters
   - Test get_trending_playlists with various parameters
   - Test increment_album_play_count with various scenarios
   - Test increment_playlist_play_count with various scenarios

2. **Constraints and Triggers:**
   - Test unique constraints on album_likes and playlist_likes
   - Test foreign key constraints and cascade deletes
   - Test indexes improve query performance

3. **RLS Policies:**
   - Test users can only like content when authenticated
   - Test users can view public content
   - Test users cannot view private content (unless owner)

**Example Database Test:**
```typescript
import { createClient } from '@supabase/supabase-js';

describe('Database Functions', () => {
  it('get_trending_albums returns top 10 albums sorted by score', async () => {
    const supabase = createClient(url, key);
    
    // Create test data
    const albums = await createTestAlbums(15); // Create 15 albums
    await createTestPlays(albums);
    await createTestLikes(albums);
    
    // Call function
    const { data, error } = await supabase.rpc('get_trending_albums', {
      days_back: 7,
      result_limit: 10
    });
    
    expect(error).toBeNull();
    expect(data).toHaveLength(10);
    
    // Verify sorting
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].trending_score).toBeGreaterThanOrEqual(data[i + 1].trending_score);
    }
  });
});
```

### Integration Testing

**Testing Approach:** End-to-end testing with Playwright

**Integration Test Scenarios:**

1. **Complete User Flows:**
   - User visits Discover page ↁEsees Tracks tab ↁEswitches to Albums tab ↁElikes an album
   - User visits Discover page ↁEswitches to Playlists tab ↁEclicks playlist ↁEnavigates to detail page
   - Unauthenticated user tries to like content ↁEsees sign-in prompt

2. **Cross-Component Integration:**
   - Tab switching preserves scroll position
   - Like button updates reflect in trending counts
   - Play tracking updates reflect in trending scores

3. **Performance Validation:**
   - Tab load times under 1 second
   - Cache reduces database queries
   - Concurrent data loading works correctly

**Example Integration Test:**
```typescript
import { test, expect } from '@playwright/test';

test('user can like an album from trending section', async ({ page }) => {
  // Navigate to Discover page
  await page.goto('/discover');
  
  // Switch to Albums tab
  await page.click('text=Albums');
  
  // Wait for trending albums to load
  await page.waitForSelector('text=🔥 Top 10 Trending Albums');
  
  // Click like button on first album
  const likeButton = page.locator('[data-testid="album-like-button"]').first();
  const initialCount = await likeButton.textContent();
  await likeButton.click();
  
  // Verify like count increased
  await expect(likeButton).not.toHaveText(initialCount);
  
  // Verify optimistic update
  await expect(likeButton).toHaveClass(/liked/);
});
```

### Performance Testing

**Metrics to Measure:**

1. **Page Load Performance:**
   - Initial Discover page load time
   - Tab switch time
   - Trending data fetch time

2. **Database Performance:**
   - Query execution time for trending functions
   - Index effectiveness
   - Cache hit rate

3. **User Experience Metrics:**
   - Time to interactive
   - First contentful paint
   - Largest contentful paint

**Performance Benchmarks:**
- Page load: < 3 seconds
- Tab switch: < 1 second
- Database queries: < 100ms
- Cache hit rate: > 80%

### Test Execution Strategy

**Development Phase:**
1. Write property-based tests for each correctness property
2. Write unit tests for components and functions
3. Run tests locally before committing
4. Fix all failing tests before proceeding

**Pre-Deployment:**
1. Run full test suite (unit + property + integration)
2. Run performance benchmarks
3. Verify all tests pass
4. Check code coverage (target: 80%+)

**Post-Deployment:**
1. Monitor error rates in production
2. Validate performance metrics
3. Check cache effectiveness
4. Monitor user engagement with new tabs

### Test Data Management

**Test Data Strategy:**
- Use factories to generate test data
- Clean up test data after each test
- Use transactions for database tests (rollback after test)
- Mock external services (Supabase Auth, Storage)

**Test Data Factories:**
```typescript
// Album factory
export const createTestAlbum = (overrides = {}) => ({
  id: uuid(),
  name: faker.music.songName(),
  user_id: uuid(),
  is_public: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Playlist factory
export const createTestPlaylist = (overrides = {}) => ({
  id: uuid(),
  name: faker.music.songName(),
  user_id: uuid(),
  is_public: true,
  created_at: new Date().toISOString(),
  ...overrides,
});
```

### Continuous Integration

**CI Pipeline:**
1. Run linting and type checking
2. Run unit tests
3. Run property-based tests
4. Run integration tests
5. Generate coverage report
6. Run performance benchmarks
7. Deploy if all tests pass

**Test Failure Handling:**
- Block deployment on test failures
- Notify team of failures
- Provide detailed error logs
- Suggest fixes based on error patterns


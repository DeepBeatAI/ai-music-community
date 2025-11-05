# Design Document

## Overview

The Single Track Page feature provides a dedicated landing page for individual tracks, accessible via shareable URLs in the format `/tracks/{track_id}`. This page displays comprehensive track information with an integrated waveform player, reusing existing components from the library and dashboard pages to maintain consistency and minimize code duplication.

## Architecture

### Route Structure

```
/tracks/[id]/page.tsx
```

The page uses Next.js 15 App Router dynamic routing with the `[id]` parameter to capture the track ID from the URL.

### Component Hierarchy

```
SingleTrackPage (page.tsx)
├── MainLayout
│   └── Single Track Container
│       ├── Back Button
│       ├── Track Header Section
│       │   ├── Track Metadata
│       │   └── Creator Info with Follow Button
│       ├── Waveform Player Section
│       │   └── WavesurferPlayer (reused from dashboard)
│       ├── Track Card Section
│       │   └── TrackCardWithActions (reused from library)
│       └── Social Interaction Section
│           ├── LikeButton
│           └── Share/Copy URL Actions
```

### Data Flow

```
URL Parameter (track_id)
    ↓
Fetch Track Data (Supabase)
    ↓
Fetch Related Data (user profile, likes, memberships)
    ↓
Render Components with Data
    ↓
User Interactions (play, like, follow, share)
    ↓
Update State & Database
```

## Components and Interfaces

### 1. SingleTrackPage Component

**Location:** `client/src/app/tracks/[id]/page.tsx`

**Purpose:** Main page component that orchestrates data fetching and component rendering.

**Props:** None (uses Next.js params)

**State:**
```typescript
interface SingleTrackPageState {
  track: TrackWithMembership | null;
  loading: boolean;
  error: string | null;
  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
}
```

**Key Functions:**
- `fetchTrackData(trackId: string)`: Fetches track data with all related information
- `handleLike()`: Toggles like state and updates database
- `handleFollow()`: Toggles follow state for track creator
- `handleBack()`: Navigates back with appropriate fallback logic

### 2. Reused Components

#### WavesurferPlayer
**Source:** `client/src/components/WavesurferPlayer.tsx`

**Usage:**
```typescript
<WavesurferPlayer
  audioUrl={cachedAudioUrl}
  trackId={track.id}  // CRITICAL: Required for play count tracking
  fileName={track.title}
  duration={track.duration}
  showWaveform={true}
  theme="ai_music"
/>
```

**Features:**
- Waveform visualization
- Play/pause controls
- Seek functionality
- Volume control
- Time display
- **Play count tracking integration** (via `playTracker` from `@/lib/playTracking`)

**Play Tracking Algorithm:**
The WavesurferPlayer component integrates with the play tracking system that:
1. Starts tracking when play begins (`playTracker.onPlayStart(trackId)`)
2. Checks every 5 seconds if the minimum play duration (30 seconds) has been reached
3. Records the play to the database via `increment_play_count` RPC function
4. Implements debouncing to prevent duplicate counts (30 seconds between plays)
5. Queues failed plays for retry in localStorage
6. Stops tracking when playback stops (`playTracker.onPlayStop(trackId)`)

**Current Implementation Status:**
- ✅ WavesurferPlayer already has play tracking integrated
- ✅ Dashboard audio posts already pass `trackId` to WavesurferPlayer
- ⚠️ Single track page must pass `trackId` to WavesurferPlayer for tracking to work

#### TrackCardWithActions
**Source:** `client/src/components/library/TrackCardWithActions.tsx`

**Usage:**
```typescript
<TrackCardWithActions
  track={track}
  userId={user?.id}
  onTrackUpdate={handleTrackUpdate}
  onTrackDelete={handleTrackDelete}
  onShowToast={handleShowToast}
/>
```

**Features:**
- Track metadata display
- Album/playlist badges
- Actions menu (conditional based on ownership)
- Play count and like count display

#### LikeButton
**Source:** `client/src/components/LikeButton.tsx`

**Usage:**
```typescript
<LikeButton
  postId={postId}  // Derived from track's post
  initialLiked={isLiked}
  initialLikeCount={likeCount}
  currentUserId={user?.id}
  onLikeChange={handleLikeChange}
/>
```

#### FollowButton
**Source:** `client/src/components/FollowButton.tsx`

**Usage:**
```typescript
<FollowButton
  targetUserId={track.user_id}
  currentUserId={user?.id}
  initialFollowing={isFollowing}
/>
```

## Data Models

### Track Data Structure

```typescript
interface TrackWithMembership {
  id: string;
  title: string;
  author: string;
  description: string | null;
  file_url: string;
  duration: number;
  genre: string | null;
  play_count: number;
  like_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Membership data
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
  
  // User profile data
  user?: {
    id: string;
    username: string;
  };
}
```

### Database Queries

#### Fetch Track with All Related Data

```sql
SELECT 
  tracks.*,
  user_profiles.username,
  album_tracks.album_id,
  albums.name as album_name,
  array_agg(DISTINCT playlist_tracks.playlist_id) as playlist_ids,
  array_agg(DISTINCT playlists.name) as playlist_names,
  COUNT(DISTINCT post_likes.id) as like_count
FROM tracks
LEFT JOIN user_profiles ON tracks.user_id = user_profiles.id
LEFT JOIN album_tracks ON tracks.id = album_tracks.track_id
LEFT JOIN albums ON album_tracks.album_id = albums.id
LEFT JOIN playlist_tracks ON tracks.id = playlist_tracks.track_id
LEFT JOIN playlists ON playlist_tracks.playlist_id = playlists.id
LEFT JOIN posts ON tracks.id = posts.track_id
LEFT JOIN post_likes ON posts.id = post_likes.post_id
WHERE tracks.id = $1
GROUP BY tracks.id, user_profiles.username, album_tracks.album_id, albums.name
```

#### Check User Like Status

```sql
SELECT EXISTS(
  SELECT 1 FROM post_likes
  WHERE post_id = (SELECT id FROM posts WHERE track_id = $1)
  AND user_id = $2
) as is_liked
```

#### Check User Follow Status

```sql
SELECT EXISTS(
  SELECT 1 FROM follows
  WHERE follower_id = $1
  AND following_id = $2
) as is_following
```

## Error Handling

### Error States

1. **Track Not Found (404)**
   - Display: "Track not found" message with link to dashboard
   - Cause: Invalid track_id or deleted track

2. **Permission Denied (403)**
   - Display: "This track is private" with authentication prompt
   - Cause: Private track accessed by non-owner

3. **Audio Load Error**
   - Display: Error message in waveform player with retry button
   - Cause: Network issues or invalid audio URL

4. **Network Error**
   - Display: "Failed to load track" with retry button
   - Cause: API request failure

### Error Handling Strategy

```typescript
try {
  const track = await fetchTrackData(trackId);
  if (!track) {
    setError('Track not found');
    return;
  }
  setTrack(track);
} catch (error) {
  if (error.code === 'PGRST116') {
    setError('Track not found');
  } else if (error.code === '42501') {
    setError('Permission denied');
  } else {
    setError('Failed to load track. Please try again.');
  }
}
```

## Testing Strategy

### Unit Tests

1. **Track Data Fetching**
   - Test successful track fetch
   - Test track not found scenario
   - Test permission denied scenario
   - Test network error handling

2. **Like Functionality**
   - Test like toggle
   - Test like count update
   - Test optimistic updates
   - Test error rollback

3. **Follow Functionality**
   - Test follow toggle
   - Test follow state persistence
   - Test error handling

4. **Navigation**
   - Test back button with history
   - Test back button without history (authenticated)
   - Test back button without history (unauthenticated)

### Integration Tests

1. **Page Load Flow**
   - Test complete page load with valid track ID
   - Test page load with invalid track ID
   - Test page load for authenticated vs unauthenticated users

2. **Audio Playback**
   - Test waveform player initialization
   - Test play/pause functionality
   - Test seek functionality
   - Test play count tracking

3. **Social Interactions**
   - Test like button interaction
   - Test follow button interaction
   - Test share functionality
   - Test copy URL functionality

### End-to-End Tests

1. **User Journey: Share and View Track**
   - User copies track URL from library
   - User shares URL with another user
   - Recipient opens URL
   - Recipient plays track
   - Recipient likes track

2. **User Journey: Track Owner Management**
   - Owner views their track page
   - Owner edits track metadata (via actions menu)
   - Owner adds track to album
   - Owner adds track to playlist
   - Owner deletes track

## Performance Optimization

### Loading Strategy

1. **Progressive Loading**
   ```
   Initial Load:
   - Track metadata (priority)
   - User profile data (priority)
   - Like/follow status (if authenticated)
   
   Deferred Load:
   - Audio file (via getCachedAudioUrl)
   - Waveform visualization
   - Album/playlist membership data
   ```

2. **Code Splitting**
   - Lazy load WavesurferPlayer component
   - Lazy load action modals
   - Lazy load social components for unauthenticated users

3. **Caching Strategy**
   - Use `getCachedAudioUrl()` for audio files
   - Cache track metadata in React Query/SWR
   - Cache user profile data
   - Cache like/follow status

### Performance Metrics

- **Target Load Time:** < 1 second for metadata
- **Target Audio Ready Time:** < 2 seconds
- **Target Interaction Response:** < 100ms

## SEO and Sharing Optimization

### Meta Tags Implementation

```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  const track = await fetchTrackData(params.id);
  
  if (!track) {
    return {
      title: 'Track Not Found',
    };
  }
  
  return {
    title: `${track.title} by ${track.author} | AI Music Platform`,
    description: track.description || `Listen to ${track.title} by ${track.author}`,
    openGraph: {
      title: track.title,
      description: track.description || `Listen to ${track.title}`,
      type: 'music.song',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/tracks/${track.id}`,
      images: [
        {
          url: track.cover_image_url || '/default-track-cover.png',
          width: 1200,
          height: 630,
          alt: track.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: track.title,
      description: track.description || `Listen to ${track.title}`,
      images: [track.cover_image_url || '/default-track-cover.png'],
    },
  };
}
```

## Responsive Design

### Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Layout Adaptations

#### Mobile (< 768px)
```
┌─────────────────────┐
│ Back Button         │
├─────────────────────┤
│ Track Title         │
│ Creator Info        │
│ Follow Button       │
├─────────────────────┤
│ Waveform Player     │
│ (Full Width)        │
├─────────────────────┤
│ Track Card          │
│ (Stacked Layout)    │
├─────────────────────┤
│ Like Button         │
│ Share Button        │
└─────────────────────┘
```

#### Desktop (> 1024px)
```
┌─────────────────────────────────────┐
│ Back Button                         │
├──────────────────┬──────────────────┤
│ Track Card       │ Creator Info     │
│ (Left Column)    │ Follow Button    │
│                  │                  │
│                  │ Social Stats     │
│                  │ Like Button      │
│                  │ Share Button     │
├──────────────────┴──────────────────┤
│ Waveform Player (Full Width)       │
└─────────────────────────────────────┘
```

## Security Considerations

### Access Control

1. **Public Tracks**
   - Accessible to all users (authenticated and unauthenticated)
   - Full playback and viewing capabilities

2. **Private Tracks**
   - Only accessible to track owner
   - Redirect to login for unauthenticated users
   - Show permission error for authenticated non-owners

3. **Actions Menu**
   - Full menu for track owner
   - Limited menu (copy URL, share) for non-owners
   - No menu for unauthenticated users

### Data Validation

1. **Track ID Validation**
   - Validate UUID format
   - Check track existence
   - Verify user permissions

2. **User Input Validation**
   - Sanitize all user inputs
   - Validate like/follow actions
   - Prevent CSRF attacks

## Implementation Notes

### Component Reuse Strategy

1. **WavesurferPlayer**
   - Reuse exact component from dashboard
   - **CRITICAL:** Pass `trackId` prop for play count tracking (required for the tracking algorithm to work)
   - Use same theme configuration
   - Play tracking is already integrated in the component via `playTracker` from `@/lib/playTracking`
   - No additional play tracking code needed - just ensure `trackId` is passed

2. **TrackCardWithActions**
   - Reuse from library pages
   - Conditional rendering of actions based on ownership
   - Same modal components for actions

3. **Social Components**
   - Reuse LikeButton from dashboard
   - Reuse FollowButton from dashboard
   - Maintain consistent behavior

### Play Count Tracking Implementation

**Algorithm Location:** `client/src/lib/playTracking.ts`

**How It Works:**
1. When WavesurferPlayer receives a `trackId` prop, it automatically integrates with the play tracker
2. On play start: `playTracker.onPlayStart(trackId)` is called
3. Every 5 seconds during playback: `playTracker.checkAndRecordPlay(trackId, userId)` checks if 30 seconds have elapsed
4. If 30+ seconds have elapsed: Play is recorded via `increment_play_count` RPC function
5. On play stop: `playTracker.onPlayStop(trackId)` cleans up tracking state
6. Debouncing prevents duplicate counts within 30 seconds
7. Failed plays are queued in localStorage and retried on next page load

**Database Function:**
```sql
-- RPC function called by play tracker
CREATE OR REPLACE FUNCTION increment_play_count(track_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE tracks
  SET play_count = play_count + 1
  WHERE id = track_uuid;
END;
$$ LANGUAGE plpgsql;
```

**Current Status:**
- ✅ Play tracking is already implemented in WavesurferPlayer
- ✅ Dashboard audio posts already use play tracking (pass `trackId={post.track?.id}`)
- ⚠️ Single track page implementation must pass `trackId={track.id}` to WavesurferPlayer

### State Management

- Use React hooks for local state
- Use AuthContext for user authentication
- Use PlaybackContext for audio playback (if needed)
- No additional global state required

### URL Structure

- Primary: `/tracks/{track_id}`
- Example: `/tracks/123e4567-e89b-12d3-a456-426614174000`
- No query parameters required
- Clean, shareable URLs

## Future Enhancements

1. **Comments Section**
   - Add comments below the track
   - Reuse CommentList component from posts

2. **Related Tracks**
   - Show similar tracks by same artist
   - Show tracks from same album/playlist

3. **Embed Support**
   - Allow embedding track player on external sites
   - Generate embed code

4. **Analytics**
   - Track page views
   - Track play completion rate
   - Track share metrics

5. **Playlist Integration**
   - "Add to Queue" button
   - "Play Next" functionality
   - Integration with Mini Player for multi-track playback

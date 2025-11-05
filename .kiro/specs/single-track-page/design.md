# Design Document

## Document Status

**Last Updated:** December 2024  
**Status:** Reflects actual implementation (updated post-development)

> **Note:** This design document has been updated to reflect the actual implementation. The final implementation uses a custom inline UI rather than reusing the TrackCard component, implements progressive loading for performance, and focuses on essential features for a cleaner user experience.

## Overview

The Single Track Page feature provides a dedicated landing page for individual tracks, accessible via shareable URLs in the format `/tracks/{track_id}`. This page displays comprehensive track information with an integrated waveform player, implementing progressive loading and lazy component loading for optimal performance.

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
│       ├── Offline Indicator (conditional)
│       ├── Back Button
│       ├── Loading Skeletons (conditional)
│       ├── Error States (conditional - 404, 403, network)
│       └── Track Content (when loaded)
│           ├── Track Header Section
│           │   ├── Title with Actions Menu
│           │   ├── Creator Info with Avatar
│           │   ├── Follow Button (for non-owners)
│           │   └── Track Stats (plays, likes, date)
│           ├── Waveform Player Section
│           │   └── WavesurferPlayer (lazy loaded)
│           ├── Track Details Section
│           │   ├── Track Metadata (genre, duration, visibility)
│           │   ├── Description (if available)
│           │   └── Playlist Memberships (if any)
│           ├── Toast Notifications
│           └── Delete Confirmation Modal (lazy loaded)
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
  track: ExtendedTrackWithMembership | null;
  loading: boolean;
  error: string | null;
  errorType: '404' | '403' | 'network' | 'audio' | null;
  audioError: string | null;
  likeCount: number;  // Read-only display
  cachedAudioUrl: string | null;
  shouldLoadAudio: boolean;  // Progressive loading
  toasts: Toast[];
  isOnline: boolean;
  failedActions: Array<{ action: string; data: unknown }>;
  showActionsMenu: boolean;
  showDeleteModal: boolean;
}
```

**Key Functions:**
- `fetchTrackData(trackId: string)`: Fetches track data with all related information
- `handleLoadAudio()`: Triggers progressive audio loading on user interaction
- `handleDeleteConfirm()`: Deletes track and navigates back
- `handleBack()`: Navigates back with smart fallback logic
- `showToast(message, type)`: Displays toast notification
- `dismissToast(id)`: Dismisses a specific toast

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
- Play tracking (increments play_count after 30+ seconds)

**Loading Strategy:**
- Lazy loaded with React.lazy() for code splitting
- Progressive loading (deferred until user interaction)
- Wrapped in ErrorBoundary for graceful error handling
- Suspense fallback with loading skeleton
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

#### FollowButton
**Source:** `client/src/components/FollowButton.tsx`

**Usage:**
```typescript
<FollowButton
  userId={track.user_id}
  username={track.user?.username || track.author || 'User'}
  size="md"
  variant="primary"
/>
```

**Features:**
- Integrates with FollowContext for state management
- Displays "Follow" or "Following" based on state
- Handles follow/unfollow actions
- Only shown to authenticated non-owners

**Loading Strategy:**
- Lazy loaded with React.lazy() for code splitting
- Wrapped in ErrorBoundary for graceful error handling
- Suspense fallback with loading skeleton

#### DeleteConfirmationModal
**Source:** `client/src/components/library/DeleteConfirmationModal.tsx`

**Usage:**
```typescript
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  trackTitle={track.title}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={handleDeleteConfirm}
/>
```

**Features:**
- Confirmation dialog for track deletion
- Only accessible to track owners
- Lazy loaded for performance

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
    setErrorType('404');
    return;
  }
  setTrack(track);
} catch (error) {
  if (error.message.includes('not found')) {
    setError('Track not found');
    setErrorType('404');
  } else if (error.message.includes('permission')) {
    setError("You don't have permission to view this track");
    setErrorType('403');
  } else {
    setError('Failed to load track. Please try again.');
    setErrorType('network');
  }
  // Log errors using centralized logging utility
  logSingleTrackPageError(error, trackId, user?.id, errorType, context);
}
```

### Offline Detection

The page implements offline detection to handle network connectivity issues:

```typescript
useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    showToast('Connection restored', 'success');
    // Retry failed actions
  };
  
  const handleOffline = () => {
    setIsOnline(false);
    showToast('No internet connection', 'error');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}, []);
```

### Audio Error Handling

Audio loading implements retry logic with exponential backoff:

```typescript
const loadAudioUrl = async () => {
  let retryCount = 0;
  const maxRetries = 3;
  
  try {
    const url = await getCachedAudioUrl(track.file_url);
    setCachedAudioUrl(url);
  } catch (error) {
    if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(() => loadAudioUrl(), 1000 * retryCount);
    } else {
      setAudioError('Failed to load audio file');
      showToast('Audio load failed', 'error');
    }
  }
};
```

## Testing Strategy

### Unit Tests

1. **Track Data Fetching**
   - Test successful track fetch
   - Test track not found scenario
   - Test permission denied scenario
   - Test network error handling

2. **Follow Functionality**
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
   - Test follow button interaction
   - Test share functionality (Web Share API and clipboard fallback)
   - Test copy URL functionality
   - Test delete track functionality (owner only)

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

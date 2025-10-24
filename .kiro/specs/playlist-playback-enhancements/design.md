# Design Document

## Overview

This design implements comprehensive playback enhancements for the existing playlist system on the AI Music Community Platform. The enhancements include sequential track playback with automatic progression, a persistent mini audio player that remains visible across all pages, playback controls (play/pause, previous/next, repeat, shuffle), drag-and-drop track reordering, and a reorganized playlists page with separate sections for owned and public playlists. These features transform playlists from static collections into fully functional music playback experiences, leveraging the existing Next.js 15, React 19, Supabase, and TypeScript stack while integrating with the platform's audio caching system (getCachedAudioUrl).

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js 15)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Playlist UI      │  │ Mini Player      │  │ Playback Context │  │
│  │ Components       │  │ Component        │  │ Provider         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                      │             │
│  ┌────────▼─────────────────────▼──────────────────────▼─────────┐  │
│  │         Playback Context (State Management)                    │  │
│  │  - Active Playlist    - Current Track    - Queue              │  │
│  │  - Playback Mode      - Position         - Shuffle/Repeat     │  │
│  └────────┬───────────────────────────────────────────────────────┘  │
│           │                                                           │
│  ┌────────▼───────────────────────────────────────────────────────┐  │
│  │         Audio System Integration                               │  │
│  │  - getCachedAudioUrl()  - Wavesurfer.js  - Audio Element     │  │
│  └────────┬───────────────────────────────────────────────────────┘  │
└───────────┼──────────────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────────────┐
│                    Browser APIs & Storage                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ sessionStorage   │  │ HTML5 Audio API  │  │ Drag & Drop API  │  │
│  │ (Persistence)    │  │ (Playback)       │  │ (Reordering)     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### Playback Context Flow

```
User Action → Playback Context → Audio System → UI Update
     │              │                  │             │
     │              ├─ Update State    │             │
     │              ├─ Manage Queue    │             │
     │              ├─ Handle Modes    │             │
     │              └─ Persist State   │             │
     │                                 │             │
     └─────────────────────────────────┴─────────────┘
                  Synchronized Updates
```

### Component Hierarchy

```
App Layout
├── PlaybackProvider (Context)
│   ├── Playlist Pages
│   │   ├── PlaylistsList (Enhanced with sections)
│   │   │   ├── MyPlaylistsSection
│   │   │   └── PublicPlaylistsSection
│   │   └── PlaylistDetail (Enhanced with playback)
│   │       ├── PlayAllButton
│   │       ├── TrackList (with drag-and-drop)
│   │       └── TrackItem (with play button)
│   └── MiniPlayer (Persistent)
│       ├── TrackInfo
│       ├── PlaybackControls
│       ├── ProgressBar
│       └── ModeControls (Shuffle/Repeat)
```

## Components and Interfaces

### 1. PlaybackContext Provider

**Location:** `src/contexts/PlaybackContext.tsx`

**Purpose:** Centralized state management for playlist playback across the application

**Context Interface:**
```typescript
interface PlaybackContextType {
  // State
  activePlaylist: PlaylistWithTracks | null;
  currentTrack: Track | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  queue: Track[];
  shuffleMode: boolean;
  repeatMode: 'off' | 'playlist' | 'track';
  progress: number; // 0-100
  duration: number; // seconds
  
  // Actions
  playPlaylist: (playlist: PlaylistWithTracks, startIndex?: number) => void;
  playTrack: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  
  // Queue management
  buildQueue: (tracks: Track[], shuffle: boolean) => void;
  getNextTrack: () => Track | null;
  getPreviousTrack: () => Track | null;
}
```

**State Management:**
- Uses React Context API for global state
- Persists state to sessionStorage on changes
- Restores state on mount if available
- Manages audio element lifecycle

**Key Features:**
- Automatic track progression
- Queue management with shuffle support
- Repeat mode handling
- Progress tracking
- Cross-page state persistence



### 2. MiniPlayer Component

**Location:** `src/components/playlists/MiniPlayer.tsx`

**Purpose:** Persistent audio player that remains visible across all pages during playback

**Props Interface:**
```typescript
interface MiniPlayerProps {
  // No props - consumes PlaybackContext
}
```

**State Management:**
- Consumes PlaybackContext for all state
- Local state for UI interactions (volume slider, etc.)

**Key Features:**
- Fixed position at bottom of screen
- Displays current track info (title, artist, cover)
- Playback controls (play/pause, previous, next)
- Progress bar with seek functionality
- Shuffle and repeat mode toggles
- Close button to stop playback
- Responsive design for mobile

**Sub-Components:**
- `TrackInfo`: Displays track metadata and cover image
- `PlaybackControls`: Play/pause, previous, next buttons
- `ProgressBar`: Seekable progress indicator
- `ModeControls`: Shuffle and repeat toggles

### 3. Enhanced PlaylistDetailClient Component

**Location:** `src/components/playlists/PlaylistDetailClient.tsx` (existing, to be enhanced)

**Purpose:** Display playlist with playback capabilities

**New Props:**
```typescript
interface PlaylistDetailClientProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
  // Existing props remain
}
```

**New Features:**
- "Play All" button at top of track list
- Play button on each track
- Visual indicator for currently playing track
- Drag-and-drop handles for track reordering (owner only)
- Integration with PlaybackContext

**Enhanced Functionality:**
```typescript
// Play all tracks from beginning
const handlePlayAll = () => {
  playPlaylist(playlist, 0);
};

// Play from specific track
const handlePlayTrack = (index: number) => {
  playPlaylist(playlist, index);
};

// Handle track reordering
const handleReorder = async (fromIndex: number, toIndex: number) => {
  // Update positions in database
  // Refresh playlist
};
```

### 4. TrackReorderList Component

**Location:** `src/components/playlists/TrackReorderList.tsx`

**Purpose:** Drag-and-drop enabled track list for playlist owners

**Props Interface:**
```typescript
interface TrackReorderListProps {
  tracks: PlaylistTrack[];
  playlistId: string;
  onReorder: (tracks: PlaylistTrack[]) => void;
  isOwner: boolean;
  currentTrackId?: string;
}
```

**Key Features:**
- Drag handles on each track
- Visual feedback during drag
- Drop zones between tracks
- Optimistic UI updates
- Database position updates
- Disabled state for non-owners

**Implementation:**
- Uses HTML5 Drag and Drop API
- Alternative: react-beautiful-dnd library for better UX
- Handles position recalculation
- Rollback on error

### 5. Enhanced PlaylistsList Component

**Location:** `src/components/playlists/PlaylistsList.tsx` (existing, to be enhanced)

**Purpose:** Display playlists in two sections: owned and public

**New Structure:**
```typescript
interface PlaylistsListProps {
  // No props - fetches data internally
}

interface PlaylistsListState {
  myPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  myPlaylistsLoading: boolean;
  publicPlaylistsLoading: boolean;
  myPlaylistsError: string | null;
  publicPlaylistsError: string | null;
}
```

**New Features:**
- Two distinct sections with headings
- Independent loading states
- Separate empty states
- Filter public playlists to exclude user's own

**Layout:**
```tsx
<div className="playlists-page">
  <section className="my-playlists">
    <h2>My Playlists</h2>
    {myPlaylistsLoading ? <LoadingSpinner /> : (
      myPlaylists.length > 0 ? (
        <PlaylistGrid playlists={myPlaylists} />
      ) : (
        <EmptyState message="You haven't created any playlists yet" />
      )
    )}
  </section>
  
  <section className="public-playlists">
    <h2>Public Playlists</h2>
    {publicPlaylistsLoading ? <LoadingSpinner /> : (
      publicPlaylists.length > 0 ? (
        <PlaylistGrid playlists={publicPlaylists} />
      ) : (
        <EmptyState message="No public playlists available" />
      )
    )}
  </section>
</div>
```



## Data Models

### Playback State Model

```typescript
interface PlaybackState {
  activePlaylistId: string | null;
  currentTrackId: string | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  position: number; // seconds
  shuffleMode: boolean;
  repeatMode: 'off' | 'playlist' | 'track';
  queue: string[]; // track IDs
  originalQueue: string[]; // for shuffle toggle
  timestamp: number; // for staleness check
}
```

### Track Queue Model

```typescript
interface TrackQueue {
  tracks: Track[];
  currentIndex: number;
  shuffled: boolean;
  originalOrder: Track[];
}
```

### Enhanced Playlist Types

```typescript
// Extend existing Playlist type
interface PlaylistWithPlayback extends PlaylistWithTracks {
  isCurrentlyPlaying: boolean;
  currentTrackIndex?: number;
}

// Track with playback state
interface TrackWithPlaybackState extends Track {
  isCurrentlyPlaying: boolean;
  isInQueue: boolean;
  queuePosition?: number;
}
```

### SessionStorage Schema

```typescript
// Key: 'playback_state'
interface StoredPlaybackState {
  playlistId: string;
  trackId: string;
  trackIndex: number;
  position: number;
  isPlaying: boolean;
  shuffleMode: boolean;
  repeatMode: 'off' | 'playlist' | 'track';
  queue: string[];
  timestamp: number;
}
```

## Database Schema Changes

### Track Position Updates

No new tables required, but we need a utility function for batch position updates:

```sql
-- Function to update track positions after reordering
CREATE OR REPLACE FUNCTION reorder_playlist_tracks(
  p_playlist_id UUID,
  p_track_positions JSONB -- [{track_id: uuid, position: int}]
)
RETURNS void AS $$
DECLARE
  track_update JSONB;
BEGIN
  FOR track_update IN SELECT * FROM jsonb_array_elements(p_track_positions)
  LOOP
    UPDATE playlist_tracks
    SET position = (track_update->>'position')::INTEGER
    WHERE playlist_id = p_playlist_id
      AND track_id = (track_update->>'track_id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Public Playlists Query

```typescript
// Utility function to fetch public playlists excluding user's own
export async function getPublicPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('is_public', true)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}
```

## Audio Integration

### Audio Element Management

```typescript
class AudioManager {
  private audio: HTMLAudioElement;
  private currentTrackUrl: string | null = null;
  
  constructor() {
    this.audio = new Audio();
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    this.audio.addEventListener('ended', this.handleTrackEnd);
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.addEventListener('error', this.handleError);
  }
  
  async loadTrack(audioUrl: string): Promise<void> {
    // Use platform's audio caching
    const cachedUrl = await getCachedAudioUrl(audioUrl);
    this.audio.src = cachedUrl;
    this.currentTrackUrl = audioUrl;
  }
  
  play(): Promise<void> {
    return this.audio.play();
  }
  
  pause(): void {
    this.audio.pause();
  }
  
  seek(position: number): void {
    this.audio.currentTime = position;
  }
  
  getCurrentTime(): number {
    return this.audio.currentTime;
  }
  
  getDuration(): number {
    return this.audio.duration;
  }
  
  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.removeEventListener('ended', this.handleTrackEnd);
    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.removeEventListener('error', this.handleError);
  }
}
```

### Integration with getCachedAudioUrl

```typescript
// Ensure all audio URLs go through caching system
const playTrack = async (track: Track) => {
  try {
    // CRITICAL: Always use getCachedAudioUrl
    const cachedUrl = await getCachedAudioUrl(track.audio_url);
    await audioManager.loadTrack(cachedUrl);
    await audioManager.play();
    setIsPlaying(true);
  } catch (error) {
    console.error('Failed to play track:', error);
    handlePlaybackError(error);
  }
};
```



## State Management Strategy

### PlaybackContext Implementation

```typescript
export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [activePlaylist, setActivePlaylist] = useState<PlaylistWithTracks | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'playlist' | 'track'>('off');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Audio manager instance
  const audioManagerRef = useRef<AudioManager | null>(null);
  
  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new AudioManager();
    
    // Restore state from sessionStorage
    restorePlaybackState();
    
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);
  
  // Persist state to sessionStorage
  useEffect(() => {
    if (activePlaylist && currentTrack) {
      persistPlaybackState({
        playlistId: activePlaylist.id,
        trackId: currentTrack.id,
        trackIndex: currentTrackIndex,
        position: audioManagerRef.current?.getCurrentTime() || 0,
        isPlaying,
        shuffleMode,
        repeatMode,
        queue: queue.map(t => t.id),
        timestamp: Date.now()
      });
    }
  }, [activePlaylist, currentTrack, currentTrackIndex, isPlaying, shuffleMode, repeatMode]);
  
  // Play playlist from specific index
  const playPlaylist = useCallback(async (playlist: PlaylistWithTracks, startIndex = 0) => {
    setActivePlaylist(playlist);
    const tracks = playlist.tracks.map(pt => pt.track);
    const orderedQueue = shuffleMode ? shuffleArray([...tracks]) : tracks;
    setQueue(orderedQueue);
    setCurrentTrackIndex(startIndex);
    setCurrentTrack(orderedQueue[startIndex]);
    
    await audioManagerRef.current?.loadTrack(orderedQueue[startIndex].audio_url);
    await audioManagerRef.current?.play();
    setIsPlaying(true);
  }, [shuffleMode]);
  
  // Handle track end
  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'track') {
      // Replay current track
      audioManagerRef.current?.seek(0);
      audioManagerRef.current?.play();
    } else {
      // Move to next track
      next();
    }
  }, [repeatMode]);
  
  // Next track
  const next = useCallback(() => {
    if (currentTrackIndex < queue.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      audioManagerRef.current?.loadTrack(queue[nextIndex].audio_url);
      audioManagerRef.current?.play();
    } else if (repeatMode === 'playlist') {
      // Restart playlist
      setCurrentTrackIndex(0);
      setCurrentTrack(queue[0]);
      audioManagerRef.current?.loadTrack(queue[0].audio_url);
      audioManagerRef.current?.play();
    } else {
      // End of playlist
      stop();
    }
  }, [currentTrackIndex, queue, repeatMode]);
  
  // Previous track
  const previous = useCallback(() => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
      audioManagerRef.current?.loadTrack(queue[prevIndex].audio_url);
      audioManagerRef.current?.play();
    } else {
      // Restart current track
      audioManagerRef.current?.seek(0);
    }
  }, [currentTrackIndex, queue]);
  
  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setShuffleMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // Shuffle queue, keeping current track at front
        const remaining = queue.filter((_, i) => i !== currentTrackIndex);
        const shuffled = shuffleArray(remaining);
        const newQueue = [queue[currentTrackIndex], ...shuffled];
        setQueue(newQueue);
        setCurrentTrackIndex(0);
      } else {
        // Restore original order
        if (activePlaylist) {
          const originalQueue = activePlaylist.tracks.map(pt => pt.track);
          setQueue(originalQueue);
          // Find current track in original order
          const newIndex = originalQueue.findIndex(t => t.id === currentTrack?.id);
          setCurrentTrackIndex(newIndex);
        }
      }
      return newMode;
    });
  }, [queue, currentTrackIndex, activePlaylist, currentTrack]);
  
  // Cycle repeat mode
  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'playlist';
      if (prev === 'playlist') return 'track';
      return 'off';
    });
  }, []);
  
  // Stop playback
  const stop = useCallback(() => {
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    setActivePlaylist(null);
    setCurrentTrack(null);
    setQueue([]);
    clearPlaybackState();
  }, []);
  
  const value: PlaybackContextType = {
    activePlaylist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    queue,
    shuffleMode,
    repeatMode,
    progress,
    duration,
    playPlaylist,
    playTrack: (track) => {
      // Implementation for playing single track
    },
    pause: () => {
      audioManagerRef.current?.pause();
      setIsPlaying(false);
    },
    resume: () => {
      audioManagerRef.current?.play();
      setIsPlaying(true);
    },
    next,
    previous,
    seek: (position) => audioManagerRef.current?.seek(position),
    toggleShuffle,
    cycleRepeat,
    stop,
    buildQueue: (tracks, shuffle) => {
      const orderedQueue = shuffle ? shuffleArray([...tracks]) : tracks;
      setQueue(orderedQueue);
    },
    getNextTrack: () => {
      if (currentTrackIndex < queue.length - 1) {
        return queue[currentTrackIndex + 1];
      }
      return null;
    },
    getPreviousTrack: () => {
      if (currentTrackIndex > 0) {
        return queue[currentTrackIndex - 1];
      }
      return null;
    }
  };
  
  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
};
```

### Utility Functions

```typescript
// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Persist playback state
function persistPlaybackState(state: StoredPlaybackState): void {
  try {
    sessionStorage.setItem('playback_state', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist playback state:', error);
  }
}

// Restore playback state
function restorePlaybackState(): StoredPlaybackState | null {
  try {
    const stored = sessionStorage.getItem('playback_state');
    if (!stored) return null;
    
    const state = JSON.parse(stored);
    
    // Check if state is stale (older than 1 hour)
    if (Date.now() - state.timestamp > 3600000) {
      clearPlaybackState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to restore playback state:', error);
    return null;
  }
}

// Clear playback state
function clearPlaybackState(): void {
  try {
    sessionStorage.removeItem('playback_state');
  } catch (error) {
    console.error('Failed to clear playback state:', error);
  }
}
```



## UI/UX Design Patterns

### Mini Player Design

**Visual Specifications:**
- Fixed position at bottom of viewport
- Height: 80px on desktop, 70px on mobile
- Background: Semi-transparent dark with backdrop blur
- Z-index: 1000 (above most content, below modals)
- Smooth slide-up animation on mount
- Responsive layout for mobile devices

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Cover] Track Title - Artist Name    [◀] [▶/⏸] [▶]  [🔀] [🔁] [✕] │
│         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│         0:45 ────────────●──────────────────────── 3:24      │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌───────────────────────────────────┐
│ [Cover] Track Title - Artist     │
│         [◀] [▶/⏸] [▶]  [🔀] [🔁] [✕] │
│         ━━━━━━━━━━━━━━━━━━━━━━━━━ │
└───────────────────────────────────┘
```

### Playlist Detail Enhancements

**Play All Button:**
- Prominent placement above track list
- Primary button styling
- Icon: Play symbol
- Text: "Play All" or "Play Playlist"
- Disabled state when playlist is empty

**Track List with Playback:**
```
┌─────────────────────────────────────────────────────────┐
│ [Play All Button]                                       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [≡] 1. [▶] Track Title - Artist      [Cover] 3:24  │ │
│ │ [≡] 2. [▶] Track Title - Artist      [Cover] 4:15  │ │
│ │ [≡] 3. [⏸] Track Title - Artist      [Cover] 2:58  │ │ ← Currently playing
│ │ [≡] 4. [▶] Track Title - Artist      [Cover] 3:42  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

[≡] = Drag handle (owner only)
[▶] = Play button
[⏸] = Pause button (current track)
```

### Playlists Page Sections

**Two-Section Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Playlists                                               │
│                                                         │
│ My Playlists                                            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│ │ [Cover] │ │ [Cover] │ │ [Cover] │                   │
│ │ Title   │ │ Title   │ │ Title   │                   │
│ │ 12 trks │ │ 8 trks  │ │ 15 trks │                   │
│ └─────────┘ └─────────┘ └─────────┘                   │
│                                                         │
│ Public Playlists                                        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│ │ [Cover] │ │ [Cover] │ │ [Cover] │                   │
│ │ Title   │ │ Title   │ │ Title   │                   │
│ │ by User │ │ by User │ │ by User │                   │
│ │ 20 trks │ │ 10 trks │ │ 25 trks │                   │
│ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Drag-and-Drop Visual Feedback

**States:**
1. **Normal:** Track with drag handle visible
2. **Dragging:** Track becomes semi-transparent, cursor changes
3. **Drop Zone:** Blue line indicator between tracks
4. **Dropping:** Brief animation as track settles into position

**Visual Indicators:**
```typescript
// CSS classes for drag states
.track-item {
  transition: all 0.2s ease;
}

.track-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.track-item.drag-over-top::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #3b82f6;
}

.track-item.drag-over-bottom::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #3b82f6;
}
```

## Error Handling

### Playback Errors

```typescript
enum PlaybackErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DECODE_ERROR = 'DECODE_ERROR',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN'
}

interface PlaybackError {
  type: PlaybackErrorType;
  message: string;
  trackId: string;
  canRetry: boolean;
}

function handlePlaybackError(error: Error, track: Track): void {
  const playbackError: PlaybackError = {
    type: categorizeError(error),
    message: getUserFriendlyMessage(error),
    trackId: track.id,
    canRetry: isRetryable(error)
  };
  
  // Log error
  console.error('Playback error:', playbackError);
  
  // Show user notification
  showNotification({
    type: 'error',
    message: playbackError.message,
    action: playbackError.canRetry ? {
      label: 'Retry',
      onClick: () => retryPlayback(track)
    } : undefined
  });
  
  // Auto-skip to next track if not retryable
  if (!playbackError.canRetry) {
    setTimeout(() => next(), 2000);
  }
}
```

### Reordering Errors

```typescript
async function handleReorder(
  playlistId: string,
  fromIndex: number,
  toIndex: number,
  tracks: PlaylistTrack[]
): Promise<void> {
  // Store original order for rollback
  const originalTracks = [...tracks];
  
  try {
    // Optimistic update
    const reorderedTracks = reorderArray(tracks, fromIndex, toIndex);
    setTracks(reorderedTracks);
    
    // Update positions in database
    const updates = reorderedTracks.map((track, index) => ({
      track_id: track.track_id,
      position: index
    }));
    
    const { error } = await supabase.rpc('reorder_playlist_tracks', {
      p_playlist_id: playlistId,
      p_track_positions: updates
    });
    
    if (error) throw error;
    
    // Success notification
    showNotification({
      type: 'success',
      message: 'Track order updated'
    });
    
  } catch (error) {
    // Rollback on error
    setTracks(originalTracks);
    
    console.error('Failed to reorder tracks:', error);
    showNotification({
      type: 'error',
      message: 'Failed to update track order. Please try again.'
    });
  }
}
```

### State Restoration Errors

```typescript
async function restorePlaybackOnMount(): Promise<void> {
  try {
    const stored = restorePlaybackState();
    if (!stored) return;
    
    // Fetch playlist data
    const playlist = await getPlaylistWithTracks(stored.playlistId);
    if (!playlist) {
      clearPlaybackState();
      return;
    }
    
    // Restore playback
    const track = playlist.tracks.find(t => t.track_id === stored.trackId);
    if (!track) {
      clearPlaybackState();
      return;
    }
    
    // Load track and seek to position
    await audioManager.loadTrack(track.track.audio_url);
    audioManager.seek(stored.position);
    
    // Don't auto-play, just restore state
    setActivePlaylist(playlist);
    setCurrentTrack(track.track);
    setShuffleMode(stored.shuffleMode);
    setRepeatMode(stored.repeatMode);
    
  } catch (error) {
    console.error('Failed to restore playback:', error);
    clearPlaybackState();
  }
}
```



## Testing Strategy

### Unit Testing

#### PlaybackContext Tests

```typescript
describe('PlaybackContext', () => {
  it('should initialize with null state', () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });
    
    expect(result.current.activePlaylist).toBeNull();
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });
  
  it('should play playlist from beginning', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });
    
    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });
    
    expect(result.current.activePlaylist).toEqual(mockPlaylist);
    expect(result.current.currentTrack).toEqual(mockPlaylist.tracks[0].track);
    expect(result.current.isPlaying).toBe(true);
  });
  
  it('should handle next track correctly', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });
    
    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
      result.current.next();
    });
    
    expect(result.current.currentTrackIndex).toBe(1);
    expect(result.current.currentTrack).toEqual(mockPlaylist.tracks[1].track);
  });
  
  it('should toggle shuffle mode', () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });
    
    act(() => {
      result.current.toggleShuffle();
    });
    
    expect(result.current.shuffleMode).toBe(true);
  });
  
  it('should cycle repeat modes', () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });
    
    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('playlist');
    
    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('track');
    
    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('off');
  });
});
```

#### AudioManager Tests

```typescript
describe('AudioManager', () => {
  let audioManager: AudioManager;
  
  beforeEach(() => {
    audioManager = new AudioManager();
  });
  
  afterEach(() => {
    audioManager.destroy();
  });
  
  it('should load track with cached URL', async () => {
    const mockUrl = 'https://example.com/track.mp3';
    const mockCachedUrl = 'https://cached.example.com/track.mp3';
    
    (getCachedAudioUrl as jest.Mock).mockResolvedValue(mockCachedUrl);
    
    await audioManager.loadTrack(mockUrl);
    
    expect(getCachedAudioUrl).toHaveBeenCalledWith(mockUrl);
  });
  
  it('should handle playback errors', async () => {
    const mockError = new Error('Network error');
    const errorHandler = jest.fn();
    
    audioManager.on('error', errorHandler);
    
    // Trigger error
    audioManager.audio.dispatchEvent(new Event('error'));
    
    expect(errorHandler).toHaveBeenCalled();
  });
});
```

### Integration Testing

#### Playlist Playback Flow

```typescript
describe('Playlist Playback Integration', () => {
  it('should play all tracks in sequence', async () => {
    render(
      <PlaybackProvider>
        <PlaylistDetailClient playlist={mockPlaylist} isOwner={true} />
        <MiniPlayer />
      </PlaybackProvider>
    );
    
    // Click Play All
    const playAllButton = screen.getByText('Play All');
    fireEvent.click(playAllButton);
    
    // Verify mini player appears
    await waitFor(() => {
      expect(screen.getByTestId('mini-player')).toBeInTheDocument();
    });
    
    // Verify first track is playing
    expect(screen.getByText(mockPlaylist.tracks[0].track.title)).toBeInTheDocument();
  });
  
  it('should navigate between tracks', async () => {
    render(
      <PlaybackProvider>
        <MiniPlayer />
      </PlaybackProvider>
    );
    
    // Start playback
    const { result } = renderHook(() => usePlayback());
    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });
    
    // Click next
    const nextButton = screen.getByLabelText('Next track');
    fireEvent.click(nextButton);
    
    // Verify second track is playing
    await waitFor(() => {
      expect(screen.getByText(mockPlaylist.tracks[1].track.title)).toBeInTheDocument();
    });
  });
});
```

#### Drag-and-Drop Reordering

```typescript
describe('Track Reordering', () => {
  it('should reorder tracks via drag and drop', async () => {
    const mockOnReorder = jest.fn();
    
    render(
      <TrackReorderList
        tracks={mockTracks}
        playlistId="test-playlist"
        onReorder={mockOnReorder}
        isOwner={true}
      />
    );
    
    const firstTrack = screen.getByTestId('track-0');
    const secondTrack = screen.getByTestId('track-1');
    
    // Simulate drag and drop
    fireEvent.dragStart(firstTrack);
    fireEvent.dragOver(secondTrack);
    fireEvent.drop(secondTrack);
    
    await waitFor(() => {
      expect(mockOnReorder).toHaveBeenCalled();
    });
  });
});
```

### End-to-End Testing

#### Complete User Journey

```typescript
test('user can play playlist and navigate pages', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to playlists
  await page.goto('/playlists');
  await page.waitForSelector('text=My Playlists');
  
  // Click on a playlist
  await page.click('text=Test Playlist');
  
  // Click Play All
  await page.click('button:has-text("Play All")');
  
  // Verify mini player appears
  await page.waitForSelector('[data-testid="mini-player"]');
  
  // Navigate to home page
  await page.goto('/');
  
  // Verify mini player persists
  expect(await page.isVisible('[data-testid="mini-player"]')).toBe(true);
  
  // Verify playback continues
  const trackTitle = await page.textContent('[data-testid="mini-player-track-title"]');
  expect(trackTitle).toBeTruthy();
  
  // Click next track
  await page.click('[aria-label="Next track"]');
  
  // Verify track changed
  const newTrackTitle = await page.textContent('[data-testid="mini-player-track-title"]');
  expect(newTrackTitle).not.toBe(trackTitle);
});
```

## Performance Optimizations

### Context Optimization

```typescript
// Memoize context value to prevent unnecessary re-renders
const value = useMemo<PlaybackContextType>(() => ({
  activePlaylist,
  currentTrack,
  currentTrackIndex,
  isPlaying,
  queue,
  shuffleMode,
  repeatMode,
  progress,
  duration,
  playPlaylist,
  playTrack,
  pause,
  resume,
  next,
  previous,
  seek,
  toggleShuffle,
  cycleRepeat,
  stop,
  buildQueue,
  getNextTrack,
  getPreviousTrack
}), [
  activePlaylist,
  currentTrack,
  currentTrackIndex,
  isPlaying,
  queue,
  shuffleMode,
  repeatMode,
  progress,
  duration
]);
```

### Audio Preloading

```typescript
// Preload next track for seamless transitions
useEffect(() => {
  if (currentTrackIndex < queue.length - 1) {
    const nextTrack = queue[currentTrackIndex + 1];
    preloadAudio(nextTrack.audio_url);
  }
}, [currentTrackIndex, queue]);

async function preloadAudio(audioUrl: string): Promise<void> {
  try {
    const cachedUrl = await getCachedAudioUrl(audioUrl);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = cachedUrl;
  } catch (error) {
    console.error('Failed to preload audio:', error);
  }
}
```

### Component Memoization

```typescript
// Memoize MiniPlayer to prevent unnecessary re-renders
export const MiniPlayer = memo(() => {
  const playback = usePlayback();
  
  if (!playback.activePlaylist || !playback.currentTrack) {
    return null;
  }
  
  return (
    <div className="mini-player">
      {/* Player UI */}
    </div>
  );
});

// Memoize track items in playlist
const TrackItem = memo<TrackItemProps>(({ track, index, isPlaying, onPlay }) => {
  return (
    <div className="track-item">
      {/* Track UI */}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isPlaying === nextProps.isPlaying
  );
});
```

### SessionStorage Throttling

```typescript
// Throttle sessionStorage writes to avoid performance issues
const throttledPersist = useCallback(
  throttle((state: StoredPlaybackState) => {
    persistPlaybackState(state);
  }, 1000),
  []
);

useEffect(() => {
  if (activePlaylist && currentTrack) {
    throttledPersist({
      playlistId: activePlaylist.id,
      trackId: currentTrack.id,
      trackIndex: currentTrackIndex,
      position: audioManagerRef.current?.getCurrentTime() || 0,
      isPlaying,
      shuffleMode,
      repeatMode,
      queue: queue.map(t => t.id),
      timestamp: Date.now()
    });
  }
}, [activePlaylist, currentTrack, currentTrackIndex, isPlaying, shuffleMode, repeatMode]);
```

## Security Considerations

### Audio URL Validation

```typescript
// Validate audio URLs before playback
function validateAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS and specific domains
    return parsed.protocol === 'https:' && 
           (parsed.hostname.includes('supabase.co') || 
            parsed.hostname.includes('your-cdn.com'));
  } catch {
    return false;
  }
}

// Use in playback
const playTrack = async (track: Track) => {
  if (!validateAudioUrl(track.audio_url)) {
    throw new Error('Invalid audio URL');
  }
  
  const cachedUrl = await getCachedAudioUrl(track.audio_url);
  await audioManager.loadTrack(cachedUrl);
  await audioManager.play();
};
```

### XSS Protection

```typescript
// Sanitize track metadata before display
import DOMPurify from 'dompurify';

function sanitizeTrackInfo(track: Track): Track {
  return {
    ...track,
    title: DOMPurify.sanitize(track.title),
    artist_name: DOMPurify.sanitize(track.artist_name)
  };
}
```

### Rate Limiting

```typescript
// Prevent rapid playlist switching abuse
const playlistSwitchLimiter = new Map<string, number>();

function canSwitchPlaylist(userId: string): boolean {
  const lastSwitch = playlistSwitchLimiter.get(userId) || 0;
  const now = Date.now();
  
  if (now - lastSwitch < 1000) { // 1 second cooldown
    return false;
  }
  
  playlistSwitchLimiter.set(userId, now);
  return true;
}
```

## Deployment Considerations

### Environment Variables

No new environment variables required. Uses existing Supabase configuration.

### Build Optimization

```typescript
// Ensure audio manager is only imported client-side
const AudioManager = dynamic(() => import('@/lib/audio/AudioManager'), {
  ssr: false
});
```

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

**Polyfills Required:**
- None (all features use standard Web APIs)

**Fallbacks:**
- sessionStorage unavailable: Playback works but doesn't persist
- Drag and Drop unavailable: Manual reorder buttons as fallback

### Performance Monitoring

```typescript
// Track playback metrics
function trackPlaybackMetrics(event: string, data: any): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, {
      event_category: 'Playback',
      ...data
    });
  }
}

// Usage
trackPlaybackMetrics('playlist_play', {
  playlist_id: playlist.id,
  track_count: playlist.tracks.length
});

trackPlaybackMetrics('track_complete', {
  track_id: track.id,
  duration: track.duration
});
```

## Implementation Phases

### Phase 1: Foundation (Priority 1-2)
**Estimated Time:** 2 hours

**Deliverables:**
1. PlaybackContext provider with state management
2. Track queue management logic
3. AudioManager class
4. SessionStorage persistence utilities
5. TypeScript type definitions

**Success Criteria:**
- Context provides all required state and actions
- Queue management handles shuffle and repeat correctly
- Audio playback works with getCachedAudioUrl integration
- State persists across page refreshes

### Phase 2: Core Playback UI (Priority 3-5)
**Estimated Time:** 2 hours

**Deliverables:**
1. MiniPlayer component with all controls
2. Enhanced PlaylistDetailClient with Play All button
3. Track-specific play buttons
4. Visual indicators for currently playing track
5. Integration with PlaybackContext

**Success Criteria:**
- Mini player appears during playback
- Mini player persists across page navigation
- Play All button starts playlist playback
- Individual track play buttons work correctly
- Currently playing track is visually indicated

### Phase 3: Enhanced Controls (Priority 6-9)
**Estimated Time:** 1.5 hours

**Deliverables:**
1. Previous/Next track controls
2. Shuffle mode toggle with queue rebuilding
3. Repeat mode cycling (off/playlist/track)
4. Progress bar with seek functionality
5. Playback state restoration on mount

**Success Criteria:**
- All playback controls function correctly
- Shuffle randomizes track order properly
- Repeat modes work as expected
- Progress bar updates in real-time
- Playback state restores after page refresh

### Phase 4: Content Management (Priority 10-12)
**Estimated Time:** 1.5 hours

**Deliverables:**
1. Drag-and-drop track reordering
2. Database function for batch position updates
3. Two-section playlists page layout
4. Public playlists query and display
5. Enhanced empty states

**Success Criteria:**
- Tracks can be reordered via drag-and-drop
- Position updates persist to database
- Playlists page shows two distinct sections
- Public playlists exclude user's own playlists
- Empty states display appropriately

### Phase 5: Testing and Polish (Final)
**Estimated Time:** 1 hour

**Deliverables:**
1. Comprehensive testing (unit, integration, e2e)
2. Error handling refinement
3. Performance optimization
4. Cross-browser testing
5. Documentation updates

**Success Criteria:**
- All tests pass
- No TypeScript errors
- No console errors
- Smooth performance on mobile
- Documentation complete

---

*Design Document Version: 1.0*  
*Created: Month 4 Week 1*  
*Status: Ready for Implementation Planning*

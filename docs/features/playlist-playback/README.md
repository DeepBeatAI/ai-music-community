# Playlist Playback System

## Overview

The Playlist Playback System provides comprehensive audio playback capabilities for playlists on the AI Music Community Platform. It includes sequential track playback, a persistent mini player, playback controls (shuffle, repeat, seek), drag-and-drop track reordering, and state persistence across page navigation.

## Features

### Core Playback
- **Sequential Playback**: Automatically advance through tracks in a playlist
- **Track-Specific Start**: Begin playback from any track in the playlist
- **Automatic Progression**: Seamlessly transition between tracks
- **Audio Caching Integration**: Uses platform's `getCachedAudioUrl()` for optimized loading

### Mini Player
- **Persistent UI**: Remains visible across all pages during playback
- **Fixed Positioning**: Anchored at the bottom of the viewport
- **Responsive Design**: Adapts to mobile and desktop screens
- **Track Information**: Displays current track title, artist, and cover image
- **Playback Controls**: Play/pause, previous, next, seek, shuffle, repeat
- **Close Button**: Stop playback and hide the player

### Playback Modes
- **Shuffle Mode**: Randomize track playback order using Fisher-Yates algorithm
- **Repeat Modes**: 
  - Off: Stop after last track
  - Repeat Playlist: Restart from beginning after last track
  - Repeat Track: Continuously replay current track
- **Mode Persistence**: Settings persist across page refreshes

### State Management
- **Playback Context**: Centralized state management using React Context
- **SessionStorage Persistence**: Playback state survives page refreshes
- **Staleness Check**: Clears state older than 1 hour
- **Cross-Page Continuity**: Playback continues seamlessly during navigation

### Content Management
- **Drag-and-Drop Reordering**: Reorder tracks by dragging (owners only)
- **Batch Position Updates**: Efficient database updates for reordering
- **Optimistic UI**: Immediate visual feedback with rollback on error
- **Two-Section Layout**: Separate "My Playlists" and "Public Playlists" sections

## Architecture

### Components

#### PlaybackContext (`src/contexts/PlaybackContext.tsx`)
Centralized state management for playback:
- Active playlist and current track
- Playback state (playing, paused, stopped)
- Queue management with shuffle support
- Repeat mode handling
- Progress tracking
- SessionStorage persistence

#### MiniPlayer (`src/components/playlists/MiniPlayer.tsx`)
Persistent audio player UI:
- TrackInfo: Current track metadata and cover
- PlaybackControls: Play/pause, previous, next buttons
- ProgressBar: Seekable progress indicator with time display
- ModeControls: Shuffle and repeat toggles

#### AudioManager (`src/lib/audio/AudioManager.ts`)
Audio playback management:
- HTMLAudioElement wrapper
- Event handling (ended, timeupdate, error)
- Integration with getCachedAudioUrl
- Cleanup and resource management

#### TrackReorderList (`src/components/playlists/TrackReorderList.tsx`)
Drag-and-drop track reordering:
- HTML5 Drag and Drop API
- Visual feedback during drag
- Database position updates
- Owner-only functionality

### Data Flow

```
User Action → PlaybackContext → AudioManager → UI Update
     │              │                  │             │
     │              ├─ Update State    │             │
     │              ├─ Manage Queue    │             │
     │              ├─ Handle Modes    │             │
     │              └─ Persist State   │             │
     │                                 │             │
     └─────────────────────────────────┴─────────────┘
                  Synchronized Updates
```

## Usage Examples

### Playing a Playlist

```typescript
import { usePlayback } from '@/contexts/PlaybackContext';

function PlaylistDetail({ playlist }) {
  const { playPlaylist } = usePlayback();
  
  const handlePlayAll = () => {
    playPlaylist(playlist, 0); // Start from first track
  };
  
  const handlePlayTrack = (index: number) => {
    playPlaylist(playlist, index); // Start from specific track
  };
  
  return (
    <div>
      <button onClick={handlePlayAll}>Play All</button>
      {playlist.tracks.map((track, index) => (
        <button key={track.id} onClick={() => handlePlayTrack(index)}>
          Play Track {index + 1}
        </button>
      ))}
    </div>
  );
}
```

### Using Playback Controls

```typescript
import { usePlayback } from '@/contexts/PlaybackContext';

function PlaybackControls() {
  const {
    isPlaying,
    pause,
    resume,
    next,
    previous,
    toggleShuffle,
    cycleRepeat,
    shuffleMode,
    repeatMode
  } = usePlayback();
  
  return (
    <div>
      <button onClick={previous}>Previous</button>
      <button onClick={isPlaying ? pause : resume}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={next}>Next</button>
      <button onClick={toggleShuffle}>
        Shuffle: {shuffleMode ? 'On' : 'Off'}
      </button>
      <button onClick={cycleRepeat}>
        Repeat: {repeatMode}
      </button>
    </div>
  );
}
```

### Implementing Drag-and-Drop

```typescript
import { TrackReorderList } from '@/components/playlists/TrackReorderList';

function PlaylistTracks({ playlist, isOwner }) {
  const handleReorder = async (reorderedTracks) => {
    // Update database with new positions
    await updateTrackPositions(playlist.id, reorderedTracks);
    // Refresh playlist data
    await refreshPlaylist();
  };
  
  return (
    <TrackReorderList
      tracks={playlist.tracks}
      playlistId={playlist.id}
      onReorder={handleReorder}
      isOwner={isOwner}
      currentTrackId={currentTrack?.id}
    />
  );
}
```

## Database Schema

### Playlist Tracks Table
```sql
CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, position)
);
```

### Reorder Function
```sql
CREATE OR REPLACE FUNCTION reorder_playlist_tracks(
  p_playlist_id UUID,
  p_track_positions JSONB
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

## Performance Considerations

### Optimizations
- **Context Memoization**: Prevent unnecessary re-renders
- **Audio Preloading**: Preload next track for seamless transitions
- **Component Memoization**: Memoize MiniPlayer and track items
- **SessionStorage Throttling**: Throttle persistence writes to 1 second intervals
- **Efficient Queries**: Indexed database queries for fast data fetching

### Benchmarks
- Page load: < 3 seconds
- Audio buffering: < 2 seconds
- Track transition: < 500ms
- Database queries: < 100ms
- State persistence: < 50ms

## Security

### Audio URL Validation
- Only HTTPS URLs allowed
- Domain whitelist for audio sources
- Integration with getCachedAudioUrl for secure access

### Row Level Security
- Playlist ownership verification for modifications
- Public/private playlist access control
- Track reordering restricted to owners

### XSS Protection
- Sanitize track metadata before display
- Validate all user inputs
- Escape HTML in track information

## Testing

### Unit Tests
- PlaybackContext state management
- AudioManager playback functionality
- Queue management with shuffle/repeat
- SessionStorage persistence utilities

### Integration Tests
- Playlist playback flow
- Track navigation
- Drag-and-drop reordering
- State persistence across refreshes

### End-to-End Tests
- Complete user journey from playlist selection to playback
- Cross-page navigation with persistent player
- Mode toggles and state persistence

See [Testing Status](testing/testing-status.md) for detailed test results.

## Troubleshooting

### Common Issues

**Playback doesn't start:**
- Check browser console for errors
- Verify audio URL is accessible
- Ensure getCachedAudioUrl is working
- Check browser audio permissions

**Mini player doesn't persist:**
- Verify PlaybackProvider wraps the app
- Check sessionStorage is available
- Ensure context is properly consumed

**Drag-and-drop doesn't work:**
- Verify user is playlist owner
- Check browser supports Drag and Drop API
- Ensure database function exists

**State doesn't restore:**
- Check sessionStorage is enabled
- Verify state isn't stale (> 1 hour)
- Ensure playlist still exists

## Future Enhancements

- Volume control in mini player
- Playback speed adjustment
- Crossfade between tracks
- Collaborative playlists
- Playlist analytics (play counts, popular tracks)
- Export/import playlists
- Keyboard shortcuts for playback control
- Queue visualization and editing

## Related Documentation

- [Requirements](.kiro/specs/playlist-playback-enhancements/requirements.md)
- [Design](.kiro/specs/playlist-playback-enhancements/design.md)
- [Implementation Tasks](.kiro/specs/playlist-playback-enhancements/tasks.md)
- [Testing Status](testing/testing-status.md)

---

*Last Updated: Month 4 Week 1*  
*Version: 1.0*
- Complete user journey from playlist selection to playback
- Cross-page navigation with persistent player
- Mode toggles and state persistence

See [Testing Status](testing/testing-status.md) for detailed test results.

## Troubleshooting

### Common Issues

**Playback doesn't start:**
- Check browser console for errors
- Verify audio URL is accessible
- Ensure getCachedAudioUrl is working
- Check browser audio permissions

**Mini player doesn't persist:**
- Verify PlaybackProvider wraps the app
- Check sessionStorage is available
- Ensure context is properly consumed

**Drag-and-drop doesn't work:**
- Verify user is playlist owner
- Check browser supports Drag and Drop API
- Ensure database function exists

**State doesn't restore:**
- Check sessionStorage is enabled
- Verify state isn't stale (> 1 hour)
- Ensure playlist still exists

## Future Enhancements

- Volume control in mini player
- Playback speed adjustment
- Crossfade between tracks
- Collaborative playlists
- Playlist analytics (play counts, popular tracks)
- Export/import playlists
- Keyboard shortcuts for playback control
- Queue visualization and editing

## Related Documentation

- [Requirements](../../.kiro/specs/playlist-playback-enhancements/requirements.md)
- [Design](../../.kiro/specs/playlist-playback-enhancements/design.md)
- [Implementation Tasks](../../.kiro/specs/playlist-playback-enhancements/tasks.md)
- [Testing Status](testing/testing-status.md)

---

*Last Updated: Month 4 Week 1*  
*Version: 1.0*

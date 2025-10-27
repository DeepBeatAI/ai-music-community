# Implementation Plan

## Overview

This implementation plan breaks down the playlist playback enhancements into discrete, actionable coding tasks. Each task builds incrementally on previous tasks following the dependency-based priority order established in the requirements. The plan is organized into five phases: Foundation, Core Playback UI, Enhanced Controls, Content Management, and Testing & Polish.

**Total Estimated Time:** 8 hours across multiple development sessions

---

## Phase 1: Foundation Layer (Priority: CRITICAL)

### Task 1: Create Playback Context and State Management

**Estimated Time:** 1.5 hours

- [x] 1. Create Playback Context and State Management

  - Create PlaybackContext provider with all state and actions
  - Implement sessionStorage persistence utilities
  - Add state persistence effects
  - Initialize and manage audio playback lifecycle
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.1 Create PlaybackContext provider structure

  - Create `src/contexts/PlaybackContext.tsx` file
  - Define `PlaybackContextType` interface with all state and actions
  - Define `PlaybackState` interface for internal state
  - Create React Context with createContext
  - Export usePlayback custom hook
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 1.2 Implement core playback state

  - Add state for activePlaylist, currentTrack, currentTrackIndex
  - Add state for isPlaying, queue, shuffleMode, repeatMode
  - Add state for progress and duration
  - Initialize all state with appropriate default values
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 1.3 Implement sessionStorage persistence utilities

  - Create `persistPlaybackState()` function
  - Create `restorePlaybackState()` function with staleness check
  - Create `clearPlaybackState()` function
  - Add error handling for sessionStorage unavailability
  - _Requirements: 1.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 1.4 Implement state persistence effects

  - Add useEffect to persist state on changes
  - Add useEffect to restore state on mount
  - Throttle persistence writes to avoid performance issues
  - Handle cleanup on unmount
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

### Task 2: Create AudioManager and Queue Management

**Estimated Time:** 1 hour

- [x] 2. Create AudioManager and Queue Management

  - Create AudioManager class for audio playback
  - Implement audio event listeners
  - Implement track queue management logic
  - Integrate AudioManager with PlaybackContext
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 2.1 Create AudioManager class

  - Create `src/lib/audio/AudioManager.ts` file
  - Implement HTMLAudioElement wrapper class
  - Add loadTrack() method with getCachedAudioUrl integration
  - Add play(), pause(), seek() methods
  - Add getCurrentTime() and getDuration() methods
  - Add destroy() method for cleanup
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 2.2 Implement audio event listeners

  - Add 'ended' event listener for track completion
  - Add 'timeupdate' event listener for progress tracking
  - Add 'error' event listener for playback errors
  - Add 'loadedmetadata' event listener for duration
  - Connect event handlers to context state updates
  - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [x] 2.3 Implement track queue management logic

  - Create `buildQueue()` function to initialize queue
  - Create `shuffleArray()` utility using Fisher-Yates algorithm
  - Implement queue rebuilding for shuffle toggle
  - Implement queue management for repeat modes
  - Add getNextTrack() and getPreviousTrack() helpers
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 2.4 Integrate AudioManager with PlaybackContext

  - Create audioManagerRef in PlaybackContext
  - Initialize AudioManager on mount
  - Connect audio events to context state updates
  - Implement cleanup on unmount
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.1, 3.2, 3.3_

### Task 3: Implement Core Playback Actions

**Estimated Time:** 30 minutes

- [x] 3. Implement Core Playback Actions

  - Implement playPlaylist action
  - Implement playback control actions (pause, resume, stop, seek)
  - Implement track navigation actions (next, previous)
  - Handle automatic track progression
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 3.1 Implement playPlaylist action

  - Accept playlist and optional startIndex parameter
  - Build queue based on shuffle mode

  - Set activePlaylist and currentTrack state
  - Load and play first/specified track
  - Update isPlaying state
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3.2 Implement playback control actions

  - Implement pause() action
  - Implement resume() action
  - Implement stop() action with state cleanup
  - Implement seek() action for progress bar
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 3.3 Implement track navigation actions

  - Implement next() action with repeat mode handling
  - Implement previous() action
  - Handle edge cases (first/last track)
  - Implement automatic track progression on 'ended' event
  - _Requirements: 3.4, 3.5, 3.6, 3.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

---

## Phase 2: Core Playback UI (Priority: HIGH)

### Task 4: Create MiniPlayer Component

**Estimated Time:** 1.5 hours

- [x] 4. Create MiniPlayer Component

  - Create MiniPlayer component structure with fixed positioning
  - Implement TrackInfo sub-component
  - Implement PlaybackControls sub-component
  - Implement ProgressBar sub-component
  - Implement ModeControls sub-component
  - Add MiniPlayer to app layout
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 4.1 Create MiniPlayer component structure

  - Create `src/components/playlists/MiniPlayer.tsx` file
  - Set up component with usePlayback hook
  - Add conditional rendering (only show when playlist active)
  - Add fixed positioning styles at bottom of viewport
  - Add slide-up animation on mount
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 4.2 Implement TrackInfo sub-component

  - Display current track cover image
  - Display track title and artist name
  - Add responsive layout for mobile
  - Handle missing cover image with placeholder
  - _Requirements: 5.4, 6.4_

- [x] 4.3 Implement PlaybackControls sub-component

  - Add previous track button
  - Add play/pause toggle button
  - Add next track button
  - Connect buttons to context actions
  - Add appropriate icons and labels
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 4.4 Implement ProgressBar sub-component

  - Display current time and total duration
  - Render progress bar with current position
  - Implement seek functionality on click/drag
  - Update progress in real-time
  - Format time display (mm:ss)

  - _Requirements: 6.7, 9.7_

- [x] 4.5 Implement ModeControls sub-component

  - Add shuffle toggle button with active state indicator
  - Add repeat mode cycle button with mode indicator
  - Add close button to stop playback
  - Connect buttons to context actions
  - Add visual feedback for active modes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 4.6 Add MiniPlayer to app layout
  - Update `src/app/layout.tsx` to include PlaybackProvider
  - Add MiniPlayer component inside provider
  - Ensure proper z-index and positioning
  - Test persistence across page navigation
  - _Requirements: 5.1, 5.2, 5.3, 5.7_

### Task 5: Enhance PlaylistDetailClient with Playback Controls

**Estimated Time:** 30 minutes

- [x] 5. Enhance PlaylistDetailClient with Playback Controls

  - Add Play All button to playlist detail
  - Add play buttons to individual tracks
  - Integrate playback state with track list
  - Show visual indicators for currently playing track
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5.1 Add Play All button to playlist detail

  - Add "Play All" button above track list in PlaylistDetailClient
  - Connect button to playPlaylist context action
  - Pass playlist and startIndex=0
  - Add disabled state when playlist is empty
  - Style button prominently with play icon
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 5.2 Add play buttons to individual tracks

  - Add play/pause button to each track item
  - Show play button when track is not current
  - Show pause button when track is current and playing
  - Connect to playPlaylist with track index
  - Add visual indicator for currently playing track
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5.3 Integrate playback state with track list

  - Use usePlayback hook in PlaylistDetailClient
  - Highlight currently playing track
  - Update UI when playback state changes
  - Show loading state during track transitions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

---

## Phase 3: Enhanced Controls (Priority: MEDIUM)

### Task 6: Implement Shuffle and Repeat Modes

**Estimated Time:** 1 hour

- [x] 6. Implement Shuffle and Repeat Modes

  - Implement shuffle mode toggle logic
  - Implement repeat mode cycling logic
  - Handle repeat mode in track progression
  - Add visual indicators for active modes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.5, 11.6, 11.7_

- [x] 6.1 Implement shuffle mode toggle logic

  - Add toggleShuffle action in PlaybackContext
  - Rebuild queue with shuffled order when enabled
  - Keep current track at front of shuffled queue
  - Restore original order when disabled
  - Update queue state and persist to sessionStorage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 6.2 Implement repeat mode cycling logic

  - Add cycleRepeat action in PlaybackContext
  - Cycle through: off → playlist → track → off
  - Update repeatMode state
  - Persist mode to sessionStorage
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 6.3 Handle repeat mode in track progression

  - Modify next() action to check repeat mode
  - If repeat track: restart current track
  - If repeat playlist: restart from first track after last
  - If off: stop playback after last track
  - _Requirements: 7.3, 7.4, 7.5, 11.5, 11.6, 11.7_

- [x] 6.4 Add visual indicators for active modes

  - Update shuffle button styling when active
  - Update repeat button with mode icon (off/playlist/track)
  - Add tooltips explaining current mode
  - Ensure accessibility with aria-labels
  - _Requirements: 7.6, 7.7, 8.6, 8.7_

### Task 7: Implement Playback State Restoration

**Estimated Time:** 30 minutes

- [x] 7. Implement Playback State Restoration

  - Implement state restoration on mount
  - Handle restoration errors gracefully
  - Validate and restore playlist and track data
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7.1 Implement state restoration on mount

  - Call restorePlaybackState() in PlaybackContext initialization
  - Fetch playlist data if stored state exists
  - Validate stored track exists in playlist
  - Load track and seek to stored position

  - Restore shuffle and repeat modes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7.2 Handle restoration errors gracefully

  - Clear stale state (older than 1 hour)
  - Handle missing playlist or track
  - Handle sessionStorage unavailability
  - Don't auto-play on restoration, just restore state
  - _Requirements: 9.7, 10.6, 10.7_

---

## Phase 4: Content Management (Priority: MEDIUM)

### Task 8: Implement Drag-and-Drop Track Reordering

**Estimated Time:** 1.5 hours

- [x] 8. Implement Drag-and-Drop Track Reordering

  - Create database function for batch position updates
  - Create TrackReorderList component
  - Implement reorder database update
  - Integrate TrackReorderList into PlaylistDetailClient
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 8.1 Create database function for batch position updates

  - Create migration file for reorder_playlist_tracks function
  - Write SQL function accepting playlist_id and track_positions JSONB
  - Implement loop to update each track position
  - Test function in Supabase dashboard
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 8.2 Create TrackReorderList component

  - Create `src/components/playlists/TrackReorderList.tsx`
  - Implement drag handle on each track (owner only)
  - Add dragStart, dragOver, dragEnd event handlers
  - Implement visual feedback during drag (opacity, drop zones)
  - Calculate new positions after drop
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 8.3 Implement reorder database update

  - Create utility function to call reorder_playlist_tracks RPC
  - Implement optimistic UI update
  - Call database function with new positions
  - Handle errors with rollback to original order
  - Show success/error notifications
  - _Requirements: 10.4, 10.5, 10.6, 10.7_

- [x] 8.4 Integrate TrackReorderList into PlaylistDetailClient

  - Replace standard track list with TrackReorderList for owners
  - Pass isOwner prop to enable/disable drag handles
  - Refresh playlist data after successful reorder
  - Maintain playback state during reordering
  - _Requirements: 10.1, 10.2, 10.3, 10.7_

### Task 9: Implement Two-Section Playlists Page

**Estimated Time:** 1 hour

- [x] 9. Implement Two-Section Playlists Page

  - Create getPublicPlaylists utility function
  - Enhance PlaylistsList component structure
  - Implement two-section layout
  - Update PlaylistCard for public playlists
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 9.1 Create getPublicPlaylists utility function

  - Create function in `src/lib/playlists.ts`
  - Query playlists where is_public=true
  - Exclude playlists where user_id matches current user
  - Order by created_at descending
  - Limit to 50 results
  - Include error handling
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 9.2 Enhance PlaylistsList component structure

  - Update `src/components/playlists/PlaylistsList.tsx`
  - Add separate state for myPlaylists and publicPlaylists
  - Add separate loading states for each section
  - Add separate error states for each section
  - Fetch both datasets independently
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 9.3 Implement two-section layout

  - Create "My Playlists" section with heading
  - Create "Public Playlists" section with heading
  - Display separate loading spinners for each section
  - Display separate empty states for each section
  - Use responsive grid layout for both sections
  - Add spacing between sections
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 9.4 Update PlaylistCard for public playlists

  - Show creator name for public playlists
  - Hide edit/delete buttons for non-owned playlists
  - Add "Public" badge indicator
  - Ensure proper navigation to playlist detail
  - _Requirements: 12.4, 12.5, 12.6_

---

## Phase 5: Testing and Polish (Priority: FINAL)

### Task 10: Comprehensive Testing

**Estimated Time:** 1 hour

- [x] 10. Comprehensive Testing

  - Test playback functionality
  - Test shuffle and repeat modes
  - Test state persistence
  - Test drag-and-drop reordering
  - Test two-section playlists page
  - Test error handling
  - Run TypeScript and linting checks
  - _Requirements: All requirements_

- [x] 10.1 Test playback functionality

  - Test Play All button starts playlist from beginning
  - Test individual track play buttons
  - Test play/pause toggle
  - Test next/previous track navigation
  - Test automatic track progression
  - Test playback across page navigation
  - Verify mini player persists correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10.2 Test shuffle and repeat modes

  - Test shuffle toggle randomizes queue
  - Test shuffle toggle restores original order
  - Test repeat off stops after last track
  - Test repeat playlist restarts from beginning
  - Test repeat track replays current track
  - Test mode persistence across page refresh

  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 10.3 Test state persistence

  - Test playback state saves to sessionStorage
  - Test state restores after page refresh
  - Test stale state is cleared (>1 hour old)
  - Test graceful handling when sessionStorage unavailable

  - Test state clears on browser close

  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 10.4 Test drag-and-drop reordering

  - Test drag handles appear for playlist owners
  - Test drag handles hidden for non-owners
  - Test visual feedback during drag
  - Test position updates persist to database
  - Test error handling with rollback

  - Test playback continues during reorder
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 10.5 Test two-section playlists page

  - Test "My Playlists" section shows user's playlists
  - Test "Public Playlists" section shows others' public playlists
  - Test user's own public playlists don't appear in public section
  - Test independent loading states

  - Test empty states for both sections
  - Test responsive layout on mobile
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 10.6 Test error handling

  - Test playback errors show user-friendly messages
  - Test network errors with retry option

  - Test auto-skip on non-retryable errors
  - Test reorder errors with rollback
  - Test missing playlist/track handling
  - _Requirements: All requirements_

- [x] 10.7 Run TypeScript and linting checks

  - Run `npx tsc --noEmit` to check for TypeScript errors
  - Run `npm run lint` to check for linting issues
  - Fix any errors or warnings
  - Verify no console errors in browser
  - _Requirements: All requirements_

### Task 11: Documentation and Finalization

**Estimated Time:** 30 minutes

- [x] 11. Documentation and Finalization

  - Update project documentation
  - Update CHANGELOG
  - Update steering documents
  - Final code quality check
  - _Requirements: All requirements_

- [x] 11.1 Update project documentation

  - Update README.md with playlist playback features
  - Document mini player functionality
  - Document shuffle and repeat modes
  - Document drag-and-drop reordering
  - Add usage examples
  - _Requirements: All requirements_

- [x] 11.2 Update CHANGELOG

  - Create entry for playlist playback enhancements
  - List all added features
  - List all changed components
  - Note any breaking changes
  - _Requirements: All requirements_

- [x] 11.3 Update steering documents

  - Update `.kiro/steering/product.md` with completed features
  - Document lessons learned
  - Note any technical decisions made during implementation
  - _Requirements: All requirements_

- [x] 11.4 Final code quality check

  - Review all changed files for code quality
  - Ensure consistent code style
  - Verify proper error handling throughout
  - Check for any TODO comments
  - Verify no sensitive data in code
  - Prepare for git commit
  - _Requirements: All requirements_

---

## Task Execution Notes

### Task Dependencies

**Critical Path:**

1. Tasks 1-3 (Foundation) must complete first
2. Task 4 (MiniPlayer) depends on Tasks 1-3

3. Task 5 (Playlist enhancements) depends on Tasks 1-4
4. Tasks 6-7 (Enhanced controls) depend on Tasks 1-5
5. Tasks 8-9 (Content management) are independent, can run parallel
6. Task 10 (Testing) requires all previous tasks
7. Task 11 (Documentation) requires Task 10

**Parallel Opportunities:**

- Tasks 8 and 9 can be worked on simultaneously
- Task 6 and 7 can be worked on simultaneously after Task 5

### Testing Guidelines

- Test after completing each major task
- Run TypeScript compiler check after any type changes
- Test playback functionality in browser during development
- Verify mini player persists across page navigation
- Test on mobile viewport for responsive design
- Check browser console for errors after each change

### Optional Tasks

No tasks are marked as optional. All tasks are required for complete implementation of the playlist playback enhancements feature.

### Success Criteria

- All tasks completed
- No TypeScript compilation errors
- No console errors in browser
- All playback features work correctly
- Mini player persists across navigation
- Shuffle and repeat modes function properly
- Drag-and-drop reordering works for owners
- Two-section playlists page displays correctly
- State persists across page refreshes
- Documentation updated
- Code ready for git commit

---

_Implementation Plan Version: 1.0_  
_Created: Month 4 Week 1_  
_Total Tasks: 11 main tasks with 50+ sub-tasks_  
_Estimated Time: 8 hours_

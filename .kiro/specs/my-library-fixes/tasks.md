# Implementation Plan - My Library Fixes and Enhancements

## Overview

This implementation plan breaks down the bug fixes and enhancements into discrete, manageable tasks organized by priority. Each task includes specific files to modify, code changes to make, and testing requirements.

## Task List

### Phase 1: Critical Fixes (P0)

- [x] 1. Fix lazy loading state persistence for Albums and Playlists sections







  - Modify `client/src/app/library/page.tsx`
  - Add initial visibility check on component mount
  - Check if elements are already in viewport using `getBoundingClientRect()`
  - Set `shouldLoadAlbums` and `shouldLoadPlaylists` to true if already visible
  - Keep Intersection Observer for elements not yet visible
  - Test: Refresh page multiple times, use browser back button
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Investigate and fix track deletion database constraint error





  - Query database to understand `posts` table relationship with `tracks`
  - Check `posts_audio_fields_check` constraint definition
  - Identify if posts should be deleted or updated when track is deleted
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2.1 Implement track deletion fix

  - Modify track deletion function (find in `client/src/lib/tracks.ts` or similar)
  - Delete related posts before deleting track
  - Add proper error handling and rollback logic
  - Test: Delete tracks that have associated posts
  - _Requirements: 7.4, 7.5_

- [x] 3. Investigate and fix track upload database error





  - Query `tracks` table schema to identify all required fields
  - Check for constraints and default values
  - Review AudioUpload component to see what fields it sends
  - Identify missing or invalid fields in upload payload
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.1 Implement track upload fix


  - Update AudioUpload component to provide all required fields
  - Add validation before database insert
  - Provide default values for optional fields
  - Add user-friendly error messages
  - Test: Upload various track types and formats
  - _Requirements: 3.4, 3.5_

### Phase 2: Functional Fixes (P1)

- [x] 4. Fix stats section play count calculation





  - Modify `client/src/types/library.ts` to remove `playsThisWeek` from `LibraryStats` interface
  - Update `client/src/lib/library.ts` `getLibraryStats` function to remove calculation
  - Update `client/src/components/library/StatsSection.tsx` to display only 5 stats
  - Adjust grid layout from 6 columns to 5 columns
  - Test: Verify stats display correctly without "Plays This Week"
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Find or create AddToPlaylistModal component





  - Search for existing `AddToPlaylistModal.tsx` component
  - If not found, create `client/src/components/library/AddToPlaylistModal.tsx`
  - Model after `AddToAlbumModal.tsx` structure
  - _Requirements: 6.1_

- [x] 5.1 Implement playlist track removal functionality


  - Track initial playlist membership state in component
  - Compare initial state with final state on save
  - Identify playlists to add (newly checked) and remove (newly unchecked)
  - Call `removeTrackFromPlaylist` for unchecked playlists
  - Call `addTrackToPlaylist` for newly checked playlists
  - Implement optimistic UI updates with rollback on error
  - Test: Add and remove tracks from multiple playlists
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 6. Create album edit page





  - Create `client/src/app/library/albums/[id]/edit/page.tsx`
  - Fetch album data using `getAlbumWithTracks`
  - Create edit form with name, description, and is_public fields
  - Implement form validation
  - Call `updateAlbum` on submit
  - Invalidate albums cache after successful update
  - Navigate back to /library after save
  - Add "Back to Library" button
  - Test: Edit album details and verify changes persist
  - _Requirements: 9.2_



### Phase 3: UX Improvements (P2)

- [x] 7. Enhance track card visual clarity - Replace eye icon





  - Modify `client/src/components/library/TrackCard.tsx`
  - Replace eye icon SVG with play icon SVG
  - Add "plays" text label after the count
  - Update icon styling for consistency
  - Test: Verify play count displays clearly
  - _Requirements: 4.1_

- [x] 7.1 Add likes counter to track card


  - Check if `like_count` field exists in tracks table (query database)
  - If not, check for `likes` table and count relationship
  - Update `TrackWithMembership` type to include like count
  - Update `getUserTracksWithMembership` to fetch like count
  - Add likes display to TrackCard component with heart icon
  - Test: Verify likes display correctly
  - _Requirements: 4.2_

- [x] 7.2 Add track author to track card


  - Update `getUserTracksWithMembership` query to join with `user_profiles`
  - Include username in returned data
  - Update `TrackWithMembership` type to include user info
  - Add author display below track title in TrackCard
  - Format as "by [username]"
  - Test: Verify author displays correctly
  - _Requirements: 4.3_

- [x] 7.3 Reduce initial tracks display to 8


  - Modify `client/src/app/library/page.tsx`
  - Change `initialLimit` prop from 12 to 8 in AllTracksSection
  - Test: Verify only 8 tracks display initially
  - _Requirements: 4.4_

- [x] 7.4 Add play button to track card


  - Add `onPlay` prop to TrackCard component interface
  - Create play button overlay on cover art
  - Style button to appear on hover (desktop) or always visible (mobile)
  - Integrate with PlaybackContext to start playback
  - Pass track data to mini player
  - Test: Click play button and verify mini player starts
  - _Requirements: 4.5, 4.6_

- [x] 7.5 Integrate track card play button with AllTracksSection


  - Import `usePlayback` hook in AllTracksSection
  - Create `handlePlay` function that calls playback context
  - Pass `handlePlay` as `onPlay` prop to TrackCard
  - Test: Play tracks from library page
  - _Requirements: 4.5, 4.6_

- [x] 8. Fix album description overflow




  - Modify album details page (find `client/src/app/library/albums/[id]/page.tsx`)
  - Add CSS classes to description container: `whitespace-pre-wrap break-words max-w-full`
  - Test: Create album with very long description and verify no overflow
  - _Requirements: 9.3_

- [x] 9. Fix album card not updating after edit







  - Modify `client/src/app/library/albums/[id]/edit/page.tsx`
  - Invalidate albums cache before navigating back: `cache.invalidate(CACHE_KEYS.ALBUMS(userId))`
  - Alternatively, modify MyAlbumsSection to re-fetch on mount
  - Test: Edit album, return to library, verify card shows updated info
  - _Requirements: 9.4_

- [x] 10. Improve My Playlists section layout - Remove wrapper box





  - Modify `client/src/app/library/page.tsx`
  - Remove `bg-gray-800 border border-gray-700 rounded-lg p-6` wrapper div
  - Let PlaylistsList component handle its own styling
  - Test: Verify playlists section displays correctly
  - _Requirements: 10.1_

- [x] 10.1 Add collapse/expand button to My Playlists section

  - Add `isPlaylistsCollapsed` state to LibraryPage
  - Create section header with collapse button (match Albums/Tracks pattern)
  - Add collapse toggle button with arrow icon
  - Wrap PlaylistsList in collapsible div
  - Add smooth transition animation (300ms)
  - Test: Collapse and expand playlists section
  - _Requirements: 10.2_

- [x] 10.2 Update playlist details page back button


  - Find playlist details page (likely `client/src/app/playlists/[id]/page.tsx`)
  - Change "Back to Playlists" text to "Back to Library"
  - Update href from `/playlists` to `/library`
  - Test: Navigate to playlist details and click back button
  - _Requirements: 10.3_



### Phase 4: Enhancements (P3)

- [x] 11. Remove cover image URL field from album creation





  - Modify `client/src/components/library/CreateAlbumModal.tsx`
  - Remove or hide the `cover_image_url` input field
  - Remove from form state if not needed
  - Test: Create new album and verify field is not shown
  - _Requirements: 9.1_

- [x] 12. Enhance /tracks page - Fix action menu functionality






  - Find tracks page component (likely `client/src/app/tracks/page.tsx`)
  - Identify why 3 dots menu buttons don't work
  - Ensure event handlers are properly connected
  - Test all menu actions: Add to Album, Add to Playlist, Copy URL, Share, Delete
  - _Requirements: 8.1_

- [x] 12.1 Update /tracks page track cards - Visual improvements


  - Apply same visual improvements as library track cards
  - Replace eye icon with play icon + "plays" text
  - Add likes counter
  - Add track author
  - Add play button overlay
  - Test: Verify all visual elements display correctly
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 12.2 Add "Most Liked" filter to /tracks page


  - Modify tracks page filters section
  - Add "Most Liked" option to sorting dropdown
  - Implement sort by like_count descending
  - Update query to order by likes when selected
  - Test: Select "Most Liked" and verify tracks sort correctly
  - _Requirements: 8.6, 8.7_

- [x] 13. Add album playback controls - Play Album button





  - Modify album details page (`client/src/app/library/albums/[id]/page.tsx`)
  - Import `usePlayback` hook from PlaybackContext
  - Create `handlePlayAlbum` function
  - Sort tracks by position
  - Call `playPlaylist` with all album tracks starting at index 0
  - Add "Play Album" button in album header
  - Style button with play icon
  - Test: Click "Play Album" and verify all tracks queue in mini player
  - _Requirements: 9.5, 9.6, 9.7_

- [x] 13.1 Add individual track play buttons to album details


  - Create `handlePlayTrack` function that accepts track index
  - Call `playPlaylist` with all album tracks starting at specified index
  - Add play button next to each track in the list
  - Style button to match playlist implementation
  - Display track number, play button, title, author, and duration
  - Test: Click play button on various tracks and verify playback starts correctly
  - _Requirements: 9.5, 9.6, 9.7_

## Implementation Notes

### Testing Checkpoints

After completing each phase, perform comprehensive testing:

1. **After Phase 1 (Critical Fixes):**
   - Test page refresh and navigation extensively
   - Test track upload with various file types
   - Test track deletion with different scenarios
   - Verify no console errors

2. **After Phase 2 (Functional Fixes):**
   - Test stats display accuracy
   - Test playlist add/remove operations
   - Test album editing workflow
   - Verify cache invalidation works

3. **After Phase 3 (UX Improvements):**
   - Test all track card interactions
   - Test album description display
   - Test playlists section collapse
   - Verify visual consistency

4. **After Phase 4 (Enhancements):**
   - Test album creation flow
   - Test /tracks page functionality
   - Test album playback controls
   - Perform full regression testing

### Dependencies

- **Phase 1** must be completed before other phases (critical blockers)
- **Phase 2** tasks can be done in parallel after Phase 1
- **Phase 3** tasks can be done in parallel after Phase 2
- **Phase 4** tasks can be done in parallel after Phase 3

### Database Investigation Tasks

Several tasks require database investigation first:
- Task 2: Check posts table relationship
- Task 3: Check tracks table schema
- Task 7.1: Check likes table/field

**Recommended approach:** Complete all database investigations first, then implement fixes.

### Key Reminders

- Always run `getDiagnostics` on modified files before marking tasks complete
- Fix all TypeScript errors and linting warnings
- Test on both desktop and mobile after UI changes
- Verify mini player integration works correctly
- Check browser console for errors after each change
- Do NOT git commit - user will handle version control

### Priority Order for Maximum Impact

If time is limited, implement in this order:
1. Task 1 (lazy loading fix) - Most visible issue
2. Task 2-2.1 (track deletion fix) - Blocking user action
3. Task 3-3.1 (track upload fix) - Blocking user action
4. Task 7.3 (reduce tracks to 8) - Quick win
5. Task 7.4-7.5 (play button) - High value UX improvement
6. Task 5-5.1 (playlist removal) - Important functionality
7. Task 4 (stats fix) - Data accuracy
8. Remaining tasks as time permits


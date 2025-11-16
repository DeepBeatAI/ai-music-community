# Implementation Plan

## Task Overview

This implementation plan breaks down the navigation and UI enhancements into discrete, manageable coding tasks. Each task builds incrementally and references specific requirements from the requirements document.

---

## Phase 1: Creator Link Component and Saved Content Cards

- [x] 1. Create reusable CreatorLink component





  - Create `client/src/components/common/CreatorLink.tsx`
  - Implement interface with userId, username, displayName, className, showIcon props
  - Add navigation logic: prefer username, fallback to userId
  - Implement hover states (text-blue-400 hover:text-blue-300)
  - Add click event handler with stopPropagation to prevent card clicks
  - Add optional icon display
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Update SavedAlbumsSection with creator links





  - Modify `SavedAlbumCard` component in `client/src/components/library/SavedAlbumsSection.tsx`
  - Add creator name display below album title
  - Integrate CreatorLink component
  - Update `getSavedAlbums` in `client/src/lib/library.ts` to include creator username/display name if not already included
  - Test creator link navigation
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 3. Update SavedPlaylistsSection with creator links





  - Modify `SavedPlaylistCard` component in `client/src/components/library/SavedPlaylistsSection.tsx`
  - Add creator name display below playlist title
  - Integrate CreatorLink component
  - Update `getSavedPlaylists` in `client/src/lib/library.ts` to include creator username/display name if not already included
  - Test creator link navigation
  - _Requirements: 1.2, 1.4, 1.5_

---

## Phase 2: Back Button Navigation

- [x] 4. Update Album detail page back button





  - Modify `client/src/app/album/[id]/page.tsx`
  - Change "Back to Creator" button text to "Back"
  - Replace `router.push(\`/profile/${album.user_id}\`)` with `router.back()`
  - Keep existing icon and styling
  - Test navigation from various entry points (library, profile, discover)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update Playlist detail page back button





  - Modify `client/src/app/playlist/[playlist_id]/page.tsx` (server component)
  - Update PlaylistDetailClient component to change "Back to Creator" to "Back"
  - Replace creator navigation with `router.back()`
  - Keep existing icon and styling
  - Test navigation from various entry points
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

---

## Phase 3: Creator Names on Detail Pages

- [x] 6. Add creator name to Album detail page





  - Modify `client/src/app/album/[id]/page.tsx`
  - Add creator name display in album header section
  - Position below album title with format "by [Creator Name]"
  - Integrate CreatorLink component
  - Fetch creator username if not already available in album data
  - Test creator link navigation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Add creator name to Playlist detail page





  - Modify `client/src/app/playlist/[playlist_id]/page.tsx` (server component)
  - Fetch creator username in server component (already done for non-owners)
  - Pass creator info to PlaylistDetailClient
  - Update PlaylistDetailClient to display creator name in header
  - Integrate CreatorLink component
  - Test creator link navigation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

## Phase 4: Load More Functionality

- [x] 8. Implement Load More for SavedTracksSection





  - Modify `client/src/components/library/SavedTracksSection.tsx`
  - Add `displayLimit` state (initial value from `initialLimit` prop)
  - Add `isLoadingMore` state
  - Implement `handleLoadMore` function to increment displayLimit by 8
  - Calculate `hasMore` and `showLoadMore` conditions
  - Render Load More button below tracks grid when `showLoadMore` is true
  - Add loading indicator to button
  - Slice tracks array based on displayLimit for rendering
  - Test with 0, 8, 9, 16, 17+ tracks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Implement Load More for SavedAlbumsSection





  - Modify `client/src/components/library/SavedAlbumsSection.tsx`
  - Add `displayLimit` state (initial value from `initialLimit` prop)
  - Add `isLoadingMore` state
  - Implement `handleLoadMore` function to increment displayLimit by 8
  - Calculate `hasMore` and `showLoadMore` conditions
  - Render Load More button below albums grid when `showLoadMore` is true
  - Add loading indicator to button
  - Slice albums array based on displayLimit for rendering
  - Test with 0, 8, 9, 16, 17+ albums
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Implement Load More for SavedPlaylistsSection





  - Modify `client/src/components/library/SavedPlaylistsSection.tsx`
  - Add `displayLimit` state (initial value from `initialLimit` prop)
  - Add `isLoadingMore` state
  - Implement `handleLoadMore` function to increment displayLimit by 8
  - Calculate `hasMore` and `showLoadMore` conditions
  - Render Load More button below playlists grid when `showLoadMore` is true
  - Add loading indicator to button
  - Slice playlists array based on displayLimit for rendering
  - Test with 0, 8, 9, 16, 17+ playlists
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

---

## Phase 5: Save Button State Synchronization

- [x] 11. Verify and fix CreatorTracksSection save status





  - Review `client/src/components/profile/CreatorTracksSection.tsx`
  - Verify `fetchSavedStatus` function is called correctly
  - Verify `savedTrackIds` state is used in SaveButton `isSaved` prop
  - Test save button display on creator pages (should show "Remove" if saved, "Save" if not)
  - Fix any issues found
  - _Requirements: 9.1, 9.2, 9.3, 9.8_

- [x] 12. Implement save status sync for CreatorAlbumsSection





  - Modify `client/src/components/profile/CreatorAlbumsSection.tsx`
  - Add `savedAlbumIds` state (Set<string>)
  - Implement `fetchSavedStatus` function using `getBulkSavedStatus`
  - Call `fetchSavedStatus` after albums are loaded
  - Update SaveButton to use `isSaved={savedAlbumIds.has(album.id)}`
  - Implement `handleSaveToggle` for optimistic updates
  - Test save button display and toggle functionality
  - _Requirements: 9.1, 9.4, 9.5, 9.8_

- [x] 13. Implement save status sync for CreatorPlaylistsSection





  - Modify `client/src/components/profile/CreatorPlaylistsSection.tsx`
  - Add `savedPlaylistIds` state (Set<string>)
  - Implement `fetchSavedStatus` function using `getBulkSavedStatus`
  - Call `fetchSavedStatus` after playlists are loaded
  - Update SaveButton to use `isSaved={savedPlaylistIds.has(playlist.id)}`
  - Implement `handleSaveToggle` for optimistic updates
  - Test save button display and toggle functionality
  - _Requirements: 9.1, 9.6, 9.7, 9.8_

---

## Phase 6: Like Count Display Fix

- [x] 14. Investigate like count database schema





  - Query the database to check if `like_count` column exists in tracks table
  - Check if there's a separate `likes` or `track_likes` table
  - Check if there's a relationship between tracks and likes
  - Document findings in a comment or separate investigation file
  - Determine which solution approach to use (A, B, or C from design doc)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Implement like count display solution





  - Based on investigation findings, implement the appropriate solution:
    - **Option A**: Add join to likes table in `getPublicTracks` query
    - **Option B**: Add trigger or computed field for like_count
    - **Option C**: Document that like system needs implementation
  - Update `client/src/lib/profileService.ts` if query changes needed
  - Update track type definitions if needed
  - Test like count display on creator page track cards
  - Verify counts are accurate
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

---

## Phase 7: Testing and Validation

- [x] 16. Run diagnostics and fix errors





  - Run `getDiagnostics` on all modified files
  - Fix any TypeScript errors
  - Fix any linting errors
  - Ensure all imports are correct
  - Verify no unused variables or functions

- [x] 17. Manual testing checklist


  - Test all creator link navigations (saved albums, saved playlists, detail pages)
  - Test back button navigation from various entry points
  - Test Load More functionality with different data sizes
  - Test save button states on creator pages
  - Test like count display on track cards
  - Verify responsive design on mobile, tablet, desktop
  - Test with empty states (no saved items, no tracks, etc.)
  - Test error scenarios (network failures, invalid IDs, etc.)

---

## Notes

- Each task should be completed and tested before moving to the next
- Run diagnostics after each file modification
- Test functionality immediately after implementation
- Use existing patterns and utilities where possible
- Maintain consistency with current codebase style
- Document any deviations from the design or unexpected issues

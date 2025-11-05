# Implementation Plan

- [x] 1. Create TrackPicker component infrastructure





- [x] 1.1 Create TrackPickerCard component for individual track display


  - Create `client/src/components/dashboard/TrackPickerCard.tsx`
  - Implement track display with title, author, and duration
  - Add visual indicator for selected state (border, checkmark)
  - Implement click handler for track selection
  - Add keyboard accessibility (Enter/Space to select)
  - Style with hover effects and transitions
  - _Requirements: 1.1, 1.2, 4.1, 7.1, 7.2, 8.1_

- [x] 1.2 Create TrackPicker component with grid layout


  - Create `client/src/components/dashboard/TrackPicker.tsx`
  - Implement track fetching from Supabase filtered by user_id
  - Display tracks in responsive grid (2-4 columns based on screen size)
  - Implement loading skeleton state
  - Implement empty state with link to Library page
  - Add pagination support (20 tracks per page)
  - Handle track selection and pass to parent component
  - Implement error handling with retry option
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 8.2_

- [x] 1.3 Add TypeScript interfaces for TrackPicker


  - Define `TrackPickerProps` interface
  - Define `TrackPickerState` interface
  - Define `TrackPickerCardProps` interface
  - Export interfaces from types file
  - _Requirements: 4.3_

- [x] 2. Update Dashboard audio post tab





- [x] 2.1 Replace AudioUpload with TrackPicker


  - Remove AudioUpload component from audio post tab
  - Remove track author input field
  - Remove track description textarea
  - Add TrackPicker component to audio post tab
  - Update form state to use selectedTrack instead of file
  - Show selected track metadata as read-only after selection
  - Preserve caption textarea for post commentary
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 2.2 Update audio post submission logic


  - Modify `handleAudioPostSubmit` to use selectedTrack.id
  - Remove track upload logic (uploadTrack call)
  - Update to only create post with track_id reference
  - Add validation to ensure track is selected
  - Add validation to ensure track is public
  - Update form reset logic to clear selectedTrack
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 2.3 Update form state management


  - Remove `selectedAudioFile` state
  - Remove `trackAuthor` state
  - Remove `trackDescription` state
  - Add `selectedTrack` state
  - Update state initialization and reset logic
  - _Requirements: 1.2, 1.5_

- [x] 3. Add track action buttons to PostItem





- [x] 3.1 Move Add to Playlist button to "About this track" section


  - Remove AddToPlaylist button from post footer
  - Add AddToPlaylist button to "About this track" section header
  - Maintain existing functionality and styling
  - Update button positioning and layout
  - _Requirements: 3.1, 3.6, 4.2_

- [x] 3.2 Add Copy Track URL button


  - Add "Copy track URL" button to "About this track" section
  - Implement `handleCopyTrackUrl` function
  - Generate track URL using `window.location.origin/tracks/{track_id}`
  - Use navigator.clipboard.writeText for copying
  - Show success toast on successful copy
  - Show error toast on failure with fallback option
  - Reuse button styling from library TrackCard
  - _Requirements: 3.2, 3.3, 4.2, 5.1, 5.2_

- [x] 3.3 Add Share Track button


  - Add "Share track" button to "About this track" section
  - Implement `handleShareTrack` function to open ShareModal
  - Pass track information to ShareModal
  - Reuse button styling from library TrackCard
  - _Requirements: 3.4, 3.5, 4.2_

- [x] 3.4 Update "About this track" section layout


  - Add flex container for buttons in section header
  - Ensure responsive layout for mobile (stack buttons if needed)
  - Maintain adequate spacing between buttons
  - Ensure touch-friendly button sizes (44x44px minimum)
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. Rename Share button to Share post




- [x] 4.1 Update PostItem Share button text

  - Change button text from "Share" to "Share post"
  - Update aria-label to "Share this post"
  - Maintain existing button styling and functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Enhance ShareModal for dual use





- [x] 5.1 Update ShareModal component props


  - Add `shareType` prop ('post' | 'track')
  - Update `itemId` prop to handle both post_id and track_id
  - Update URL generation logic based on shareType
  - Maintain backward compatibility with existing usage
  - _Requirements: 3.5, 4.2_

- [x] 5.2 Update ShareModal URL generation

  - Implement conditional URL generation based on shareType
  - Track: `${origin}/tracks/${itemId}`
  - Post: `${origin}/posts/${itemId}`
  - Update modal title based on shareType
  - _Requirements: 3.5_

- [x] 6. Add error handling and user feedback





- [x] 6.1 Implement clipboard error handling


  - Add try-catch around clipboard operations
  - Show error toast with helpful message on failure
  - Implement fallback modal for manual copy if clipboard fails
  - _Requirements: 5.1, 5.2_

- [x] 6.2 Implement track loading error handling


  - Add error state to TrackPicker
  - Show error message with retry button
  - Log errors to console for debugging
  - _Requirements: 5.3, 5.4_

- [x] 6.3 Add validation error messages


  - Show error if no track selected on submit
  - Show error if selected track is not public
  - Display validation errors near relevant fields
  - _Requirements: 5.4_

- [x] 7. Implement accessibility features





- [x] 7.1 Add keyboard navigation to TrackPicker


  - Implement arrow key navigation between tracks
  - Add Enter/Space key handlers for track selection
  - Ensure proper tab order through picker
  - Add Escape key handler to close modals
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.2 Add ARIA labels and roles


  - Add role="listbox" to TrackPicker container
  - Add role="option" to TrackPickerCard
  - Add aria-selected attribute to selected track
  - Add aria-label to all new buttons
  - Add aria-label to track cards with title and author
  - _Requirements: 7.3, 7.4_

- [x] 7.3 Implement focus management


  - Focus moves to TrackPicker when audio tab opens
  - Focus returns to tab button when modal closes
  - Trap focus within modals when open
  - Add visible focus indicators to all interactive elements
  - _Requirements: 7.4_

- [x] 8. Optimize performance




- [x] 8.1 Implement track caching


  - Cache fetched tracks in component state
  - Avoid refetching tracks on tab switch
  - Implement session-based cache for track data
  - _Requirements: 6.4_

- [x] 8.2 Add React performance optimizations


  - Wrap TrackPickerCard in React.memo
  - Use useCallback for event handlers
  - Use useMemo for computed values
  - Implement pagination to limit initial render
  - _Requirements: 6.1, 6.3_

- [x] 8.3 Optimize API calls


  - Fetch tracks only when audio tab is opened (lazy loading)
  - Implement pagination with 20 tracks per page
  - Add loading states during fetch operations
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Ensure mobile responsiveness





- [x] 9.1 Implement responsive grid layout


  - Mobile (< 640px): 1-2 column grid
  - Tablet (640px - 1024px): 2-3 column grid
  - Desktop (> 1024px): 3-4 column grid
  - Test on various screen sizes
  - _Requirements: 8.2_

- [x] 9.2 Optimize touch interactions


  - Ensure minimum 44x44px touch targets for all buttons
  - Add adequate spacing between interactive elements
  - Test touch selection on mobile devices
  - Implement touch-friendly button sizes in "About this track" section
  - _Requirements: 8.1, 8.3_

- [x] 9.3 Test mobile-specific features


  - Test track picker on mobile browsers
  - Test clipboard functionality on mobile
  - Test share modal on mobile
  - Verify button stacking on small screens
  - _Requirements: 8.4, 8.5_

- [x] 10. Automated Testing






- [x] 10.1 Run TypeScript and linting checks

  - Run `npm run type-check` or equivalent
  - Fix all TypeScript errors
  - Run ESLint and fix all errors/warnings
  - Ensure no console errors in browser
  - _Requirements: All_


- [x] 10.2 Write unit tests for TrackPicker components


  - Test TrackPickerCard renders correctly with track data
  - Test TrackPickerCard selection state changes
  - Test TrackPickerCard click and keyboard handlers
  - Test TrackPicker loading state rendering
  - Test TrackPicker empty state rendering
  - Test TrackPicker track grid rendering
  - Test TrackPicker pagination logic
  - _Requirements: 1.1, 1.2, 6.1, 6.2_


- [x] 10.3 Write integration tests for audio post creation

  - Test complete flow: open audio tab → select track → add caption → submit
  - Test form state updates when track is selected
  - Test form validation (no track selected)
  - Test form reset after successful submission
  - Test error handling for failed submissions
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.3, 5.4_


- [x] 10.4 Write tests for button handlers

  - Test handleCopyTrackUrl copies correct URL
  - Test handleCopyTrackUrl shows success toast
  - Test handleCopyTrackUrl handles clipboard errors
  - Test handleShareTrack opens modal with correct data
  - Test Share post button has correct text
  - _Requirements: 2.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2_


- [x] 10.5 Run all automated tests and fix failures

  - Execute test suite with `npm test` or equivalent
  - Fix any failing tests
  - Ensure test coverage meets project standards
  - Verify no test warnings or errors
  - _Requirements: All_

- [x] 11. Manual Testing (After automated tests pass)


- [x] 11.1 Manual validation checklist

  - **User Flow Testing:**
    - [ ] Audio post creation with track selection works end-to-end
    - [ ] Empty state displays correct message and Library link works
    - [ ] Track selection provides visual feedback
    - [ ] Copy track URL copies to clipboard successfully
    - [ ] Share track modal opens with correct information
    - [ ] Share post button displays "Share post" text
    - [ ] Add to Playlist button works in new location
  - **Error Handling:**
    - [ ] Clipboard errors show helpful error message
    - [ ] Track loading errors display with retry option
    - [ ] Validation errors appear for missing track selection
    - [ ] All error messages are user-friendly
  - **Accessibility:**
    - [ ] Keyboard navigation works through TrackPicker (Tab, Arrow keys)
    - [ ] Enter/Space keys select tracks
    - [ ] Escape key closes modals
    - [ ] Focus indicators are visible on all interactive elements
    - [ ] ARIA labels are present and correct (inspect with dev tools)
  - **Mobile Responsiveness:**
    - [ ] Track picker displays correctly on mobile (< 640px)
    - [ ] All buttons are touch-friendly (44x44px minimum)
    - [ ] Buttons in "About this track" section stack properly on small screens
    - [ ] Touch selection works smoothly
    - [ ] Responsive grid adapts to screen size (1-2-3-4 columns)
  - **Performance:**
    - [ ] Track picker loads within 500ms
    - [ ] Track selection responds within 100ms
    - [ ] No performance degradation on mobile
    - [ ] Pagination works smoothly for users with many tracks
  - _Requirements: All_

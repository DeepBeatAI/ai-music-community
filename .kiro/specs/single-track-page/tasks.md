# Implementation Plan

## Overview

This implementation plan breaks down the Single Track Page feature into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring a systematic approach to creating a dedicated page for individual tracks accessible via `/tracks/{track_id}` URLs.

## Task List

- [x] 1. Create route structure and basic page layout





- [x] 1.1 Create Next.js dynamic route at `client/src/app/tracks/[id]/page.tsx`


  - Set up the page component with proper TypeScript types
  - Extract track ID from URL params using Next.js App Router
  - Add MainLayout wrapper for consistent page structure
  - _Requirements: 1.1, 1.4_

- [x] 1.2 Implement basic loading and error states

  - Create loading skeleton UI for track data
  - Create error state UI for track not found (404)
  - Create error state UI for permission denied (403)
  - Add retry functionality for failed loads
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3_

- [x] 2. Implement track data fetching and state management





- [x] 2.1 Create data fetching function for track with all related data


  - Write Supabase query to fetch track with user profile, album, and playlist memberships
  - Fetch like count from posts table
  - Handle authentication state for conditional data fetching
  - Implement error handling for database queries
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 2.2 Implement user-specific data fetching (like status, follow status)


  - Check if authenticated user has liked the track
  - Check if authenticated user is following the track uploader
  - Handle unauthenticated state gracefully
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 2.3 Set up state management for track data and user interactions


  - Create state for track data, loading, and errors
  - Create state for like status and count
  - Create state for follow status
  - Implement optimistic updates for user interactions
  - _Requirements: 5.3, 5.4_


- [x] 3. Integrate waveform player with play tracking





- [x] 3.1 Add WavesurferPlayer component to the page


  - Import and render WavesurferPlayer component from `@/components/WavesurferPlayer`
  - Pass track audio URL using getCachedAudioUrl utility
  - Pass trackId prop for play count tracking (CRITICAL for tracking algorithm)
  - Configure waveform theme and display options
  - _Requirements: 3.1, 3.2, 3.5, 9.2, 9.3_

- [x] 3.2 Verify play tracking integration


  - Ensure trackId is passed to WavesurferPlayer
  - Test that play events trigger playTracker.onPlayStart
  - Test that 30+ second plays are recorded to database
  - Verify play_count increments correctly
  - _Requirements: 3.2, 3.3_

- [x] 4. Integrate track card display





- [x] 4.1 Add TrackCardWithActions component to the page


  - Import and render TrackCardWithActions from `@/components/library/TrackCardWithActions`
  - Pass track data with membership information
  - Implement conditional actions menu based on ownership
  - Handle track update and delete callbacks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3_

- [x] 4.2 Implement toast notification system


  - Create toast state and handler functions
  - Pass toast handler to TrackCardWithActions
  - Display success/error messages for user actions
  - Auto-dismiss toasts after appropriate duration
  - _Requirements: 4.4, 4.5_

- [x] 5. Implement social features (like and follow)





- [x] 5.1 Add like functionality


  - Import and render LikeButton component
  - Connect to post associated with track
  - Implement like toggle with optimistic updates
  - Update like count in real-time
  - Handle errors with rollback
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.2 Add follow functionality for track uploader


  - Import and render FollowButton component
  - Display track uploader's username with link to profile
  - Implement follow toggle with optimistic updates
  - Show follow button only for non-owners
  - _Requirements: 5.4, 5.5_

- [x] 5.3 Display creator information section


  - Show track uploader's username (from user_profiles table)
  - Add link to uploader's profile page
  - Display user stats if available
  - Position follow button near creator info
  - _Requirements: 5.4_


- [x] 6. Implement navigation and back button





- [x] 6.1 Create back button with smart navigation


  - Add back button to page header
  - Implement router.back() for users with navigation history
  - Implement fallback to dashboard for authenticated users without history
  - Implement fallback to home page for unauthenticated users without history
  - Test browser back button functionality
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 6.2 Handle playback cleanup on navigation


  - Stop waveform playback when navigating away
  - Clean up audio resources properly
  - Ensure no memory leaks from audio player
  - _Requirements: 10.5_

- [x] 7. Implement responsive design




- [x] 7.1 Create mobile-optimized layout


  - Implement stacked layout for mobile screens (< 768px)
  - Ensure waveform player is touch-friendly
  - Make action buttons easily tappable (44px minimum)
  - Test on various mobile screen sizes
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7.2 Create desktop-optimized layout


  - Implement two-column layout for desktop (> 1024px)
  - Position track card and creator info side-by-side
  - Ensure waveform player spans full width
  - Test on various desktop screen sizes
  - _Requirements: 6.1, 6.5_

- [x] 8. Add SEO and sharing optimization





- [x] 8.1 Implement generateMetadata function



  - Create Next.js generateMetadata export
  - Fetch track data for metadata generation
  - Set page title with track title and author
  - Add meta description with track information
  - _Requirements: 7.1, 7.3_

- [x] 8.2 Add Open Graph meta tags

  - Add og:title with track title
  - Add og:description with track description
  - Add og:type as "music.song"
  - Add og:url with canonical track URL
  - Add og:image with track cover or default image
  - _Requirements: 7.1, 7.4_

- [x] 8.3 Add Twitter Card meta tags

  - Add twitter:card as "summary_large_image"
  - Add twitter:title with track title
  - Add twitter:description with track description
  - Add twitter:image with track cover or default image
  - _Requirements: 7.2_


- [x] 9. Implement performance optimizations





- [x] 9.1 Add progressive loading strategy


  - Load track metadata first (priority)
  - Defer audio file loading until user interaction
  - Implement code splitting for heavy components
  - Use React.lazy for modal components
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 9.2 Integrate audio caching system


  - Use getCachedAudioUrl for all audio URL processing
  - Implement cache hit/miss tracking
  - Add retry logic for failed audio loads
  - _Requirements: 9.3_

- [x] 9.3 Add performance monitoring


  - Track page load time
  - Track audio ready time
  - Track user interaction response times
  - Log performance metrics to console
  - _Requirements: 9.5_

- [x] 10. Error handling and edge cases





- [x] 10.1 Implement comprehensive error handling


  - Handle track not found (404) with user-friendly message
  - Handle permission denied (403) with authentication prompt
  - Handle network errors with retry functionality
  - Handle audio load failures with troubleshooting guidance
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10.2 Add offline detection


  - Detect when user loses network connectivity
  - Display offline indicator
  - Queue failed actions for retry when online
  - _Requirements: 8.4_

- [x] 10.3 Implement error logging


  - Log all errors to console with context
  - Include track ID and user ID in error logs
  - Add error boundaries for component failures
  - _Requirements: 8.5_

- [x] 11. Testing and validation





- [x] 11.1 Automated Tests



  - Write unit tests for data fetching functions
  - Write unit tests for like/follow toggle logic
  - Write unit tests for navigation logic
  - Write integration tests for page load flow
  - Write integration tests for audio playback
  - Write integration tests for social interactions
  - Run all automated tests and fix failures
  - _Requirements: All requirements_


- [x] 11.2 Manual Testing (After automated tests pass)


  - **Checklist for functionality validation:**
    - [ ] Navigate to `/tracks/{valid_id}` and verify page loads correctly
    - [ ] Verify track metadata displays (title, author, play count, like count)
    - [ ] Verify waveform player loads and displays correctly
    - [ ] Click play button and verify audio plays
    - [ ] Play track for 30+ seconds and verify play_count increments in database
    - [ ] Verify seek functionality works on waveform
    - [ ] Verify volume control works
    - [ ] Click like button and verify like count updates
    - [ ] Click follow button and verify follow status updates
    - [ ] Open actions menu and verify appropriate options show based on ownership
    - [ ] Click "Copy Track URL" and verify URL is copied to clipboard
    - [ ] Click back button and verify navigation works correctly
    - [ ] Navigate to `/tracks/{invalid_id}` and verify 404 error displays
    - [ ] Test on mobile device and verify responsive layout
    - [ ] Test on desktop and verify two-column layout
    - [ ] Share track URL on social media and verify preview displays correctly
    - [ ] Open shared URL in incognito mode and verify unauthenticated access works
  - _Requirements: All requirements_

- [ ] 12. Documentation and cleanup
- [ ] 12.1 Add code comments and documentation
  - Add JSDoc comments to all functions
  - Document component props and state
  - Add inline comments for complex logic
  - Document any workarounds or edge cases
  - _Requirements: All requirements_

- [ ] 12.2 Run TypeScript and linting checks
  - Fix all TypeScript errors
  - Fix all ESLint errors and warnings
  - Ensure code follows project style guidelines
  - Run Prettier to format code
  - _Requirements: All requirements_

- [ ] 12.3 Final validation
  - Verify all requirements are met
  - Verify all acceptance criteria are satisfied
  - Test complete user journey from sharing to viewing
  - Confirm no console errors or warnings
  - _Requirements: All requirements_

## Implementation Notes

### Critical Dependencies
- WavesurferPlayer component must receive `trackId` prop for play tracking
- getCachedAudioUrl must be used for all audio URL processing
- TrackCardWithActions handles all track management actions
- LikeButton and FollowButton handle social interactions

### Testing Priority
1. Core functionality (page load, data fetching, audio playback)
2. Play tracking (30+ second plays increment play_count)
3. Social features (like, follow)
4. Error handling (404, 403, network errors)
5. Responsive design (mobile and desktop layouts)
6. SEO and sharing (meta tags, social previews)

### Performance Targets
- Page load: < 1 second for metadata
- Audio ready: < 2 seconds
- Interaction response: < 100ms
- Play tracking: Record after 30 seconds of playback

## Completion Criteria

The Single Track Page feature is complete when:
1. All tasks are marked as complete
2. All automated tests pass
3. Manual testing checklist is fully validated
4. No TypeScript or linting errors remain
5. All requirements and acceptance criteria are met
6. Code is documented and follows project standards
7. Feature works correctly on mobile and desktop
8. Play tracking correctly increments play_count after 30+ seconds
9. SEO meta tags display correctly when shared on social media
10. User can navigate, play, like, follow, and share tracks successfully

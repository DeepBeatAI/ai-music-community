# Implementation Plan

## Overview

This implementation plan breaks down the Creator Profile Page feature into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring a systematic approach to implementing this comprehensive feature.

## ⚠️ CRITICAL PRINCIPLE: COPY, DON'T REUSE

**The starting point is to COPY the UI from /library and /library/tracks pages, then modify the copies.**

- ✅ **DO**: Copy entire component files to new locations (e.g., `AllTracksSection.tsx` → `CreatorTracksSection.tsx`)
- ✅ **DO**: Modify the copied files to add/remove features as needed
- ❌ **DON'T**: Import and reuse library components directly
- ❌ **DON'T**: Create shared components that both pages use
- ❌ **DON'T**: Modify existing library components

**Why?** This ensures changes to /library pages don't affect creator profiles and vice versa. Each page remains independent and maintainable.

**Exception**: Utility components like `FollowButton` that are designed to be reusable across the app can be imported directly.

## Task List

- [x] 1. Database Schema Setup





- [x] 1.1 Add user_type column to profiles table


  - Add user_type TEXT column with default 'Free User'
  - Add index on user_type column
  - Update existing profiles to have 'Free User' as user_type
  - _Requirements: 2.1, 8.5, 15.1, 15.2_

- [x] 1.2 Create saved_tracks table


  - Create table with id, user_id, track_id, created_at columns
  - Add UNIQUE constraint on (user_id, track_id)
  - Add indexes on user_id, track_id, and created_at
  - Add RLS policies: SELECT (own saves), INSERT (own saves), DELETE (own saves)
  - _Requirements: 5.4, 5.5, 8.2, 8.7_

- [x] 1.3 Create saved_albums table


  - Create table with id, user_id, album_id, created_at columns
  - Add UNIQUE constraint on (user_id, album_id)
  - Add indexes on user_id, album_id, and created_at
  - Add RLS policies: SELECT (own saves), INSERT (own saves), DELETE (own saves)
  - _Requirements: 5.4, 5.5, 8.3, 8.8_

- [x] 1.4 Create saved_playlists table


  - Create table with id, user_id, playlist_id, created_at columns
  - Add UNIQUE constraint on (user_id, playlist_id)
  - Add indexes on user_id, playlist_id, and created_at
  - Add RLS policies: SELECT (own saves), INSERT (own saves), DELETE (own saves)
  - _Requirements: 5.4, 5.5, 8.4, 8.9_

- [x] 1.5 Create database function for creator stats calculation


  - Review existing getLibraryStats function in client/src/lib/library.ts
  - Create getCreatorStats(user_id) function that extends getLibraryStats logic
  - Add creator_score calculation: (total_plays × 0.6) + (total_likes × 0.4) where likes come from post_likes joined with posts
  - Add follower_count using existing user_follows table
  - Filter all counts to only public content (is_public = true)
  - Return: creator_score, follower_count, track_count, album_count, playlist_count, total_plays
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 1.6 Add composite indexes for performance


  - Add index on tracks(user_id, is_public)
  - Add index on albums(user_id, is_public) if albums table exists
  - Add index on playlists(user_id, is_public)
  - _Requirements: Performance optimization_

- [x] 1.7 Update TypeScript database types



  - Run Supabase type generation to update client/src/types/database.ts
  - Verify all new tables and functions are included in types
  - _Requirements: All database requirements_



- [x] 2. TypeScript Interfaces and Types





- [x] 2.1 Create CreatorProfile interface


  - Add CreatorProfile interface in client/src/types/index.ts
  - Include id, username, full_name, avatar_url, bio, website, user_type, created_at, updated_at
  - _Requirements: 2.1, 15.1_

- [x] 2.2 Create CreatorStats interface


  - Add CreatorStats interface in client/src/types/index.ts
  - Include creator_score, follower_count, track_count, album_count, playlist_count, total_plays
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2.3 Create social feature interfaces


  - Add UserFollow interface (id, follower_id, following_id, created_at)
  - Add SavedTrack interface (id, user_id, track_id, created_at)
  - Add SavedAlbum interface (id, user_id, album_id, created_at)
  - Add SavedPlaylist interface (id, user_id, playlist_id, created_at)
  - _Requirements: 4.3, 4.4, 5.4, 5.5_

- [x] 3. Service Layer Implementation





- [x] 3.1 Create profile service functions


  - Create client/src/lib/profileService.ts
  - Implement getCreatorByUsername(username) function
  - Implement getCreatorById(userid) function
  - Implement getCreatorStats(userid) function using database function
  - Implement getPublicTracks(userid, limit, offset) function
  - Implement getPublicAlbums(userid, limit, offset) function
  - Implement getPublicPlaylists(userid, limit, offset) function
  - Add error handling and type safety
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1-3.6, 7.2_

- [x] 3.2 Create save service functions


  - Create client/src/lib/saveService.ts (follow functionality already exists in utils/community.ts)
  - Implement saveTrack(user_id, track_id) function
  - Implement unsaveTrack(user_id, track_id) function
  - Implement saveAlbum(user_id, album_id) function
  - Implement unsaveAlbum(user_id, album_id) function
  - Implement savePlaylist(user_id, playlist_id) function
  - Implement unsavePlaylist(user_id, playlist_id) function
  - Implement getSavedStatus(user_id, item_id, item_type) function
  - Add error handling and optimistic updates support
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 4. Reusable UI Components





- [x] 4.1 Create UserTypeBadge component


  - Create client/src/components/profile/UserTypeBadge.tsx
  - Accept userType prop (string)
  - Display pill-shaped badge with color coding (gray for Free User)
  - Add support for future multiple badges (userTypes array prop)
  - Make responsive and accessible
  - _Requirements: 2.1, 15.3, 15.4_

- [x] 4.2 Verify and reuse existing FollowButton component


  - FollowButton already exists at client/src/components/FollowButton.tsx
  - Verify it works with FollowContext (client/src/contexts/FollowContext.tsx)
  - Confirm it uses toggleUserFollow and getUserFollowStatus from utils/community.ts
  - Test that it displays "Follow"/"Following" correctly
  - No new implementation needed - just import and use existing component
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.3 Create SaveButton component


  - Create client/src/components/profile/SaveButton.tsx
  - Accept itemId, itemType, isSaved, onToggle, size props
  - Display outline bookmark icon and "Save" when not saved
  - Display filled bookmark icon and "Remove" when saved
  - Show loading spinner during action
  - Handle errors with toast notifications
  - Implement optimistic UI updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 4.4 Create CreatorProfileHeader component


  - Create client/src/components/profile/CreatorProfileHeader.tsx
  - Accept profile, isOwnProfile props (no need for isFollowing/onFollowToggle - FollowButton handles this)
  - Display large circular avatar
  - Display username, full name, bio, website
  - Import and use existing FollowButton component from client/src/components/FollowButton.tsx
  - Hide FollowButton if isOwnProfile
  - Make responsive (stacked on mobile, horizontal on desktop)
  - Add accessibility labels
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [x] 4.5 Create CreatorStatsSection component


  - **COPY** the entire StatsSection.tsx file from client/src/components/library/StatsSection.tsx to client/src/components/profile/CreatorStatsSection.tsx
  - **DO NOT** import or reuse the original StatsSection component
  - In the copied file, modify to use getCreatorStats instead of getLibraryStats
  - Remove "Upload Remaining" stat card
  - Add "Creator Score" stat card (formula: total_plays × 0.6 + total_likes × 0.4)
  - Add "Followers" stat card (from user_follows table)
  - Keep existing: Tracks, Albums, Playlists, Total Plays stat cards
  - Filter all counts to only public content (is_public = true)
  - Maintain existing grid layout (3 cols on mobile, 5-6 cols on desktop)
  - Keep skeleton loading state and error handling patterns
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_



- [x] 5. Creator Profile Content Sections






- [x] 5.1 Create CreatorTrackCard component

  - **COPY** the entire TrackCard component file to client/src/components/profile/CreatorTrackCard.tsx
  - **DO NOT** import or reuse the original TrackCard component
  - In the copied file, remove "Add to Album" menu option
  - Remove "Delete" menu option
  - Keep "Add to Playlist" menu option
  - Add "Save" menu option
  - Add "Copy Track URL" menu option
  - Add "Share" menu option
  - Integrate SaveButton component
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 14.1_


- [x] 5.2 Create CreatorTracksSection component

  - **COPY** the entire AllTracksSection.tsx file from client/src/components/library/AllTracksSection.tsx to client/src/components/profile/CreatorTracksSection.tsx
  - **DO NOT** import or reuse the original AllTracksSection component
  - In the copied file, accept userId, initialLimit, showViewAll props
  - Modify query to filter tracks to is_public = true only
  - Use CreatorTrackCard instead of regular TrackCard
  - Add "View All" button that redirects to /profile/[username]/tracks
  - Keep existing collapsible section with localStorage persistence pattern
  - Keep existing error handling and retry mechanism
  - _Requirements: 2.5, 5.1, 5.2, 5.3, 7.1, 7.2, 14.1, 14.3_


- [x] 5.3 Create CreatorAlbumsSection component

  - **COPY** the entire MyAlbumsSection.tsx file from client/src/components/library/MyAlbumsSection.tsx to client/src/components/profile/CreatorAlbumsSection.tsx
  - **DO NOT** import or reuse the original MyAlbumsSection component
  - In the copied file, accept userId, initialLimit props
  - Modify query to filter albums to is_public = true only
  - Add SaveButton to each album card
  - Remove edit and delete options
  - Keep existing collapsible section with localStorage persistence pattern
  - Keep existing grid layout
  - Keep existing error handling and retry mechanism
  - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 14.1, 14.3_


- [x] 5.4 Create CreatorPlaylistsSection component

  - **COPY** the entire PlaylistsList.tsx file from client/src/components/playlists/PlaylistsList.tsx to client/src/components/profile/CreatorPlaylistsSection.tsx
  - **DO NOT** import or reuse the original PlaylistsList component
  - In the copied file, accept userId, initialLimit props
  - Modify query to filter playlists to is_public = true only
  - Add SaveButton to each playlist card
  - Remove edit and delete options
  - Keep existing collapsible section with localStorage persistence pattern
  - Keep existing grid layout
  - Keep existing error handling and retry mechanism
  - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 14.1, 14.3_

- [x] 6. Main Creator Profile Pages






- [x] 6.1 Move existing profile page to account page

  - Rename/move client/src/app/profile/page.tsx to client/src/app/account/page.tsx
  - Update all internal links and references within the moved file
  - Ensure account settings functionality remains unchanged
  - _Requirements: 1.1, 14.4_


- [x] 6.2 Create CreatorProfilePage component

  - Create client/src/app/profile/[username]/page.tsx
  - Extract username from URL params
  - Fetch creator profile using getCreatorByUsername (fallback to getCreatorById)
  - Check if viewing own profile (isOwnProfile)
  - No need to fetch follow status - FollowButton handles this via FollowContext
  - Render UserTypeBadge at top
  - Render CreatorProfileHeader (which includes FollowButton)
  - Render CreatorStatsSection
  - Render CreatorTracksSection with showViewAll=true
  - Render CreatorAlbumsSection
  - Render CreatorPlaylistsSection
  - Handle loading, error, and not found states
  - Wrap sections in error boundaries (copy pattern from library page)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 14.1_


- [x] 6.3 Create CreatorTracksPage component

  - Create client/src/app/profile/[username]/tracks/page.tsx
  - **COPY** the entire page structure from client/src/app/library/tracks/page.tsx
  - **DO NOT** import or reuse the library tracks page
  - In the copied file, extract username from URL params
  - Fetch creator profile
  - Modify query to fetch only public tracks (is_public = true) for the creator
  - Use CreatorTrackCard for each track instead of regular TrackCard
  - Keep existing infinite scroll or load more pagination pattern
  - Add save functionality to tracks
  - Keep existing loading and error state handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.2_


- [x] 6.4 Create profile redirect page

  - Create client/src/app/profile/page.tsx
  - Check if user is authenticated
  - If authenticated, redirect to /profile/[username] (own profile)
  - If not authenticated, redirect to /login?redirect=/profile
  - Show loading spinner during redirect
  - _Requirements: 1.2_

- [x] 7. Header Navigation Updates




- [x] 7.1 Update Header component with avatar dropdown

  - Modify client/src/components/layout/Header.tsx (or equivalent)
  - Change avatar click behavior from redirect to dropdown menu
  - Add dropdown menu with two options:
    - "My Creator Profile" → /profile
    - "Manage my Account" → /account
  - Use appropriate icons (User icon, Settings icon)
  - Make dropdown accessible (keyboard navigation, ARIA labels)
  - Ensure dropdown works on mobile
  - _Requirements: 1.5_



- [x] 8. Home Page Integration





- [x] 8.1 Update Recent Activity section


  - Modify client/src/app/page.tsx (or relevant component)
  - For follow events: Make entire event card clickable, redirect to creator profile
  - For post/audio post events: Make event card redirect to /dashboard
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 8.2 Update Popular Creators section


  - Modify Popular Creators component in home page
  - Make "View" button redirect to creator profile
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 9.5, 9.6, 9.7_

- [x] 8.3 Update Suggested for You section


  - Modify Suggested for You component in home page
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 9.8, 9.9_

- [x] 9. Discover Page Integration




- [x] 9.1 Update Suggested for You section

  - Modify client/src/app/discover/page.tsx or UserRecommendations component
  - Make "Check out Creator" button redirect to creator profile
  - _Requirements: 10.1_

- [x] 9.2 Update Top 5 Popular Creators sections

  - Modify PopularCreatorCard component
  - Make "View Profile" button redirect to creator profile for both 7-day and all-time sections
  - _Requirements: 10.2, 10.3_

- [x] 10. Dashboard Page Integration




- [x] 10.1 Update post cards with username links

  - Modify client/src/app/dashboard/page.tsx or post card component
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 11.1, 11.2_

- [x] 11. Feed Page Integration




- [x] 11.1 Update event cards


  - Modify client/src/app/feed/page.tsx or event card component
  - For follow events: Make event card clickable, redirect to creator profile
  - For post/audio post events: Make event card redirect to /dashboard
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 12. Notifications Page Integration




- [x] 12.1 Update notification cards


  - Modify client/src/app/notifications/page.tsx or notification card component
  - Remove current link to /discover page
  - Add username links that redirect to creator profile
  - Check if username is current user, if so don't make clickable
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 13. Testing and Validation
- [x] 13.1 Automated Tests - Service Functions





  - Write tests for getCreatorStats function
  - Verify creator_score calculation: (total_plays × 0.6) + (total_likes × 0.4)
  - Verify follower_count from user_follows table
  - Verify all counts filter to is_public = true only
  - Verify performance (<100ms for stats query)
  - Write tests for save service functions (saveTrack, unsaveTrack, etc.)
  - Test error handling and edge cases
  - _Requirements: 3.1-3.6, 5.4, 5.5_

- [x] 13.2 Automated Tests - Components





  - Write tests for UserTypeBadge component
  - Verify existing FollowButton component works correctly (no new tests needed if already tested)
  - Write tests for SaveButton component
  - Write tests for CreatorProfileHeader component
  - Write tests for CreatorStatsSection component
  - Write tests for CreatorTracksSection component
  - Write tests for CreatorAlbumsSection component
  - Write tests for CreatorPlaylistsSection component
  - _Requirements: All component requirements_

- [x] 13.3 Automated Tests - Page Components






  - Write tests for CreatorProfilePage
  - Write tests for CreatorTracksPage
  - Write tests for profile redirect page
  - Test loading, error, and not found states
  - _Requirements: 1.1, 1.2, 7.1-7.5_

- [x] 13.4 Automated Tests - Integration





  - Test follow/unfollow workflow (verify existing FollowContext integration)
  - Test save/unsave workflow
  - Test URL routing (/profile, /account, /profile/[username])
  - Test navigation from all integrated pages
  - Test authentication requirements
  - _Requirements: 4.3-4.5, 5.4-5.6, 9.1-13.3_

- [x] 13.5 Run TypeScript diagnostics




  - Run getDiagnostics on all modified and new files
  - Fix all TypeScript errors
  - Fix all linting errors
  - Ensure no type errors remain
  - _Requirements: Code quality_

- [x] 13.6 Manual Testing Checklist


  - **Visual Design**: Verify user type badge, profile header, stats cards, follow button, save buttons, track/album/playlist cards display correctly
  - **Responsive Design**: Test mobile (<768px), tablet (768-1024px), desktop (>1024px) layouts
  - **Accessibility**: Verify keyboard navigation, focus indicators, screen reader labels, color contrast
  - **Cross-Browser**: Test on Chrome, Firefox, Safari, Edge, Mobile Safari, Mobile Chrome
  - _Requirements: All UI/UX requirements_


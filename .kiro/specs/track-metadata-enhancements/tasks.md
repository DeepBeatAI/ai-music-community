# Implementation Plan: Track Metadata Enhancements

This implementation plan breaks down the track metadata enhancements into discrete, manageable coding tasks. Each task builds incrementally on previous work following the priority order: Track Description → Track Author → Play Count Tracking.

## Priority Order

**Phase 1**: Track Description vs Post Caption Separation (4-6 hours)
**Phase 2**: Mandatory Track Author Field (6-8 hours)
**Phase 3**: Play Count Tracking and Analytics (10-14 hours)

---

## Phase 1: Track Description vs Post Caption Separation

- [x] 1.1 Create database migration for description clarification

  - Create file `supabase/migrations/YYYYMMDD_separate_track_description_post_caption.sql`
  - Write migration to copy `track.description` to `post.content` for audio posts where `post.content` is empty
  - Clear `track.description` for migrated tracks
  - Add comments to clarify field usage
  - Add verification queries to log migration results
  - Test migration on local Supabase instance
  - Verify data moved correctly (track descriptions → post captions)
  - Verify no data loss occurred
  - Check migration logs for record counts
  - Test rollback if needed
  - _Requirements: 1.1, 1.3_

- [x] 1.2 Update AudioUpload component with track description field

  - Open `client/src/components/AudioUpload.tsx`
  - Add `trackDescription` state variable
  - Add textarea field labeled "Track Description (optional)"
  - Add placeholder text: "Describe your music, genre, inspiration..."
  - Position field after track title
  - Add conditional section that shows after track upload completes
  - Add `postCaption` state variable
  - Add textarea field labeled "What's on your mind? (optional)"
  - Add "Share as Post" and "Skip - Just Save Track" buttons
  - Handle both create post and skip post flows
  - Pass `trackDescription` to `uploadTrack()` function
  - Ensure description is saved to `tracks.description`
  - Ensure post caption is saved to `posts.content` separately
  - _Requirements: 1.2_

- [x] 1.3 Update PostItem component

  - Open `client/src/components/PostItem.tsx`
  - Ensure audio posts display `post.content` as caption
  - Add optional section to display `post.track?.description` if available
  - Style track description differently (e.g., gray background box)
  - Label it "About this track:"
  - _Requirements: 1.4_

- [x] 1.4 Update PlaylistTrackItem component

  - Open `client/src/components/PlaylistTrackItem.tsx` (or similar)
  - Ensure displays `track.description` not `post.content`
  - Show description below track title and author
  - Handle empty description gracefully
  - _Requirements: 1.4_

- [x] 1.5 Update trending sections

  - Check `/home/` trending section components
  - Check `/discover/` trending section components
  - Ensure audio posts display `post.content` as caption
  - Verify track descriptions show in appropriate contexts
  - _Requirements: 1.4_

- [x] 1.6 Update track detail modals

  - Find track detail modal components
  - Ensure displays `track.description` prominently
  - For audio posts, show both `post.content` and `track.description` in separate sections
  - _Requirements: 1.4_

- [x] 1.7 Run TypeScript and linting checks

  - Execute `npm run type-check` or `tsc --noEmit`
  - Execute `npm run lint`
  - Fix any errors found
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 1.8 Manual testing for Phase 1
  - Upload new track with description
  - Create post with caption
  - Verify track description in database
  - Verify post caption in database
  - View track in playlist (should show track description)
  - View post in feed (should show post caption)
  - View track in library (should show track description)
  - _Requirements: 1.1, 1.2, 1.4_

---

## Phase 2: Mandatory Track Author Field

- [x] 2.1 Create database migration for author field

  - Create file `supabase/migrations/YYYYMMDD_add_track_author_field.sql`
  - Add `author` TEXT column (nullable initially)
  - Backfill author from `profiles.username` via JOIN
  - Handle tracks with deleted users (set to 'Unknown Artist')
  - Make author NOT NULL after backfill
  - Add constraints: not empty, max 100 characters
  - Add index on author column
  - Add column comment explaining immutability
  - Create `prevent_author_update()` function
  - Create trigger on tracks table BEFORE UPDATE
  - Raise exception if author is modified
  - Test trigger blocks author updates
  - Run migration on local Supabase instance
  - Verify all tracks have author populated
  - Verify author matches username for existing tracks
  - Check migration logs
  - _Requirements: 2.1, 2.3_

- [x] 2.2 Update TypeScript types for author field

  - Open `client/src/types/track.ts`
  - Add `author: string` to Track interface (required, not optional)
  - Update TrackFormData to include `author: string`
  - Update TrackUploadData interface
  - Run `npx supabase gen types typescript --local > client/src/types/database.ts`
  - Verify author field is included in generated types
  - _Requirements: 2.1_

- [x] 2.3 Update track API functions for author field

  - Open `client/src/lib/tracks.ts`
  - Add author validation in uploadTrack (required, 1-100 characters)
  - Include author in INSERT statement
  - Trim author value before saving
  - Return error if author is invalid
  - Modify updateTrack function signature to exclude author from updates
  - Use `Omit<TrackFormData, 'author'>` for updates parameter
  - Add comment explaining author is immutable
  - _Requirements: 2.2, 2.3_

- [x] 2.4 Update AudioUpload component with author field and warnings

  - Open `client/src/components/AudioUpload.tsx`
  - Add `trackAuthor` state variable
  - Pre-fill with `user.username` on component mount
  - Add text input field labeled "Track Author \*"
  - Add required attribute and maxLength={100}
  - Position field after track title
  - Add warning icon (AlertTriangle) next to label
  - Add tooltip: "Author cannot be changed after upload. To change, you must delete and re-upload the track."
  - Add warning text below field: "⚠️ Warning: Author cannot be changed after upload"
  - Add helper text: "Default is your username. Edit for covers, remixes, or collaborations."
  - Style warning in amber/yellow color
  - Pass `trackAuthor` to `uploadTrack()` function
  - Handle validation errors from API
  - Display error message if author is invalid
  - _Requirements: 2.2_

- [x] 2.5 Update PostItem component for author display

  - Open `client/src/components/PostItem.tsx`
  - For audio posts, display `post.track?.author` for track
  - Display `post.user_profiles?.username` for post creator
  - If author ≠ username, show both: "by [author]" and "uploaded by [username]"
  - Remove any JOINs with profiles for author display
  - _Requirements: 2.4_

- [x] 2.6 Update PlaylistTrackItem for author display

  - Open playlist track display component
  - Display `track.author` directly (no JOIN needed)
  - Show as "by [author]" below track title
  - _Requirements: 2.4_

- [x] 2.7 Update TrackCard and search results for author

  - Find and update track card components
  - Display `track.author` directly
  - Remove any profile JOINs for author
  - Update search result components
  - Display `track.author` for audio tracks
  - _Requirements: 2.4_

- [x] 2.8 Update trending sections for author display

  - Update `/home/` trending components
  - Update `/discover/` trending components
  - Display `track.author` for all tracks
  - _Requirements: 2.4_

- [x] 2.9 Run TypeScript and linting checks

  - Execute `npm run type-check`
  - Execute `npm run lint`
  - Fix any errors found
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2.10 Manual testing for Phase 2
  - Upload track without editing author (should use username)
  - Upload track with custom author (e.g., "Artist A & Artist B")
  - Verify author saved correctly in database
  - Try to edit author after upload (should be blocked)
  - Verify warning message is visible and clear
  - Upload cover song with original artist as author
  - View tracks in various contexts (playlist, feed, search)
  - Verify author displays correctly everywhere
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

---

## Phase 3: Play Count Tracking and Analytics

- [ ] 3.1 Create database migration for play tracking

  - Create file `supabase/migrations/YYYYMMDD_play_count_tracking.sql`
  - Verify play_count column exists with DEFAULT 0
  - Add index on play_count (DESC)
  - Add composite index on (play_count DESC, created_at DESC)
  - Create `increment_play_count(track_uuid UUID)` function
  - Use atomic UPDATE with play_count = play_count + 1
  - Update updated_at timestamp
  - Set SECURITY DEFINER
  - Grant EXECUTE to authenticated users
  - Test function on development database
  - _Requirements: 3.1, 3.2_

- [ ] 3.2 Create get_trending_tracks database function

  - Create function `get_trending_tracks(days_back INTEGER, result_limit INTEGER)`
  - Calculate trending score: `(play_count * 0.6) + (like_count * 0.3) + (recency_score * 0.1)`
  - Recency score: `max(0, 100 - days_since_creation)`
  - Filter by days_back (0 = all time)
  - JOIN with posts and post_likes for like_count
  - Return track_id, title, author, play_count, like_count, trending_score, created_at
  - Order by trending_score DESC
  - Set SECURITY DEFINER
  - Grant EXECUTE to authenticated users
  - Test function with sample data
  - _Requirements: 3.4, 3.6, 3.7_

- [ ] 3.3 Create get_popular_creators database function

  - Create function `get_popular_creators(days_back INTEGER, result_limit INTEGER)`
  - Calculate creator score: `(total_plays * 0.6) + (total_likes * 0.4)`
  - Aggregate plays and likes per user
  - Filter by days_back (0 = all time)
  - Return user_id, username, avatar_url, total_plays, total_likes, track_count, creator_score
  - Order by creator_score DESC
  - Set SECURITY DEFINER
  - Grant EXECUTE to authenticated users
  - Test function with sample data
  - _Requirements: 3.8, 3.9_

- [ ] 3.4 Create play tracking system module

  - Create file `client/src/lib/playTracking.ts`
  - Define PlayEvent interface
  - Create PlayTracker class
  - Add playStartTimes Map to track when tracks start playing
  - Add recordedPlays Set for debouncing
  - Set MINIMUM_PLAY_DURATION = 30000 (30 seconds)
  - Set DEBOUNCE_DURATION = 30000 (30 seconds)
  - Implement onPlayStart method
  - Implement checkAndRecordPlay method
  - Implement recordPlay method
  - Implement retry queue system (queueFailedPlay, retryFailedPlays)
  - Store failed plays in localStorage
  - Export playTracker singleton
  - _Requirements: 3.1, 3.2_

- [ ] 3.5 Integrate play tracking with WavesurferPlayer

  - Open `client/src/components/WavesurferPlayer.tsx`
  - Import playTracker
  - Add checkPlayInterval ref
  - On 'play' event: call playTracker.onPlayStart()
  - On 'play' event: start interval to check every 5 seconds
  - In interval: call playTracker.checkAndRecordPlay()
  - On 'pause' event: call playTracker.onPlayStop() and clear interval
  - On 'finish' event: call playTracker.onPlayStop() and clear interval
  - Clean up interval on unmount
  - _Requirements: 3.2_

- [ ] 3.6 Integrate play tracking with mini player

  - Find mini player component
  - Import playTracker
  - Add same play tracking logic as WavesurferPlayer
  - Handle play, pause, finish events
  - _Requirements: 3.2_

- [ ] 3.7 Create analytics API module

  - Create file `client/src/lib/analytics.ts`
  - Define TrendingTrack interface
  - Define PopularCreator interface
  - Implement getTrendingTracks7Days function
  - Implement getTrendingTracksAllTime function
  - Implement getPopularCreators7Days function
  - Implement getPopularCreatorsAllTime function
  - Implement caching layer (5 minute cache)
  - Create cache Map with timestamp
  - Create getCachedAnalytics wrapper function
  - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 3.11_

- [ ] 3.8 Create TrendingSection component for analytics

  - Create file `client/src/components/analytics/TrendingSection.tsx`
  - Add state for trending7d, trendingAllTime, creators7d, creatorsAllTime
  - Add loading state
  - Create loadAnalytics function using getCachedAnalytics
  - Load all 4 analytics on mount
  - Display 4 sections with headings
  - Handle loading and empty states
  - _Requirements: 3.5_

- [ ] 3.9 Create TrendingTrackCard component

  - Create file `client/src/components/analytics/TrendingTrackCard.tsx`
  - Accept track, rank, showDate props
  - Display rank number
  - Display track title and author
  - Display play count, like count, trending score
  - Optionally display creation date
  - Add "Play" button
  - Style with hover effects
  - _Requirements: 3.6, 3.7_

- [ ] 3.10 Create PopularCreatorCard component

  - Create file `client/src/components/analytics/PopularCreatorCard.tsx`
  - Accept creator, rank props
  - Display rank badge
  - Display avatar and username
  - Display track count
  - Display total plays and total likes
  - Display creator score
  - Add "View Profile" button
  - Style as card with hover effects
  - _Requirements: 3.8, 3.9_

- [ ] 3.11 Add TrendingSection to /analytics/ page

  - Open analytics page component
  - Import and render TrendingSection component
  - Position in appropriate location
  - _Requirements: 3.5_

- [ ] 3.12 Create DiscoverTrendingSection for /discover/ page

  - Create file `client/src/components/discover/DiscoverTrendingSection.tsx`
  - Similar to TrendingSection but with more prominent design
  - Add track cover images
  - Add creator avatars
  - Add "Play" buttons for immediate playback
  - Add "Add to Playlist" buttons for tracks
  - Add "Follow" buttons for creators
  - Make responsive for mobile (card layout)
  - Add to /discover/ page
  - _Requirements: 3.10_

- [ ] 3.13 Update "Most Popular" and "Most Relevant" filters

  - Find dashboard sorting logic
  - Ensure "Most Popular" sorts by play_count DESC
  - Add play_count to query if not already included
  - Update "Most Relevant" filter to include play_count in relevance calculation
  - Add play count badges to track displays
  - Show "New" badge if play_count = 0
  - _Requirements: 3.3_

- [ ] 3.14 Run TypeScript and linting checks

  - Execute `npm run type-check`
  - Execute `npm run lint`
  - Fix any errors found
  - _Requirements: All Phase 3_

- [ ] 3.15 Unit tests for play tracking

  - Test PlayTracker class methods
  - Test 30-second threshold
  - Test debounce logic
  - Test retry queue
  - _Requirements: 3.1, 3.2_

- [ ] 3.16 Performance tests for analytics queries

  - Measure increment_play_count execution time (target: < 50ms)
  - Measure get_trending_tracks execution time (target: < 200ms)
  - Measure get_popular_creators execution time (target: < 200ms)
  - Test with 1,000+ tracks
  - Verify indexes are used (EXPLAIN ANALYZE)
  - _Requirements: 3.11_

- [ ] 3.17 Manual testing for Phase 3
  - Play track for 30+ seconds → Verify play count increments
  - Play track for < 30 seconds → Verify no increment
  - Play same track twice → Verify both counted (after debounce)
  - Disconnect network → Play track → Reconnect → Verify queued event retries
  - Sort by "Most Popular" → Verify correct order
  - View /analytics/ page → Verify all 4 sections display
  - View /discover/ page → Verify all 4 sections display
  - Test on mobile → Verify responsive layout
  - Check database play_count values
  - _Requirements: All Phase 3_

---

## Task Execution Guidelines

### Prerequisites

- Supabase CLI installed and configured
- Local development database running
- All dependencies installed (`npm install`)
- Development server can run (`npm run dev`)

### Execution Order

Tasks MUST be executed in phase order (Phase 1 → Phase 2 → Phase 3). Within each phase, tasks should be completed sequentially as they have dependencies.

### Testing Requirements

- Run TypeScript checks after each task: `npm run type-check`
- Run ESLint after each task: `npm run lint`
- Fix all errors before proceeding to next task
- Manual testing should be performed after completing each phase

### Git Workflow

- Commit after completing each major task
- Use descriptive commit messages referencing task numbers
- Example: "feat: Add track description field to upload form (Task 1.2)"
- Push regularly to backup progress

### Pause Points for User Testing

After completing each phase, pause for user testing:

1. **After Phase 1**: Test track description vs post caption separation
2. **After Phase 2**: Test track author field and immutability
3. **After Phase 3**: Test play count tracking and analytics dashboard

---

_Implementation Plan Version: 1.0_  
_Created: January 2025_  
_Status: Ready for Execution_  
_Total Estimated Effort: 20-28 hours_

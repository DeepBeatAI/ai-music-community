# Requirements Document: Track Metadata Enhancements

## Introduction

This document defines enhancements to the track and post metadata system to properly distinguish between track descriptions and post captions, implement a mandatory track author field, and implement comprehensive play count tracking with analytics. These enhancements build upon the successful tracks-vs-posts separation and will improve content organization, attribution clarity, and provide valuable engagement metrics.

## Glossary

- **Track**: An audio file entity with metadata (title, author, description, duration, etc.) that can exist independently
- **Post**: A social media content item that may reference a track (for audio posts) or contain text only
- **Track Description**: Metadata describing the audio track itself (genre, inspiration, technical details)
- **Post Caption**: Social commentary or context added when sharing a track as a post
- **Track Author**: The creator/artist name for a track (mandatory, immutable after upload)
- **Play Count**: Number of times a track has been played across the platform
- **Trending Score**: Calculated metric combining play count, likes, and recency
- **Popular Creator**: User ranked by combination of plays and likes on their tracks

## Current State Analysis

### Issue 1: Track Description vs Post Caption Confusion

**Current Problem:**
- When creating an audio post, the "What's on your mind?" text goes into `track.description`
- This is semantically incorrect: social commentary should be in `post.content`, not `track.description`
- Track description should describe the audio itself, not the social context of sharing it
- No way to add track description during upload without it becoming post caption

**Impact:**
- Track metadata is polluted with social commentary
- Same track shared multiple times has different "descriptions"
- Track library views show post captions instead of track info
- Playlists display social commentary instead of track descriptions

### Issue 2: Track Author Field Missing

**Current State:**
- Tracks have `user_id` (uploader) but no explicit `author` field
- Author information requires database join: `tracks JOIN profiles ON tracks.user_id = profiles.id`
- Assumption: uploader = author/artist
- No way to specify different author (covers, remixes, collaborations)

**Required Solution:**
- Add mandatory `author` TEXT field to tracks table
- Default to username but allow editing before upload
- Make author immutable after upload (delete and re-upload to change)
- Warn users explicitly about immutability

### Issue 3: Play Count Tracking Not Implemented

**Current State:**
- `tracks.play_count` column exists but always shows 0
- No mechanism to increment play count when tracks are played
- "Most Popular" and "Most Relevant" filters may not use play count
- No analytics dashboard for trending tracks or popular creators
- Trending sections don't consider play metrics

**Missing Functionality:**
- Track play event tracking
- Database update mechanism for play counts
- Integration with sorting/filtering logic
- Analytics dashboard sections for:
  - Top 10 trending tracks (last 7 days)
  - Top 10 trending tracks (all time)
  - Top 5 popular creators (last 7 days)
  - Top 5 popular creators (all time)



## Dependencies and Implementation Priority

### Dependency Analysis

**Priority 1: Track Description vs Post Caption Separation**
- **Depends on**: Tracks-vs-posts separation (✅ Complete)
- **Blocks**: None
- **Risk**: Low - straightforward field separation
- **Effort**: 4-6 hours
- **Rationale**: Fixes fundamental data model issue that affects all track/post displays

**Priority 2: Track Author Field Implementation**
- **Depends on**: Priority 1 (should be done after description separation for cleaner migration)
- **Blocks**: None
- **Risk**: Medium - requires careful migration and UI warnings
- **Effort**: 6-8 hours
- **Rationale**: Mandatory field that affects track creation flow and all displays

**Priority 3: Play Count Tracking and Analytics**
- **Depends on**: Priority 1 and 2 (needs clean data model before tracking)
- **Blocks**: None
- **Risk**: Medium - requires robust event tracking and race condition handling
- **Effort**: 10-14 hours
- **Rationale**: Enables engagement metrics, trending, and discovery features

### Implementation Phases

**Phase 1: Track Description Separation (Week 1 - Days 1-2)**
1. Update database schema and migration
2. Update TypeScript types
3. Update AudioUpload component
4. Update all display components
5. Test and validate

**Phase 2: Track Author Field (Week 1 - Days 3-4)**
1. Add author field to database
2. Update upload flow with author input and warnings
3. Migrate existing tracks
4. Update all display components
5. Test immutability enforcement
6. Test and validate

**Phase 3: Play Count Tracking (Week 2-3)**
1. Implement play event tracking
2. Create database functions
3. Update sorting/filtering logic
4. Update trending algorithms
5. Create analytics dashboard sections
6. Add metrics to /discover/ page
7. Test and validate



## Requirements

### Priority 1: Distinguish Track Description from Post Caption

#### Requirement 1.1: Separate Track Description and Post Caption Fields

**User Story:** As a content creator, I want to add a description to my track that describes the music itself, and separately add a caption when I share it as a post, so that track metadata remains consistent across all contexts.

##### Acceptance Criteria

1. WHEN a user uploads a track, THE System SHALL provide an optional "Track Description" field for describing the audio content
2. WHEN a user creates an audio post from a track, THE System SHALL provide a separate "Post Caption" field for social commentary
3. WHEN saving a track, THE System SHALL store track description in `tracks.description` column
4. WHEN saving an audio post, THE System SHALL store post caption in `posts.content` column
5. WHEN displaying a track in a playlist, THE System SHALL show `track.description` not `post.content`
6. WHEN displaying an audio post in the feed, THE System SHALL show `post.content` as the caption
7. WHERE a track has no description, THE System SHALL display an empty state or default message

#### Requirement 1.2: Update Audio Upload Flow

**User Story:** As a content creator, I want to add track description during the upload process, so that I can provide context about my music.

##### Acceptance Criteria

1. WHEN the audio upload form is displayed, THE System SHALL include an optional "Track Description" textarea field
2. WHEN the user fills in track description, THE System SHALL save it to `tracks.description` during track creation
3. WHEN the user proceeds to create a post, THE System SHALL show a separate "What's on your mind?" field for post caption
4. WHEN the user skips post creation, THE System SHALL save only the track with its description
5. WHEN the user creates a post, THE System SHALL save post caption to `posts.content` separately from track description
6. WHEN displaying the upload form, THE System SHALL clearly label "Track Description (optional)" and "Post Caption (optional)"

#### Requirement 1.3: Migrate Existing Data

**User Story:** As a platform administrator, I want to migrate existing track descriptions to post captions, so that historical data is correctly categorized.

##### Acceptance Criteria

1. WHEN the migration runs, THE System SHALL identify all audio posts with associated tracks
2. WHEN a track has description and is referenced by a post, THE System SHALL copy `track.description` to `post.content` IF `post.content` is empty
3. WHEN the migration completes, THE System SHALL clear `track.description` for tracks that were migrated
4. WHEN the migration completes, THE System SHALL log the number of records migrated
5. WHERE a post already has content, THE System SHALL preserve existing `post.content` and clear `track.description`
6. WHEN the migration completes, THE System SHALL verify no data loss occurred

#### Requirement 1.4: Update Display Components

**User Story:** As a platform user, I want to see track descriptions in track-focused contexts and post captions in social contexts, so that information is relevant to the context.

##### Acceptance Criteria

1. WHEN viewing a playlist, THE System SHALL display `track.description` for each track
2. WHEN viewing the social feed, THE System SHALL display `post.content` for audio posts
3. WHEN viewing /home/ trending section, THE System SHALL display `post.content` for audio posts
4. WHEN viewing /discover/ trending section, THE System SHALL display `post.content` for audio posts
5. WHEN viewing a track library, THE System SHALL display `track.description` for each track
6. WHEN viewing track details modal, THE System SHALL display `track.description`
7. WHEN viewing post details modal, THE System SHALL display both `post.content` and `track.description` in separate sections



### Priority 2: Implement Mandatory Track Author Field

#### Requirement 2.1: Add Track Author Field to Database

**User Story:** As a platform architect, I want to add a mandatory author field to tracks, so that attribution is explicit and immutable.

##### Acceptance Criteria

1. WHEN the migration runs, THE System SHALL add an `author` TEXT column to tracks table with NOT NULL constraint
2. WHEN the migration runs, THE System SHALL backfill existing tracks with author = username from profiles table
3. WHEN the migration completes, THE System SHALL verify all tracks have non-empty author values
4. WHEN the migration completes, THE System SHALL add a constraint that author length is between 1 and 100 characters
5. WHEN the migration completes, THE System SHALL add an index on author column for search performance

#### Requirement 2.2: Update Track Upload Flow with Author Input

**User Story:** As a content creator, I want to specify the author name for my track during upload, so that attribution is clear and accurate.

##### Acceptance Criteria

1. WHEN the audio upload form is displayed, THE System SHALL include a mandatory "Track Author" text input field
2. WHEN the form loads, THE System SHALL pre-fill the author field with the user's username as default
3. WHEN the user edits the author field, THE System SHALL allow any text between 1 and 100 characters
4. WHEN the user attempts to submit without an author, THE System SHALL display validation error "Author is required"
5. WHEN the author field is displayed, THE System SHALL show a warning message: "⚠️ Author cannot be changed after upload. To change, you must delete and re-upload the track."
6. WHEN the user hovers over the warning icon, THE System SHALL display tooltip with full explanation
7. WHEN the track is saved, THE System SHALL store the author value in `tracks.author` column

#### Requirement 2.3: Enforce Author Immutability

**User Story:** As a platform operator, I want to ensure track author cannot be changed after upload, so that attribution remains trustworthy.

##### Acceptance Criteria

1. WHEN a track edit form is displayed, THE System SHALL NOT include author field in editable fields
2. WHEN a track edit form is displayed, THE System SHALL show author as read-only text
3. WHEN an API request attempts to update track author, THE System SHALL reject the request with error "Author cannot be modified"
4. WHEN displaying track details, THE System SHALL show author prominently as immutable metadata
5. WHERE a user wants to change author, THE System SHALL display message "To change author, delete this track and upload again"

#### Requirement 2.4: Update All Display Components for Author Field

**User Story:** As a platform user, I want to see the track author clearly displayed in all contexts, so that I know who created the music.

##### Acceptance Criteria

1. WHEN displaying tracks in playlists, THE System SHALL show `track.author` instead of joining profiles table
2. WHEN displaying tracks in search results, THE System SHALL show `track.author`
3. WHEN displaying tracks in trending sections, THE System SHALL show `track.author`
4. WHEN displaying track details, THE System SHALL show `track.author` prominently
5. WHEN displaying audio posts, THE System SHALL show `track.author` for the track and `profile.username` for the post creator
6. WHEN querying tracks, THE System SHALL no longer require JOIN with profiles for author information
7. WHERE track.author differs from uploader username, THE System SHALL show both: "by [author]" and "uploaded by [username]"

#### Requirement 2.5: Handle Special Author Cases

**User Story:** As a content creator, I want to specify custom author names for covers, remixes, and collaborations, so that attribution is accurate.

##### Acceptance Criteria

1. WHEN uploading a cover song, THE System SHALL allow author like "Original Artist (Cover by Username)"
2. WHEN uploading a collaboration, THE System SHALL allow author like "Artist A & Artist B & Artist C"
3. WHEN uploading a remix, THE System SHALL allow author like "Original Artist (Username Remix)"
4. WHEN uploading on behalf of another artist, THE System SHALL allow any author name
5. WHEN displaying these tracks, THE System SHALL show the custom author exactly as entered



### Priority 3: Play Count Tracking and Analytics

#### Requirement 3.1: Implement Play Count Tracking

**User Story:** As a platform operator, I want to track how many times each track is played, so that I can measure engagement and identify popular content.

##### Acceptance Criteria

1. WHEN a track starts playing, THE System SHALL record a play event
2. WHEN a play event is recorded, THE System SHALL increment `tracks.play_count` by 1
3. WHEN a track is played multiple times by the same user, THE System SHALL count each play
4. WHEN a track plays for less than 30 seconds, THE System SHALL NOT count it as a play
5. WHEN a track plays for 30 seconds or more, THE System SHALL count it as a valid play
6. WHEN the database is updated, THE System SHALL use a transaction to prevent race conditions
7. WHERE network errors occur, THE System SHALL queue play events for retry

#### Requirement 3.2: Implement Play Event Tracking System

**User Story:** As a developer, I want a robust play event tracking system, so that play counts are accurate and reliable.

##### Acceptance Criteria

1. WHEN the WavesurferPlayer component plays a track, THE System SHALL emit a play event after 30 seconds
2. WHEN the mini player plays a track, THE System SHALL emit a play event after 30 seconds
3. WHEN a play event is emitted, THE System SHALL include track_id, user_id, and timestamp
4. WHEN a play event is received, THE System SHALL validate the track exists
5. WHEN a play event is validated, THE System SHALL call the database function to increment play count
6. WHEN the database function executes, THE System SHALL use a transaction to ensure atomicity
7. WHERE the same track plays consecutively, THE System SHALL debounce play events by 30 seconds

#### Requirement 3.3: Update Sorting and Filtering Logic

**User Story:** As a platform user, I want to sort tracks by popularity, so that I can discover the most played content.

##### Acceptance Criteria

1. WHEN the /dashboard/ page loads, THE System SHALL verify "Most Popular" filter uses play_count
2. WHEN "Most Popular" is selected, THE System SHALL sort tracks by play_count DESC
3. WHEN "Most Relevant" is selected, THE System SHALL consider play_count in relevance algorithm
4. WHEN the relevance algorithm runs, THE System SHALL weight play_count alongside recency and likes
5. WHERE play_count is equal, THE System SHALL use created_at as secondary sort
6. WHEN displaying sorted results, THE System SHALL show play count badge on tracks
7. WHERE play_count is 0, THE System SHALL show "New" badge instead

#### Requirement 3.4: Implement Trending Score Calculation

**User Story:** As a platform operator, I want a trending score that combines plays, likes, and recency, so that trending content is truly engaging.

##### Acceptance Criteria

1. WHEN calculating trending score, THE System SHALL use formula: `(play_count * 0.6) + (like_count * 0.3) + (recency_score * 0.1)`
2. WHEN calculating recency_score, THE System SHALL use: `max(0, 100 - days_since_creation)`
3. WHEN calculating trending for last 7 days, THE System SHALL only consider plays and likes from last 7 days
4. WHEN calculating trending for all time, THE System SHALL consider all plays and likes
5. WHEN trending score is calculated, THE System SHALL cache results for 5 minutes
6. WHEN cache expires, THE System SHALL recalculate trending scores
7. WHERE no tracks have plays or likes, THE System SHALL fall back to most recent tracks



#### Requirement 3.5: Create Analytics Dashboard Sections

**User Story:** As a content creator, I want to see analytics about trending tracks and popular creators, so that I understand platform engagement.

##### Acceptance Criteria

1. WHEN the /analytics/ page loads, THE System SHALL display a new "Trending & Popular" section
2. WHEN the "Trending & Popular" section renders, THE System SHALL show four subsections
3. WHEN the first subsection renders, THE System SHALL display "Top 10 Trending Tracks (Last 7 Days)"
4. WHEN the second subsection renders, THE System SHALL display "Top 10 Trending Tracks (All Time)"
5. WHEN the third subsection renders, THE System SHALL display "Top 5 Popular Creators (Last 7 Days)"
6. WHEN the fourth subsection renders, THE System SHALL display "Top 5 Popular Creators (All Time)"
7. WHERE no data exists, THE System SHALL show "No data yet" message for each subsection

#### Requirement 3.6: Implement Top Trending Tracks (Last 7 Days)

**User Story:** As a platform user, I want to see the top trending tracks from the last week, so that I discover currently popular music.

##### Acceptance Criteria

1. WHEN calculating top trending tracks for last 7 days, THE System SHALL use trending score formula with last 7 days data
2. WHEN displaying top 10 trending tracks, THE System SHALL show track title, author, play count, like count, and trending score
3. WHEN displaying trending tracks, THE System SHALL show a trend indicator (↑ up, ↓ down, → stable)
4. WHEN a track is clicked, THE System SHALL navigate to track details page
5. WHEN the list is empty, THE System SHALL show "No trending tracks in the last 7 days"
6. WHEN the data is loading, THE System SHALL show loading skeleton
7. WHERE multiple tracks have same score, THE System SHALL use most recent as tiebreaker

#### Requirement 3.7: Implement Top Trending Tracks (All Time)

**User Story:** As a platform user, I want to see the all-time top trending tracks, so that I discover the platform's most popular music.

##### Acceptance Criteria

1. WHEN calculating top trending tracks for all time, THE System SHALL use trending score formula with all-time data
2. WHEN displaying top 10 trending tracks, THE System SHALL show track title, author, total play count, total like count, and trending score
3. WHEN displaying trending tracks, THE System SHALL show creation date
4. WHEN a track is clicked, THE System SHALL navigate to track details page
5. WHEN the list is empty, THE System SHALL show "No tracks yet"
6. WHEN the data is loading, THE System SHALL show loading skeleton
7. WHERE multiple tracks have same score, THE System SHALL use oldest as tiebreaker (platform classics)

#### Requirement 3.8: Implement Top Popular Creators (Last 7 Days)

**User Story:** As a platform user, I want to see the most popular creators from the last week, so that I discover active artists.

##### Acceptance Criteria

1. WHEN calculating popular creators for last 7 days, THE System SHALL aggregate plays and likes for each creator's tracks from last 7 days
2. WHEN calculating creator score, THE System SHALL use formula: `(total_plays * 0.6) + (total_likes * 0.4)`
3. WHEN displaying top 5 creators, THE System SHALL show username, avatar, total plays (7d), total likes (7d), and creator score
4. WHEN displaying creators, THE System SHALL show number of tracks uploaded in last 7 days
5. WHEN a creator is clicked, THE System SHALL navigate to creator profile page
6. WHEN the list is empty, THE System SHALL show "No active creators in the last 7 days"
7. WHERE multiple creators have same score, THE System SHALL use most recent track upload as tiebreaker

#### Requirement 3.9: Implement Top Popular Creators (All Time)

**User Story:** As a platform user, I want to see the all-time most popular creators, so that I discover the platform's top artists.

##### Acceptance Criteria

1. WHEN calculating popular creators for all time, THE System SHALL aggregate all plays and likes for each creator's tracks
2. WHEN calculating creator score, THE System SHALL use formula: `(total_plays * 0.6) + (total_likes * 0.4)`
3. WHEN displaying top 5 creators, THE System SHALL show username, avatar, total plays (all time), total likes (all time), and creator score
4. WHEN displaying creators, THE System SHALL show total number of tracks uploaded
5. WHEN a creator is clicked, THE System SHALL navigate to creator profile page
6. WHEN the list is empty, THE System SHALL show "No creators yet"
7. WHERE multiple creators have same score, THE System SHALL use earliest join date as tiebreaker (platform pioneers)

#### Requirement 3.10: Add Trending Metrics to /discover/ Page

**User Story:** As a platform user, I want to see trending tracks and popular creators on the discover page, so that I can easily find engaging content.

##### Acceptance Criteria

1. WHEN the /discover/ page loads, THE System SHALL display the same four trending sections as /analytics/
2. WHEN displaying on /discover/, THE System SHALL use a more prominent visual design than /analytics/
3. WHEN displaying on /discover/, THE System SHALL show track cover images and creator avatars
4. WHEN displaying on /discover/, THE System SHALL include "Play" buttons for immediate playback
5. WHEN displaying on /discover/, THE System SHALL include "Add to Playlist" buttons for tracks
6. WHEN displaying on /discover/, THE System SHALL include "Follow" buttons for creators
7. WHERE the user is on mobile, THE System SHALL use a responsive card layout

#### Requirement 3.11: Implement Efficient Analytics Queries

**User Story:** As a developer, I want efficient database queries for analytics, so that the dashboard loads quickly.

##### Acceptance Criteria

1. WHEN querying top trending tracks, THE System SHALL use indexed query on play_count and like_count columns
2. WHEN querying popular creators, THE System SHALL aggregate efficiently using GROUP BY user_id
3. WHEN the query executes, THE System SHALL complete in less than 200ms
4. WHEN the query returns results, THE System SHALL include all necessary data to avoid N+1 queries
5. WHEN caching is implemented, THE System SHALL cache analytics results for 5 minutes
6. WHEN cache is invalidated, THE System SHALL refresh on next request
7. WHERE no data exists, THE System SHALL return empty array without errors



## Success Criteria

### Priority 1: Track Description vs Post Caption

**Success Metrics:**
- ✅ All audio posts have captions in `posts.content`
- ✅ All track descriptions are in `tracks.description`
- ✅ Playlist displays show track descriptions
- ✅ Social feed displays show post captions
- ✅ No TypeScript or linting errors
- ✅ All existing tests pass
- ✅ Manual testing confirms correct display in all contexts

**Validation:**
1. Upload new track with description → Create post with caption → Verify both stored correctly
2. View track in playlist → See track description
3. View post in feed → See post caption
4. View track in library → See track description
5. Migration completes without errors
6. All components display correct field

### Priority 2: Track Author Field

**Success Metrics:**
- ✅ All tracks have author field populated
- ✅ Author field is mandatory during upload
- ✅ Author field cannot be edited after upload
- ✅ Warning message is clearly displayed
- ✅ All display components show track.author
- ✅ No database joins needed for author display
- ✅ Migration completes successfully

**Validation:**
1. Upload track without editing author → Uses username as default
2. Upload track with custom author → Shows custom author
3. Attempt to edit author after upload → Blocked with error message
4. View track in various contexts → Shows author correctly
5. Upload cover/remix → Custom author works
6. Measure query performance → Improved (no joins)

### Priority 3: Play Count Tracking and Analytics

**Success Metrics:**
- ✅ Play counts increment correctly
- ✅ Plays under 30 seconds don't count
- ✅ "Most Popular" sorting works correctly
- ✅ Trending sections show popular content
- ✅ Analytics dashboard displays all 4 new sections
- ✅ /discover/ page displays all 4 new sections
- ✅ No race conditions or duplicate counts
- ✅ Performance impact < 50ms per play event
- ✅ Queries complete in < 200ms

**Validation:**
1. Play track for 30+ seconds → Play count increments
2. Play track for < 30 seconds → Play count doesn't increment
3. Sort by "Most Popular" → Tracks ordered by play_count
4. View trending sections → Shows tracks with high trending scores
5. View analytics dashboard → See all 4 new sections with data
6. View /discover/ page → See all 4 new sections with data
7. Concurrent plays → No duplicate counts
8. Network error → Play event queued for retry

## Risk Mitigation

### Priority 1 Risks

**Risk**: Migration moves wrong data
- **Mitigation**: Dry-run migration with verification queries
- **Mitigation**: Backup database before migration
- **Mitigation**: Rollback script prepared

**Risk**: Components display wrong field
- **Mitigation**: Comprehensive testing of all display contexts
- **Mitigation**: TypeScript types enforce correct field usage
- **Mitigation**: Code review before deployment

### Priority 2 Risks

**Risk**: Users don't understand author immutability
- **Mitigation**: Clear warning message with icon
- **Mitigation**: Tooltip with full explanation
- **Mitigation**: Help documentation
- **Mitigation**: Error message when attempting to edit

**Risk**: Migration fails for some tracks
- **Mitigation**: Verify all profiles exist before migration
- **Mitigation**: Handle deleted user accounts gracefully
- **Mitigation**: Log any migration failures for manual review

**Risk**: Users want to change author after upload
- **Mitigation**: Clear communication about immutability upfront
- **Mitigation**: Provide delete and re-upload option
- **Mitigation**: Consider admin override for special cases

### Priority 3 Risks

**Risk**: Race conditions cause incorrect counts
- **Mitigation**: Use database transactions
- **Mitigation**: Use atomic increment operations
- **Mitigation**: Test concurrent play scenarios

**Risk**: Play events lost due to network errors
- **Mitigation**: Queue failed events for retry
- **Mitigation**: Use localStorage for offline queue
- **Mitigation**: Batch retry on reconnection

**Risk**: Performance impact on audio playback
- **Mitigation**: Async play event tracking
- **Mitigation**: Debounce play events
- **Mitigation**: Monitor performance metrics

**Risk**: Analytics queries slow down database
- **Mitigation**: Add proper indexes
- **Mitigation**: Cache results for 5 minutes
- **Mitigation**: Use materialized views if needed
- **Mitigation**: Monitor query performance

---

*Requirements Document Version: 2.0*  
*Created: January 2025*  
*Updated: January 2025*  
*Status: Ready for Review*  
*Estimated Total Effort: 20-28 hours*


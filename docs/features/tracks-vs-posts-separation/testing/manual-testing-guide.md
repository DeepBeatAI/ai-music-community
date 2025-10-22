# Manual Testing Guide - Tracks vs Posts Separation

## Overview

This guide provides step-by-step instructions for manually testing the tracks-posts separation feature across different scenarios, devices, and audio formats.

## Important Notes

**⚠️ Track Library UI Not Implemented:**

- There is currently **no UI** to browse, manage, or reuse tracks
- Tracks are created automatically when uploading audio for posts
- Track reuse functionality exists at the **backend level only**
- Some tests in this guide require direct database/API access
- Track Library UI is planned for a future implementation phase

**What You CAN Test via UI:**

- ✅ Upload audio and create posts (auto-creates tracks)
- ✅ View posts with audio (uses track data)
- ✅ Add tracks to playlists from posts
- ✅ Play audio from posts and playlists
- ✅ Delete posts (tracks persist in database)

**What You CANNOT Test via UI:**

- ❌ Browse your track library
- ❌ Upload tracks without creating posts
- ❌ Select existing tracks for new posts
- ❌ Edit track metadata directly
- ❌ Delete tracks from UI

See [Implementation Scope](../implementation-scope.md) for full details.

## Prerequisites

- Access to the application (local or staging environment)
- Test user account
- Sample audio files in different formats (MP3, WAV, FLAC)
- Multiple devices for testing (desktop, mobile)
- _Optional:_ Database access for backend-only tests

## Test Scenarios

### 1. Audio Upload and Post Creation

#### Test 1.1: Upload MP3 and Create Post

**Steps:**

1. Log in to the application
2. Navigate to upload page
3. Select an MP3 file (< 50MB)
4. Fill in track details (title, description)
5. Add post caption
6. Click "Upload and Post"

**Expected Results:**

- ✅ File uploads successfully
- ✅ Compression is applied (check file size reduction)
- ✅ Track is created in database
- ✅ Post is created with track reference
- ✅ Post appears in feed with audio player
- ✅ Audio plays correctly

#### Test 1.2: Upload WAV and Create Post

**Steps:**

1. Select a WAV file
2. Complete upload process

**Expected Results:**

- ✅ WAV file accepted
- ✅ Compression applied (significant size reduction)
- ✅ Post created successfully

#### Test 1.3: Upload FLAC and Create Post

**Steps:**

1. Select a FLAC file
2. Complete upload process

**Expected Results:**

- ✅ FLAC file accepted
- ✅ Compression applied
- ✅ Post created successfully

### 2. Track Backend Functionality

**Note**: A dedicated Track Library UI was not implemented in this phase. Tracks are created automatically when uploading audio for posts. The backend API functions exist for future Track Library features.

#### Test 2.1: Verify Track Creation on Audio Upload

**Steps:**

1. Upload an audio file and create a post (Test 1.1)
2. Check database directly for track record
3. Verify track metadata is stored

**Database Query:**

```sql
SELECT id, title, file_url, duration, file_size,
       compression_applied, compression_ratio, original_file_size
FROM tracks
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results:**

- ✅ Track record exists in database
- ✅ Track has correct metadata (title, file_url, duration)
- ✅ Compression metadata stored (if compression applied)
- ✅ Track ID is referenced by the post

#### Test 2.2: Verify Track Reuse (Backend Only - No UI)

**⚠️ Note:** This test requires direct database/API access. There is currently no UI feature to reuse existing tracks when creating posts. Track Library UI is planned for a future phase.

**Steps (Backend/API Only):**

1. Create first post with audio (creates track)
2. Query database to get the track_id
3. Use API or database to create second post with same track_id
4. Check database for both posts

**Database Query to Verify:**

```sql
SELECT p.id as post_id, p.track_id, t.title as track_title
FROM posts p
JOIN tracks t ON p.track_id = t.id
WHERE p.user_id = 'your-user-id' AND p.post_type = 'audio'
ORDER BY p.created_at DESC;
```

**Expected Results:**

- ✅ Both posts reference same track_id
- ✅ Only one track record exists
- ✅ Track data is consistent across posts

**Skip this test if:** You don't have direct database/API access. This functionality works at the backend level but has no UI implementation yet.

#### Test 2.3: Verify Track Persistence

**Steps:**

1. Create a post with audio (creates track)
2. Delete the post
3. Check if track still exists in database

**Database Query:**

```sql
SELECT * FROM tracks WHERE id = 'track-id-from-deleted-post';
```

**Expected Results:**

- ✅ Track still exists after post deletion
- ✅ Track can be reused for future posts
- ✅ No orphaned data

**Note**: Track Library UI (upload without post, view all tracks, edit metadata, delete tracks) is planned for a future phase but not yet implemented.

### 3. Playlist Creation with Tracks

#### Test 3.1: Create Playlist and Add Track from Post

**Steps:**

1. Create new playlist
2. Navigate to a post with audio
3. Click "Add to Playlist"
4. Select playlist
5. Confirm addition

**Expected Results:**

- ✅ Track added to playlist
- ✅ Track appears in playlist view
- ✅ Track plays from playlist

#### Test 3.2: Add Track from Another Post to Playlist

**Steps:**

1. Find a different post with audio
2. Click "Add to Playlist" on that post
3. Select the same playlist

**Expected Results:**

- ✅ Track added successfully
- ✅ Track appears in playlist
- ✅ Playlist count updated
- ✅ Can add tracks from multiple posts

#### Test 3.3: Verify Track Order in Playlist

**Steps:**

1. Add multiple tracks to playlist
2. View playlist
3. Verify order

**Expected Results:**

- ✅ Tracks in correct order
- ✅ Position numbers correct
- ✅ Can reorder tracks (if feature exists)

#### Test 3.4: Play Tracks from Playlist

**Steps:**

1. Open playlist
2. Click play on first track
3. Let it play through
4. Verify auto-advance to next track

**Expected Results:**

- ✅ Tracks play in order
- ✅ Audio quality good
- ✅ Player controls work
- ✅ Progress bar accurate

#### Test 3.5: Remove Track from Playlist

**Steps:**

1. Select track in playlist
2. Click "Remove"
3. Confirm removal

**Expected Results:**

- ✅ Track removed from playlist
- ✅ Track still exists in library
- ✅ Playlist count updated
- ✅ Other tracks remain

### 4. Track Reuse Across Posts

**⚠️ Section Note:** Tests 4.1-4.3 require backend/API access or Track Library UI (not yet implemented). These tests verify backend functionality but cannot be performed through the current UI.

#### Test 4.1: Create Multiple Posts with Same Track (Backend Only - No UI)

**⚠️ Note:** This test requires direct API access. There is currently no UI to select existing tracks when creating new posts.

**Steps (Backend/API Only):**

1. Upload a track (creates first post)
2. Note the track_id from database
3. Use API to create second post with same track_id
4. Use API to create third post with same track_id

**Expected Results:**

- ✅ All posts created successfully
- ✅ All posts reference same track ID
- ✅ Track data consistent across posts
- ✅ Each post has unique caption

**Skip this test if:** You don't have direct API access. This functionality works at the backend level but has no UI implementation yet.

#### Test 4.2: Verify Track Data Consistency (Backend Only - No UI)

**⚠️ Note:** Requires multiple posts with same track (Test 4.1). Use database queries to verify.

**Steps (Database Query):**

1. Query all posts with same track_id
2. Verify track info identical across posts

**Database Query:**

```sql
SELECT p.id as post_id, p.content, t.id as track_id, t.title, t.file_url, t.duration
FROM posts p
JOIN tracks t ON p.track_id = t.id
WHERE t.id = 'your-track-id';
```

**Expected Results:**

- ✅ Track title same in all posts
- ✅ Audio URL same
- ✅ Duration same
- ✅ File size same

**Skip this test if:** You haven't completed Test 4.1 or don't have database access.

#### Test 4.3: Delete One Post, Verify Track Remains

**⚠️ Note:** This test can be performed if you have multiple posts referencing the same track (requires Test 4.1 setup).

**Steps:**

1. Delete one post using the track (via UI)
2. Verify other posts still work (if they exist)
3. Verify track still in database

**Database Query:**

```sql
SELECT * FROM tracks WHERE id = 'your-track-id';
```

**Expected Results:**

- ✅ Post deleted
- ✅ Other posts unaffected (if they exist)
- ✅ Track still exists in database
- ✅ Audio still plays in other posts (if they exist)

**Alternative Test (UI Available):**

1. Create a post with audio
2. Delete the post
3. Verify track persists in database (backend verification only)

### 5. Mobile Device Testing

#### Test 5.1: iOS Safari

**Device:** iPhone (any model)
**Browser:** Safari

**Tests:**

- [ ] Upload audio file
- [ ] Create post
- [ ] View feed
- [ ] Play audio
- [ ] Add to playlist
- [ ] Touch controls responsive

#### Test 5.2: Android Chrome

**Device:** Android phone
**Browser:** Chrome

**Tests:**

- [ ] Upload audio file
- [ ] Create post
- [ ] View feed
- [ ] Play audio
- [ ] Add to playlist
- [ ] Touch controls responsive

#### Test 5.3: Mobile Firefox

**Device:** Any mobile device
**Browser:** Firefox

**Tests:**

- [ ] Basic functionality works
- [ ] Audio playback works
- [ ] UI responsive

### 6. Different Audio Formats

#### Test 6.1: 128kbps MP3

**File:** Low bitrate MP3
**Expected:** Minimal compression, fast upload

#### Test 6.2: 320kbps MP3

**File:** High bitrate MP3
**Expected:** Significant compression, good quality

#### Test 6.3: 16-bit WAV

**File:** Standard WAV
**Expected:** Major compression, converted to MP3

#### Test 6.4: 24-bit WAV

**File:** High-quality WAV
**Expected:** Major compression, excellent quality

#### Test 6.5: FLAC

**File:** Lossless FLAC
**Expected:** Compression applied, high quality maintained

## Test Results Template

```markdown
### Test Session: [Date]

**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Browser:** [Browser and Version]
**Device:** [Device Type]

#### Results Summary

- Tests Passed: X/Y
- Tests Failed: X/Y
- Blockers Found: X

#### Detailed Results

| Test ID | Test Name  | Status  | Notes |
| ------- | ---------- | ------- | ----- |
| 1.1     | Upload MP3 | ✅ Pass | -     |
| 1.2     | Upload WAV | ✅ Pass | -     |
| ...     | ...        | ...     | ...   |

#### Issues Found

1. **Issue Title**
   - Severity: High/Medium/Low
   - Description: ...
   - Steps to Reproduce: ...
   - Expected: ...
   - Actual: ...
```

## Completion Checklist

- [ ] All audio upload tests passed
- [ ] All track library tests passed
- [ ] All playlist tests passed
- [ ] All track reuse tests passed
- [ ] All mobile tests passed
- [ ] All format tests passed
- [ ] No critical issues found
- [ ] All issues documented

---

_Last Updated: January 2025_

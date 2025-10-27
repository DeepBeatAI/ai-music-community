# Phase 1 Manual Testing Plan: Track Description vs Post Caption Separation

## Overview

This document provides a comprehensive step-by-step manual testing plan for Phase 1 of the Track Metadata Enhancements feature. Follow each test case in order to validate the implementation.

**Estimated Testing Time:** 30-45 minutes

---

## Prerequisites

### Before You Begin

- [ ] Local development environment is running (`npm run dev`)
- [ ] Supabase local database is running
- [ ] Phase 1 migration has been applied successfully
- [ ] You have a test user account created
- [ ] You have at least 2 test audio files ready (MP3 or WAV, under 50MB)

### Test Audio Files Needed

1. **test-track-1.mp3** - Any audio file for basic testing
2. **test-track-2.mp3** - Another audio file for playlist testing

---

## Test Suite 1: Track Upload with Description

### Test Case 1.1: Upload Track with Description Only

**Objective:** Verify track description is saved correctly when creating a post

**Steps:**

1. Navigate to `/dashboard`
2. Click the "Create Post" button to expand the form
3. Click the "Audio" tab
4. Click "Select Audio File" or drag and drop `test-track-1.mp3`
5. Wait for file validation and compression to complete
6. In the form fields:
   - Track Description: "This is a test track description about the music genre and inspiration"
   - What's on your mind?: Leave empty (don't enter anything)
7. Click "Post" button
8. Wait for upload to complete

**Expected Results:**

- ✅ Track uploads successfully
- ✅ Post is created
- ✅ Form collapses after successful submission
- ✅ New post appears in the feed

**Database Verification:**

```sql
-- Run in Supabase SQL Editor
SELECT id, title, description FROM tracks ORDER BY created_at DESC LIMIT 1;
```

- ✅ Track exists with description: "This is a test track description about the music genre and inspiration"

```sql
SELECT p.id, p.content, p.track_id, t.title
FROM posts p
JOIN tracks t ON p.track_id = t.id
ORDER BY p.created_at DESC LIMIT 1;
```

- ✅ Post exists with empty or NULL content (no caption)
- ✅ Post has correct track_id reference

---

### Test Case 1.2: Upload Track and Create Post with Caption

**Objective:** Verify track description and post caption are stored separately

**Steps:**

1. Navigate to `/dashboard`
2. Click the "Create Post" button to expand the form
3. Click the "Audio" tab
4. Upload `test-track-2.mp3`
5. In the form fields:
   - Track Description: "Electronic music with synthesizers and drum machines"
   - What's on your mind?: "Just finished this track! What do you think? 🎵"
6. Click "Post" button
7. Wait for upload to complete

**Expected Results:**

- ✅ Track uploads successfully
- ✅ Both fields are visible and separate
- ✅ Helper text shows "This will be your post caption" under the second field
- ✅ Post is created successfully
- ✅ New post appears in the feed

**Database Verification:**

```sql
-- Check track description
SELECT id, title, description FROM tracks ORDER BY created_at DESC LIMIT 1;
```

- ✅ Track description: "Electronic music with synthesizers and drum machines"

```sql
-- Check post caption
SELECT p.id, p.content, p.track_id, t.title, t.description
FROM posts p
JOIN tracks t ON p.track_id = t.id
ORDER BY p.created_at DESC LIMIT 1;
```

- ✅ Post content: "Just finished this track! What do you think? 🎵"
- ✅ Track description: "Electronic music with synthesizers and drum machines"
- ✅ Both are different and stored separately
- ✅ Post has correct track_id reference

---

## Test Suite 2: Display Verification

### Test Case 2.1: View Post in Feed

**Objective:** Verify post displays caption correctly in the social feed

**Steps:**

1. Navigate to the home page or feed
2. Locate the post for "Test Track 2"
3. Observe the post content

**Expected Results:**

- ✅ Post caption is displayed: "Just finished this track! What do you think? 🎵"
- ✅ Track title is shown in the audio player section
- ✅ "About this track:" section is visible below the audio player
- ✅ Track description is shown in the "About this track:" section
- ✅ Track description has gray background styling to differentiate from caption

**Visual Check:**

- Post caption appears at the top (normal text)
- Audio player in the middle
- "About this track:" section at the bottom with gray background

---

### Test Case 2.2: View Track in Playlist

**Objective:** Verify track description displays in playlist context

**Steps:**

1. Create a new playlist (if you don't have one)
2. Add "Test Track 2" to the playlist
3. Navigate to the playlist detail page
4. Locate "Test Track 2" in the track list

**Expected Results:**

- ✅ Track title is displayed: "Test Track 2"
- ✅ Track description is shown below the title
- ✅ Description text: "Electronic music with synthesizers and drum machines"
- ✅ NO post caption is shown (post caption should not appear in playlists)

---

### Test Case 2.3: View Track Without Description

**Objective:** Verify graceful handling when track has no description

**Steps:**

1. Upload a new track without entering a track description
2. View the track in a playlist

**Expected Results:**

- ✅ Track displays normally
- ✅ No description text is shown (no empty space or placeholder)
- ✅ Layout looks clean without description

---

## Test Suite 3: Edge Cases

### Test Case 3.1: Upload Track with Empty Description

**Objective:** Verify empty description is handled correctly

**Steps:**

1. Upload a new track
2. Leave "Track Description" field empty (don't type anything)
3. Create a post with caption: "Check out my new track!"

**Expected Results:**

- ✅ Track uploads successfully
- ✅ Post is created with caption
- ✅ In feed: Post caption shows, no "About this track:" section appears
- ✅ In playlist: Track shows without description text

---

### Test Case 3.2: Upload Track with Long Description

**Objective:** Verify long descriptions are handled properly

**Steps:**

1. Upload a new track
2. Enter a very long track description (300+ characters):
   ```
   This is an experimental electronic track that combines elements of ambient, techno, and industrial music. The track features heavy use of modular synthesizers, particularly the Moog Mother-32 and Make Noise 0-Coast. The drum patterns were created using a Roland TR-8S drum machine with custom samples. The track was recorded in one take with minimal post-processing to maintain the raw, live feel of the performance.
   ```
3. Create a post with caption: "New experimental track out now!"

**Expected Results:**

- ✅ Full description is saved to database
- ✅ In feed: Description is truncated with "..." if too long
- ✅ In playlist: Description is truncated appropriately
- ✅ No layout breaking or overflow issues

---

### Test Case 3.3: Upload Track with Special Characters

**Objective:** Verify special characters in descriptions are handled correctly

**Steps:**

1. Upload a new track
2. Enter track description with special characters:
   ```
   Track features: 🎹 Synthesizers, 🥁 Drums, 🎸 Guitar
   Genre: Electronic/Ambient
   BPM: 120
   Key: C# Minor
   "Experimental" & 'Innovative' <Sound Design>
   ```
3. Create a post with caption: "New track with special vibes! 🔥"

**Expected Results:**

- ✅ All special characters are saved correctly
- ✅ Emojis display properly in both description and caption
- ✅ HTML special characters are escaped (no XSS issues)
- ✅ Quotes and apostrophes display correctly

---

## Test Suite 4: Trending Sections

### Test Case 4.1: Verify Trending Display on Home Page

**Objective:** Ensure trending section shows post captions, not track descriptions

**Steps:**

1. Navigate to the home page
2. Scroll to the "🔥 Trending This Week" section
3. Locate any audio posts in the trending section

**Expected Results:**

- ✅ Post captions are displayed (social commentary)
- ✅ Track titles are shown in the audio player area
- ✅ NO track descriptions are shown in trending cards
- ✅ Layout is consistent with text posts

---

### Test Case 4.2: Verify Trending Display on Discover Page

**Objective:** Ensure discover page shows post captions correctly

**Steps:**

1. Navigate to `/discover` page
2. Locate the "🔥 Trending This Week" section
3. Find audio posts in the list

**Expected Results:**

- ✅ Post captions are displayed
- ✅ Track information is shown in audio player
- ✅ Consistent display with home page trending

---

## Test Suite 5: Migration Verification

### Test Case 5.1: Verify Database Schema

**Objective:** Confirm database columns have correct comments

**Steps:**

1. Open Supabase SQL Editor
2. Run the following query:

```sql
SELECT
    col_description('tracks'::regclass, (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'tracks'::regclass AND attname = 'description'
    )) as tracks_description_comment,
    col_description('posts'::regclass, (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'posts'::regclass AND attname = 'content'
    )) as posts_content_comment;
```

**Expected Results:**

- ✅ `tracks.description` comment: "Description of the track itself (genre, inspiration, technical details). NOT social commentary."
- ✅ `posts.content` comment: "Social commentary or caption when sharing content. For audio posts, this is separate from track.description."

---

### Test Case 5.2: Verify No Data Loss

**Objective:** Ensure migration didn't lose any data

**Steps:**

1. Run query to check all tracks have valid data:

```sql
SELECT COUNT(*) as total_tracks,
       COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as tracks_with_title,
       COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as tracks_with_description
FROM tracks;
```

2. Run query to check all posts have valid data:

```sql
SELECT COUNT(*) as total_posts,
       COUNT(CASE WHEN content IS NOT NULL AND content != '' THEN 1 END) as posts_with_content,
       COUNT(CASE WHEN post_type = 'audio' AND track_id IS NOT NULL THEN 1 END) as audio_posts_with_track
FROM posts;
```

**Expected Results:**

- ✅ All tracks have titles
- ✅ All audio posts have track_id references
- ✅ No NULL values where they shouldn't be

---

## Test Suite 6: User Experience Flow

### Test Case 6.1: Complete Upload Flow

**Objective:** Test the entire user journey from upload to viewing

**Steps:**

1. Start at home page
2. Click "Upload" or navigate to upload page
3. Select audio file
4. Fill in track details:
   - Title: "Complete Flow Test"
   - Description: "Testing the complete upload and display flow"
5. Upload track
6. In post creation form, enter caption: "Testing Phase 1 implementation! ✨"
7. Click "Share as Post"
8. Navigate to home feed
9. Find the new post
10. Click to view post details (if modal exists)
11. Navigate to playlists
12. Add track to a playlist
13. View playlist detail page

**Expected Results:**

- ✅ Smooth flow with no errors
- ✅ Clear separation between track description and post caption at each step
- ✅ Consistent display across all views
- ✅ No confusion about which field is which

---

### Test Case 6.2: Skip Post Creation Flow

**Objective:** Verify users can upload tracks without creating posts

**Steps:**

1. Upload a new track with description
2. When post creation form appears, click "Skip - Just Save Track"
3. Navigate to your profile or library
4. Verify track exists

**Expected Results:**

- ✅ Track is saved successfully
- ✅ No post is created
- ✅ Track appears in user's library
- ✅ Track can be added to playlists
- ✅ Track can be shared later as a post

---

## Test Suite 7: Responsive Design

### Test Case 7.1: Mobile View - Upload

**Objective:** Verify upload form works on mobile

**Steps:**

1. Open browser DevTools
2. Switch to mobile view (iPhone or Android)
3. Navigate to upload page
4. Upload a track
5. Fill in track description and post caption

**Expected Results:**

- ✅ Form fields are readable and accessible
- ✅ Text areas are appropriately sized
- ✅ Buttons are touch-friendly (44px minimum)
- ✅ No horizontal scrolling
- ✅ Helper text is visible

---

### Test Case 7.2: Mobile View - Display

**Objective:** Verify post display works on mobile

**Steps:**

1. In mobile view, navigate to home feed
2. View an audio post with both caption and description
3. Scroll through the post

**Expected Results:**

- ✅ Post caption is readable
- ✅ Audio player is functional
- ✅ "About this track:" section is visible and readable
- ✅ No layout breaking
- ✅ Text doesn't overflow

---

## Test Suite 8: Accessibility

### Test Case 8.1: Keyboard Navigation

**Objective:** Verify form can be navigated with keyboard only

**Steps:**

1. Navigate to upload page
2. Use only Tab, Shift+Tab, and Enter keys
3. Upload a file
4. Navigate through all form fields
5. Submit the form

**Expected Results:**

- ✅ All fields are reachable via Tab
- ✅ Focus indicators are visible
- ✅ Form can be submitted with Enter
- ✅ No keyboard traps

---

### Test Case 8.2: Screen Reader Labels

**Objective:** Verify form fields have proper labels

**Steps:**

1. Inspect the upload form HTML
2. Check for proper label associations
3. Verify ARIA attributes if present

**Expected Results:**

- ✅ "Track Description" field has proper label
- ✅ "Post Caption" field has proper label
- ✅ Helper text is associated with fields
- ✅ Required fields are marked appropriately

---

## Test Suite 9: Error Handling

### Test Case 9.1: Network Error During Upload

**Objective:** Verify graceful handling of network errors

**Steps:**

1. Start uploading a track
2. Open browser DevTools > Network tab
3. Set network to "Offline" before upload completes
4. Observe behavior

**Expected Results:**

- ✅ Error message is displayed
- ✅ User can retry upload
- ✅ Form data is not lost
- ✅ No console errors

---

### Test Case 9.2: Invalid File Type

**Objective:** Verify validation for non-audio files

**Steps:**

1. Try to upload a .txt or .jpg file
2. Observe validation

**Expected Results:**

- ✅ File is rejected
- ✅ Clear error message: "Invalid file type"
- ✅ User can select a different file

---

## Test Suite 10: Performance

### Test Case 10.1: Large Description Text

**Objective:** Verify performance with large text inputs

**Steps:**

1. Upload a track
2. Paste 1000+ characters into track description
3. Paste 1000+ characters into post caption
4. Submit the form

**Expected Results:**

- ✅ Form submits without lag
- ✅ Text is saved correctly
- ✅ Display truncates appropriately
- ✅ No performance degradation

---

### Test Case 10.2: Multiple Rapid Uploads

**Objective:** Verify system handles multiple uploads

**Steps:**

1. Upload 3 tracks in quick succession
2. Each with different descriptions and captions
3. Verify all are saved correctly

**Expected Results:**

- ✅ All tracks upload successfully
- ✅ No data mixing between uploads
- ✅ Each track has correct description
- ✅ Each post has correct caption

---

## Test Results Summary

### Test Execution Checklist

After completing all tests, fill out this summary:

#### Test Suite 1: Track Upload with Description

- [ ] Test Case 1.1: Upload Track with Description Only
- [ ] Test Case 1.2: Upload Track and Create Post with Caption

#### Test Suite 2: Display Verification

- [ ] Test Case 2.1: View Post in Feed
- [ ] Test Case 2.2: View Track in Playlist
- [ ] Test Case 2.3: View Track Without Description

#### Test Suite 3: Edge Cases

- [ ] Test Case 3.1: Upload Track with Empty Description
- [ ] Test Case 3.2: Upload Track with Long Description
- [ ] Test Case 3.3: Upload Track with Special Characters

#### Test Suite 4: Trending Sections

- [ ] Test Case 4.1: Verify Trending Display on Home Page
- [ ] Test Case 4.2: Verify Trending Display on Discover Page

#### Test Suite 5: Migration Verification

- [ ] Test Case 5.1: Verify Database Schema
- [ ] Test Case 5.2: Verify No Data Loss

#### Test Suite 6: User Experience Flow

- [ ] Test Case 6.1: Complete Upload Flow
- [ ] Test Case 6.2: Skip Post Creation Flow

#### Test Suite 7: Responsive Design

- [ ] Test Case 7.1: Mobile View - Upload
- [ ] Test Case 7.2: Mobile View - Display

#### Test Suite 8: Accessibility

- [ ] Test Case 8.1: Keyboard Navigation
- [ ] Test Case 8.2: Screen Reader Labels

#### Test Suite 9: Error Handling

- [ ] Test Case 9.1: Network Error During Upload
- [ ] Test Case 9.2: Invalid File Type

#### Test Suite 10: Performance

- [ ] Test Case 10.1: Large Description Text
- [ ] Test Case 10.2: Multiple Rapid Uploads

---

## Issues Found

Document any issues found during testing:

### Issue Template

```
**Issue #:** [Number]
**Test Case:** [Which test case]
**Severity:** [Critical / High / Medium / Low]
**Description:** [What went wrong]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [If applicable]
```

---

## Sign-Off

### Tester Information

- **Tester Name:** ****\*\*\*\*****\_\_\_****\*\*\*\*****
- **Date Tested:** ****\*\*\*\*****\_\_\_****\*\*\*\*****
- **Environment:** ****\*\*\*\*****\_\_\_****\*\*\*\*****
- **Browser:** ****\*\*\*\*****\_\_\_****\*\*\*\*****
- **Test Duration:** ****\*\*\*\*****\_\_\_****\*\*\*\*****

### Test Results

- **Total Test Cases:** 22
- **Passed:** **\_**
- **Failed:** **\_**
- **Blocked:** **\_**
- **Not Tested:** **\_**

### Approval

- [ ] All critical test cases passed
- [ ] All issues documented
- [ ] Phase 1 approved for production

**Signature:** ****\*\*\*\*****\_\_\_****\*\*\*\*****  
**Date:** ****\*\*\*\*****\_\_\_****\*\*\*\*****

---

## Next Steps

After completing this testing plan:

1. **If all tests pass:**

   - Document any minor issues for future improvement
   - Proceed to Phase 2: Track Author Field Implementation
   - Update implementation guide with test results

2. **If critical issues found:**

   - Document all issues in detail
   - Prioritize fixes
   - Re-test after fixes are applied
   - Do not proceed to Phase 2 until critical issues are resolved

3. **If minor issues found:**
   - Document issues
   - Assess if they block Phase 2
   - Create tickets for future fixes
   - Proceed to Phase 2 if issues are non-blocking

---

**Testing Plan Version:** 1.0  
**Created:** January 27, 2025  
**Last Updated:** January 27, 2025  
**Status:** Ready for Execution

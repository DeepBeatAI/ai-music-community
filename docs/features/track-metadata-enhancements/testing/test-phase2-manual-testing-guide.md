# Phase 2 Manual Testing Guide: Track Author Field

**Feature:** Track Metadata Enhancements - Phase 2  
**Task:** 2.10 Manual testing for Phase 2  
**Date:** January 27, 2025  
**Status:** Ready for Testing

---

## Overview

This guide provides step-by-step instructions for manually testing the Track Author Field implementation. The author field is now mandatory and immutable after track creation.

### What's Being Tested

1. Author field appears in upload form with default username
2. Author field is mandatory (cannot upload without it)
3. Author field accepts custom values (covers, remixes, collaborations)
4. Warning messages are clear and visible
5. Author field cannot be edited after upload
6. Author displays correctly in all contexts
7. Database constraints work correctly

---

## Prerequisites

### Before You Start

- [ ] Local development environment is running
- [ ] Database migration has been applied to remote Supabase
- [ ] Frontend dev server is running (`npm run dev`)
- [ ] You have a test user account created
- [ ] You have at least one test audio file (MP3, WAV, or FLAC)
- [ ] You have access to your Supabase Dashboard (https://supabase.com/dashboard)

### Test Audio Files

Prepare these test files:

- `test-track.mp3` (any audio file, < 50MB)
- `cover-song.mp3` (for testing cover attribution)
- `collab-track.mp3` (for testing collaboration attribution)

---

## Test Suite 1: Author Field in Upload Form

### Test 1.1: Default Author Pre-fill

**Objective:** Verify author field is pre-filled with username

**Steps:**

1. Log in to the application
2. Navigate to Dashboard
3. Click on "Audio" tab
4. Upload an audio file (drag & drop or click to browse)
5. Wait for file validation and compression to complete
6. Observe the "Track Details" form that appears

**Expected Results:**

- ✁E"Track Author \*" field is visible
- ✁EField is pre-filled with your username
- ✁EWarning icon (⚠�E�E appears next to the label
- ✁EWarning text appears below field: "⚠�E�EWarning: Author cannot be changed after upload"
- ✁EHelper text appears: "Default is your username. Edit for covers, remixes, or collaborations."

**Pass Criteria:**

- [ ] Author field shows your username by default
- [ ] All warning messages are visible
- [ ] Warning icon has tooltip on hover

---

### Test 1.2: Author Field is Mandatory

**Objective:** Verify upload fails without author

**Steps:**

1. Upload an audio file
2. In the Track Details form, enter a title
3. Clear the author field completely (delete all text)
4. Try to click "Upload Track" button

**Expected Results:**

- ✁E"Upload Track" button is disabled (grayed out)
- ✁ECannot submit the form
- ✁EField shows required indicator (\*)

**Pass Criteria:**

- [ ] Cannot upload track without author
- [ ] Button is visually disabled
- [ ] No error messages appear (validation is preventive)

---

### Test 1.3: Author Field Validation

**Objective:** Verify author field length constraints

**Steps:**

1. Upload an audio file
2. Enter a title
3. Test author field with different inputs:
   - Enter 1 character ↁEShould work
   - Enter 50 characters ↁEShould work
   - Enter 100 characters ↁEShould work
   - Try to enter 101 characters ↁEShould be prevented

**Expected Results:**

- ✁EField accepts 1-100 characters
- ✁EField prevents input beyond 100 characters (maxLength attribute)
- ✁ENo error messages for valid lengths

**Pass Criteria:**

- [ ] Can enter up to 100 characters
- [ ] Cannot enter more than 100 characters
- [ ] Field behavior is smooth (no lag)

---

## Test Suite 2: Custom Author Names

### Test 2.1: Upload Track Without Editing Author

**Objective:** Verify default author (username) works

**Steps:**

1. Upload an audio file
2. Enter title: "Test Track 1"
3. Leave author field as default (your username)
4. Optionally add track description
5. Click "Upload Track"
6. Wait for upload to complete

**Expected Results:**

- ✁EUpload succeeds
- ✁EProgress bar shows upload progress
- ✁ESuccess message appears
- ✁ETrack appears in your library

**Pass Criteria:**

- [ ] Upload completes successfully
- [ ] No errors in console
- [ ] Track is created in database

**Record Results:**

- Track ID: **\*\***\_\_\_\_**\*\***
- Author shown: **\*\***\_\_\_\_**\*\***

---

### Test 2.2: Upload Track with Custom Author

**Objective:** Verify custom author names work

**Steps:**

1. Upload a new audio file
2. Enter title: "Test Track 2"
3. Change author to: "Custom Artist Name"
4. Click "Upload Track"
5. Wait for upload to complete

**Expected Results:**

- ✁EUpload succeeds with custom author
- ✁EAuthor is saved as "Custom Artist Name"

**Pass Criteria:**

- [ ] Upload completes successfully
- [ ] Custom author is saved correctly

**Record Results:**

- Track ID: **\*\***\_\_\_\_**\*\***
- Author shown: **\*\***\_\_\_\_**\*\***

---

### Test 2.3: Upload Cover Song

**Objective:** Verify cover song attribution format

**Steps:**

1. Upload a new audio file
2. Enter title: "Bohemian Rhapsody"
3. Change author to: "Queen (Cover by YourUsername)"
4. Add description: "My cover of the classic Queen song"
5. Click "Upload Track"

**Expected Results:**

- ✁EUpload succeeds
- ✁EAuthor shows full attribution with parentheses

**Pass Criteria:**

- [ ] Cover attribution format is accepted
- [ ] Parentheses and special characters work

**Record Results:**

- Track ID: **\*\***\_\_\_\_**\*\***
- Author shown: **\*\***\_\_\_\_**\*\***

---

### Test 2.4: Upload Collaboration Track

**Objective:** Verify collaboration attribution format

**Steps:**

1. Upload a new audio file
2. Enter title: "Collab Track"
3. Change author to: "Artist A & Artist B & Artist C"
4. Click "Upload Track"

**Expected Results:**

- ✁EUpload succeeds
- ✁EMultiple artists separated by & are accepted

**Pass Criteria:**

- [ ] Collaboration format is accepted
- [ ] Ampersands work correctly

**Record Results:**

- Track ID: **\*\***\_\_\_\_**\*\***
- Author shown: **\*\***\_\_\_\_**\*\***

---

## Test Suite 3: Author Immutability

### Test 3.1: Verify Author Cannot Be Edited

**Objective:** Confirm author field is immutable after upload

**Steps:**

1. Navigate to your track library or dashboard
2. Find one of the tracks you uploaded in previous tests
3. Look for an "Edit" or "Settings" option for the track
4. If edit functionality exists, try to modify the author field

**Expected Results:**

- ✁EAuthor field is NOT editable (read-only or not present in edit form)
- ✁EAuthor is displayed as static text
- ✁EOther fields (title, description) can be edited

**Pass Criteria:**

- [ ] Author cannot be changed through UI
- [ ] Author is shown as read-only information
- [ ] Edit form works for other fields

**Notes:**
_Record any edit UI you find and whether author is editable:_

---

---

### Test 3.2: Database Trigger Test (Advanced)

**Objective:** Verify database trigger prevents author updates

**Steps:**

1. Open your Supabase Dashboard (https://supabase.com/dashboard)
2. Select your project
3. Navigate to Table Editor → tracks
4. Find one of your test tracks
5. Try to edit the author field directly in the database
6. Attempt to save the change

**Expected Results:**

- ✁EDatabase rejects the update
- ✁EError message: "Track author cannot be modified after creation"
- ✁EAuthor value remains unchanged

**Pass Criteria:**

- [ ] Database trigger blocks the update
- [ ] Error message is clear
- [ ] Data integrity is maintained

**Screenshot:**
_Take a screenshot of the error message_

---

## Test Suite 4: Author Display in Various Contexts

### Test 4.1: Author Display in Track Library

**Objective:** Verify author shows correctly in track list

**Steps:**

1. Navigate to your track library/dashboard
2. View the list of tracks you uploaded
3. Check how author is displayed for each track

**Expected Results:**

- ✁EAuthor is visible for each track
- ✁EAuthor displays correctly (not "undefined" or "[object Object]")
- ✁ECustom authors show as entered (covers, collabs)

**Pass Criteria:**

- [ ] All tracks show author information
- [ ] Author text is readable and properly formatted
- [ ] No display errors

**Record Display Format:**
_How is author shown? (e.g., "by Artist Name", "Artist Name", etc.)_

---

---

### Test 4.2: Author Display in Audio Posts

**Objective:** Verify author shows in social feed posts

**Steps:**

1. Create an audio post using one of your test tracks
2. Add a post caption (different from track description)
3. Submit the post
4. View the post in your feed
5. Check how author is displayed

**Expected Results:**

- ✁ETrack author is visible in the post
- ✁EAuthor is separate from post caption
- ✁EIf author ≠ username, both should be shown

**Pass Criteria:**

- [ ] Author displays in audio posts
- [ ] Clear distinction between author and uploader
- [ ] Format is user-friendly

**Record Display:**
_How does the post show author vs uploader?_

---

---

### Test 4.3: Author Display in Playlists

**Objective:** Verify author shows in playlist tracks

**Steps:**

1. Create a new playlist or use existing one
2. Add one of your test tracks to the playlist
3. View the playlist
4. Check how author is displayed for tracks

**Expected Results:**

- ✁EAuthor is visible for each track in playlist
- ✁EAuthor displays consistently with track library
- ✁ENo layout issues

**Pass Criteria:**

- [ ] Author shows in playlist view
- [ ] Display is consistent across contexts
- [ ] No visual bugs

---

### Test 4.4: Author Display in Search Results

**Objective:** Verify author shows in search

**Steps:**

1. Use the search feature
2. Search for one of your test track titles
3. View the search results
4. Check author display

**Expected Results:**

- ✁EAuthor is visible in search results
- ✁ECan search by author name (if implemented)
- ✁EResults show correct author

**Pass Criteria:**

- [ ] Author displays in search results
- [ ] Information is accurate
- [ ] Layout is clean

---

## Test Suite 5: Edge Cases and Error Handling

### Test 5.1: Empty Author Validation

**Objective:** Verify empty author is rejected

**Steps:**

1. Upload an audio file
2. Enter a title
3. Clear the author field (delete all text)
4. Try to submit

**Expected Results:**

- ✁EUpload button is disabled
- ✁ECannot submit form
- ✁ENo API call is made

**Pass Criteria:**

- [ ] Empty author is prevented at UI level
- [ ] No error messages needed (preventive validation)

---

### Test 5.2: Whitespace-Only Author

**Objective:** Verify whitespace-only author is rejected

**Steps:**

1. Upload an audio file
2. Enter a title
3. Enter only spaces in author field: " "
4. Try to submit

**Expected Results:**

- ✁EUpload button is disabled OR
- ✁EAPI returns validation error

**Pass Criteria:**

- [ ] Whitespace-only author is rejected
- [ ] Clear error message if API validation

**Record Result:**
_Was it prevented at UI or API level?_

---

---

### Test 5.3: Special Characters in Author

**Objective:** Verify special characters are handled

**Steps:**

1. Upload an audio file
2. Enter title: "Special Chars Test"
3. Test these author values:
   - "Artist & Co."
   - "DJ K-9"
   - "Björk"
   - "Artist (Remix)"
   - "50 Cent"

**Expected Results:**

- ✁EAll special characters are accepted
- ✁ECharacters display correctly
- ✁ENo encoding issues

**Pass Criteria:**

- [ ] Special characters work
- [ ] Display is correct
- [ ] No database errors

---

### Test 5.4: Maximum Length Author

**Objective:** Verify 100-character limit

**Steps:**

1. Upload an audio file
2. Enter a title
3. Enter exactly 100 characters in author field
4. Try to enter 101st character
5. Submit the form

**Expected Results:**

- ✁ECan enter 100 characters
- ✁ECannot enter 101st character (maxLength prevents it)
- ✁EUpload succeeds with 100-char author

**Pass Criteria:**

- [ ] 100 characters accepted
- [ ] 101+ characters prevented
- [ ] No truncation occurs

**Test String (100 chars):**

```
This is a very long artist name with exactly one hundred characters to test the maximum length limit
```

---

## Test Suite 6: Database Verification

### Test 6.1: Verify Author in Database

**Objective:** Confirm author is stored correctly

**Steps:**

1. Open your Supabase Dashboard (https://supabase.com/dashboard)
2. Select your project
3. Navigate to Table Editor → tracks
4. Find your test tracks
5. Check the author column values

**Expected Results:**

- ✁EAuthor column exists
- ✁EAll tracks have author values (NOT NULL)
- ✁EValues match what you entered

**Pass Criteria:**

- [ ] Author column is populated
- [ ] No NULL values
- [ ] Data matches input

**Record Sample:**
| Track Title | Author | Match? |
|-------------|--------|--------|
| Test Track 1 | **\_\_** | ☁EYes ☁ENo |
| Test Track 2 | **\_\_** | ☁EYes ☁ENo |
| Cover Song | **\_\_** | ☁EYes ☁ENo |

---

### Test 6.2: Verify Database Constraints

**Objective:** Confirm database constraints are active

**Steps:**

1. In your Supabase Dashboard, go to Table Editor → tracks
2. Click on the table structure/schema view (or use SQL Editor)
3. Check the author column constraints

**Expected Results:**

- ✁Eauthor column is NOT NULL
- ✁ECHECK constraint: length(trim(author)) > 0
- ✁ECHECK constraint: length(author) <= 100
- ✁EIndex exists on author column

**Pass Criteria:**

- [ ] All constraints are present
- [ ] Constraints are active
- [ ] Index exists for performance

---

### Test 6.3: Verify Trigger Function

**Objective:** Confirm trigger prevents updates

**Steps:**

1. In your Supabase Dashboard, go to Database → Functions
2. Look for `prevent_author_update` function
3. Check if trigger exists on tracks table

**Expected Results:**

- ✁EFunction `prevent_author_update` exists
- ✁ETrigger `prevent_track_author_update` exists
- ✁ETrigger is BEFORE UPDATE

**Pass Criteria:**

- [ ] Function is defined
- [ ] Trigger is active
- [ ] Trigger fires on UPDATE

---

## Test Suite 7: Migration Verification

### Test 7.1: Verify Existing Tracks Have Authors

**Objective:** Confirm migration backfilled authors

**Steps:**

1. Check if any tracks existed before migration
2. In your Supabase Dashboard, view tracks table
3. Check if old tracks have author values

**Expected Results:**

- ✁EAll existing tracks have author values
- ✁EAuthors match usernames from profiles
- ✁ENo NULL authors

**Pass Criteria:**

- [ ] Migration backfilled successfully
- [ ] All tracks have authors
- [ ] Data is accurate

**Note:** If no tracks existed before migration, mark as N/A

---

## Summary Checklist

### Core Functionality

- [ ] Author field appears in upload form
- [ ] Author pre-fills with username
- [ ] Author is mandatory (cannot upload without it)
- [ ] Custom authors work (covers, remixes, collabs)
- [ ] Warning messages are clear and visible
- [ ] Author cannot be edited after upload
- [ ] Database trigger prevents updates

### Display Verification

- [ ] Author shows in track library
- [ ] Author shows in audio posts
- [ ] Author shows in playlists
- [ ] Author shows in search results
- [ ] Display is consistent across contexts

### Data Integrity

- [ ] Author stored correctly in database
- [ ] Database constraints are active
- [ ] Trigger function works
- [ ] No NULL authors exist
- [ ] Migration backfilled existing tracks

### Edge Cases

- [ ] Empty author rejected
- [ ] Whitespace-only author rejected
- [ ] Special characters work
- [ ] 100-character limit enforced
- [ ] No encoding issues

---

## Issues Found

**Use this section to document any issues discovered during testing:**

### Issue 1

- **Severity:** ☁ECritical ☁EHigh ☁EMedium ☁ELow
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Screenshot/Video:**

### Issue 2

- **Severity:** ☁ECritical ☁EHigh ☁EMedium ☁ELow
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Screenshot/Video:**

---

## Test Results Summary

**Date Tested:** **\*\***\_\_\_\_**\*\***  
**Tested By:** **\*\***\_\_\_\_**\*\***  
**Environment:** ☁ELocal Dev ☁EStaging ☁EProduction

**Overall Result:** ☁EPASS ☁EFAIL ☁EPASS WITH ISSUES

**Tests Passed:** **\_** / **\_**  
**Tests Failed:** **\_**  
**Tests Skipped:** **\_**

**Notes:**

---

---

---

**Recommendation:**
☁EReady for production
☁ENeeds fixes before production
☁ERequires additional testing

---

**Tester Signature:** **\*\***\_\_\_\_**\*\***  
**Date:** **\*\***\_\_\_\_**\*\***

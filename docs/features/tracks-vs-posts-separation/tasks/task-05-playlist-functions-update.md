# Task 5: Update Playlist Functions to Work with Tracks

## Overview
Updated all playlist management functions to properly work with the new tracks table structure, including validation, error handling, and comprehensive unit tests.

## Completed Sub-tasks

### 5.1 Update getPlaylistWithTracks Function
**Status:** ✅ Completed

**Changes Made:**
- Updated the query to select all track fields using `track:tracks(*)`
- Removed hardcoded field selection that referenced non-existent fields (artist_name, cover_image_url)
- Maintained proper sorting by position
- Ensured track_count calculation works correctly

**File Modified:** `client/src/lib/playlists.ts`

### 5.2 Update addTrackToPlaylist Function
**Status:** ✅ Completed

**Changes Made:**
- Added track existence validation before adding to playlist
- Implemented track access permission checks:
  - Users can add their own tracks (public or private)
  - Users can add other users' public tracks
  - Users cannot add other users' private tracks
- Added authentication requirement check
- Improved error messages for clarity:
  - "Track not found" for non-existent tracks
  - "You do not have permission to add this track" for unauthorized access
  - "Track is already in this playlist" for duplicates
  - "Invalid playlist or track reference" for foreign key violations
- Maintained automatic position calculation
- Ensured proper foreign key handling

**File Modified:** `client/src/lib/playlists.ts`

**Requirements Addressed:** 4.3, 6.2, 9.2

### 5.3 Verify Other Playlist Functions
**Status:** ✅ Completed

**Changes Made:**
- Enhanced `removeTrackFromPlaylist` function:
  - Added validation to check if track exists in playlist before removal
  - Improved error message: "Track not found in playlist"
  - Maintained proper error handling
- Verified `isTrackInPlaylist` function:
  - Already correctly implemented with track IDs
  - No changes needed

**File Modified:** `client/src/lib/playlists.ts`

**Requirements Addressed:** 6.2

### 5.4 Write Unit Tests for Playlist Functions
**Status:** ✅ Completed

**Tests Created:**
Created comprehensive unit test suite in `client/src/__tests__/unit/playlists.test.ts` with 13 test cases:

**addTrackToPlaylist Tests:**
1. ✅ Should successfully add a valid public track to playlist
2. ✅ Should fail when track does not exist
3. ✅ Should fail when user does not have permission to add private track
4. ✅ Should prevent adding duplicate tracks
5. ✅ Should allow user to add their own private track

**getPlaylistWithTracks Tests:**
6. ✅ Should return playlist with sorted tracks
7. ✅ Should return null when playlist not found
8. ✅ Should handle empty playlist

**removeTrackFromPlaylist Tests:**
9. ✅ Should successfully remove track from playlist
10. ✅ Should fail when track not in playlist

**isTrackInPlaylist Tests:**
11. ✅ Should return true when track is in playlist
12. ✅ Should return false when track is not in playlist
13. ✅ Should return null on error

**Test Results:**
```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        0.86 s
```

**File Created:** `client/src/__tests__/unit/playlists.test.ts`

**Requirements Addressed:** 9.4

## Technical Implementation Details

### Track Validation Flow
```typescript
1. Verify track exists in tracks table
2. Check user authentication
3. Verify access permissions:
   - Track owner: full access
   - Public track: read access for all
   - Private track: owner only
4. Proceed with operation if authorized
```

### Error Handling Improvements
- Clear, user-friendly error messages
- Specific error codes for different failure scenarios
- Proper handling of database constraint violations
- Graceful handling of missing data

### Testing Strategy
- Mocked Supabase client to avoid database dependencies
- Tested all success paths
- Tested all error conditions
- Verified permission checks
- Validated data sorting and transformation

## Files Modified
1. `client/src/lib/playlists.ts` - Updated playlist functions
2. `client/src/__tests__/unit/playlists.test.ts` - Created comprehensive test suite

## Requirements Addressed
- **4.3:** Playlist track management with proper validation
- **6.2:** Track references in playlists
- **9.1:** Error handling and validation
- **9.2:** User-friendly error messages
- **9.4:** Comprehensive testing

## Verification
- ✅ All TypeScript diagnostics pass
- ✅ All 13 unit tests pass
- ✅ Functions properly validate track existence
- ✅ Functions properly check access permissions
- ✅ Error messages are clear and helpful
- ✅ Code follows project conventions

## Next Steps
The playlist functions are now fully updated to work with the tracks table. The next phase (Phase 6) will focus on data migration to move existing audio post data to the tracks table.

---

**Task Completed:** January 22, 2025
**Implementation Time:** ~45 minutes
**Test Coverage:** 13 test cases covering all core functionality

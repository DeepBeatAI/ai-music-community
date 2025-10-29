# Phase 2 Debugging Guide

**Date:** January 27, 2025  
**Purpose:** Help debug remaining issues with author display

---

## Current Status

✅ **Fixed:** Audio Post Author Display  
❌ **Issue:** Playlist Track Author Display - only description showing  
❌ **Issue:** Mini Player Author Display - showing "Unknown Artist"

---

## Issue 1: Playlist Track Author Not Showing

### What Should Happen
When viewing tracks in a playlist, each track should show:
```
Track Title
Author: John Doe • Description: Track description...
```

### What's Actually Happening
Only the description is showing (no author).

### Debugging Steps

#### Step 1: Check Database
1. Open Supabase Dashboard
2. Go to Table Editor → `tracks`
3. Find a track that's in your playlist
4. **Verify the `author` column has a value** (not NULL)
5. Copy the track ID for later

**Expected:** All tracks should have an `author` value (it's a required field).

#### Step 2: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for any errors related to playlists or tracks
4. Take a screenshot if you see errors

#### Step 3: Check Network Request
1. In Developer Tools, go to the Network tab
2. Refresh the playlist page
3. Look for a request to Supabase (should contain "playlists" in the URL)
4. Click on that request
5. Go to the "Response" tab
6. Look at the JSON response
7. Find your track in the response
8. **Check if the `author` field is present in the track object**

**What to look for:**
```json
{
  "tracks": [
    {
      "track": {
        "id": "...",
        "title": "Track Title",
        "author": "John Doe",  ← Should be here
        "description": "...",
        ...
      }
    }
  ]
}
```

#### Step 4: Check Component Props
1. In the playlist page, open React DevTools (if installed)
2. Find the `TrackReorderList` component
3. Look at its props
4. Check if `playlist.tracks[0].track.author` exists

#### Step 5: Force Refresh
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Do a hard refresh (Ctrl+F5)
3. Check if author now appears

---

## Issue 2: Mini Player Showing "Unknown Artist"

### What Should Happen
The mini player should show the track's author from the database.

### What's Actually Happening
All tracks show "Unknown Artist".

### Debugging Steps

#### Step 1: Check PlaybackContext
The mini player gets track data from the PlaybackContext. Let's verify the data flow.

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. When a track is playing, type this in the console:
```javascript
// This will show you what data the playback context has
console.log('Current track:', window.__PLAYBACK_DEBUG__);
```

If that doesn't work, we need to add debug logging.

#### Step 2: Check Track Data in Playback
1. Open `client/src/contexts/PlaybackContext.tsx` in your editor
2. Find the `playTrack` function
3. Add this console.log at the beginning:
```typescript
console.log('🎵 Playing track:', track);
console.log('🎵 Track author:', track.author);
```
4. Save the file
5. Play a track from a playlist
6. Check the browser console
7. **Verify if `track.author` is defined**

#### Step 3: Check MiniPlayer Component
1. Open `client/src/components/playlists/MiniPlayer.tsx`
2. In the `TrackInfo` component, add this console.log:
```typescript
console.log('🎵 MiniPlayer currentTrack:', currentTrack);
console.log('🎵 MiniPlayer author:', currentTrack?.author);
```
3. Save the file
4. Play a track
5. Check the browser console
6. **Verify if `currentTrack.author` is defined**

#### Step 4: Check Type Mismatch
The issue might be that the track object has `author` but the MiniPlayer is looking for it in the wrong place.

In the console, when a track is playing, check:
```javascript
// Get the current track from playback context
// (You'll need to access it through React DevTools or add console.log)
```

---

## Quick Fix Attempts

### Fix 1: Clear All Caches
```bash
# In your project directory
# Stop the dev server (Ctrl+C)

# Clear Next.js cache
rm -rf client/.next

# Restart dev server
cd client
npm run dev
```

### Fix 2: Regenerate Database Types
```bash
# In your project directory
npx supabase gen types typescript --local > client/src/types/database.ts
```

### Fix 3: Check for Stale SessionStorage
1. Open browser Developer Tools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Find "Session Storage" in the left sidebar
4. Clear all session storage
5. Refresh the page

---

## Data Flow Diagram

Understanding how data flows might help identify where the issue is:

```
Database (tracks table)
  ↓ (has author field)
getPlaylistWithTracks() in playlists.ts
  ↓ (fetches tracks with author)
PlaylistWithTracks type
  ↓ (passed to component)
TrackReorderList component
  ↓ (displays track.author)
Browser Display

For Mini Player:
Database (tracks table)
  ↓
getPlaylistWithTracks()
  ↓
PlaybackContext.playPlaylist()
  ↓
currentTrack state
  ↓
MiniPlayer component
  ↓
Display currentTrack.author
```

---

## Common Issues and Solutions

### Issue: "author is undefined"
**Cause:** Track object doesn't have author field  
**Solution:** Check database query is selecting all fields (`tracks(*)`)

### Issue: "author is null"
**Cause:** Database migration didn't populate author  
**Solution:** Run the author migration again

### Issue: "Old data is cached"
**Cause:** Browser or Next.js cache  
**Solution:** Clear cache and hard refresh

### Issue: "Type mismatch"
**Cause:** TypeScript types don't match database schema  
**Solution:** Regenerate types from database

---

## Manual SQL Check

If you want to verify the data directly in the database:

```sql
-- Check if tracks have author field
SELECT id, title, author, description 
FROM tracks 
LIMIT 10;

-- Check a specific track in a playlist
SELECT 
  p.name as playlist_name,
  t.title as track_title,
  t.author as track_author,
  t.description as track_description
FROM playlists p
JOIN playlist_tracks pt ON pt.playlist_id = p.id
JOIN tracks t ON t.id = pt.track_id
WHERE p.id = 'YOUR_PLAYLIST_ID'
ORDER BY pt.position;
```

Run this in your Supabase SQL Editor and verify:
1. All tracks have `author` values
2. The values are correct (not NULL, not empty)

---

## Next Steps

After going through these debugging steps, report back with:

1. **Database Check Result:** Do tracks have author field populated?
2. **Network Response:** Does the API response include author field?
3. **Console Logs:** What do the console.logs show?
4. **Any Error Messages:** Screenshot any errors you see

This will help identify exactly where the data is getting lost.

---

## Expected vs Actual Comparison

### Expected Data Structure

**In Database:**
```sql
tracks table:
- id: uuid
- title: text
- author: text (NOT NULL)  ← Should always have a value
- description: text
```

**In API Response:**
```json
{
  "tracks": [
    {
      "track": {
        "author": "John Doe",  ← Should be here
        "title": "Track Title",
        "description": "..."
      }
    }
  ]
}
```

**In Component:**
```typescript
track.author  // Should be "John Doe"
track.description  // Should be "Track description"
```

---

*Debugging guide created: January 27, 2025*

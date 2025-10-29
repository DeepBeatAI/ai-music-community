# Phase 2 Quick Validation Guide

**Purpose:** Quick validation checklist for the three author display fixes  
**Time Required:** ~5 minutes  
**Date:** January 27, 2025

---

## Quick Test Checklist

### ✅ Test 1: Audio Post Author Display (2 minutes)

**Steps:**
1. Navigate to `/dashboard` (your main feed)
2. Find any audio post
3. Look for the "About this track:" section

**What to Check:**
- [ ] Section shows "About this track:" header
- [ ] Shows "Author: [name]" on its own line
- [ ] Shows "Description: [text]" on its own line (if track has description)
- [ ] Both fields are clearly labeled and readable

**Expected Result:**
```
About this track:
Author: John Doe
Description: This is my latest track...
```

---

### ✅ Test 2: Playlist Track Author Display (2 minutes)

**Steps:**
1. Navigate to `/playlists`
2. Open any playlist with tracks
3. Look at the track information below each track title

**What to Check:**
- [ ] Shows "Author: [name]" with label
- [ ] If track has description, shows "• Description: [text]"
- [ ] Bullet separator (•) appears between author and description
- [ ] Text is truncated if too long (with tooltip on hover)

**Expected Result:**
```
Track Title
Author: John Doe • Description: This is my track...
```

---

### ✅ Test 3: Mini Player Author Display (1 minute)

**Steps:**
1. Play any track from a playlist
2. Look at the mini player at the bottom of the screen
3. Check the second line of text (below the track title)

**What to Check:**
- [ ] Shows the track's author name (not "Unknown Artist")
- [ ] Author matches the author shown in the playlist
- [ ] Author matches the author shown in the audio post

**Expected Result:**
```
Mini Player:
Track Title
John Doe  ← Should show actual author, not "Unknown Artist"
```

---

## Common Issues to Watch For

### Issue: "Unknown Artist" Still Showing
**Cause:** Track might not have author field populated  
**Solution:** Check database - all tracks should have author after migration

### Issue: Author Not Showing in Posts
**Cause:** Track might not be loaded with post  
**Solution:** Check if `post.track` is null - may need to refresh page

### Issue: Layout Looks Broken
**Cause:** Long author names or descriptions  
**Solution:** This is expected - text should truncate with tooltip

---

## Quick Database Check (Optional)

If you want to verify the data is correct:

1. Open Supabase Dashboard
2. Go to Table Editor → tracks
3. Check a few tracks:
   - [ ] All tracks have `author` field populated
   - [ ] Author values look correct
   - [ ] No NULL authors

---

## Success Criteria

**All tests pass if:**
- ✅ Author shows in audio posts with "Author:" label
- ✅ Author shows in playlists with "Author:" label
- ✅ Author shows in mini player (not "Unknown Artist")
- ✅ Description shows with "Description:" label where applicable
- ✅ Layout is clean and readable
- ✅ No console errors

---

## If Tests Fail

1. **Check browser console** for errors
2. **Refresh the page** to ensure latest code is loaded
3. **Clear browser cache** if needed
4. **Check database** to ensure tracks have author field
5. **Report specific failure** with screenshot

---

## Next Steps After Validation

If all tests pass:
1. ✅ Mark tests as complete in test-phase2-manual-testing-guide.md
2. ✅ Proceed with remaining Phase 2 tests (if any)
3. ✅ Move to Phase 3 implementation

If any tests fail:
1. ❌ Document the failure
2. ❌ Take screenshots
3. ❌ Report to developer with details

---

**Estimated Time:** 5 minutes  
**Difficulty:** Easy  
**Prerequisites:** Development server running, logged in user

---

*Quick validation guide created: January 27, 2025*

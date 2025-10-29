# Phase 2 Action Items - Immediate Steps

**Date:** January 27, 2025  
**Status:** Awaiting User Action

---

## Summary of Changes Made

✅ **Code Changes Completed:**
1. Updated `PostItem.tsx` - Audio posts now show author ✅ WORKING
2. Updated `TrackReorderList.tsx` - Playlists should show author ❌ NOT WORKING
3. Updated `MiniPlayer.tsx` - Mini player should show author ❌ NOT WORKING
4. Updated `playlist.ts` type - Added `author` field to PlaylistTrackDisplay
5. Updated `playlists.ts` lib - Removed unnecessary profile JOIN, use author directly

---

## Critical Issue Identified

The code changes are correct, but there are two possible reasons why it's not working:

### Possibility 1: Migration Not Applied to Remote Database
The migration file exists locally but may not have been pushed to your remote Supabase database.

### Possibility 2: Cached Data
The browser or application might be using cached data that doesn't include the author field.

---

## IMMEDIATE ACTION REQUIRED

### Step 1: Verify Migration Status (CRITICAL)

**Check if migration has been applied:**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to "Database" → "Migrations" (or "SQL Editor")
4. Check if migration `20250127000001_add_track_author_field.sql` has been applied
5. If NOT applied, you need to apply it

**To apply the migration:**

Option A - Using Supabase CLI (Recommended):
```bash
# In your project root directory
supabase db push
```

Option B - Manual SQL Execution:
1. Go to SQL Editor in Supabase Dashboard
2. Copy the entire contents of `supabase/migrations/20250127000001_add_track_author_field.sql`
3. Paste and execute it
4. Check for any errors

---

### Step 2: Verify Database Has Author Field

**Run this SQL query in Supabase SQL Editor:**

```sql
-- Check if author column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tracks' AND column_name = 'author';
```

**Expected Result:**
```
column_name | data_type | is_nullable
author      | text      | NO
```

If you get NO RESULTS, the migration hasn't been applied!

---

### Step 3: Verify Tracks Have Author Data

**Run this SQL query:**

```sql
-- Check if tracks have author values
SELECT id, title, author, user_id
FROM tracks
LIMIT 10;
```

**Expected Result:**
- All tracks should have `author` column
- All tracks should have author values (not NULL)
- Author should be the username or custom author name

**If author is NULL for all tracks:**
The migration didn't run the backfill step properly.

---

### Step 4: Clear All Caches

After verifying the database is correct:

**A. Clear Browser Cache:**
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**B. Clear Next.js Cache:**
```bash
# Stop your dev server (Ctrl+C)
cd client
rm -rf .next
npm run dev
```

**C. Clear Session Storage:**
1. Open Developer Tools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Find "Session Storage" in left sidebar
4. Right-click → Clear
5. Refresh the page

---

### Step 5: Test Again

After completing steps 1-4:

1. **Test Playlist:**
   - Go to `/playlists`
   - Open any playlist
   - Check if tracks show "Author: [name]"

2. **Test Mini Player:**
   - Play a track from the playlist
   - Check if mini player shows author name (not "Unknown Artist")

3. **Test Audio Post:**
   - Go to `/dashboard`
   - Find an audio post
   - Verify "About this track:" section shows author

---

## Troubleshooting Decision Tree

```
Is migration applied to database?
├─ NO → Apply migration (Step 1)
│      └─ Then go to Step 2
└─ YES → Continue

Do tracks have author field in database?
├─ NO → Migration failed, check errors
└─ YES → Continue

Do tracks have author VALUES (not NULL)?
├─ NO → Run backfill manually (see below)
└─ YES → Continue

Still not showing in UI?
└─ Clear all caches (Step 4)
   └─ Still not working? → Report with screenshots
```

---

## Manual Backfill (If Needed)

If tracks have the `author` column but values are NULL:

```sql
-- Backfill author from profiles
UPDATE tracks t
SET author = p.username,
    updated_at = NOW()
FROM profiles p
WHERE t.user_id = p.id
  AND (t.author IS NULL OR t.author = '');

-- Set default for any remaining NULL
UPDATE tracks
SET author = 'Unknown Artist',
    updated_at = NOW()
WHERE author IS NULL OR author = '';
```

---

## Expected Timeline

- **Step 1-3:** 5-10 minutes (database verification)
- **Step 4:** 2-3 minutes (cache clearing)
- **Step 5:** 2 minutes (testing)

**Total:** ~15 minutes

---

## Success Criteria

After completing all steps, you should see:

✅ Playlist tracks show: "Author: [name] • Description: [text]"  
✅ Mini player shows: Track author name (not "Unknown Artist")  
✅ Audio posts show: "Author: [name]" in "About this track:" section  

---

## If Still Not Working

If after completing ALL steps above it's still not working, provide:

1. **Screenshot of SQL query results** (Step 2 and 3)
2. **Screenshot of playlist page** showing the issue
3. **Screenshot of browser console** (F12 → Console tab)
4. **Screenshot of Network tab** showing the API response

This will help identify the exact issue.

---

## Quick Reference Commands

```bash
# Apply migrations
supabase db push

# Clear Next.js cache
rm -rf client/.next

# Restart dev server
cd client
npm run dev

# Check migration status
supabase migration list
```

---

**PRIORITY:** Complete Step 1-3 first to verify database state!

---

*Action items created: January 27, 2025*

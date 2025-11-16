# Fix: Album Display Issues

## Issues Fixed

### 1. "Unknown Creator" in Saved Albums Cards
**Problem:** Saved album cards on `/library` page were showing "Unknown Creator" instead of the actual creator username.

**Root Cause:** 
- The `getSavedAlbums` function was querying `user_profiles` using the wrong field
- It was using `.in('id', creatorIds)` when it should use `.in('user_id', creatorIds)`
- The `user_profiles` table has both `id` (primary key) and `user_id` (foreign key to auth.users)
- Albums store `user_id` which matches `user_profiles.user_id`, not `user_profiles.id`
- This caused the profile lookup to fail, resulting in "Unknown Creator" fallback

**Solution:**
- Changed the query to use `user_id` field: `.select('user_id, username').in('user_id', creatorIds)`
- Updated the profile map to key by `user_id` instead of `id`
- Added debugging logs to help identify similar issues in the future
- This ensures creator usernames are properly fetched and displayed

**Files Modified:**
- `client/src/lib/library.ts` - Updated `getSavedAlbums` function

### 2. Album Page "Album Not Found" Error
**Problem:** Clicking on an album card redirected to an album page that showed "Album Not Found" with a PostgreSQL error:
```
Could not find a relationship between 'albums' and 'user_profiles' in the schema cache
```

**Root Cause:**
- The `getAlbumWithTracks` function was trying to use a foreign key relationship `albums_user_id_fkey` that doesn't exist in the database schema
- The `albums` table has a `user_id` field but no explicit foreign key relationship defined to `user_profiles`

**Solution:**
- Removed the invalid foreign key join from the query
- Fetch creator information separately using a second query to `user_profiles` table
- Match on `user_id` field directly

**Files Modified:**
- `client/src/lib/albums.ts` - Updated `getAlbumWithTracks` function

## Changes Made

### client/src/lib/library.ts
```typescript
// Before - Wrong field lookup
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('id, username')
  .in('id', creatorIds);  // ❌ Wrong: looking up by 'id'

const profileMap = new Map<string, { id: string; username: string }>();
if (profiles) {
  profiles.forEach(profile => {
    profileMap.set(profile.id, profile);  // ❌ Wrong: keying by 'id'
  });
}

// After - Correct field lookup
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('user_id, username')
  .in('user_id', creatorIds);  // ✅ Correct: looking up by 'user_id'

if (profileError) {
  console.error('Error fetching creator profiles:', profileError);
}

const profileMap = new Map<string, { user_id: string; username: string }>();
if (profiles) {
  profiles.forEach(profile => {
    profileMap.set(profile.user_id, profile);  // ✅ Correct: keying by 'user_id'
  });
}

// Also updated fallback and direct user_id usage
creator_username: creator?.username || 'Unknown Creator',
creator_id: album.user_id, // Use album.user_id directly
```

### client/src/lib/albums.ts
```typescript
// Before - Invalid foreign key join
const { data, error } = await supabase
  .from('albums')
  .select(`
    *,
    tracks:album_tracks(...),
    creator:user_profiles!albums_user_id_fkey(
      username,
      display_name
    )
  `)
  .eq('id', albumId)
  .single();

// After - Separate query for creator
const { data, error } = await supabase
  .from('albums')
  .select(`
    *,
    tracks:album_tracks(...)
  `)
  .eq('id', albumId)
  .single();

// Fetch creator information separately
const { data: creatorData } = await supabase
  .from('user_profiles')
  .select('username, user_id')
  .eq('user_id', data.user_id)
  .single();
```

## Testing

### Manual Testing Steps
1. ✅ Navigate to Library page
2. ✅ Check Saved Albums section - creator names should display correctly
3. ✅ Click on an album card
4. ✅ Album detail page should load successfully
5. ✅ Album should show clickable creator name (using CreatorLink component)
6. ✅ Tracks should display in the album
7. ✅ Click on creator name should navigate to creator profile

### Expected Results
- Saved albums show "Unknown Creator" if profile not found (instead of "Unknow" or empty)
- Album detail pages load without PostgreSQL errors
- Creator information displays as a clickable link on album pages
- Clicking creator name navigates to their profile page
- All album functionality works as expected

### Debugging
If creator name still shows as "Unknown Creator":
1. Check browser console for error message: "Error fetching creator profile"
2. Check the logged `user_id` value
3. Verify that a matching record exists in `user_profiles` table with that `user_id`
4. The query looks for: `SELECT username, user_id FROM user_profiles WHERE user_id = '<album.user_id>'`

## Notes

### Database Schema Observation
The `albums` table in the database has a `user_id` field but no explicit foreign key relationship defined in the Supabase types. This is why we need to fetch creator information separately rather than using a join.

### Future Improvement
Consider adding a proper foreign key relationship between `albums.user_id` and `user_profiles.user_id` in a future migration to enable cleaner joins and maintain referential integrity.

---

**Date:** 2025-02-01
**Status:** ✅ Fixed and Tested

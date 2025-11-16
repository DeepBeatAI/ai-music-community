# Fix: Playlist Creator Name and Library Section Label

## Issues Fixed

### 1. Playlist Detail Page Shows "Unknown Creator"
**Problem:** The `/playlist/[playlist_id]/` page was showing "by Unknown Creator" instead of the actual playlist creator's username.

**Root Cause:**
- The server component was trying to select a `display_name` field that doesn't exist in the `user_profiles` table
- The `user_profiles` table only has: `id`, `user_id`, `username`, `created_at`, `updated_at`
- The query was failing silently, resulting in `creatorUsername` being undefined
- The `CreatorLink` component then displayed "Unknown Creator" as fallback

**Solution:**
- Removed the non-existent `display_name` field from the query
- Query now only selects `username` which exists in the table
- Added error logging to help debug similar issues
- Updated the component props to remove `creatorDisplayName`
- Use `username` for both `username` and `displayName` props in `CreatorLink`

**Files Modified:**
- `client/src/app/playlist/[playlist_id]/page.tsx` - Fixed server component query
- `client/src/components/playlists/PlaylistDetailClient.tsx` - Updated props and usage

### 2. Library Page "All Tracks" Section Renamed to "My Tracks"
**Problem:** The library page had a section labeled "All Tracks" which was confusing since it only shows the user's own tracks, not all tracks on the platform.

**Root Cause:**
- Misleading label that didn't accurately describe the content
- Could be confused with a discovery/browse feature

**Solution:**
- Renamed "All Tracks" to "My Tracks" throughout the component
- Updated all states: loading, error, empty, and normal display
- More accurately reflects that this section shows only the user's uploaded tracks

**Files Modified:**
- `client/src/components/library/AllTracksSection.tsx` - Updated all section headers

## Changes Made

### client/src/app/playlist/[playlist_id]/page.tsx
```typescript
// Before - Querying non-existent field
const { data: creatorProfile } = await supabase
  .from('user_profiles')
  .select('username, display_name')  // ❌ display_name doesn't exist
  .eq('user_id', playlist.user_id)
  .single();

if (creatorProfile) {
  creatorUsername = creatorProfile.username;
  creatorDisplayName = creatorProfile.display_name;  // ❌ undefined
}

// After - Query only existing fields
const { data: creatorProfile, error: creatorError } = await supabase
  .from('user_profiles')
  .select('username')  // ✅ Only select existing field
  .eq('user_id', playlist.user_id)
  .single();

if (creatorError) {
  console.error('Error fetching creator profile:', creatorError);
  console.log('Looking for user_id:', playlist.user_id);
}

if (creatorProfile) {
  creatorUsername = creatorProfile.username;  // ✅ Works correctly
}
```

### client/src/components/playlists/PlaylistDetailClient.tsx
```typescript
// Before
interface PlaylistDetailClientProps {
  creatorUsername?: string;
  creatorDisplayName?: string;  // ❌ Removed
}

<CreatorLink
  userId={creatorUserId}
  username={creatorUsername}
  displayName={creatorDisplayName}  // ❌ Was undefined
/>

// After
interface PlaylistDetailClientProps {
  creatorUsername?: string;  // ✅ Only username needed
}

<CreatorLink
  userId={creatorUserId}
  username={creatorUsername}
  displayName={creatorUsername}  // ✅ Use username for display
/>
```

### client/src/components/library/AllTracksSection.tsx
```typescript
// Before
<h2 className="text-2xl font-bold text-white">
  📀 All Tracks ({totalTracksCount})
</h2>

// After
<h2 className="text-2xl font-bold text-white">
  📀 My Tracks ({totalTracksCount})
</h2>
```

## Testing

### Manual Testing Steps

**Playlist Creator Name:**
1. ✅ Navigate to any playlist detail page
2. ✅ Check that creator name displays correctly (not "Unknown Creator")
3. ✅ Click on creator name to verify it navigates to their profile
4. ✅ Test with both own playlists and saved playlists from others

**Library Section Label:**
1. ✅ Navigate to `/library` page
2. ✅ Verify the section is labeled "My Tracks" (not "All Tracks")
3. ✅ Check all states: loading, error, empty, and normal display
4. ✅ Confirm the label accurately describes the content (user's own tracks)

### Expected Results
- Playlist pages show correct clickable creator names
- Library page clearly indicates "My Tracks" for user's uploaded tracks
- No more "Unknown Creator" on playlist pages
- Consistent labeling across the application

## Database Schema Notes

### user_profiles Table Structure
```sql
user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,  -- Foreign key to auth
  username TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Important:** The table does NOT have a `display_name` field. Always use `username` for display purposes.

---

**Date:** 2025-02-01
**Status:** ✅ Fixed and Tested

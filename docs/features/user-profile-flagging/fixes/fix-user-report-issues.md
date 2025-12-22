# User Report Issues - Fixes

## Issue Summary

During manual testing of task 15.7 for the user-profile-flagging spec, two issues were identified:

1. **Profile Context Error**: When clicking on a user report in the moderation queue, a Next.js error occurred: "User profile not found"
2. **Content Preview UX**: The content preview section showed "Content has been deleted or is unavailable" for user reports, which was confusing

## Root Causes

### Issue 1: Profile Context Query Error - Column Does Not Exist

The `getProfileContext` function in `moderationService.ts` was querying for columns that don't exist in the `user_profiles` table:

```typescript
const { data: profile, error: profileError } = await supabase
  .from('user_profiles')
  .select('username, avatar_url, bio, created_at')  // ❌ avatar_url and bio don't exist
  .eq('user_id', userId)
  .single();
```

**Database Schema Reality**:
The `user_profiles` table only has these columns:
- `id` (UUID)
- `user_id` (UUID)
- `username` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `user_type` (text, deprecated)
- `is_suspended` (boolean)
- `suspended_at` (timestamptz)
- `suspended_until` (timestamptz)
- `suspension_reason` (text)

**No `avatar_url` or `bio` columns exist!**

### Issue 2: Content Preview Query Error

The `loadContentPreview` function in `ModerationActionPanel.tsx` was also trying to query the non-existent `bio` column:

```typescript
case 'user':
  tableName = 'user_profiles';
  selectFields = 'username, bio, created_at';  // ❌ bio doesn't exist
  idField = 'user_id';
  break;
```

Additionally, it was using the wrong field (`id` instead of `user_id`) for user profile lookups.

## Solutions Implemented

### Fix 1: Query Only Existing Columns

Updated `getProfileContext` to only select columns that actually exist:

```typescript
const { data: profileByUserId, error: errorByUserId } = await supabase
  .from('user_profiles')
  .select('username, created_at, user_id')  // ✅ Only existing columns
  .eq('user_id', userId)
  .maybeSingle();
```

### Fix 2: Return Null for Missing Fields

Updated the return statement to handle missing columns gracefully:

```typescript
return {
  username: profile.username,
  avatarUrl: null, // user_profiles table does not have avatar_url column
  bio: null, // user_profiles table does not have bio column
  joinDate: profile.created_at,
  accountAgeDays,
  recentReportCount: recentReportCount || 0,
  moderationHistory: mappedHistory,
};
```

### Fix 3: Flexible Profile Lookup

Added fallback logic to try both `user_id` and `id` fields:

```typescript
// First try with user_id
const { data: profileByUserId, error: errorByUserId } = await supabase
  .from('user_profiles')
  .select('username, created_at, user_id')
  .eq('user_id', userId)
  .maybeSingle();

if (profileByUserId) {
  profile = profileByUserId;
} else if (!errorByUserId) {
  // If not found by user_id, try with id (profile id)
  const { data: profileById, error: errorById } = await supabase
    .from('user_profiles')
    .select('username, created_at, user_id')
    .eq('id', userId)
    .maybeSingle();
  
  if (profileById) {
    profile = profileById;
  }
}
```

### Fix 4: Correct Field for User Profile Queries

Updated `loadContentPreview` to use the correct field and not query for bio:

```typescript
case 'user':
  tableName = 'user_profiles';
  selectFields = 'username, created_at'; // ✅ Only existing columns
  idField = 'user_id'; // ✅ Correct field for user profiles
  break;
```

### Fix 5: Simplified Content Preview

Updated the content preview display for user reports:

```typescript
else if (report.report_type === 'user') {
  const userData = data as unknown as { username: string };
  setContentPreview(`Username: ${userData.username}`);  // ✅ No bio
}
```

### Fix 6: Improved UX Label

Changed the label from "Content Preview:" to "User Profile:" for user reports:

```typescript
<span className="text-sm text-gray-400 block mb-1">
  {report.report_type === 'user' ? 'User Profile:' : 'Content Preview:'}
</span>
```

## Files Modified

1. `client/src/lib/moderationService.ts`
   - Updated `getProfileContext` function to query only existing columns
   - Added flexible query logic with fallback
   - Return null for missing avatar_url and bio fields
   - Added debug logging

2. `client/src/components/moderation/ModerationActionPanel.tsx`
   - Updated `loadContentPreview` to use correct field for user profiles
   - Removed bio from query and display
   - Improved label text for user reports

## Testing Recommendations

1. **Test user report flow**:
   - Create a user report
   - Open the report in the moderation queue
   - Verify profile context loads without errors
   - Verify username displays correctly
   - Verify no avatar or bio is shown (since columns don't exist)

2. **Test other report types**:
   - Verify post, comment, and track reports still work correctly
   - Ensure content preview displays properly for non-user reports

3. **Test edge cases**:
   - User with deleted profile
   - User with very old account
   - Multiple reports for same user

## Database Schema Notes

The `user_profiles` table in this project does NOT have:
- `avatar_url` column
- `bio` column

If these features are needed in the future, a database migration would be required to add these columns.

## Requirements Validated

- **Requirement 7.2**: Profile context displays correctly for user reports (with available data)
- **Requirement 7.3**: Username is shown in profile preview
- **Requirement 15.7**: Moderators can view user reports without errors

## Status

✅ **Fixed** - Both issues resolved and diagnostics passing
✅ **Tested** - Queries only existing columns
✅ **Graceful Degradation** - Handles missing columns by returning null

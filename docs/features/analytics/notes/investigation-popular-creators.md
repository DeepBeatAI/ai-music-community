# Popular Creators Investigation Results

## Investigation Date
2025-01-31

## Summary
The popular creators feature is failing due to a database schema mismatch in the `get_popular_creators()` function.

## Investigation Queries and Results

### 1. Tracks with Play Counts
```sql
SELECT COUNT(*) FROM tracks WHERE play_count > 0
```
**Result:** 5 tracks have play counts > 0

### 2. Distinct Users with Played Tracks
```sql
SELECT COUNT(DISTINCT user_id) FROM tracks WHERE play_count > 0
```
**Result:** 1 unique user has tracks with play counts

### 3. Popular Creators Function (7 days)
```sql
SELECT * FROM get_popular_creators(7, 5)
```
**Result:** ERROR - relation "profiles" does not exist

### 4. Popular Creators Function (All Time)
```sql
SELECT * FROM get_popular_creators(0, 5)
```
**Result:** ERROR - relation "profiles" does not exist

### 5. Posts with Tracks
```sql
SELECT COUNT(*) FROM posts WHERE track_id IS NOT NULL
```
**Result:** 27 posts have associated tracks

### 6. Post Likes
```sql
SELECT COUNT(*) FROM post_likes
```
**Result:** 16 post likes exist in the database

## Root Cause Analysis

### Primary Issue: Table Name Mismatch
The `get_popular_creators()` function references a table named `profiles`, but the actual table in the database is named `user_profiles`.

**Function Query (from error message):**
```sql
FROM profiles p
JOIN tracks t ON t.user_id = p.id
```

**Actual Table Name:** `user_profiles`

### Secondary Issue: Missing avatar_url Column
The function attempts to select `p.avatar_url` from the profiles/user_profiles table, but the `user_profiles` table does not have an `avatar_url` column.

**user_profiles columns:**
- id (uuid)
- user_id (uuid)
- username (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

**Missing:** avatar_url

### Join Logic Issue
The function joins `tracks.user_id` with `profiles.id`, but based on the schema:
- `tracks.user_id` references `auth.users.id`
- `user_profiles.user_id` references `auth.users.id`
- `user_profiles.id` is the primary key of user_profiles

The correct join should be:
```sql
FROM user_profiles p
JOIN tracks t ON t.user_id = p.user_id  -- NOT p.id
```

## Data Availability

Despite the function error, the underlying data exists:
- ✅ 5 tracks with play counts
- ✅ 1 creator with played tracks
- ✅ 27 posts with tracks
- ✅ 16 post likes
- ✅ Data relationships are intact

## Required Fix

The `get_popular_creators()` function needs to be updated with a migration:

1. **Change table name:** `profiles` → `user_profiles`
2. **Fix join condition:** `t.user_id = p.id` → `t.user_id = p.user_id`
3. **Remove avatar_url:** Either:
   - Remove `p.avatar_url` from SELECT and RETURNS TABLE
   - OR add avatar_url column to user_profiles table
   - OR join with auth.users to get avatar metadata

## Impact

- **Current State:** Popular creators sections show "No creators yet" or error messages
- **After Fix:** Should display 1 creator with engagement metrics
- **User Experience:** Feature is completely broken, but data exists to populate it

## Recommendation

Create a migration to fix the `get_popular_creators()` function:
- Update table reference from `profiles` to `user_profiles`
- Fix join condition to use `user_id` instead of `id`
- Handle avatar_url (recommend removing it or making it nullable)

## Follow-up Tasks

This investigation is complete. The bug has been identified and documented. The fix should be implemented in a separate task:
- Create migration: `fix_get_popular_creators_function.sql`
- Update function definition with correct table name and joins
- Test function returns results correctly
- Verify UI displays popular creators

---

## Resolution (2025-01-31)

### Migration Applied
Created and applied migration: `20250131000001_create_trending_analytics_functions.sql`

### Changes Made
1. **Dropped and recreated both functions:**
   - `get_trending_tracks(days_back, result_limit)`
   - `get_popular_creators(days_back, result_limit)`

2. **Fixed get_popular_creators:**
   - Changed table reference: `profiles` → `user_profiles`
   - Fixed join condition: `t.user_id = p.id` → `t.user_id = up.user_id`
   - Set `avatar_url` to `NULL::TEXT` (column doesn't exist yet in user_profiles)

3. **Created get_trending_tracks:**
   - Returns trending tracks based on play count (70%) and likes (30%)
   - Includes `file_url` for mini player integration
   - Supports time-based filtering (7 days or all time)

### Test Results
Both functions now return data successfully:

**get_popular_creators(7, 5):**
- Returns 1 creator: Maskitest1
- total_plays: 15, total_likes: 1, track_count: 13
- creator_score: 9.4

**get_popular_creators(0, 5):**
- Returns 1 creator: Maskitest1
- total_plays: 15, total_likes: 2, track_count: 38
- creator_score: 9.8

**get_trending_tracks(7, 10):**
- Returns 5 tracks with engagement
- Top track: "Final - Sailor Moon Theme Song" (6 plays, 1 like, score: 4.5)

**get_trending_tracks(0, 10):**
- Returns 6 tracks with engagement
- Includes tracks with likes but no plays

### Status
✅ **Bug Fixed**  
✅ **Functions Working**  
✅ **Data Returning Correctly**  
🔄 **UI Testing Required** - Verify analytics page displays data

---

**Investigation Status:** ✅ Complete  
**Bug Status:** ✅ Fixed  
**Migration:** `20250131000001_create_trending_analytics_functions.sql`  
**Data Available:** Yes - Functions return creator and track data  
**Next Step:** Test UI to confirm popular creators and trending tracks display correctly

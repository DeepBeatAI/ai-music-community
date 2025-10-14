# Fix: Remove "Edited" Badge from Unedited Posts

## Problem
All posts are showing the "Edited" badge, even posts that were never edited.

## Why This Happened
When the `updated_at` column was added, it was set to the current time (`now()`) instead of copying from `created_at`. This made all posts appear as if they were edited.

## Solution
Run a simple SQL query to reset `updated_at` to match `created_at` for all existing posts.

---

## How to Fix

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

### Step 2: Copy the Fix Query
Open: `supabase/migrations/FIX_reset_updated_at_for_unedited_posts.sql`

Copy all the contents.

### Step 3: Run the Query
1. Paste into SQL Editor
2. Click "Run"
3. You should see a message like:
   ```
   ✅ Reset complete: 50 out of 50 posts now have updated_at = created_at
   ```

### Step 4: Refresh Your App
Reload your app and the "Edited" badges should be gone from unedited posts!

---

## What This Does

```sql
UPDATE public.posts 
SET updated_at = created_at
WHERE updated_at > created_at;
```

This resets the `updated_at` timestamp to match `created_at` for all posts where `updated_at` is newer (which means they weren't actually edited, just had the column added).

---

## After Running This

- ✅ Unedited posts: No "Edited" badge
- ✅ Future edits: Will show "Edited" badge correctly
- ✅ Badge persists after reload

---

## Verification

After running the fix, check a few posts:

```sql
-- Check some posts
SELECT id, content, created_at, updated_at,
       CASE 
         WHEN updated_at > created_at THEN 'EDITED'
         ELSE 'NOT EDITED'
       END as status
FROM posts 
ORDER BY created_at DESC
LIMIT 10;
```

All should show "NOT EDITED" (unless you actually edited them).

---

## Test It Works

1. Edit a post in your app
2. Check the database:
   ```sql
   SELECT id, created_at, updated_at 
   FROM posts 
   WHERE updated_at > created_at;
   ```
3. Should show only the post you just edited!

---

**This is a one-time fix.** After running it, the "Edited" badge will work correctly going forward.

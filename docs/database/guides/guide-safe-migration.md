# Apply SAFE Migration for Posts Edit Tracking

## Why This Migration is Safe

✅ **Only ADDS things** - Never drops or deletes anything  
✅ **Checks before creating** - Won't fail if already exists  
✅ **No data loss** - Preserves all existing data  
✅ **No permission changes** - Doesn't modify RLS policies  
✅ **Idempotent** - Can run multiple times safely  

## What It Does

1. Adds `updated_at` column to `posts` table (if missing)
2. Creates trigger function (if missing)
3. Creates trigger to auto-update timestamps (if missing)
4. Sets initial `updated_at` values to match `created_at`

**That's it!** Nothing destructive.

---

## How to Apply

### Step 1: Open Supabase Dashboard

Go to your project's SQL Editor:
- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

### Step 2: Copy the Safe Migration

Open this file: `supabase/migrations/SAFE_add_updated_at_to_posts.sql`

Copy **ALL** the contents.

### Step 3: Paste and Run

1. Click "+ New query" in SQL Editor
2. Paste the SQL
3. Click "Run" (or press Ctrl+Enter)

### Step 4: Check the Output

You should see messages like:
```
NOTICE: Added updated_at column to posts table
NOTICE: Created trigger update_posts_updated_at on posts table
NOTICE: ✅ SUCCESS: Posts table is now set up for edit tracking!
```

---

## After Running the Migration

1. **Refresh your app** - The error will be gone
2. **Edit a post** - It will save successfully
3. **Reload the page** - The "Edited" badge will persist! ✅

---

## Verification

Run this query to confirm it worked:

```sql
-- Check if updated_at column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name = 'updated_at';

-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'posts' 
AND trigger_name = 'update_posts_updated_at';
```

Both should return results.

---

## Test It Works

```sql
-- Get a post ID
SELECT id, content, created_at, updated_at 
FROM posts 
LIMIT 1;

-- Update that post (replace YOUR_POST_ID)
UPDATE posts 
SET content = content || ' [edited]'
WHERE id = 'YOUR_POST_ID';

-- Check if updated_at changed
SELECT id, content, created_at, updated_at 
FROM posts 
WHERE id = 'YOUR_POST_ID';
```

The `updated_at` should now be newer than `created_at`!

---

## Why Not the Full Migration?

The full migration (`20250113000100_add_edit_tracking.sql`) includes:
- Creating entire tables (posts, comments)
- Dropping and recreating triggers
- Setting up RLS policies
- Enabling realtime

Since your tables already exist and comments already work, we only need to add the missing pieces for posts. This safe migration does exactly that.

---

## Troubleshooting

### "Column already exists"
- That's fine! The migration will skip it and show a notice
- The trigger will still be created

### "Trigger already exists"  
- That's fine! The migration will skip it and show a notice
- Everything is already set up

### Still getting errors?
- Make sure you're logged in as project owner
- Try refreshing the Supabase schema cache
- Restart your development server

---

**This migration is 100% safe to run!** It only adds what's missing.

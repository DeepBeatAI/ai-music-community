# Apply Edit Tracking Migration - Quick Guide

## Problem
The `updated_at` column doesn't exist in your posts table, causing the error:
```
Could not find the 'updated_at' column of 'posts' in the schema cache
```

## Solution
Apply the edit tracking migration to add the `updated_at` column and triggers.

---

## Steps to Apply Migration

### Option 1: Via Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Click "SQL Editor" in the left sidebar

2. **Create New Query**
   - Click "+ New query" button

3. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/20250113000100_add_edit_tracking.sql`
   - Copy ALL the contents (the entire file)

4. **Paste and Run**
   - Paste the SQL into the query editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success message

5. **Verify Success**
   - You should see: "Success. No rows returned"
   - Run this verification query:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'posts' 
   AND column_name = 'updated_at';
   ```
   - Should return one row showing `updated_at` column exists

---

### Option 2: Via Supabase CLI (If you have it installed)

```bash
# Make sure you're in the project root
cd /path/to/ai-music-community

# Apply all pending migrations
supabase db push

# Or apply migrations using the CLI
supabase migration up
```

---

## What This Migration Does

1. ✅ Adds `updated_at` column to `posts` table
2. ✅ Adds `updated_at` column to `comments` table (if not exists)
3. ✅ Creates trigger function to auto-update timestamps
4. ✅ Creates triggers on both tables
5. ✅ Sets up RLS policies for security
6. ✅ Enables Realtime for live updates

---

## After Applying the Migration

Once the migration is applied:

1. **Refresh your app** - The error should be gone
2. **Test editing a post** - It should work now
3. **Reload the page** - The "Edited" badge should persist!

---

## Verification

After applying, run this query to confirm everything is set up:

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

Both queries should return results.

---

## Troubleshooting

### "Permission denied"
- Make sure you're logged in as the project owner
- Check you have admin access to the database

### "Table 'posts' does not exist"
- The posts table should already exist
- If not, you may need to apply earlier migrations first

### Still getting errors?
- Try refreshing the Supabase schema cache
- Restart your local development server
- Clear browser cache and reload

---

## Quick Test

After applying the migration, test it works:

```sql
-- Update a post (replace POST_ID with a real post ID)
UPDATE posts 
SET content = 'Test update' 
WHERE id = 'YOUR_POST_ID';

-- Check if updated_at changed
SELECT id, content, created_at, updated_at 
FROM posts 
WHERE id = 'YOUR_POST_ID';
```

The `updated_at` timestamp should be newer than `created_at`!

---

**Need Help?** Check the full documentation in `TASK_1_EDIT_TRACKING_SUMMARY.md`

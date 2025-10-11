# Migration 003: Comments Table - Application Guide

## Overview
This guide explains how to apply the comments table migration to your Supabase database.

## Migration File
- **File**: `003_create_comments_table.sql`
- **Purpose**: Create comments table with RLS policies and indexes for threaded commenting system
- **Requirements**: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

## Prerequisites
- Access to Supabase Dashboard
- Project: `trsctwpczzgwbbnrkuyg`
- Admin/Owner permissions on the project

## Application Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Navigate to SQL Editor**
   - Go to https://supabase.com/dashboard/project/trsctwpczzgwbbnrkuyg
   - Click on "SQL Editor" in the left sidebar

2. **Create New Query**
   - Click "New query" button
   - Name it: "003 - Create Comments Table"

3. **Copy Migration SQL**
   - Open `supabase/migrations/003_create_comments_table.sql`
   - Copy the entire contents

4. **Paste and Execute**
   - Paste the SQL into the query editor
   - Click "Run" button
   - Wait for confirmation message

5. **Verify Success**
   - Check for success message: "Success. No rows returned"
   - Navigate to "Table Editor" in left sidebar
   - Verify "comments" table appears in the list

### Option 2: Via Supabase CLI (If Installed)

```bash
# Navigate to project root
cd /path/to/ai-music-community

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

## Verification Steps

After applying the migration, run these verification queries in the SQL Editor:

### 1. Verify Table Structure
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;
```

**Expected Result**: Should show 7 columns (id, post_id, user_id, content, parent_comment_id, created_at, updated_at)

### 2. Verify Indexes
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'comments';
```

**Expected Result**: Should show 5 indexes:
- `comments_pkey` (primary key on id)
- `idx_comments_post_id`
- `idx_comments_user_id`
- `idx_comments_parent_id`
- `idx_comments_created_at`

### 3. Verify RLS is Enabled
```sql
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'comments';
```

**Expected Result**: Should return `t` (true)

### 4. Verify RLS Policies
```sql
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'comments'
ORDER BY policyname;
```

**Expected Result**: Should show 4 policies:
- `Comments are viewable by everyone` (SELECT)
- `Users can create comments` (INSERT)
- `Users can delete own comments` (DELETE)
- `Users can update own comments` (UPDATE)

### 5. Verify Trigger
```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'comments';
```

**Expected Result**: Should show `update_comments_updated_at` trigger

## Testing the Migration

After verification, test the RLS policies using the test file:

1. Open `supabase/migrations/003_test_comments_rls.sql`
2. Run the test queries one by one in SQL Editor
3. Verify each test produces expected results

### Quick Test: Create a Test Comment

```sql
-- Replace YOUR_USER_ID with your actual user ID from auth.users
-- Replace POST_ID with an actual post ID from posts table

INSERT INTO comments (post_id, user_id, content)
VALUES (
  'POST_ID_HERE',
  auth.uid(),
  'This is a test comment to verify the migration worked!'
)
RETURNING *;
```

**Expected Result**: Should successfully insert and return the new comment

### Quick Test: Verify Public Read Access

```sql
SELECT * FROM comments LIMIT 5;
```

**Expected Result**: Should return comments without authentication errors

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the comments table (this will cascade delete all comments)
DROP TABLE IF EXISTS comments CASCADE;

-- Drop the trigger function if no other tables use it
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**⚠️ WARNING**: Rollback will permanently delete all comments data!

## Troubleshooting

### Error: "relation 'posts' does not exist"
- **Cause**: Posts table not found
- **Solution**: Ensure previous migrations have been applied

### Error: "permission denied for schema public"
- **Cause**: Insufficient permissions
- **Solution**: Ensure you're logged in as project owner/admin

### Error: "policy already exists"
- **Cause**: Migration was partially applied
- **Solution**: Drop existing policies and re-run migration

### RLS Policies Not Working
- **Check**: Verify RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'comments';`
- **Solution**: Run `ALTER TABLE comments ENABLE ROW LEVEL SECURITY;`

## Post-Migration Tasks

After successfully applying the migration:

1. ✅ Mark Task 1 as complete in `.kiro/specs/advanced-social-features/tasks.md`
2. ✅ Update TypeScript types (Task 2)
3. ✅ Proceed with component implementation (Tasks 3-5)

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Review error messages in SQL Editor
3. Verify all prerequisites are met
4. Consult Supabase documentation: https://supabase.com/docs

---

**Migration Status**: ⏳ Pending Application
**Created**: 2025-01-05
**Last Updated**: 2025-01-05

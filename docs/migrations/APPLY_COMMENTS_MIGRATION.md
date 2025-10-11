# 🚀 Quick Start: Apply Comments Migration

## ⚡ Quick Steps

1. **Open Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/trsctwpczzgwbbnrkuyg
   ```

2. **Go to SQL Editor** (left sidebar)

3. **Copy the migration SQL**
   - Open: `supabase/migrations/003_create_comments_table.sql`
   - Copy all contents (Ctrl+A, Ctrl+C)

4. **Paste and Run**
   - Click "New query" in SQL Editor
   - Paste the SQL
   - Click "Run" button

5. **Verify Success**
   - Look for: "Success. No rows returned"
   - Check Table Editor - "comments" table should appear

## ✅ Quick Verification

Run this in SQL Editor to confirm everything worked:

```sql
-- Should return 7 columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'comments';

-- Should return 't' (RLS enabled)
SELECT relrowsecurity FROM pg_class WHERE relname = 'comments';

-- Should return 4 policies
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'comments';
```

## 📚 Detailed Documentation

For complete instructions, troubleshooting, and testing:
- **Full Guide**: `supabase/migrations/003_APPLY_MIGRATION_GUIDE.md`
- **Task Summary**: `supabase/migrations/003_TASK_SUMMARY.md`
- **Test Queries**: `supabase/migrations/003_test_comments_rls.sql`

## 🎯 What This Creates

- ✅ Comments table with proper schema
- ✅ 4 performance indexes
- ✅ Row Level Security enabled
- ✅ 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Automatic timestamp updates
- ✅ Cascade delete for posts and nested replies

## ⏭️ Next Steps

After applying the migration:
1. Verify using the queries above
2. Proceed to Task 2: Create TypeScript type definitions
3. Continue with component implementation

---

**Need Help?** Check the detailed guide in `supabase/migrations/003_APPLY_MIGRATION_GUIDE.md`

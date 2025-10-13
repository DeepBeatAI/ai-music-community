# Environment Variables for Edge Functions

## ✅ Auto-Configured Variables

Supabase **automatically provides** these environment variables to all Edge Functions:

- **`SUPABASE_URL`** - Your project URL (e.g., `https://xxxxx.supabase.co`)
- **`SUPABASE_SERVICE_ROLE_KEY`** - Your service role key with full database access
- **`SUPABASE_ANON_KEY`** - Your anonymous key (if needed)

## 🎯 What This Means

**You don't need to manually configure anything!**

The `collect-metrics` function will automatically have access to:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
```

These values are injected by Supabase when the function runs.

## 🔍 How to Verify

After deploying your function, you can test it immediately. If you get a response, the environment variables are working correctly.

## 🛠️ Custom Environment Variables (Optional)

If you need to add **custom** environment variables (not the built-in ones), you would typically:

1. Use the Supabase CLI (if available):
   ```bash
   supabase secrets set MY_CUSTOM_VAR=value
   ```

2. Or check your Supabase Dashboard for a **Secrets** or **Environment** section in:
   - Project Settings
   - Edge Functions settings
   - Individual function settings

However, for the `collect-metrics` function, **you only need the built-in variables**, which are already configured!

## ✨ Summary

**For this function:** No action needed! Just deploy and test. The environment variables are automatically available. 🎉

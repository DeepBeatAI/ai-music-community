# Session Management Troubleshooting Guide

## Issue: Logged Out Sessions Still Showing

### Symptoms
- User logs out but their session still appears in Active Sessions tab
- Sessions with `is_active = false` or `expires_at < now()` are visible

### Root Causes

#### 1. Tab Not Refreshed
**Most Common Cause**

The Active Sessions list doesn't auto-refresh. After a user logs out or a session expires, you need to manually refresh the list.

**Solution**:
- Click away from the Active Sessions tab
- Click back to Active Sessions tab
- The list will reload and filter out inactive/expired sessions

#### 2. Session Not Marked as Inactive
The `mark_session_inactive` function wasn't called during logout.

**Check**:
```sql
SELECT id, user_id, is_active, expires_at, last_activity
FROM user_sessions
WHERE user_id = 'USER_ID_HERE'
ORDER BY last_activity DESC;
```

**Solution**:
- Ensure user is using the logout button (not just closing browser)
- Check browser console for errors during logout
- Verify `mark_session_inactive` function exists in database

#### 3. Database Query Not Filtering Correctly
The `get_active_sessions_with_usernames` function should filter by:
```sql
WHERE us.is_active = true
  AND us.expires_at > now()
```

**Check**:
```sql
-- View the function definition
SELECT pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'get_active_sessions_with_usernames';
```

**Solution**:
- Verify the function has the correct WHERE clause
- Re-apply the migration if needed

### Debugging Steps

1. **Check if session is actually inactive**:
   ```sql
   SELECT id, is_active, expires_at
   FROM user_sessions
   WHERE id = 'SESSION_ID_HERE';
   ```

2. **Manually mark session as inactive**:
   ```sql
   UPDATE user_sessions
   SET is_active = false
   WHERE id = 'SESSION_ID_HERE';
   ```

3. **Clean up old expired sessions**:
   ```sql
   UPDATE user_sessions
   SET is_active = false
   WHERE expires_at < now() OR last_activity < now() - interval '2 hours';
   ```

4. **Test the mark_session_inactive function**:
   ```sql
   SELECT public.mark_session_inactive('SESSION_TOKEN_HERE');
   ```

### User Not Logged Out After Admin Termination

**Expected Behavior**: User is NOT immediately logged out when admin terminates their session.

**Why**: Supabase Auth tokens cannot be invalidated server-side. The user's browser still has a valid token.

**Actual Logout Flow**:
1. Admin terminates session (marks as `is_active = false` in database)
2. User continues using current page (still has valid token in browser)
3. User navigates to another page or refreshes
4. Auth state change handler runs and checks session status in database
5. Finds `is_active = false`, automatically signs user out
6. User sees message: "Your session has been terminated by an administrator"
7. User is redirected to login page

**Testing**:
1. Admin terminates user's session
2. User should still be able to use current page
3. User clicks any link or refreshes page
4. User should be immediately logged out with message

### Expected Behavior

**When user logs out**:
1. `signOut` function is called
2. `mark_session_inactive` database function is called
3. Session's `is_active` is set to `false`
4. Supabase Auth signs out the user
5. User is redirected to login page

**In Active Sessions tab**:
1. Query filters by `is_active = true AND expires_at > now()`
2. Logged out sessions (`is_active = false`) are excluded
3. Expired sessions (`expires_at < now()`) are excluded
4. Only active, non-expired sessions are shown

### Common Mistakes

❌ **Looking at database directly**: The database may have inactive sessions, but they won't show in the admin dashboard

❌ **Not refreshing the tab**: The list doesn't auto-refresh, you need to click away and back

❌ **Checking immediately**: There may be a 1-2 second delay for the database update to complete

✅ **Correct approach**: 
1. User logs out
2. Wait 2-3 seconds
3. Refresh Active Sessions tab (click away and back)
4. Session should be gone

### Auto-Refresh Feature (Future Enhancement)

Currently, the Active Sessions tab doesn't auto-refresh. This could be added:

```typescript
// In SecurityTab.tsx
useEffect(() => {
  if (activeView !== 'sessions') return;
  
  // Refresh every 30 seconds
  const interval = setInterval(() => {
    loadSessions();
  }, 30000);
  
  return () => clearInterval(interval);
}, [activeView]);
```

### Related Issues

- **Session Expiration UX**: See [guide-session-expiration-ux.md](guide-session-expiration-ux.md)
- **Session Management**: See [guide-session-management.md](guide-session-management.md)

---

**Last Updated**: November 27, 2024
**Status**: Active troubleshooting guide

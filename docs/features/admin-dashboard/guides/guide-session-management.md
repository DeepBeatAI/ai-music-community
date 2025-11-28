# Session Management Guide

## Overview

This guide explains how user sessions work in the admin dashboard, including session tracking, expiration, and termination.

## Session Lifecycle

### Session Creation

When a user logs in:
1. Supabase Auth creates an authentication session with an access token
2. The session token expires 1 hour after creation
3. A record is created in the `user_sessions` table with:
   - User ID
   - Session token
   - IP address (captured via `/api/get-ip` endpoint)
   - User agent (browser information)
   - Expiration time (1 hour from creation)
   - `is_active` flag set to `true`

### Session Activity Tracking

- **Last Activity**: Updated every 5 minutes while the user is active
- **Duration**: Calculated from `created_at` to `last_activity`
- **IP Address**: Captured on session creation and stored in database

### Session Expiration

**What is the "Expires" column?**
- Shows when the session token expires (1 hour after creation)
- This is the Supabase Auth token expiration time

**What happens after expiration?**
- **Automatic logout**: Supabase Auth automatically invalidates the token
- **Not immediate**: User won't be forcibly logged out while idle - they can continue using the current page
- **On next interaction**: When user performs any action that requires authentication:
  - Clicks a link to navigate to another page
  - Refreshes the page (F5 or browser refresh)
  - Makes an API request (like posting a comment, liking a track, etc.)
  - Attempts to access protected data
- **What happens then**: 
  - Supabase Auth detects the expired token
  - User is automatically redirected to the login page
  - Session remains in database but is filtered from active list (expires_at < now())
- **Database filtering**: Expired sessions are automatically filtered from the active sessions list by the query

**Query filter:**
```sql
WHERE us.is_active = true
  AND us.expires_at > now()
```

**Session expiration flow:**
1. Token expires (1 hour after creation)
2. User continues using the current page (no immediate logout)
3. User performs an action (navigate, refresh, API call, etc.)
4. Supabase Auth detects expired token during the action
5. User is redirected to login page
6. Expired session is automatically filtered from active sessions list (no manual cleanup needed)

**Example scenarios:**
- User logs in at 1:00 PM, token expires at 2:00 PM
- At 2:05 PM, user is still viewing a page (no logout yet)
- At 2:10 PM, user clicks a link → Supabase detects expired token → Redirects to login
- At 2:15 PM, user refreshes the page → Supabase detects expired token → Redirects to login

### Session Termination

**Admin Termination:**
1. Admin clicks "Terminate" button in Active Sessions tab
2. `terminate_user_session` function is called
3. Session's `is_active` flag is set to `false` in database
4. Action is logged in `admin_audit_log`
5. Session list is refreshed to remove terminated session
6. **User logout**: On user's next page load or navigation:
   - Auth state change handler checks if session is still active
   - Finds `is_active = false` in database
   - Automatically signs user out with message: "Your session has been terminated by an administrator"
   - User is redirected to login page

**User Logout:**
1. User clicks logout button
2. `signOut` function calls `mark_session_inactive` database function
3. Session is marked as `is_active = false` in database
4. Supabase Auth signs out the user
5. User is redirected to login page

**Automatic Cleanup:**
- Expired sessions are automatically filtered by the database query (`expires_at > now()`)
- No need to manually mark expired sessions as inactive
- The query ensures only valid, non-expired sessions appear in the list
- Database function `mark_session_inactive` handles session cleanup without causing render loops

**Why might a terminated session still show?**
- The session list needs to be refreshed (click the Active Sessions tab again)
- The database query filters by `is_active = true AND expires_at > now()`, so terminated/expired sessions won't appear after refresh

## Active Sessions Display

### Columns

1. **Username**: User's display name from `user_profiles`
2. **User ID**: Truncated UUID with tooltip showing full ID
3. **IP Address**: 
   - Cleaned format (removes `::ffff:` IPv6 prefix)
   - Shows "Not captured" if IP wasn't recorded
4. **Duration**: Time from session creation to last activity
   - Format: `Xh Ym` for hours and minutes
   - Format: `Xm` for minutes only
5. **Last Activity**: Timestamp of most recent activity
6. **Expires**: Session token expiration time (with tooltip explanation)
7. **Actions**: Terminate button (disabled for current user's session)

### IP Address Format

**IPv4-mapped IPv6 addresses:**
- Database stores: `::ffff:127.0.0.1`
- Display shows: `127.0.0.1`
- The `::ffff:` prefix is automatically removed for cleaner display

**IP address capture:**
- All sessions should have an IP address captured
- Shows "Not captured" only if database has `null` value (rare)
- Fallback to `127.0.0.1` (localhost) if all detection methods fail

**IP capture process:**
1. User logs in
2. `/api/get-ip` endpoint checks multiple sources (priority order):
   - `cf-connecting-ip` header (Cloudflare)
   - `x-forwarded-for` header (most proxies)
   - `x-real-ip` header (Nginx)
   - `request.ip` (Next.js 13+)
   - `socket.remoteAddress` (direct connection)
   - Fallback: `127.0.0.1` (localhost)
3. IPv6 localhost (`::1`) is converted to IPv4 (`127.0.0.1`)
4. IP is stored in database
5. Display removes `::ffff:` prefix for cleaner IPv4 display

**Why IP might show 127.0.0.1:**
- Local development (no proxy headers available)
- Direct connection without reverse proxy
- All detection methods failed (uses fallback)

## Database Functions

### get_active_sessions_with_usernames

Returns active sessions with user information:
```sql
SELECT 
  us.id,
  us.user_id,
  up.username,
  us.session_token,
  us.ip_address,
  us.user_agent,
  us.last_activity,
  us.expires_at,
  us.is_active,
  us.created_at
FROM user_sessions us
INNER JOIN user_profiles up ON up.user_id = us.user_id
WHERE us.is_active = true
  AND us.expires_at > now()
ORDER BY us.last_activity DESC;
```

### mark_session_inactive

Marks a session as inactive (called on user logout):
```sql
CREATE OR REPLACE FUNCTION public.mark_session_inactive(p_session_token TEXT)
RETURNS BOOLEAN
AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE session_token = p_session_token;
  
  RETURN true;
END;
$$;
```

### terminate_user_session

Terminates a user session (admin action):
```sql
-- Set is_active to false
UPDATE user_sessions
SET is_active = false
WHERE id = p_session_id;

-- Log the action
PERFORM log_admin_action(
  'session_terminated',
  'user',
  v_user_id::TEXT,
  NULL,
  jsonb_build_object('session_id', p_session_id)
);
```

**How user logout works**:
- Admin marks session as inactive in database
- User's browser still has valid Supabase Auth token (can't be invalidated server-side)
- On user's next page load or navigation:
  - `AuthContext` checks if session is still active in database
  - If `is_active = false`, user is automatically signed out
  - User sees message: "Your session has been terminated by an administrator"
  - User is redirected to login page
- This prevents the session from being recreated

## Security Considerations

1. **Admin-only access**: Only users with admin role can view and terminate sessions
2. **Self-termination prevention**: Admins cannot terminate their own current session
3. **Audit logging**: All session terminations are logged for accountability
4. **IP tracking**: IP addresses are captured for security monitoring
5. **Automatic cleanup**: Expired sessions are automatically filtered from active list

## Troubleshooting

### Session still showing after termination
- **Solution**: Refresh the Active Sessions tab
- **Reason**: The list doesn't auto-refresh after termination

### IP address shows "Not captured"
- **Reason**: IP detection failed during login or session is from before IP tracking was implemented
- **Solution**: IP will be captured on next login

### Session expired but user still logged in
- **Reason**: Supabase Auth may have refreshed the token automatically
- **Solution**: This is normal behavior - Supabase handles token refresh

### Duration shows 0m or negative
- **Reason**: Session was just created or timing issue during session creation
- **Solution**: Duration will update as user activity is tracked
- **Negative duration**: Shows "< 1m" when `last_activity` is before `created_at` (rare timing issue)

## Related Files

- `client/src/components/admin/SecurityTab.tsx` - Active Sessions UI
- `client/src/lib/securityService.ts` - Session management functions
- `client/src/contexts/AuthContext.tsx` - Session creation and tracking
- `client/src/types/admin.ts` - UserSession type definition
- `supabase/migrations/*_create_user_sessions.sql` - Database schema
- `supabase/migrations/*_create_session_functions.sql` - Database functions

## Recent Changes

### November 27, 2024

**Added Duration Column:**
- Calculates time from session creation to last activity
- Displays in hours and minutes format
- Shows "< 1m" for negative durations (timing issues)

**Improved IP Address Capture:**
- Removes `::ffff:` IPv6 prefix for cleaner display
- Changed "N/A" to "Not captured" for missing IPs
- Enhanced IP detection with multiple fallback methods
- Always captures an IP address (uses 127.0.0.1 as final fallback)
- Converts IPv6 localhost to IPv4 for consistency

**Added Expires Tooltip:**
- Explains that session expires 1 hour after creation
- Clarifies that user needs to re-authenticate after expiration

**Fixed TypeScript Types:**
- Added `username` field to `UserSession` interface
- Removed `any` type usage for better type safety

**Fixed Session Cleanup:**
- Created `mark_session_inactive` database function for logout handling
- `signOut` function calls database function to mark session as inactive
- Prevents logged-out sessions from showing in active list
- Avoids infinite render loops by using database function instead of direct state updates
- Expired sessions are automatically filtered by database query (no manual cleanup needed)

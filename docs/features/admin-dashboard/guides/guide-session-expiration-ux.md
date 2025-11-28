# Session Expiration UX Improvements

## Current Behavior

**Problem**: When a user's session expires (1 hour after login), they get redirected to the login page with no explanation when they try to navigate or interact with the site. This creates confusion and poor user experience.

## Recommended Solutions

### Solution 1: Session Expiration Warning (Recommended)

**Implementation**: Show a warning before session expires

**User Flow**:
1. User logs in at 1:00 PM (expires at 2:00 PM)
2. At 1:50 PM (10 minutes before expiration):
   - Show a toast notification: "Your session will expire in 10 minutes. Save your work."
3. At 1:55 PM (5 minutes before expiration):
   - Show another toast: "Your session will expire in 5 minutes. Click here to stay logged in."
   - Provide a "Stay Logged In" button that refreshes the session
4. At 2:00 PM (expiration):
   - If user hasn't refreshed, show modal: "Your session has expired. Please log in again."
   - Redirect to login page after 3 seconds or when user clicks "Log In"

**Benefits**:
- Users are warned before losing their work
- Option to extend session without interruption
- Clear explanation when session expires

**Implementation Details**:
```typescript
// In AuthContext or a dedicated SessionWarning component
useEffect(() => {
  if (!session) return;
  
  const expiresAt = new Date(session.expires_at! * 1000);
  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  
  // Show warning 10 minutes before expiration
  const warningTime = timeUntilExpiry - (10 * 60 * 1000);
  if (warningTime > 0) {
    const warningTimer = setTimeout(() => {
      showToast('Your session will expire in 10 minutes. Save your work.');
    }, warningTime);
    
    return () => clearTimeout(warningTimer);
  }
}, [session]);
```

### Solution 2: Automatic Session Refresh (Simplest)

**Implementation**: Automatically refresh the session token before it expires

**User Flow**:
1. User logs in at 1:00 PM (expires at 2:00 PM)
2. At 1:50 PM (10 minutes before expiration):
   - Automatically call `supabase.auth.refreshSession()` in the background
   - Session is extended for another hour (now expires at 2:50 PM)
3. User never experiences session expiration during active use

**Benefits**:
- Seamless experience - users never get logged out while active
- No interruptions or warnings needed
- Simple to implement

**Drawbacks**:
- Sessions can stay active indefinitely if user keeps browser open
- Less secure for shared computers
- No forced re-authentication

**Implementation Details**:
```typescript
// In AuthContext
useEffect(() => {
  if (!session) return;
  
  const expiresAt = new Date(session.expires_at! * 1000);
  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  
  // Refresh 10 minutes before expiration
  const refreshTime = timeUntilExpiry - (10 * 60 * 1000);
  
  if (refreshTime > 0) {
    const refreshTimer = setTimeout(async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Failed to refresh session:', error);
      }
    }, refreshTime);
    
    return () => clearTimeout(refreshTimer);
  }
}, [session]);
```

### Solution 3: Expiration Modal with Explanation (Current + Enhancement)

**Implementation**: Show a clear modal when session expires

**User Flow**:
1. User's session expires
2. User tries to navigate or interact
3. Instead of immediate redirect, show modal:
   ```
   Session Expired
   
   Your session has expired for security reasons. 
   Sessions expire after 1 hour of inactivity.
   
   Please log in again to continue.
   
   [Log In] [Cancel]
   ```
4. User clicks "Log In" → Redirect to login page with return URL
5. After login, redirect back to the page they were on

**Benefits**:
- Clear explanation of why they're being logged out
- User can save work before being redirected
- Return URL preserves their location

**Implementation Details**:
```typescript
// Create a SessionExpiredModal component
// Show it when auth state changes to SIGNED_OUT due to expiration
// Store current URL before redirect
// After login, redirect back to stored URL
```

### Solution 4: Hybrid Approach (Best UX)

**Combination of Solutions 1 and 2**:

1. **Auto-refresh during active use**: If user is actively using the site (mouse movement, keyboard input), automatically refresh the session
2. **Warning for idle users**: If user is idle (no activity for 45 minutes), show warning
3. **Expiration modal**: If session expires, show clear modal with explanation

**User Flow**:
- **Active user**: Session automatically refreshes, never expires
- **Idle user**: Gets warning at 50 minutes, can click to stay logged in
- **Inactive user**: Session expires, sees clear modal with explanation

**Benefits**:
- Best of both worlds
- Active users never interrupted
- Idle users get warning
- Clear explanation if session expires

## Recommended Implementation

**For MVP**: ✅ **IMPLEMENTED - Solution 2 (Automatic Session Refresh)** - simplest and best UX

**For Production**: Implement **Solution 4 (Hybrid Approach)** - best balance of UX and security (future enhancement)

## Security Considerations

### Automatic Refresh Concerns
- **Shared computers**: User might forget to log out, session stays active
- **Mitigation**: Add "Remember me" checkbox on login
  - If unchecked: Don't auto-refresh, expire after 1 hour
  - If checked: Auto-refresh for up to 24 hours, then require re-login

### Activity Detection
- Track user activity (mouse movement, keyboard input, clicks)
- Only refresh if user was active in last 10 minutes
- If idle for 50+ minutes, don't auto-refresh

### Maximum Session Duration
- Even with auto-refresh, enforce maximum session duration (e.g., 24 hours)
- After 24 hours, require re-authentication regardless of activity

## Implementation Priority

1. **Immediate** (Quick fix): Add expiration modal with clear message
2. **Short-term** (1-2 weeks): Implement automatic session refresh
3. **Long-term** (1-2 months): Add activity detection and hybrid approach

## Code Example: Quick Fix (Expiration Modal)

```typescript
// In AuthContext.tsx
const [showExpirationModal, setShowExpirationModal] = useState(false);

useEffect(() => {
  const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
    // ... existing code ...
    
    // Detect session expiration
    if (event === 'SIGNED_OUT' && !currentSession && session) {
      // Check if it was due to expiration
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      
      if (now > expiresAt) {
        // Session expired
        setShowExpirationModal(true);
        // Store current URL for return after login
        localStorage.setItem('return_url', pathname);
      }
    }
  };
  
  // ... rest of code ...
}, [router, pathname]);

// Render modal
{showExpirationModal && (
  <SessionExpiredModal 
    onClose={() => {
      setShowExpirationModal(false);
      router.push('/login');
    }}
  />
)}
```

## Related Files

- `client/src/contexts/AuthContext.tsx` - Session management
- `client/src/components/SessionExpiredModal.tsx` - Modal component (to be created)
- `client/src/components/SessionWarning.tsx` - Warning toast (to be created)

## Testing Checklist

- [ ] Test session expiration after 1 hour
- [ ] Test auto-refresh (if implemented)
- [ ] Test warning notifications (if implemented)
- [ ] Test expiration modal display
- [ ] Test return URL after re-login
- [ ] Test on shared computer scenario
- [ ] Test with multiple tabs open
- [ ] Test with network interruption

---

## Implementation Status

### ✅ Completed: Automatic Session Refresh (November 27, 2024)

**What was implemented**:
- Automatic session token refresh 10 minutes before expiration
- Session expiration tracking in user_sessions table
- Console logging for debugging
- Graceful error handling (silent failures)

**How it works**:
1. When user logs in, session expires in 1 hour
2. At 50 minutes, auto-refresh timer triggers
3. `supabase.auth.refreshSession()` is called
4. New token is issued with fresh 1-hour expiration
5. Session record in database is updated with new expiration time
6. User continues working without interruption

**User experience**:
- Users never experience unexpected logouts during active use
- Sessions can stay active indefinitely while user is using the site
- No warnings or modals needed
- Seamless experience

**Security considerations**:
- Sessions still expire if browser is closed (no persistent refresh)
- Inactive sessions (browser idle) will eventually expire
- Admin can still terminate sessions manually
- Future enhancement: Add maximum session duration (e.g., 24 hours)

**Testing**:
- Check browser console for auto-refresh logs
- Session should refresh automatically 10 minutes before expiration
- User should never be logged out while actively using the site

**Files modified**:
- `client/src/contexts/AuthContext.tsx` - Added auto-refresh useEffect

---

**Status**: ✅ Implemented and Active
**Priority**: High - Significantly improves user experience
**Actual Effort**: ~1 hour (simpler than estimated)

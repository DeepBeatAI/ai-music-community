# Security Testing Guide - Tracks vs Posts Separation

## Overview

This guide provides comprehensive security testing procedures for the tracks-posts separation feature, covering Row Level Security (RLS) policies, access permissions, privacy controls, authorization checks, and SQL injection prevention.

## Current Testing Status

### ⚠️ Private Track Tests - BLOCKED

**Status:** Multiple tests cannot be executed due to missing UI implementation

**Affected Tests:**

- Test 1.1: Private Track Access Control
- Test 2.2: Private Track Accessible Only by Owner
- Test 2.3: Track Access via Post
- Test 2.4: Track Access via Playlist
- Section 3: All Private Track Privacy tests (3.1-3.4)

**Root Cause:** The `AudioUpload` component (line 241 in `client/src/components/AudioUpload.tsx`) hardcodes `is_public: true` with no UI option to create private tracks.

**Backend Status:** ✅ Database schema and RLS policies fully support private tracks

**Workaround:** Private tracks can be created directly via SQL for RLS policy testing:

```sql
INSERT INTO tracks (user_id, title, file_url, is_public)
VALUES ('user-id', 'Test Private Track', 'test-url', false);
```

**Required for Unblocking:**

1. Add public/private toggle to AudioUpload component
2. Update track upload flow to respect privacy selection
3. Add privacy controls to track management/edit UI

### ✅ Tests Available Now

The following security tests can be executed with current implementation:

- Test 1.2: Public Track Access
- Test 1.3: Track Modification Permissions
- Test 1.4: Track Deletion Permissions
- Test 2.1: Public Track Accessible by All
- Section 4: Authorization Checks (all tests)
- Section 5: SQL Injection Vulnerabilities (all tests)
- Section 6: Additional Security Tests (all tests)

## Security Principles

1. **Principle of Least Privilege**: Users can only access what they need
2. **Defense in Depth**: Multiple layers of security
3. **Secure by Default**: Private by default, public by choice
4. **Input Validation**: All user input sanitized
5. **Authorization First**: Check permissions before any operation

## Test Scenarios

### 1. RLS Policies with Different Users

#### Test 1.1: Private Track Access Control

> **⚠️ BLOCKED - UI NOT IMPLEMENTED**
>
> **Status:** Cannot be executed - private track creation UI not yet implemented
>
> **Blocker:** The `AudioUpload` component currently hardcodes `is_public: true` (line 241 in `client/src/components/AudioUpload.tsx`). There is no UI toggle to create private tracks.
>
> **Required for unblocking:**
>
> - Add public/private toggle to AudioUpload component
> - Update track upload flow to respect user's privacy selection
> - Add privacy controls to track management UI
>
> **Database & RLS Status:** ✅ Ready (schema and policies already support private tracks)

**Setup:**

- User A creates private track
- User B attempts to access

**Test Steps:**

1. User A logs in
2. User A uploads track with `is_public = false` _(UI not available)_
3. Note track ID
4. User A logs out
5. User B logs in
6. User B attempts to fetch track by ID

**Expected Results:**

- ✅ User A can see their private track
- ✅ User B cannot see User A's private track
- ✅ API returns 403 or null for User B
- ✅ No track data leaked in response

**SQL Verification:**

```sql
-- As User B, this should return no rows
SELECT * FROM tracks
WHERE id = 'user-a-private-track-id';
```

**Manual Testing Workaround (Database Direct):**

```sql
-- Temporarily create a private track via SQL for testing RLS policies
INSERT INTO tracks (user_id, title, file_url, is_public)
VALUES ('user-a-id', 'Test Private Track', 'test-url', false);
```

#### Test 1.2: Public Track Access

**Setup:**

- User A creates public track
- User B attempts to access

**Test Steps:**

1. User A creates track with `is_public = true`
2. User B attempts to fetch track

**Expected Results:**

- ✅ User A can see their public track
- ✅ User B can see User A's public track
- ✅ Track data returned correctly
- ✅ No private metadata exposed

#### Test 1.3: Track Modification Permissions

**Setup:**

- User A creates track
- User B attempts to modify

**Test Steps:**

1. User A creates track
2. User B attempts to update track metadata

**Expected Results:**

- ✅ User A can update their own track
- ✅ User B cannot update User A's track
- ✅ Update fails with proper error
- ✅ No unauthorized changes applied

**SQL Verification:**

```sql
-- As User B, this should fail
UPDATE tracks
SET title = 'Hacked Title'
WHERE id = 'user-a-track-id';
```

#### Test 1.4: Track Deletion Permissions

**Setup:**

- User A creates track
- User B attempts to delete

**Test Steps:**

1. User A creates track
2. User B attempts to delete track

**Expected Results:**

- ✅ User A can delete their own track
- ✅ User B cannot delete User A's track
- ✅ Delete fails with proper error
- ✅ Track remains in database

### 2. Track Access Permissions

#### Test 2.1: Public Track Accessible by All

**Test Steps:**

1. Create public track
2. Test access as:
   - Authenticated user (owner)
   - Authenticated user (other)
   - Unauthenticated user

**Expected Results:**

- ✅ Owner can access
- ✅ Other authenticated users can access
- ✅ Unauthenticated users can access
- ✅ All see same data

#### Test 2.2: Private Track Accessible Only by Owner

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. Create private track _(UI not available)_
2. Test access as:
   - Authenticated user (owner)
   - Authenticated user (other)
   - Unauthenticated user

**Expected Results:**

- ✅ Owner can access
- ❌ Other authenticated users cannot access
- ❌ Unauthenticated users cannot access
- ✅ Proper error messages returned

#### Test 2.3: Track Access via Post

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. Create private track _(UI not available)_
2. Create post with track
3. Test post access as other user

**Expected Results:**

- ✅ Post visible if track is public
- ❌ Post not visible if track is private
- ✅ Track privacy respected in posts
- ✅ No data leakage through posts

#### Test 2.4: Track Access via Playlist

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. Create private track _(UI not available)_
2. Add to playlist
3. Test playlist access as other user

**Expected Results:**

- ✅ Track visible in playlist if public
- ❌ Track not visible in playlist if private
- ✅ Playlist respects track privacy
- ✅ No unauthorized access

### 3. Private Track Privacy

> **⚠️ SECTION BLOCKED - UI NOT IMPLEMENTED**
>
> All tests in this section require the ability to create private tracks, which is not yet available in the UI. See Test 1.1 blocker details above.

#### Test 3.1: Private Track Not in Public Feed

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. User A creates private track _(UI not available)_
2. User A creates post with private track
3. User B views public feed

**Expected Results:**

- ❌ Post with private track not in User B's feed
- ✅ Post visible only to User A
- ✅ Feed query respects privacy
- ✅ No private tracks leaked

**SQL Verification:**

```sql
-- Public feed query should exclude private tracks
SELECT p.*, t.*
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE t.is_public = true OR t.user_id = current_user_id();
```

#### Test 3.2: Private Track Not in Search

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. Create private track with unique title _(UI not available)_
2. Search for track title as other user

**Expected Results:**

- ❌ Private track not in search results
- ✅ Only public tracks returned
- ✅ Search respects privacy
- ✅ No information disclosure

#### Test 3.3: Private Track Not Accessible via Direct URL

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. Get private track ID _(requires creating private track first)_
2. Construct direct URL
3. Access as other user

**Expected Results:**

- ❌ Access denied
- ✅ 403 Forbidden or 404 Not Found
- ✅ No track data returned
- ✅ No error message leaks info

#### Test 3.4: Private Track Visible Only to Owner

> **⚠️ BLOCKED - UI NOT IMPLEMENTED** (Same blocker as Test 1.1)

**Test Steps:**

1. User A creates private track _(UI not available)_
2. User A views their library
3. User B views User A's profile

**Expected Results:**

- ✅ User A sees private track in library
- ❌ User B doesn't see private track
- ✅ Privacy maintained across all views
- ✅ No data leakage

### 4. Authorization Checks

#### Test 4.1: Unauthenticated Upload Prevention

**Test Steps:**

1. Log out (no auth token)
2. Attempt to upload track

**Expected Results:**

- ❌ Upload fails
- ✅ 401 Unauthorized error
- ✅ No file uploaded
- ✅ No database record created

**API Test:**

```javascript
// Should fail without auth token
const response = await fetch("/api/tracks/upload", {
  method: "POST",
  body: formData,
  // No Authorization header
});
expect(response.status).toBe(401);
```

#### Test 4.2: Unauthenticated Post Creation Prevention

**Test Steps:**

1. Log out
2. Attempt to create post

**Expected Results:**

- ❌ Post creation fails
- ✅ 401 Unauthorized error
- ✅ No post created
- ✅ Proper error message

#### Test 4.3: Unauthenticated Modification Prevention

**Test Steps:**

1. Log out
2. Attempt to update track metadata

**Expected Results:**

- ❌ Update fails
- ✅ 401 Unauthorized error
- ✅ No changes applied
- ✅ Track data unchanged

#### Test 4.4: Unauthenticated Public Access Allowed

**Test Steps:**

1. Log out
2. View public feed
3. View public tracks

**Expected Results:**

- ✅ Public feed accessible
- ✅ Public tracks visible
- ✅ Audio playback works
- ✅ No private data exposed

### 5. SQL Injection Vulnerabilities

#### Test 5.1: Track Title SQL Injection

**Test Inputs:**

```javascript
const maliciousInputs = [
  "'; DROP TABLE tracks; --",
  "' OR '1'='1",
  "'; UPDATE tracks SET is_public = true; --",
  "admin'--",
  "' UNION SELECT * FROM users--",
];
```

**Test Steps:**

1. For each malicious input:
2. Attempt to create track with input as title
3. Verify input is sanitized

**Expected Results:**

- ✅ Input sanitized or rejected
- ✅ No SQL executed
- ✅ Database unchanged
- ✅ Proper error handling

#### Test 5.2: Track Description SQL Injection

**Test Steps:**

1. Use malicious SQL in description field
2. Attempt to save track

**Expected Results:**

- ✅ Input sanitized
- ✅ No SQL injection possible
- ✅ Description saved as plain text
- ✅ No database compromise

#### Test 5.3: Search Query SQL Injection

**Test Steps:**

1. Use malicious SQL in search query
2. Execute search

**Expected Results:**

- ✅ Query sanitized
- ✅ No SQL injection
- ✅ Safe search results
- ✅ No data leakage

#### Test 5.4: Track ID SQL Injection

**Test Steps:**

1. Use malicious SQL as track ID parameter
2. Attempt to fetch track

**Expected Results:**

- ✅ Invalid ID rejected
- ✅ No SQL injection
- ✅ Proper error handling
- ✅ No database access

### 6. Additional Security Tests

#### Test 6.1: File Upload Security

**Test Steps:**

1. Attempt to upload non-audio file
2. Attempt to upload oversized file (> 50MB)
3. Attempt to upload file with malicious name

**Expected Results:**

- ✅ Non-audio files rejected
- ✅ Oversized files rejected
- ✅ Malicious filenames sanitized
- ✅ Only valid audio files accepted

#### Test 6.2: CSRF Protection

**Test Steps:**

1. Attempt cross-site request
2. Verify CSRF token required

**Expected Results:**

- ✅ CSRF token validated
- ✅ Cross-site requests blocked
- ✅ Proper error returned

#### Test 6.3: Rate Limiting

**Test Steps:**

1. Make rapid repeated requests
2. Verify rate limiting applied

**Expected Results:**

- ✅ Rate limit enforced
- ✅ 429 Too Many Requests returned
- ✅ Legitimate requests not affected

#### Test 6.4: XSS Prevention

**Test Inputs:**

```javascript
const xssInputs = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
];
```

**Test Steps:**

1. Use XSS payloads in track title/description
2. View track in UI

**Expected Results:**

- ✅ Scripts not executed
- ✅ HTML escaped
- ✅ Safe rendering
- ✅ No XSS possible

## Security Testing Tools

### Manual Testing Tools

- Browser DevTools (Network, Console)
- Postman (API testing)
- cURL (Command-line testing)

### Automated Testing Tools

- OWASP ZAP (Security scanner)
- Burp Suite (Penetration testing)
- SQLMap (SQL injection testing)

### Database Tools

- Supabase Dashboard (RLS policy testing)
- PostgreSQL CLI (Direct database testing)

## RLS Policy Verification

### Check Current Policies

```sql
-- View all RLS policies for tracks table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tracks';
```

### Expected Policies

```sql
-- SELECT policy: Users can see public tracks or their own tracks
CREATE POLICY "Users can view public tracks or own tracks"
ON tracks FOR SELECT
USING (
  is_public = true
  OR user_id = auth.uid()
);

-- INSERT policy: Users can only insert their own tracks
CREATE POLICY "Users can insert own tracks"
ON tracks FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Users can only update their own tracks
CREATE POLICY "Users can update own tracks"
ON tracks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE policy: Users can only delete their own tracks
CREATE POLICY "Users can delete own tracks"
ON tracks FOR DELETE
USING (user_id = auth.uid());
```

## Security Test Results Template

```markdown
### Security Test Session: [Date]

**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Test Type:** [Manual/Automated]

#### RLS Policy Tests

| Test                 | Expected   | Actual | Status |
| -------------------- | ---------- | ------ | ------ |
| Private track access | Denied     | \_\_\_ | ✅/❌  |
| Public track access  | Allowed    | \_\_\_ | ✅/❌  |
| Track modification   | Owner only | \_\_\_ | ✅/❌  |
| Track deletion       | Owner only | \_\_\_ | ✅/❌  |

#### Permission Tests

| Test                | Expected | Actual | Status |
| ------------------- | -------- | ------ | ------ |
| Unauth upload       | Denied   | \_\_\_ | ✅/❌  |
| Unauth modify       | Denied   | \_\_\_ | ✅/❌  |
| Unauth view public  | Allowed  | \_\_\_ | ✅/❌  |
| Unauth view private | Denied   | \_\_\_ | ✅/❌  |

#### SQL Injection Tests

| Input Type   | Sanitized | Status |
| ------------ | --------- | ------ |
| Track title  | Yes/No    | ✅/❌  |
| Description  | Yes/No    | ✅/❌  |
| Search query | Yes/No    | ✅/❌  |
| Track ID     | Yes/No    | ✅/❌  |

#### Privacy Tests

| Test               | Expected | Actual | Status |
| ------------------ | -------- | ------ | ------ |
| Private in feed    | Hidden   | \_\_\_ | ✅/❌  |
| Private in search  | Hidden   | \_\_\_ | ✅/❌  |
| Private direct URL | Denied   | \_\_\_ | ✅/❌  |
| Private to owner   | Visible  | \_\_\_ | ✅/❌  |

#### Vulnerabilities Found

1. **Vulnerability Title**
   - Severity: Critical/High/Medium/Low
   - Description: ...
   - Impact: ...
   - Reproduction: ...
   - Recommendation: ...
```

## Completion Checklist

### Currently Testable

- [ ] Public track RLS policy tests passed
- [ ] Track modification permission tests passed
- [ ] Track deletion permission tests passed
- [ ] All authorization tests passed
- [ ] All SQL injection tests passed
- [ ] File upload security tests passed
- [ ] XSS prevention tests passed
- [ ] CSRF protection verified
- [ ] Rate limiting verified

### Blocked - Pending Private Track UI

- [ ] ⚠️ Private track RLS policy tests (blocked - no UI)
- [ ] ⚠️ Private track access control tests (blocked - no UI)
- [ ] ⚠️ Private track privacy tests (blocked - no UI)
- [ ] ⚠️ Track privacy in feed tests (blocked - no UI)
- [ ] ⚠️ Track privacy in search tests (blocked - no UI)

### Final Validation

- [ ] No critical vulnerabilities found
- [ ] All testable medium/low issues documented
- [ ] Security recommendations provided
- [ ] Blocked tests documented with workarounds

## Security Recommendations

1. **Enable RLS on all tables** - Ensure Row Level Security is enabled
2. **Use parameterized queries** - Prevent SQL injection
3. **Validate all input** - Sanitize user input
4. **Implement rate limiting** - Prevent abuse
5. **Use HTTPS only** - Encrypt all traffic
6. **Regular security audits** - Continuous monitoring
7. **Keep dependencies updated** - Patch vulnerabilities
8. **Implement logging** - Track security events

## Future Testing Requirements

Once private track UI is implemented, the following tests must be executed before production release:

### Critical Security Tests (Blocked)

1. **Private Track Access Control** - Verify RLS policies prevent unauthorized access
2. **Privacy Leakage Prevention** - Ensure private tracks don't appear in feeds, search, or public APIs
3. **Permission Boundaries** - Confirm only owners can access/modify private tracks
4. **Data Leakage via Relations** - Verify private tracks don't leak through posts/playlists

### Implementation Tracking

- **Feature Spec:** To be created for private track UI
- **Estimated Effort:** 4-6 hours (UI toggle + privacy controls)
- **Priority:** Medium (security infrastructure ready, UI enhancement needed)

### Testing Approach After Implementation

1. Execute all blocked tests (1.1, 2.2-2.4, 3.1-3.4)
2. Perform penetration testing on privacy boundaries
3. Validate RLS policies with real user scenarios
4. Test edge cases (track ownership transfer, shared playlists, etc.)

---

_Last Updated: January 2025_
_Security Level: Partial - Public tracks production-ready, private tracks pending UI_
_Next Review: After private track UI implementation_

# Authorization Verification Guide

This guide provides instructions for verifying that authorization checks are properly implemented for post and comment editing.

## Requirements Tested

- **3.1**: Edit buttons only show for content owner
- **3.2**: Users cannot edit content they don't own via API
- **3.3**: System verifies authenticated user ID matches content owner ID
- **3.4**: Unauthenticated users cannot edit
- **3.5**: RLS policies enforce authorization at database level

## Automated Tests

### 1. Component Authorization Tests

Run the component-level authorization tests:

```bash
cd client
npm test -- authorization
```

**Expected Results:**
- ✓ EditablePost shows edit button only for post owner
- ✓ EditablePost hides edit button for non-owners
- ✓ EditablePost hides edit button for unauthenticated users
- ✓ Comment shows edit/delete buttons only for comment owner
- ✓ Comment hides edit/delete buttons for non-owners
- ✓ Comment hides edit/delete buttons for unauthenticated users

### 2. Integration Tests

The integration tests verify the utility functions enforce authorization:

```bash
cd client
npm test -- src/__tests__/integration/authorization.test.ts
```

**Expected Results:**
- ✓ updatePost validates content before attempting update
- ✓ updateComment validates content and character limits
- ✓ Functions return proper error messages for validation failures

### 3. Database RLS Policy Tests

To verify RLS policies are properly configured, run the SQL test file:

```bash
# Option 1: Using psql (if you have direct database access)
psql -h localhost -U postgres -d postgres -f supabase/migrations/test_edit_authorization_rls.sql

# Option 2: Using Supabase Studio SQL Editor
# 1. Open Supabase Studio (http://localhost:54323)
# 2. Go to SQL Editor
# 3. Copy and paste the contents of test_edit_authorization_rls.sql
# 4. Run the query
```

**Expected Results:**
- ✓ RLS is enabled on posts table
- ✓ RLS is enabled on comments table
- ✓ UPDATE policy exists for posts table
- ✓ UPDATE policy exists for comments table
- ✓ updated_at column exists on both tables
- ✓ Triggers exist to auto-update updated_at timestamps

## Manual Verification

### Test Scenario 1: Post Owner Can Edit

1. Log in as User A
2. Create a text post
3. Verify "Edit" button appears on your post
4. Click "Edit" button
5. Modify the content
6. Click "Save"
7. Verify content is updated
8. Verify "Edited" badge appears

**Expected Result:** ✓ Post is successfully edited

### Test Scenario 2: Non-Owner Cannot Edit Post

1. Log in as User A
2. View a post created by User B
3. Verify "Edit" button does NOT appear
4. Log out

**Expected Result:** ✓ No edit button visible for other users' posts

### Test Scenario 3: Unauthenticated User Cannot Edit

1. Log out (or open incognito window)
2. View any post
3. Verify "Edit" button does NOT appear

**Expected Result:** ✓ No edit button visible when not logged in

### Test Scenario 4: Comment Owner Can Edit

1. Log in as User A
2. Create a comment on any post
3. Verify "Edit" button appears on your comment
4. Click "Edit" button
5. Modify the content
6. Click "Save"
7. Verify content is updated
8. Verify "Edited" badge appears

**Expected Result:** ✓ Comment is successfully edited

### Test Scenario 5: Non-Owner Cannot Edit Comment

1. Log in as User A
2. View a comment created by User B
3. Verify "Edit" button does NOT appear on User B's comment

**Expected Result:** ✓ No edit button visible for other users' comments

### Test Scenario 6: RLS Policy Blocks Unauthorized Updates

This test requires direct database access or API testing tools.

**Using Browser DevTools:**

1. Log in as User A
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to update another user's post directly:

```javascript
// Get the Supabase client from the page
const { supabase } = window;

// Try to update a post you don't own
const result = await supabase
  .from('posts')
  .update({ content: 'Hacked content' })
  .eq('id', 'some-other-users-post-id');

console.log(result);
```

**Expected Result:** ✓ Update fails or returns 0 rows affected (RLS blocks it)

### Test Scenario 7: Audio Post Caption Editing

1. Log in as User A
2. Create an audio post with a caption
3. Click "Edit" button
4. Verify you can only edit the caption (not the audio file)
5. Modify the caption
6. Click "Save"
7. Verify caption is updated
8. Verify audio file remains unchanged

**Expected Result:** ✓ Only caption is editable for audio posts

## Verification Checklist

Use this checklist to confirm all authorization requirements are met:

### Client-Side Authorization (UI)
- [ ] Edit button shows only for post owner
- [ ] Edit button shows only for comment owner
- [ ] Edit button hidden for unauthenticated users
- [ ] Edit button hidden for non-owners
- [ ] Audio posts only allow caption editing

### Server-Side Authorization (API)
- [ ] updatePost function validates user ownership
- [ ] updateComment function validates user ownership
- [ ] Functions return proper error messages
- [ ] Content validation occurs before database calls

### Database Authorization (RLS)
- [ ] RLS enabled on posts table
- [ ] RLS enabled on comments table
- [ ] UPDATE policy exists for posts
- [ ] UPDATE policy exists for comments
- [ ] Policies check auth.uid() = user_id
- [ ] Unauthorized updates are blocked at database level

### Error Handling
- [ ] Clear error messages for authorization failures
- [ ] Network errors handled gracefully
- [ ] Validation errors shown inline
- [ ] Users can retry after errors

## Troubleshooting

### Issue: Edit button shows for non-owners

**Cause:** Client-side ownership check may be incorrect

**Solution:** 
1. Check that `currentUserId` prop is correctly passed
2. Verify `isOwner` calculation: `currentUserId === post.user_id`
3. Ensure user_id is correctly set on posts/comments

### Issue: RLS policy not blocking unauthorized updates

**Cause:** RLS policies may not be properly configured

**Solution:**
1. Run the RLS test SQL file to verify policies exist
2. Check that policies use `auth.uid() = user_id`
3. Verify RLS is enabled: `ALTER TABLE posts ENABLE ROW LEVEL SECURITY;`
4. Restart Supabase if policies were just added

### Issue: Tests failing

**Cause:** Mock data or test setup issues

**Solution:**
1. Check that mocks are properly configured
2. Verify test data matches expected structure
3. Ensure Jest configuration is correct
4. Clear Jest cache: `npm test -- --clearCache`

## Success Criteria

All authorization checks are properly implemented when:

1. ✓ All automated tests pass (42 tests)
2. ✓ All manual test scenarios pass
3. ✓ RLS policies are verified in database
4. ✓ Edit buttons only show for content owners
5. ✓ Unauthorized API calls are blocked
6. ✓ Proper error messages are displayed

## Next Steps

After verifying authorization:

1. Mark task 6.1 as complete
2. Mark task 6 as complete
3. Proceed to task 7: Mobile responsiveness and accessibility
4. Document any issues found during verification
5. Update this guide if new test scenarios are discovered

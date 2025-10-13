# Authorization Quick Reference

## Quick Test Command

```bash
cd client
npm test -- authorization
```

**Expected:** 42 tests passing

## Authorization Flow

### Post Editing
```
User clicks Edit → Check isOwner → Show edit UI → User saves → 
API checks user_id → RLS verifies auth.uid() → Update succeeds/fails
```

### Comment Editing
```
User clicks Edit → Check isOwner → Show edit UI → User saves → 
API checks user_id → RLS verifies auth.uid() → Update succeeds/fails
```

## Security Layers

1. **UI Layer**: `isOwner = currentUserId === content.user_id`
2. **API Layer**: `.eq('user_id', userId)` in update query
3. **Database Layer**: RLS policy `auth.uid() = user_id`

## Key Files

### Implementation
- `client/src/components/EditablePost.tsx` - Post authorization
- `client/src/components/Comment.tsx` - Comment authorization
- `client/src/utils/posts.ts` - updatePost function
- `client/src/utils/comments.ts` - updateComment function

### Tests
- `client/src/__tests__/integration/authorization.test.ts`
- `client/src/components/__tests__/EditablePost.authorization.test.tsx`
- `client/src/components/__tests__/Comment.authorization.test.tsx`
- `supabase/migrations/test_edit_authorization_rls.sql`

### Documentation
- `supabase/migrations/AUTHORIZATION_VERIFICATION_GUIDE.md`
- `.kiro/specs/post-editing/TASK_6_COMPLETION.md`
- `.kiro/specs/post-editing/TASK_6_SUMMARY.md`

## Common Issues

### Edit button shows for non-owner
**Fix:** Check `currentUserId` prop is correctly passed

### RLS not blocking updates
**Fix:** Verify RLS is enabled and policies exist

### Tests failing
**Fix:** Clear Jest cache: `npm test -- --clearCache`

## Verification Checklist

- [ ] Run `npm test -- authorization` (42 tests pass)
- [ ] Edit button shows only for post owner
- [ ] Edit button shows only for comment owner
- [ ] No edit button for unauthenticated users
- [ ] RLS policies block unauthorized updates
- [ ] Error messages are clear and helpful

## Status

✅ **COMPLETED** - All authorization checks implemented and tested

# Task 5: Comment Editing - Integration Guide

## Overview
This guide explains how to integrate the comment editing functionality into your application.

## What Was Implemented

The Comment component now supports inline editing with:
- Edit button for comment owners
- Inline edit mode with textarea
- Real-time character counter (1000 max)
- Validation (empty content, character limit)
- Save and Cancel buttons
- Optimistic UI updates
- Error handling with rollback
- EditedBadge integration

## Integration Steps

### 1. No Changes Required for Existing Usage

The Comment component is **backward compatible**. If you're already using it, the edit functionality is automatically available:

```typescript
import Comment from '@/components/Comment';

// Existing usage - edit functionality is now included
<Comment
  comment={comment}
  postId={postId}
  currentUserId={currentUserId}
  onReply={handleReply}
  onDelete={handleDelete}
  depth={0}
/>
```

### 2. Verify Dependencies

Ensure these imports are available in your project:

```typescript
// Already imported in Comment.tsx
import { updateComment } from '@/utils/comments';
import EditedBadge from '@/components/EditedBadge';
```

Both of these were implemented in previous tasks and should already be available.

### 3. Database Requirements

The edit tracking must be set up (completed in Task 1):
- `updated_at` column exists on `comments` table
- Trigger automatically updates `updated_at` on content changes
- RLS policies allow users to update their own comments

### 4. Testing the Integration

#### Manual Testing Checklist

1. **Basic Edit Flow:**
   - [ ] Log in as a user
   - [ ] Create a comment
   - [ ] Click the Edit button
   - [ ] Modify the text
   - [ ] Click Save
   - [ ] Verify the comment updates
   - [ ] Verify "(Edited)" badge appears

2. **Validation Testing:**
   - [ ] Enter edit mode
   - [ ] Delete all text
   - [ ] Verify "Comment cannot be empty" error
   - [ ] Verify Save button is disabled
   - [ ] Type 1001 characters
   - [ ] Verify "exceeds maximum length" error
   - [ ] Verify Save button is disabled

3. **Cancel Testing:**
   - [ ] Enter edit mode
   - [ ] Modify text
   - [ ] Click Cancel
   - [ ] Verify original text is restored
   - [ ] Verify edit mode exits

4. **Error Handling:**
   - [ ] Disconnect network
   - [ ] Enter edit mode and modify text
   - [ ] Click Save
   - [ ] Verify error message appears
   - [ ] Verify edit mode stays active
   - [ ] Verify modified text is preserved
   - [ ] Reconnect network and retry

5. **Permissions:**
   - [ ] View another user's comment
   - [ ] Verify no Edit button appears
   - [ ] View your own comment
   - [ ] Verify Edit button appears

6. **Nested Comments:**
   - [ ] Create a reply to a comment
   - [ ] Edit the reply
   - [ ] Verify it works the same as top-level comments

## UI/UX Behavior

### Edit Button
- Appears next to Reply and Delete buttons
- Only visible to comment owner
- Icon: ✏️ with "Edit" text (hidden on mobile)
- Hover color: yellow

### Edit Mode
- Replaces comment text with textarea
- Textarea pre-filled with current content
- Auto-focuses on textarea
- Character counter in bottom-right corner
- Save and Cancel buttons below textarea
- Action buttons (Reply, Edit, Delete) hidden during edit

### Character Counter
- Gray: 0-900 characters
- Yellow: 901-1000 characters
- Red: 1001+ characters (over limit)

### Validation Errors
- Appear below textarea
- Red text color
- Specific error messages
- Save button disabled when errors present

### Optimistic Updates
- UI updates immediately on Save click
- Edit mode exits instantly
- Content updates in view mode
- "(Edited)" badge appears
- Database save happens in background
- Rollback on error

## API Usage

The component uses the `updateComment` utility function:

```typescript
import { updateComment } from '@/utils/comments';

const result = await updateComment(
  commentId,    // string
  content,      // string (trimmed)
  userId        // string (for authorization)
);

// Result structure
interface UpdateCommentResult {
  success: boolean;
  error?: string;
}
```

## Cache Invalidation

After successful save, the query cache is invalidated:

```typescript
queryCache.invalidatePattern(`comments-${postId}`);
```

This ensures fresh data on next fetch.

## Mobile Considerations

- Touch targets are 44px minimum
- Character counter positioned for mobile screens
- Buttons stack appropriately on small screens
- Textarea resizes for mobile viewports

## Accessibility

- Edit button has proper ARIA label: "Edit comment"
- Textarea auto-focuses on edit mode entry
- Keyboard navigation fully supported
- Error messages are screen reader friendly
- Semantic HTML structure maintained

## Performance

- Optimistic updates provide instant feedback
- Minimal re-renders (local state only)
- Cache invalidation only on successful save
- Efficient validation (no debouncing needed)

## Security

- Owner-only editing enforced at UI level
- RLS policies enforce at database level
- User ID validation in update function
- XSS protection via React's built-in escaping

## Troubleshooting

### Edit button doesn't appear
- Verify `currentUserId` prop is passed to Comment component
- Verify `currentUserId` matches `comment.user_id`
- Check browser console for errors

### Save fails silently
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies on comments table
- Verify user is authenticated

### Edited badge doesn't appear
- Verify EditedBadge component is imported
- Check that `updated_at` is different from `created_at`
- Verify database trigger is updating `updated_at`

### Character counter not updating
- Check that textarea `onChange` handler is working
- Verify `editContent` state is updating
- Check browser console for errors

### Optimistic update doesn't rollback on error
- Verify error handling in `handleSaveEdit`
- Check that `localComment` state is being restored
- Verify `setIsEditing(true)` is called on error

## Example Usage

### Basic Integration

```typescript
import CommentList from '@/components/CommentList';

function PostPage({ post, user }) {
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      
      {/* Comments with edit functionality included */}
      <CommentList
        postId={post.id}
        currentUserId={user?.id}
        onCommentCountChange={(delta) => {
          // Update post comment count
        }}
      />
    </div>
  );
}
```

### Custom Integration

If you're rendering Comment components directly:

```typescript
import Comment from '@/components/Comment';

function CustomCommentDisplay({ comments, userId }) {
  return (
    <div>
      {comments.map(comment => (
        <Comment
          key={comment.id}
          comment={comment}
          postId={comment.post_id}
          currentUserId={userId}
          // Edit functionality is automatically included
        />
      ))}
    </div>
  );
}
```

## Visual Example

To see a complete demonstration:

```typescript
import EditableCommentVisualExample from '@/components/__tests__/EditableComment.visual.example';

// Render in a page to see all features
<EditableCommentVisualExample />
```

## Testing

Run the test suite:

```bash
cd client
npm test -- EditableComment.test.tsx --watchAll=false
```

All 15 tests should pass.

## Next Steps

1. Test the integration in your development environment
2. Verify edit functionality works with real data
3. Test on mobile devices
4. Test with different user roles
5. Monitor for any errors in production

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the test file for expected behavior
3. Check the completion summary for implementation details
4. Verify all dependencies are installed

---

**Status:** Ready for Integration  
**Backward Compatible:** Yes  
**Breaking Changes:** None  
**Date:** January 13, 2025

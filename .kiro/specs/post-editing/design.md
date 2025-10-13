# Design Document

## Overview

This design implements post and comment editing functionality for the AI Music Community Platform. The solution enables users to edit their text posts, audio post captions, and comments after publication while maintaining content transparency through "Edited" badges. The design leverages existing database schema, React components, and Supabase RLS policies to provide a secure and user-friendly editing experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Post Edit UI │  │Comment Edit  │  │ Edited Badge │      │
│  │  Component   │  │   Component  │  │  Component   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │         Edit State Management (React)              │     │
│  └─────────────────────────┬──────────────────────────┘     │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ updatePost() │  │updateComment │  │ Validation   │      │
│  │   Function   │  │  Function    │  │   Utils      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼──────────────────┼──────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼──────────────────────────────┐
│                   Supabase Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ posts table  │  │comments table│  │  RLS Policies│    │
│  │ (UPDATE ops) │  │ (UPDATE ops) │  │  (Security)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────────────────────────────────┘
```

### Component Flow

1. **User Interaction**: User clicks "Edit" button on their post/comment
2. **State Change**: Component enters edit mode, displays editable textarea
3. **User Edits**: User modifies content, validation occurs in real-time
4. **Save Action**: User clicks "Save", triggering API call
5. **Database Update**: Supabase updates record with new content and timestamp
6. **UI Update**: Component exits edit mode, displays updated content with "Edited" badge
7. **Real-time Sync**: Other users see updates via Supabase Realtime (for comments)

## Components and Interfaces

### 1. Database Schema Updates

The existing `posts` and `comments` tables already have `updated_at` columns. We need to ensure triggers are in place to auto-update these timestamps.

**Posts Table** (already exists):
```sql
posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  content TEXT NOT NULL,
  post_type TEXT ('text' | 'audio'),
  audio_url TEXT,
  audio_filename TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ  -- Used to track edits
)
```

**Comments Table** (already exists):
```sql
comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts,
  user_id UUID REFERENCES auth.users,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ  -- Used to track edits
)
```

**Required Migration**:
- Add trigger to auto-update `updated_at` on posts table (if not exists)
- Verify trigger exists on comments table (should already be there)

### 2. TypeScript Interfaces

**Edit State Interface**:
```typescript
interface EditState {
  isEditing: boolean;
  editedContent: string;
  isSaving: boolean;
  error: string | null;
}
```

**Post Update Payload**:
```typescript
interface PostUpdatePayload {
  content: string;
  updated_at?: string; // Auto-set by trigger
}
```

**Comment Update Payload**:
```typescript
interface CommentUpdatePayload {
  content: string;
  updated_at?: string; // Auto-set by trigger
}
```

### 3. React Components

#### EditablePost Component

**Purpose**: Wraps existing post display with edit functionality

**Props**:
```typescript
interface EditablePostProps {
  post: Post;
  currentUserId: string;
  onUpdate: (postId: string, content: string) => Promise<void>;
}
```

**Key Features**:
- Displays "Edit" button only for post owner
- Toggles between view and edit modes
- Handles text posts (full content edit) and audio posts (caption only)
- Shows loading state during save
- Displays error messages on failure
- Implements unsaved changes warning

#### EditableComment Component

**Purpose**: Adds inline editing to comment display

**Props**:
```typescript
interface EditableCommentProps {
  comment: CommentWithProfile;
  currentUserId: string;
  onUpdate: (commentId: string, content: string) => Promise<void>;
}
```

**Key Features**:
- Inline edit mode within comment thread
- Character limit validation (1000 chars)
- Optimistic UI updates
- Cancel functionality
- Error handling with retry option

#### EditedBadge Component

**Purpose**: Displays "Edited" indicator with timestamp

**Props**:
```typescript
interface EditedBadgeProps {
  createdAt: string;
  updatedAt: string;
  className?: string;
}
```

**Logic**:
```typescript
const isEdited = new Date(updatedAt) > new Date(createdAt);
// Only show badge if edited (timestamps differ)
```

**Display**:
- Text: "Edited"
- Tooltip: Shows last edit timestamp on hover
- Styling: Subtle gray text, small font size

### 4. API Functions

#### updatePost Function

**Location**: `client/src/utils/posts.ts`

```typescript
export async function updatePost(
  postId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate content
  if (!content.trim()) {
    return { success: false, error: 'Content cannot be empty' };
  }

  // Update post in database
  const { error } = await supabase
    .from('posts')
    .update({ content: content.trim() })
    .eq('id', postId)
    .eq('user_id', userId); // RLS will also enforce this

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

#### updateComment Function

**Location**: `client/src/utils/comments.ts` (new file or existing)

```typescript
export async function updateComment(
  commentId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate content
  if (!content.trim()) {
    return { success: false, error: 'Comment cannot be empty' };
  }

  if (content.length > 1000) {
    return { success: false, error: 'Comment exceeds 1000 character limit' };
  }

  // Update comment in database
  const { error } = await supabase
    .from('comments')
    .update({ content: content.trim() })
    .eq('id', commentId)
    .eq('user_id', userId); // RLS will also enforce this

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

## Data Models

### Post Model (Existing)

```typescript
interface Post {
  id: string;
  created_at: string;
  updated_at: string;  // Key field for edit tracking
  content: string;     // Editable field
  user_id: string;
  post_type: 'text' | 'audio';
  audio_url?: string;  // NOT editable
  audio_filename?: string;  // NOT editable
  // ... other fields
}
```

### Comment Model (Existing)

```typescript
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;     // Editable field
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;  // Key field for edit tracking
}
```

### Edit Validation Rules

**Text Posts**:
- Content must not be empty
- Content must be trimmed of leading/trailing whitespace
- No maximum length enforced (matches current behavior)
- Validation errors displayed inline below textarea

**Audio Posts**:
- Only `content` field is editable
- `audio_url`, `audio_filename`, and other audio fields are immutable
- **Content CAN be empty** (captions are optional for audio posts)
- No validation error for empty caption

**Comments**:
- Content must not be empty
- Content must not exceed 1000 characters
- Content must be trimmed
- Validation errors displayed inline below textarea

## Error Handling

### Client-Side Validation Errors

**Empty Content (Text Posts and Comments)**:
```typescript
{
  type: 'validation',
  message: 'Content cannot be empty',
  field: 'content',
  display: 'inline' // Show below input field
}
```

**Empty Caption (Audio Posts)** - No Error:
```typescript
// Audio posts allow empty captions - no validation error
```

**Character Limit Exceeded**:
```typescript
{
  type: 'validation',
  message: 'Comment exceeds 1000 character limit',
  field: 'content',
  display: 'inline' // Show below input field
}
```

### Server-Side Errors

**Authorization Error** (RLS policy violation):
```typescript
{
  type: 'authorization',
  message: 'You do not have permission to edit this content',
  code: 'PGRST301'
}
```

**Network Error**:
```typescript
{
  type: 'network',
  message: 'Failed to save changes. Please check your connection.',
  retryable: true
}
```

### Error Display Strategy

1. **Inline Validation Errors**: Show validation errors directly below the edit field in red text
   - Empty content errors
   - Character limit errors
   - Clear, actionable messaging
2. **Toast Notifications**: Show success/failure messages after save attempt
   - Success: "Post updated successfully" or "Comment updated successfully"
   - Failure: Network errors or server errors
   - Auto-dismiss after 3-5 seconds
   - Manual dismiss option with close button
3. **Preserve Content**: Keep edited content in state on error for retry
4. **Retry Option**: Provide "Try Again" button for network errors

### Toast Notification System

**Component**: `Toast` or use existing notification system

**Props**:
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number; // milliseconds, default 3000
  onDismiss?: () => void;
}
```

**Implementation**:
- Position: Fixed at top-right or bottom-center
- Animation: Slide in from side, fade out on dismiss
- Accessibility: ARIA live region for screen reader announcements
- Queue: Support multiple toasts stacking vertically
- Auto-dismiss: Fade out after duration
- Manual dismiss: X button in corner

**Usage**:
```typescript
// After successful save
showToast({
  message: 'Post updated successfully',
  type: 'success',
  duration: 3000
});

// After failed save
showToast({
  message: 'Failed to save changes. Please try again.',
  type: 'error',
  duration: 5000
});
```

## Testing Strategy

### Unit Tests

**Component Tests**:
- EditablePost component renders correctly
- Edit mode toggles properly
- Save button is disabled when content is empty
- Cancel button restores original content
- EditedBadge only shows when timestamps differ

**Utility Function Tests**:
- `updatePost()` validates empty content
- `updateComment()` enforces character limit
- Proper error handling for network failures

### Integration Tests

**Post Editing Flow**:
1. User clicks "Edit" on their post
2. Content becomes editable
3. User modifies content
4. User clicks "Save"
5. Database updates successfully
6. "Edited" badge appears
7. Other users see updated content

**Comment Editing Flow**:
1. User clicks "Edit" on their comment
2. Inline editor appears
3. User modifies content
4. User clicks "Save"
5. Database updates successfully
6. "Edited" badge appears
7. Real-time update propagates to other users

**Authorization Tests**:
- User cannot edit another user's post
- User cannot edit another user's comment
- Unauthenticated users see no edit buttons
- RLS policies block unauthorized updates

### End-to-End Tests

**Scenario 1: Edit Text Post**
- Create text post
- Edit content
- Verify "Edited" badge appears
- Verify content persists after page refresh

**Scenario 2: Edit Audio Post Caption**
- Create audio post with caption
- Edit caption only
- Verify audio file remains unchanged
- Verify "Edited" badge appears

**Scenario 3: Edit Comment**
- Create comment on post
- Edit comment content
- Verify real-time update
- Verify "Edited" badge appears

**Scenario 4: Validation Errors**
- Attempt to save empty content
- Verify error message displays
- Verify content is not saved

**Scenario 5: Concurrent Edits**
- User A edits their post
- User B views the post
- User A saves changes
- Verify User B sees updated content (via real-time or refresh)

## Security Considerations

### Row Level Security (RLS)

**Existing RLS Policies** (already in place):
```sql
-- Posts: Users can update their own posts
CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE USING (auth.uid() = user_id);

-- Comments: Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
FOR UPDATE USING (auth.uid() = user_id);
```

These policies automatically enforce authorization at the database level.

### Input Sanitization

**XSS Prevention**:
- All user input is sanitized before display
- React automatically escapes content in JSX
- No `dangerouslySetInnerHTML` used for user content

**SQL Injection Prevention**:
- Supabase client uses parameterized queries
- No raw SQL with user input

### Content Validation

**Client-Side** (UX):
- Immediate feedback on validation errors
- Character counters for length limits
- Trim whitespace before submission

**Server-Side** (Security):
- Database constraints enforce NOT NULL on content
- RLS policies enforce ownership
- Triggers auto-update timestamps

## Performance Considerations

### Optimistic Updates

For comments, implement optimistic UI updates:
```typescript
// Update UI immediately
setComments(prev => prev.map(c => 
  c.id === commentId ? { ...c, content: newContent } : c
));

// Then update database
const result = await updateComment(commentId, newContent, userId);

// Rollback on error
if (!result.success) {
  setComments(prev => prev.map(c => 
    c.id === commentId ? { ...c, content: originalContent } : c
  ));
}
```

### Database Indexing

Existing indexes support edit operations:
- `posts.id` (primary key) - fast lookups for updates
- `comments.id` (primary key) - fast lookups for updates
- `posts.user_id` - RLS policy enforcement
- `comments.user_id` - RLS policy enforcement

### Caching Strategy

**Invalidate Cache on Edit**:
- Clear post cache entry after successful update
- Trigger re-fetch for affected queries
- Update local state immediately for instant feedback

## Implementation Notes

### Existing Code to Leverage

1. **Comment Component**: Already exists, needs edit mode added
2. **Post Display Components**: Need edit functionality integrated
3. **Supabase Client**: Already configured with RLS
4. **Real-time Subscriptions**: Already set up for comments

### New Code Required

1. **EditablePost Component**: New wrapper or enhancement
2. **EditableComment Component**: Enhancement to existing Comment component
3. **EditedBadge Component**: New shared component
4. **Update Utility Functions**: New functions in utils
5. **Database Migration**: Trigger for posts.updated_at

### Mobile Considerations

- Edit buttons must be touch-friendly (44px minimum)
- Textarea must be responsive and properly sized
- Keyboard should auto-focus when entering edit mode
- Save/Cancel buttons should be easily tappable
- Error messages should be clearly visible on small screens

### Accessibility

- Edit buttons have proper ARIA labels
- Edit mode announces state change to screen readers
- Error messages are associated with form fields
- Keyboard navigation works for all edit controls
- Focus management when entering/exiting edit mode

## Migration Plan

### Phase 1: Database Setup
1. Create migration for posts.updated_at trigger
2. Verify comments.updated_at trigger exists
3. Test triggers in development

### Phase 2: Core Functionality
1. Implement update utility functions
2. Create EditedBadge component
3. Add edit mode to post components
4. Add edit mode to comment components

### Phase 3: Polish & Testing
1. Add validation and error handling
2. Implement optimistic updates
3. Add unsaved changes warning
4. Write unit and integration tests

### Phase 4: Deployment
1. Run database migration in production
2. Deploy frontend changes
3. Monitor for errors
4. Gather user feedback

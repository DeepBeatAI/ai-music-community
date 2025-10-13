# EditablePost Integration Guide

## Quick Start

Replace `PostItem` with `EditablePost` in your pages to enable editing functionality.

## Basic Integration

### Before:
```typescript
import PostItem from '@/components/PostItem';

<PostItem
  post={post}
  currentUserId={user?.id}
  onDelete={handleDelete}
  showWaveform={true}
/>
```

### After:
```typescript
import EditablePost from '@/components/EditablePost';

<EditablePost
  post={post}
  currentUserId={user?.id}
  onDelete={handleDelete}
  showWaveform={true}
  onUpdate={handlePostUpdate}
/>
```

## Props

### EditablePost Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `post` | `Post` | Yes | The post object to display/edit |
| `currentUserId` | `string` | No | Current user's ID for ownership check |
| `onDelete` | `(postId: string) => void` | No | Callback when post is deleted |
| `showWaveform` | `boolean` | No | Show waveform for audio posts (default: true) |
| `onUpdate` | `(postId: string, newContent: string) => void` | No | Callback when post is updated |

## Implementation Examples

### Example 1: Dashboard Page

```typescript
// client/src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import EditablePost from '@/components/EditablePost';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);

  const handlePostUpdate = async (postId: string, newContent: string) => {
    // Option 1: Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, content: newContent, updated_at: new Date().toISOString() }
        : p
    ));

    // Option 2: Refetch from server
    // await fetchPosts();
  };

  const handlePostDelete = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <EditablePost
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      ))}
    </div>
  );
}
```

### Example 2: Discover Page

```typescript
// client/src/app/discover/page.tsx
'use client';

import EditablePost from '@/components/EditablePost';
import { useAuth } from '@/contexts/AuthContext';

export default function DiscoverPage() {
  const { user } = useAuth();
  const [trendingPosts, setTrendingPosts] = useState([]);

  const handlePostUpdate = (postId: string, newContent: string) => {
    // Update local state
    setTrendingPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, content: newContent, updated_at: new Date().toISOString() }
        : p
    ));
  };

  return (
    <div className="space-y-4">
      {trendingPosts.map(post => (
        <EditablePost
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onUpdate={handlePostUpdate}
        />
      ))}
    </div>
  );
}
```

### Example 3: Profile Page

```typescript
// client/src/app/profile/page.tsx
'use client';

import EditablePost from '@/components/EditablePost';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [userPosts, setUserPosts] = useState([]);

  const handlePostUpdate = (postId: string, newContent: string) => {
    setUserPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, content: newContent, updated_at: new Date().toISOString() }
        : p
    ));
  };

  const handlePostDelete = async (postId: string) => {
    // Delete from database
    await supabase.from('posts').delete().eq('id', postId);
    
    // Update local state
    setUserPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="space-y-4">
      {userPosts.map(post => (
        <EditablePost
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      ))}
    </div>
  );
}
```

## Update Strategies

### Strategy 1: Optimistic Updates (Recommended)
Update local state immediately for instant feedback:

```typescript
const handlePostUpdate = (postId: string, newContent: string) => {
  setPosts(prev => prev.map(p => 
    p.id === postId 
      ? { ...p, content: newContent, updated_at: new Date().toISOString() }
      : p
  ));
};
```

**Pros:**
- Instant UI feedback
- Better user experience
- No loading states

**Cons:**
- May show stale data if save fails
- Requires error handling

### Strategy 2: Server Refetch
Refetch data from server after update:

```typescript
const handlePostUpdate = async (postId: string, newContent: string) => {
  await fetchPosts(); // Refetch all posts
};
```

**Pros:**
- Always shows accurate data
- Simpler error handling

**Cons:**
- Slower user experience
- More database queries
- Loading states required

### Strategy 3: Hybrid Approach
Optimistic update with server validation:

```typescript
const handlePostUpdate = async (postId: string, newContent: string) => {
  // Optimistic update
  setPosts(prev => prev.map(p => 
    p.id === postId 
      ? { ...p, content: newContent, updated_at: new Date().toISOString() }
      : p
  ));

  // Validate with server in background
  try {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    
    if (data) {
      // Update with server data if different
      setPosts(prev => prev.map(p => p.id === postId ? data : p));
    }
  } catch (error) {
    console.error('Failed to validate update:', error);
  }
};
```

## Migration Checklist

- [ ] Import `EditablePost` instead of `PostItem`
- [ ] Add `onUpdate` callback handler
- [ ] Implement update strategy (optimistic/refetch/hybrid)
- [ ] Test edit functionality with owner account
- [ ] Test view-only mode with non-owner account
- [ ] Test audio post caption editing
- [ ] Test error handling (network errors, empty content)
- [ ] Test unsaved changes warning
- [ ] Verify EditedBadge appears after edits

## Common Issues

### Issue 1: Edit button not showing
**Cause:** `currentUserId` doesn't match `post.user_id`
**Solution:** Ensure you're passing the correct user ID

### Issue 2: Save fails silently
**Cause:** Missing `onUpdate` callback
**Solution:** Add `onUpdate` prop to handle updates

### Issue 3: EditedBadge not showing
**Cause:** Post missing `updated_at` field
**Solution:** Ensure your query includes `updated_at` field

### Issue 4: Audio preview not working in edit mode
**Expected:** Audio is intentionally disabled during editing
**Solution:** This is by design - audio preview is disabled in edit mode

## Testing

### Manual Testing Steps:

1. **Owner View:**
   - [ ] Edit button visible
   - [ ] Click edit button enters edit mode
   - [ ] Content is editable
   - [ ] Save button works
   - [ ] Cancel button works
   - [ ] Unsaved changes warning appears

2. **Non-Owner View:**
   - [ ] Edit button not visible
   - [ ] Post is read-only

3. **Audio Posts:**
   - [ ] Caption-only message appears
   - [ ] Audio file cannot be changed
   - [ ] Caption can be edited

4. **Error Handling:**
   - [ ] Empty content shows error
   - [ ] Network errors show retry button
   - [ ] Content preserved on error

5. **EditedBadge:**
   - [ ] Badge appears after edit
   - [ ] Badge shows correct timestamp
   - [ ] Badge not shown for new posts

## Performance Considerations

- Component uses local state for instant feedback
- Minimal re-renders with proper state management
- Optimistic updates reduce perceived latency
- No unnecessary API calls

## Accessibility

- All buttons have proper ARIA labels
- Keyboard navigation supported
- Focus management in edit mode
- Screen reader friendly

## Next Steps

1. Choose pages to integrate EditablePost
2. Implement update handlers
3. Test with real user accounts
4. Monitor for errors in production
5. Gather user feedback

## Support

For issues or questions:
- Check the completion document: `TASK_4_COMPLETION.md`
- Review the visual examples: `EditablePost.visual.example.tsx`
- Test with the example implementations above

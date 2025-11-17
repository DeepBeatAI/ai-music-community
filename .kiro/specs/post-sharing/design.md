# Post Sharing Feature - Design Document

## Overview

This feature enables users to share individual posts from the community board through two mechanisms:
1. **Copy URL**: Direct clipboard copy of the post URL for manual sharing
2. **Web Share API**: Native device sharing functionality (with clipboard fallback)

Each post will have a dedicated detail page accessible via `/posts/[postId]` that displays the full post content with the same functionality as the dashboard view, including comments, likes, and interactions.

## Architecture

### URL Structure

```
/posts/[postId]  - Individual post detail page
```

**Example URLs:**
- `/posts/550e8400-e29b-41d4-a716-446655440000`
- `/posts/7c9e6679-7425-40de-944b-e07fc1f90ae7`

### Component Hierarchy

```
app/
├── posts/
│   └── [postId]/
│       └── page.tsx          # Post detail page (Server Component)
│
components/
├── PostItem.tsx              # Existing component (updated with share buttons)
├── posts/
│   ├── PostShareButtons.tsx  # New: Share and Copy URL buttons
│   └── PostDetailView.tsx    # New: Post detail page wrapper
│
utils/
└── posts.ts                  # Updated with fetchPostById function
```

## Components and Interfaces

### 1. PostShareButtons Component

**Purpose**: Provides "Copy post url" and "Share post" buttons with proper functionality

**Location**: `client/src/components/posts/PostShareButtons.tsx`

**Props Interface**:
```typescript
interface PostShareButtonsProps {
  postId: string;
  postContent: string;
  username: string;
  postType: 'text' | 'audio';
  trackTitle?: string;
}
```

**Functionality**:
- Copy URL button: Copies post URL to clipboard
- Share button: Uses Web Share API with fallback to clipboard
- Toast notifications for success/error states
- Manual copy modal for clipboard API failures

**Design Decisions**:
- Separate component for reusability and testing
- Handles all share-related logic internally
- Uses existing toast context for notifications
- Graceful degradation for unsupported browsers

### 2. PostDetailView Component

**Purpose**: Wrapper component for the post detail page with navigation and error handling

**Location**: `client/src/components/posts/PostDetailView.tsx`

**Props Interface**:
```typescript
interface PostDetailViewProps {
  post: Post;
  currentUserId?: string;
}
```

**Features**:
- "Back to Dashboard" navigation link
- Breadcrumb navigation
- Error boundary integration
- Loading state management
- SEO metadata generation

### 3. Post Detail Page

**Purpose**: Server Component that fetches and displays individual posts

**Location**: `client/src/app/posts/[postId]/page.tsx`

**Implementation**:
```typescript
export default async function PostDetailPage({
  params,
}: {
  params: { postId: string };
}) {
  // Server-side data fetching
  // Error handling (404, 403)
  // Metadata generation
  // Render PostDetailView
}
```

**Features**:
- Server-side rendering for SEO
- Dynamic metadata generation
- Proper error pages (404, 403)
- Authentication check
- RLS policy enforcement

### 4. Updated PostItem Component

**Purpose**: Integrate PostShareButtons into existing post footer

**Location**: `client/src/components/PostItem.tsx` (existing, to be updated)

**Changes**:
- Replace inactive "Share post" button with PostShareButtons component
- Position buttons correctly in post footer
- Maintain existing functionality (likes, comments, etc.)

## Data Models

### Post Data Structure (Existing)

```typescript
interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  content: string;
  user_id: string;
  post_type: 'text' | 'audio';
  track_id?: string;
  track?: Track;
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  like_count?: number;
  liked_by_user?: boolean;
}
```

### New Utility Function

```typescript
/**
 * Fetch a single post by ID with all related data
 */
export async function fetchPostById(
  postId: string,
  userId?: string
): Promise<Post | null> {
  // Fetch post with user profile and track data
  // Add like count and user like status
  // Return null if not found
}
```

## Error Handling

### Error States

1. **Post Not Found (404)**
   - Display: "Post not found"
   - Action: Link back to dashboard
   - Cause: Invalid postId or deleted post

2. **Access Denied (403)**
   - Display: "You don't have permission to view this post"
   - Action: Link to login or dashboard
   - Cause: RLS policy rejection

3. **Network Error**
   - Display: "Failed to load post"
   - Action: Retry button
   - Cause: Network failure or server error

4. **Clipboard API Failure**
   - Display: Manual copy modal
   - Action: Text input with URL for manual copy
   - Cause: Browser doesn't support clipboard API or permission denied

### Error Handling Strategy

```typescript
// Post detail page error handling
try {
  const post = await fetchPostById(postId, userId);
  if (!post) {
    return <NotFoundError />;
  }
  return <PostDetailView post={post} />;
} catch (error) {
  if (error.code === 'PGRST116') {
    return <NotFoundError />;
  }
  if (error.message.includes('permission')) {
    return <AccessDeniedError />;
  }
  return <NetworkError />;
}
```

## Testing Strategy

### Unit Tests

1. **PostShareButtons Component**
   - Test clipboard copy success
   - Test clipboard copy failure (manual modal)
   - Test Web Share API success
   - Test Web Share API fallback
   - Test toast notifications

2. **fetchPostById Function**
   - Test successful post fetch
   - Test post not found
   - Test with/without user authentication
   - Test like count calculation
   - Test track data joining

### Integration Tests

1. **Post Detail Page**
   - Test page renders with valid postId
   - Test 404 page for invalid postId
   - Test authentication flow
   - Test navigation back to dashboard
   - Test share buttons functionality

2. **PostItem Integration**
   - Test share buttons appear in post footer
   - Test button positioning
   - Test interaction with other post actions

### Manual Testing Checklist

- [ ] Copy URL button copies correct URL
- [ ] Share button opens native share dialog (mobile)
- [ ] Share button falls back to clipboard (desktop)
- [ ] Manual copy modal appears when clipboard fails
- [ ] Post detail page displays correctly
- [ ] Back navigation works
- [ ] 404 page displays for invalid posts
- [ ] SEO metadata is correct
- [ ] Shared links work when opened in new tab
- [ ] Authentication is properly enforced

## SEO and Metadata

### Open Graph Tags

```typescript
export async function generateMetadata({
  params,
}: {
  params: { postId: string };
}): Promise<Metadata> {
  const post = await fetchPostById(params.postId);
  
  if (!post) {
    return {
      title: 'Post Not Found - AI Music Community',
    };
  }
  
  const username = post.user_profiles?.username || 'Anonymous';
  const title = post.post_type === 'audio' && post.track?.title
    ? `${username}'s post: ${post.track.title}`
    : `${username}'s post`;
  
  const description = post.content
    ? post.content.substring(0, 160)
    : 'Check out this post on AI Music Community';
  
  return {
    title: `${title} - AI Music Community`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.created_at,
      authors: [username],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
```

### SEO Considerations

- Server-side rendering for crawler accessibility
- Dynamic metadata based on post content
- Proper HTTP status codes (404, 403)
- Canonical URLs
- Structured data for rich snippets (future enhancement)

## Performance Considerations

### Loading Strategy

1. **Server-Side Rendering**
   - Initial page load is server-rendered
   - Faster first contentful paint
   - Better SEO

2. **Client-Side Interactions**
   - Share buttons use client-side APIs
   - Comments load on demand
   - Optimistic UI updates for likes

3. **Caching**
   - Browser caching for static assets
   - No aggressive caching for post content (ensure freshness)
   - Cache share button state in memory

### Performance Targets

- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- Share button response: < 100ms
- Clipboard copy: < 50ms

## Security Considerations

### Access Control

1. **RLS Policies**
   - Reuse existing posts table RLS policies
   - No additional database changes needed
   - Server-side enforcement

2. **Authentication**
   - Public posts viewable without auth
   - Private posts require authentication
   - Owner-only actions (edit/delete) enforced

3. **Input Validation**
   - Validate postId format (UUID)
   - Sanitize post content for XSS
   - Rate limiting on share actions (future)

### Security Best Practices

- Use Next.js built-in CSRF protection
- Sanitize user-generated content
- Validate all inputs on server-side
- Use HTTPS for all requests
- Implement proper error messages (no info leakage)

## Implementation Notes

### Browser Compatibility

**Web Share API Support**:
- Chrome/Edge: ✅ (Desktop & Mobile)
- Safari: ✅ (iOS only)
- Firefox: ❌ (Desktop), ✅ (Android)

**Fallback Strategy**:
- Desktop browsers without Web Share API: Copy to clipboard
- Mobile browsers: Prefer Web Share API
- Clipboard API unavailable: Manual copy modal

### Accessibility

- Proper ARIA labels for share buttons
- Keyboard navigation support
- Screen reader announcements for actions
- Focus management for modals
- High contrast mode support

### Mobile Considerations

- Touch-friendly button sizes (min 44x44px)
- Native share sheet on mobile
- Responsive layout for post detail page
- Optimized for slow connections

## Future Enhancements

1. **Share Analytics**
   - Track share counts per post
   - Display share count badge
   - Analytics dashboard for creators

2. **Custom Share Messages**
   - Allow users to customize share text
   - Template system for share messages
   - Preview before sharing

3. **Additional Share Targets**
   - Direct share to Twitter, Facebook, etc.
   - Email share option
   - QR code generation

4. **Embed Support**
   - Embeddable post widgets
   - oEmbed protocol support
   - Customizable embed styles

## Design Decisions and Rationale

### Why Server Components for Post Detail Page?

- **SEO**: Crawlers can index post content
- **Performance**: Faster initial load
- **Security**: Server-side RLS enforcement
- **Simplicity**: No client-side data fetching complexity

### Why Separate PostShareButtons Component?

- **Reusability**: Can be used in other contexts
- **Testability**: Easier to unit test
- **Maintainability**: Isolated share logic
- **Performance**: Can be lazy-loaded if needed

### Why Web Share API with Clipboard Fallback?

- **User Experience**: Native share is more intuitive on mobile
- **Compatibility**: Clipboard works everywhere
- **Progressive Enhancement**: Best experience for capable browsers
- **Accessibility**: Native share dialogs are accessible

### Why No Database Changes?

- **Simplicity**: Leverage existing RLS policies
- **Performance**: No migration overhead
- **Maintainability**: Less code to maintain
- **Risk**: Lower risk of breaking existing functionality

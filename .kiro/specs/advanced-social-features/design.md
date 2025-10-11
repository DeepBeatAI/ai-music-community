# Design Document

## Overview

This design document outlines the architecture and implementation approach for three major feature enhancements to the AI Music Community Platform:

1. **Comments System**: A threaded commenting system with nested replies, real-time updates, and optimistic UI
2. **Performance Optimization**: Database indexing, query optimization, and caching strategies
3. **Analytics Dashboard**: Basic metrics dashboard for tracking platform engagement

These features build upon the existing architecture using Next.js 15.4.3, React 19.1.0, Supabase (PostgreSQL + Realtime), and TypeScript in strict mode.

## Architecture

### System Context

The platform follows a modern JAMstack architecture:
- **Frontend**: Next.js App Router with React Server Components and Client Components
- **Backend**: Supabase (PostgreSQL database, Authentication, Realtime subscriptions, Storage)
- **State Management**: React Context for auth, local state for UI, Supabase Realtime for live data
- **Styling**: Tailwind CSS v4 with utility-first approach

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js App Router (React 19)                         │ │
│  │  ├─ PostItem Component (existing)                      │ │
│  │  ├─ Comment Component (new)                            │ │
│  │  ├─ CommentList Component (new)                        │ │
│  │  └─ Analytics Dashboard (new)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State Management                                       │ │
│  │  ├─ React Context (Auth)                               │ │
│  │  ├─ Local State (UI interactions)                      │ │
│  │  └─ Optimistic Updates (Comments CRUD)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  ├─ comments table (new)                               │ │
│  │  ├─ posts table (existing)                             │ │
│  │  ├─ user_profiles table (existing)                     │ │
│  │  ├─ Performance indexes (new)                          │ │
│  │  └─ RLS Policies                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Realtime Engine                                        │ │
│  │  └─ Comments subscriptions (new)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Comments System Components

#### Comment Component (`client/src/components/Comment.tsx`)

**Purpose**: Display individual comments with nested replies, user info, and action buttons.

**Props Interface**:
```typescript
interface CommentProps {
  comment: CommentWithProfile;
  postId: string;
  currentUserId?: string;
  onReply?: (parentId: string) => void;
  onDelete?: (commentId: string) => void;
  depth?: number; // Track nesting level (max 3)
}
```

**Key Features**:
- Recursive rendering for nested replies
- Delete button (owner only)
- Reply button (authenticated users)
- Timestamp and user avatar
- Optimistic delete with rollback
- Mobile-responsive with proper indentation

**Component Structure**:
```typescript
export function Comment({ comment, postId, currentUserId, onReply, onDelete, depth = 0 }: CommentProps) {
  // State for optimistic updates
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Handlers
  const handleDelete = async () => { /* Optimistic delete */ };
  const handleReply = () => { /* Trigger reply form */ };
  
  return (
    <div className={`comment-container depth-${depth}`}>
      {/* Comment header with user info */}
      {/* Comment content */}
      {/* Action buttons (reply, delete) */}
      {/* Nested replies (recursive) */}
    </div>
  );
}
```

#### CommentList Component (`client/src/components/CommentList.tsx`)

**Purpose**: Manage the list of comments for a post, handle real-time updates, and provide comment creation form.

**Props Interface**:
```typescript
interface CommentListProps {
  postId: string;
  currentUserId?: string;
  initialComments?: CommentWithProfile[];
}
```

**Key Features**:
- Fetch and display comments
- Real-time subscription to new comments
- Comment creation form
- Pagination (load more)
- Optimistic UI for new comments
- Error handling and loading states

#### Integration with PostItem

**Modification to `client/src/components/PostItem.tsx`**:
- Add comment count display
- Add "Show Comments" toggle button
- Conditionally render CommentList component
- Update comment count in real-time



### 2. Performance Optimization Components

#### Database Indexes

**Strategy**: Add indexes to frequently queried columns to improve query performance.

**New Indexes**:
```sql
-- Posts queries (feed, user profile)
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);

-- Comments queries (by post, by user)
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);

-- User stats queries (leaderboards, discovery)
CREATE INDEX idx_user_stats_followers ON user_stats(followers_count DESC);

-- Notifications queries (unread notifications)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
```

**Impact**: 30-50% improvement in query performance for common operations.

#### Query Optimization Utility (`client/src/utils/queryCache.ts`)

**Purpose**: Implement client-side caching for frequently accessed data.

**Interface**:
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>>;
  
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  invalidate(key: string): void;
  clear(): void;
}

export const queryCache = new QueryCache();
```

**Usage Pattern**:
```typescript
// Check cache first
const cached = queryCache.get(`comments-${postId}`);
if (cached) return cached;

// Fetch from database
const { data } = await supabase.from('comments').select('*').eq('post_id', postId);

// Cache the result
queryCache.set(`comments-${postId}`, data, 5 * 60 * 1000); // 5 minutes TTL
```

#### Comments Pagination

**Strategy**: Load comments in batches of 10 to reduce initial load time.

**Implementation**:
```typescript
const COMMENTS_PER_PAGE = 10;

async function fetchComments(postId: string, page: number = 0) {
  const from = page * COMMENTS_PER_PAGE;
  const to = from + COMMENTS_PER_PAGE - 1;
  
  const { data, error } = await supabase
    .from('comments')
    .select('*, user_profiles(*)')
    .eq('post_id', postId)
    .is('parent_comment_id', null) // Top-level comments only
    .order('created_at', { ascending: false })
    .range(from, to);
    
  return { data, error, hasMore: data?.length === COMMENTS_PER_PAGE };
}
```

### 3. Analytics Dashboard Components

#### Analytics Page (`client/src/app/analytics/page.tsx`)

**Purpose**: Display platform metrics and engagement statistics.

**Component Structure**:
```typescript
export default async function AnalyticsPage() {
  // Server-side data fetching
  const metrics = await fetchPlatformMetrics();
  
  return (
    <div className="analytics-dashboard">
      <MetricsGrid metrics={metrics} />
      <ActivityChart data={metrics.activityData} />
    </div>
  );
}
```

#### MetricsGrid Component

**Purpose**: Display key platform metrics in a grid layout.

**Metrics to Display**:
- Total Users
- Total Posts
- Total Comments
- Total Likes
- Active Users (last 7 days)
- Posts This Week

**Interface**:
```typescript
interface PlatformMetrics {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  activeUsers: number;
  postsThisWeek: number;
}
```

#### ActivityChart Component

**Purpose**: Visualize user activity over time using a simple chart library.

**Chart Library**: Use a lightweight library like `recharts` or implement a simple SVG-based chart.

**Data Structure**:
```typescript
interface ActivityDataPoint {
  date: string;
  posts: number;
  comments: number;
  users: number;
}
```

## Data Models

### Comments Table Schema

```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Relationships**:
- `post_id` → `posts.id` (many-to-one)
- `user_id` → `auth.users.id` (many-to-one)
- `parent_comment_id` → `comments.id` (self-referential, optional)

**Constraints**:
- Content length: 1-1000 characters
- Cascade delete: When post is deleted, all comments are deleted
- Cascade delete: When parent comment is deleted, all replies are deleted

### TypeScript Interfaces

```typescript
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentWithProfile extends Comment {
  user_profile: UserProfile;
  replies?: CommentWithProfile[];
  reply_count?: number;
}
```

### Analytics Data Model

**Option 1: Direct Queries** (Simpler, suitable for MVP)
```typescript
// Query counts directly from tables
const totalUsers = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
const totalPosts = await supabase.from('posts').select('*', { count: 'exact', head: true });
const totalComments = await supabase.from('comments').select('*', { count: 'exact', head: true });
```

**Option 2: Analytics Table** (Better performance for production)
```sql
CREATE TABLE performance_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Decision**: Use Option 1 for MVP, migrate to Option 2 if performance becomes an issue.

## Error Handling

### Client-Side Error Handling

**Strategy**: Graceful degradation with user-friendly error messages.

**Error Scenarios**:

1. **Comment Creation Failure**
   - Show error toast notification
   - Remove optimistic comment from UI
   - Allow user to retry

2. **Comment Deletion Failure**
   - Restore deleted comment in UI
   - Show error message
   - Log error for debugging

3. **Real-time Connection Failure**
   - Gracefully degrade to polling or manual refresh
   - Show connection status indicator
   - Attempt reconnection

4. **Analytics Data Fetch Failure**
   - Show error state with retry button
   - Display cached data if available
   - Log error for monitoring

**Error Handling Pattern**:
```typescript
try {
  const { data, error } = await supabase.from('comments').insert(newComment);
  
  if (error) throw error;
  
  // Success handling
} catch (error) {
  console.error('Failed to create comment:', error);
  
  // Rollback optimistic update
  setComments(prevComments => prevComments.filter(c => c.id !== optimisticId));
  
  // Show user-friendly error
  showToast('Failed to post comment. Please try again.', 'error');
}
```

### Database-Level Error Prevention

**RLS Policies**: Prevent unauthorized access at the database level.

```sql
-- Prevent users from deleting others' comments
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- Prevent users from creating comments as other users
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Input Validation**: Enforce constraints at the database level.

```sql
-- Content length validation
CHECK (length(content) >= 1 AND length(content) <= 1000)

-- Prevent self-referential loops (comment replying to itself)
CHECK (parent_comment_id IS NULL OR parent_comment_id != id)
```



## Testing Strategy

### Unit Testing

**Components to Test**:
1. Comment Component
   - Renders comment data correctly
   - Shows delete button only for owner
   - Shows reply button for authenticated users
   - Handles nested replies correctly
   - Respects max depth limit

2. CommentList Component
   - Fetches and displays comments
   - Handles pagination correctly
   - Creates new comments
   - Updates on real-time events

3. Query Cache Utility
   - Stores and retrieves cached data
   - Respects TTL expiration
   - Invalidates cache correctly

**Testing Framework**: Jest + React Testing Library

**Example Test**:
```typescript
describe('Comment Component', () => {
  it('should show delete button for comment owner', () => {
    const comment = createMockComment({ user_id: 'user-123' });
    render(<Comment comment={comment} currentUserId="user-123" />);
    
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
  
  it('should not show delete button for non-owner', () => {
    const comment = createMockComment({ user_id: 'user-123' });
    render(<Comment comment={comment} currentUserId="user-456" />);
    
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
```

### Integration Testing

**Scenarios to Test**:
1. **Comment Creation Flow**
   - User creates comment
   - Comment appears in UI immediately (optimistic)
   - Comment persists in database
   - Other users see the comment in real-time

2. **Comment Deletion Flow**
   - User deletes comment
   - Comment removed from UI immediately
   - Comment removed from database
   - Nested replies are also deleted

3. **Real-time Updates**
   - User A creates comment
   - User B sees comment appear without refresh
   - Comment count updates for both users

4. **Performance Optimization**
   - Queries use indexes (check EXPLAIN ANALYZE)
   - Cache reduces database calls
   - Pagination loads incrementally

### Manual Testing Checklist

**Comments System**:
- [ ] Create top-level comment
- [ ] Reply to comment (nested)
- [ ] Reply to reply (2 levels deep)
- [ ] Test max depth limit (3 levels)
- [ ] Delete own comment
- [ ] Verify cannot delete others' comments
- [ ] Test character limit (1000 chars)
- [ ] Test real-time updates (two browsers)
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation
- [ ] Test screen reader accessibility

**Performance**:
- [ ] Verify query performance improvement
- [ ] Test cache hit/miss scenarios
- [ ] Test pagination (load more)
- [ ] Test with slow network (throttling)
- [ ] Run Lighthouse performance audit

**Analytics**:
- [ ] Dashboard loads for authenticated users
- [ ] Metrics display correctly
- [ ] Chart renders properly
- [ ] Test on mobile devices
- [ ] Verify access control (unauthenticated users)

### Performance Testing

**Metrics to Track**:
- Page load time (target: < 3 seconds)
- Time to Interactive (target: < 2 seconds)
- Database query time (target: < 100ms)
- Comment creation latency (target: < 500ms)
- Real-time update latency (target: < 1 second)

**Tools**:
- Chrome DevTools Performance tab
- Lighthouse CI
- Supabase Dashboard (query performance)
- Network throttling (simulate slow connections)

## Security Considerations

### Row Level Security (RLS) Policies

**Comments Table Policies**:

```sql
-- Anyone can view comments
CREATE POLICY "Comments are viewable by everyone"
ON comments FOR SELECT
USING (true);

-- Authenticated users can create comments
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);
```

**Rationale**:
- Public read access enables non-authenticated users to view discussions
- Write operations require authentication to prevent spam
- Users can only modify/delete their own content

### Input Validation and Sanitization

**Client-Side Validation**:
```typescript
function validateCommentContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty' };
  }
  
  if (content.length > 1000) {
    return { valid: false, error: 'Comment must be 1000 characters or less' };
  }
  
  return { valid: true };
}
```

**Database-Level Validation**:
```sql
-- Enforce content length at database level
CHECK (length(content) >= 1 AND length(content) <= 1000)
```

**XSS Prevention**:
- React automatically escapes content by default
- Avoid using `dangerouslySetInnerHTML`
- Sanitize any user-generated HTML if needed (use DOMPurify)

### Rate Limiting Considerations

**Supabase Built-in Rate Limiting**:
- API requests: Limited by Supabase plan
- Realtime connections: Limited by concurrent connections

**Application-Level Rate Limiting** (Future Enhancement):
```typescript
// Implement client-side debouncing for comment creation
const debouncedCreateComment = debounce(createComment, 1000);
```

### Authentication and Authorization

**Protected Routes**:
```typescript
// Analytics page - require authentication
export default async function AnalyticsPage() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Render dashboard
}
```

**Component-Level Auth Checks**:
```typescript
// Show reply button only for authenticated users
{currentUserId && (
  <button onClick={handleReply}>Reply</button>
)}
```

## Deployment Considerations

### Database Migrations

**Migration Files**:
1. `[timestamp]_create_comments_table.sql` - Comments table and RLS policies
2. `[timestamp]_add_performance_indexes.sql` - Performance indexes

**Migration Process**:
```bash
# Local development
supabase migration up

# Production (via Supabase Dashboard or CLI)
supabase db push
```

**Rollback Strategy**:
- Keep migration files in version control
- Test migrations in staging environment first
- Have rollback SQL ready for each migration

### Environment Variables

**Required Variables**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**No New Variables Required**: This feature uses existing Supabase configuration.

### Vercel Deployment

**Build Process**:
```bash
npm run build
```

**Deployment Checklist**:
- [ ] Run TypeScript type check (`tsc --noEmit`)
- [ ] Run tests (`npm test`)
- [ ] Apply database migrations
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Verify real-time subscriptions work
- [ ] Monitor error logs

### Performance Monitoring

**Metrics to Monitor**:
- Database query performance (Supabase Dashboard)
- API response times
- Real-time connection stability
- Error rates
- User engagement (comments per post, active users)

**Tools**:
- Supabase Dashboard (database metrics)
- Vercel Analytics (page performance)
- Browser DevTools (client-side performance)

## Alternative Approaches Considered

### Comments System Alternatives

**Alternative 1: Third-Party Service (e.g., Disqus, Commento)**
- **Pros**: Quick to implement, managed infrastructure
- **Cons**: Less control, potential privacy concerns, additional cost
- **Decision**: Build in-house for full control and integration with existing auth

**Alternative 2: Flat Comment Structure (No Nesting)**
- **Pros**: Simpler implementation, easier to paginate
- **Cons**: Less organized discussions, harder to follow conversations
- **Decision**: Implement nested comments for better UX, limit depth to 3 levels

### Caching Alternatives

**Alternative 1: Redis Cache**
- **Pros**: Centralized cache, shared across users
- **Cons**: Additional infrastructure, cost, complexity
- **Decision**: Use client-side cache for MVP, consider Redis for production scale

**Alternative 2: React Query / SWR**
- **Pros**: Built-in caching, revalidation, and state management
- **Cons**: Additional dependency, learning curve
- **Decision**: Implement simple custom cache for MVP, consider migration later

### Analytics Alternatives

**Alternative 1: Third-Party Analytics (e.g., Google Analytics, Mixpanel)**
- **Pros**: Rich features, visualization tools
- **Cons**: Privacy concerns, additional cost, external dependency
- **Decision**: Build basic in-house analytics for MVP, integrate third-party later if needed

**Alternative 2: Dedicated Analytics Database**
- **Pros**: Better performance for complex queries
- **Cons**: Additional infrastructure, data synchronization complexity
- **Decision**: Query directly from main database for MVP, optimize later if needed

## Implementation Phases

### Phase 1: Comments Database and Types (Day 1, Task 1)
- Create comments table migration
- Add RLS policies
- Define TypeScript interfaces
- Apply migration and verify

### Phase 2: Comment Components (Day 1, Task 2-3)
- Build Comment component
- Build CommentList component
- Implement optimistic UI
- Add real-time subscriptions

### Phase 3: Integration with Posts (Day 2, Task 1)
- Update PostItem component
- Add comment count display
- Add "Show Comments" toggle
- Test end-to-end flow

### Phase 4: Performance Optimization (Day 2, Task 2)
- Create performance indexes migration
- Implement query cache utility
- Add comments pagination
- Measure performance improvements

### Phase 5: Analytics Dashboard (Day 2, Task 3)
- Create analytics page
- Fetch platform metrics
- Build metrics grid component
- Add activity chart

### Phase 6: Testing and Documentation (Day 3)
- Write unit tests
- Perform integration testing
- Update documentation
- Security review
- Deploy to production

## Success Criteria

**Functional Requirements**:
- ✅ Users can create, view, and delete comments
- ✅ Nested replies work up to 3 levels deep
- ✅ Real-time updates work across sessions
- ✅ Analytics dashboard displays accurate metrics
- ✅ Performance indexes improve query speed

**Non-Functional Requirements**:
- ✅ No TypeScript errors
- ✅ All RLS policies enforced
- ✅ Mobile responsive design
- ✅ Accessible (ARIA labels, keyboard navigation)
- ✅ Page load time < 3 seconds
- ✅ Query performance < 100ms

**Quality Metrics**:
- ✅ Test coverage > 80% for new components
- ✅ Zero security vulnerabilities
- ✅ Lighthouse score > 80
- ✅ Zero console errors in production

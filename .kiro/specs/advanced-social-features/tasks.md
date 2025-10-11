# Implementation Plan

- [x] 1. Set up comments database schema and security

  - Create migration file for comments table with proper schema
  - Add RLS policies for secure comment operations (SELECT, INSERT, UPDATE, DELETE)
  - Create indexes for post_id, user_id, and parent_comment_id columns
  - Test RLS policies in Supabase SQL editor
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Create TypeScript type definitions for comments

  - Add Comment interface to client/src/types/index.ts
  - Add CommentWithProfile interface with user_profile join
  - Ensure types match database schema exactly

  - Run TypeScript type check to verify no errors
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Implement Comment component with nested replies

  - [x] 3.1 Create Comment component structure

    - Build component file at client/src/components/Comment.tsx
    - Implement props interface with comment data, postId, currentUserId, callbacks, and depth
    - Add component layout with user avatar, username, timestamp, and content
    - Implement mobile-responsive styling with Tailwind CSS
    - _Requirements: 1.4, 5.1, 5.2_

  - [x] 3.2 Add comment action buttons

    - Implement delete button (visible only to comment owner)
    - Implement reply button (visible only to authenticated users)
    - Add proper ARIA labels for accessibility
    - Ensure touch targets are at least 44px for mobile
    - _Requirements: 1.5, 1.6, 5.3, 5.6_

  - [x] 3.3 Implement recursive nested replies rendering

    - Add recursive rendering for comment replies
    - Implement depth tracking (max 3 levels)
    - Add proper indentation for nested comments
    - Ensure mobile-friendly indentation that doesn't overflow
    - _Requirements: 1.7, 1.8, 5.3_

  - [x] 3.4 Add optimistic delete functionality

    - Implement optimistic UI update for delete action
    - Add rollback mechanism if server delete fails
    - Display user-friendly error messages on failure
    - _Requirements: 1.9, 6.3, 6.4, 4.6_

- [x] 4. Build CommentList component with real-time updates

  - [x] 4.1 Create CommentList component structure

    - Build component file at client/src/components/CommentList.tsx
    - Implement props interface with postId, currentUserId, and initialComments
    - Set up state management for comments list
    - Add loading and error states
    - _Requirements: 1.1, 5.7_

  - [x] 4.2 Implement comment fetching with pagination

    - Create function to fetch comments from Supabase (10 per page)
    - Implement "Load More" button for pagination
    - Add loading indicator during fetch
    - Handle fetch errors gracefully
    - _Requirements: 1.12, 2.11_

  - [x] 4.3 Add comment creation form

    - Build textarea input with 1000 character limit
    - Add character counter display
    - Implement form validation
    - Add submit button (disabled when empty or over limit)
    - _Requirements: 1.2, 1.3, 4.7_

  - [x] 4.4 Implement optimistic comment creation

    - Add optimistic UI update when creating comment
    - Generate temporary ID for optimistic comment
    - Replace with server ID when confirmed
    - Rollback on server error with user notification
    - _Requirements: 6.1, 6.2, 4.6_

  - [x] 4.5 Set up Supabase Realtime subscription

    - Subscribe to comments table changes for the post
    - Handle INSERT events to add new comments
    - Handle DELETE events to remove comments
    - Implement graceful degradation if Realtime fails
    - _Requirements: 1.10, 6.5, 6.6, 6.7, 6.8_

- [x] 5. Integrate comments into PostItem component

  - [x] 5.1 Add comment count display

    - Query and display comment count for each post
    - Update count in real-time when comments change
    - Style count badge to match existing UI patterns
    - _Requirements: 1.11, 6.6_

  - [x] 5.2 Add "Show Comments" toggle button

    - Implement toggle button in post footer
    - Add state to track comments visibility
    - Style button to match existing interaction buttons
    - _Requirements: 1.1_

  - [x] 5.3 Conditionally render CommentList

    - Render CommentList when comments are toggled visible
    - Pass necessary props (postId, currentUserId)
    - Ensure proper spacing and layout
    - Test on mobile devices
    - _Requirements: 1.1, 5.1_

- [x] 6. Create performance optimization migration

  - [x] 6.1 Add database indexes for common queries

    - Create migration file for performance indexes
    - Add index on posts(created_at DESC)
    - Add composite index on posts(user_id, created_at DESC)
    - Add index on user_stats(followers_count DESC)
    - Add partial index on notifications(user_id, read) WHERE read = false
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

  - [x] 6.2 Test query performance improvements

    - Run EXPLAIN ANALYZE on key queries before and after
    - Document performance improvements
    - Verify indexes are being used by query planner
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

- [x] 7. Implement query caching utility

  - [x] 7.1 Create QueryCache class

    - Build utility file at client/src/utils/queryCache.ts
    - Implement cache storage with Map
    - Add get, set, invalidate, and clear methods
    - Implement TTL (time-to-live) expiration logic
    - _Requirements: 2.11, 2.12_

  - [x] 7.2 Integrate cache into comment queries

    - Wrap comment fetch calls with cache check
    - Set appropriate TTL for comment data (5 minutes)
    - Invalidate cache on comment create/delete
    - Test cache hit/miss scenarios
    - _Requirements: 2.11, 2.12_

- [x] 8. Build analytics dashboard

  - [x] 8.1 Create analytics page route

    - Create file at client/src/app/analytics/page.tsx
    - Implement authentication check (redirect if not logged in)
    - Set up page layout with proper spacing
    - Add page title and description
    - _Requirements: 3.1, 3.6_

  - [x] 8.2 Fetch platform metrics

    - Query total users count from user_profiles table
    - Query total posts count from posts table
    - Query total comments count from comments table
    - Implement error handling for failed queries
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 3.10_

  - [x] 8.3 Create MetricsGrid component

    - Build component to display metrics in grid layout
    - Show total users, posts, comments
    - Style cards to match existing UI design
    - Ensure mobile responsiveness
    - _Requirements: 3.2, 3.3, 3.4, 3.8_

  - [x] 8.4 Add activity chart visualization

    - Query user activity data over time
    - Implement simple chart using SVG or lightweight library
    - Display posts and comments over time
    - Ensure chart is responsive on mobile
    - _Requirements: 3.5, 3.8, 3.9_

- [-] 9. Comprehensive testing and validation

  - [x] 9.1 Test comments system functionality

    - Create top-level comment on post
    - Reply to existing comment (nested)
    - Test reply to reply (2 levels deep)
    - Verify max depth limit (3 levels)
    - Delete own comment and verify cascade delete of replies
    - Verify cannot delete other users' comments
    - Test 1000 character limit enforcement
    - Test real-time updates with two browser windows
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [x] 9.2 Test performance optimizations

    - Verify database queries use new indexes (EXPLAIN ANALYZE)
    - Test query cache hit/miss scenarios
    - Verify comments pagination loads correctly
    - Test performance with network throttling
    - Run Lighthouse performance audit (target score > 80)
    - _Requirements: 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

  - [x] 9.3 Test analytics dashboard

    - Verify dashboard loads for authenticated users
    - Verify redirect for unauthenticated users
    - Check metrics display accurate counts
    - Test chart renders correctly
    - Verify mobile responsiveness
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 9.4 Test mobile responsiveness and accessibility

    - Test all features on mobile viewport
    - Verify touch targets are at least 44px
    - Test keyboard navigation through comments
    - Verify ARIA labels with screen reader
    - Test loading states and error messages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 9.5 Run TypeScript and code quality checks

    - Run `tsc --noEmit` to verify no TypeScript errors
    - Run ESLint to check code quality
    - Fix any warnings or errors
    - Verify no console errors in browser
    - _Requirements: 4.3, 4.5_

- [x] 10. Update documentation

  - [x] 10.1 Update README with new features

    - Add comments system to features list
    - Document analytics dashboard access
    - Update technology stack section
    - _Requirements: 4.4, 4.5_

  - [x] 10.2 Add inline code comments

    - Document complex logic in Comment component
    - Explain recursive rendering approach
    - Document cache invalidation strategy
    - Add JSDoc comments for public functions
    - _Requirements: 4.4_

  - [x] 10.3 Create CHANGELOG entry

    - Document all new features added
    - List performance improvements
    - Note any breaking changes (none expected)
    - Include migration instructions
    - _Requirements: 4.5_

  - [x] 10.4 Update Kiro steering docs

    - Update .kiro/steering/product.md with progress
    - Document any architectural decisions
    - Note lessons learned for future reference
    - _Requirements: 4.5_

- [x] 11. Security and final review


  - [x] 11.1 Verify RLS policies

    - Test all RLS policies with different user scenarios
    - Verify unauthenticated users can only read
    - Verify users can only modify their own comments
    - Check cascade delete behavior
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 11.2 Security audit

    - Check for SQL injection vulnerabilities
    - Verify input sanitization and validation
    - Test XSS prevention
    - Verify authentication checks on protected routes
    - Check for exposed sensitive data
    - _Requirements: 4.7_

  - [x] 11.3 Final code review

    - Review all new code for best practices
    - Check error handling completeness
    - Verify proper TypeScript typing
    - Ensure consistent code style
    - Remove any debug console.logs
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

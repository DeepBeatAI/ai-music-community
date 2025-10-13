# Implementation Plan

- [x] 1. Set up database infrastructure for edit tracking

  - Create migration to add/verify updated_at triggers for posts and comments tables
  - Ensure triggers automatically update updated_at timestamp on UPDATE operations
  - Test triggers work correctly in local development environment
  - _Requirements: 1.7, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement core update utility functions

  - Create updatePost() function in client/src/utils/posts.ts with validation
  - Create updateComment() function in client/src/utils/comments.ts with validation
  - Implement client-side validation (empty content, character limits)
  - Add proper error handling and return types
  - _Requirements: 1.3, 1.6, 2.3, 2.6, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 2.1 Write unit tests for update functions

  - Test updatePost() validates empty content
  - Test updateComment() enforces 1000 character limit
  - Test error handling for network failures
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 3. Create EditedBadge component

  - Build reusable EditedBadge component in client/src/components/
  - Implement logic to compare created_at and updated_at timestamps
  - Add tooltip showing last edit timestamp on hover
  - Style badge with subtle gray text and small font
  - Ensure responsive design for mobile
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.9_

- [x] 3.1 Write unit tests for EditedBadge

  - Test badge only shows when timestamps differ
  - Test tooltip displays correct timestamp
  - Test badge doesn't show for unedited content
  - _Requirements: 5.4_

- [x] 4. Implement post editing functionality

  - Add edit state management to post components (isEditing, editedContent, isSaving, error)
  - Create "Edit" button that only shows for post owner
  - Implement toggle between view and edit modes
  - Add editable textarea for content editing
  - Differentiate between text posts (full edit) and audio posts (caption only)
  - Add "Save" and "Cancel" buttons with proper handlers
  - Integrate EditedBadge component into post display

  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 6.1, 6.2, 6.3, 6.7_

- [x] 4.1 Add loading and error states for post editing

  - Display loading indicator during save operation
  - Show error messages inline below edit field
  - Preserve edited content on error for retry
  - Add "Try Again" button for network errors
  - _Requirements: 6.3, 6.4_

- [x] 4.2 Implement unsaved changes warning for posts

  - Detect when content has been modified but not saved
  - Show confirmation dialog when user navigates away with unsaved changes
  - Disable other post interactions while in edit mode
  - _Requirements: 6.5, 6.6_

- [x] 5. Implement comment editing functionality

  - Add edit state management to comment components
  - Create inline "Edit" button for comment owner
  - Implement inline edit mode within comment thread
  - Add editable textarea with character counter
  - Add "Save" and "Cancel" buttons
  - Integrate EditedBadge component into comment display
  - Ensure only one comment can be in edit mode at a time
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.1, 6.2, 6.8, 6.9_

- [x] 5.1 Add validation and error handling for comments

  - Implement real-time character count display
  - Show validation errors for empty content
  - Show validation errors for exceeding 1000 character limit
  - Display error messages inline
  - Preserve content on error for retry
  - _Requirements: 6.3, 6.4, 7.1, 7.2, 7.3, 7.6_

- [x] 5.2 Implement optimistic updates for comments

  - Update UI immediately when user saves
  - Show loading state during database update
  - Rollback changes if save fails
  - Display success message on successful save
  - _Requirements: 2.4, 4.4, 6.3_

- [x] 6. Implement authorization and security checks

  - Verify "Edit" buttons only show for content owner
  - Ensure RLS policies block unauthorized updates
  - Add client-side ownership checks before showing edit UI
  - Test that unauthenticated users cannot edit
  - Verify proper error messages for authorization failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.1 Write integration tests for authorization

  - Test user cannot edit another user's post
  - Test user cannot edit another user's comment
  - Test unauthenticated users see no edit buttons
  - Test RLS policies block unauthorized updates
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Add mobile responsiveness and accessibility

  - Ensure edit buttons are touch-friendly (44px minimum)
  - Make textarea responsive and properly sized on mobile
  - Implement auto-focus on textarea when entering edit mode
  - Add proper ARIA labels to edit buttons
  - Implement keyboard navigation for edit controls
  - Add focus management when entering/exiting edit mode
  - Test on mobile devices and screen readers
  - _Requirements: 6.7_

- [x] 7.1 Write accessibility tests

  - Test screen reader announcements for edit mode

  - Test keyboard navigation works for all controls
  - Test ARIA labels are present and correct
  - Test focus management
  - _Requirements: 6.7_

- [x] 8. Integration and end-to-end validation

  - Test complete post editing flow (text and audio posts)
  - Test complete comment editing flow
  - Verify EditedBadge appears after successful edits
  - Test content persists after page refresh
  - Verify real-time updates work for comments
  - Test validation errors display correctly
  - Test concurrent editing scenarios
  - _Requirements: All requirements_

- [x] 8.1 Write end-to-end tests

  - Test edit text post scenario
  - Test edit audio post caption scenario
  - Test edit comment scenario
  - Test validation error scenarios
  - Test concurrent edit scenarios
  - _Requirements: All requirements_

## Phase 2: UX Enhancements

- [x] 9. Implement toast notification system

  - Create reusable Toast component with success/error/info variants
  - Implement toast queue system for multiple notifications
  - Add auto-dismiss functionality (3-5 seconds)
  - Add manual dismiss button
  - Position toasts consistently (top-right or bottom-center)
  - Add slide-in/fade-out animations
  - Implement ARIA live regions for accessibility
  - Style toasts with success icon and appropriate colors
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 9.1 Integrate toast notifications into edit flows

  - Show "Post updated successfully" toast after post edit
  - Show "Comment updated successfully" toast after comment edit
  - Show error toasts for network failures
  - Remove or update existing success message displays
  - Test toast notifications on mobile devices
  - _Requirements: 1.4, 2.5, 4.4, 8.1, 8.2_

- [x] 10. Allow empty captions for audio posts

  - Update validation logic in EditablePost component to allow empty content for audio posts
  - Remove "Content cannot be empty" error for audio post captions
  - Update updatePost() function to allow empty content for audio posts
  - Add visual indicator that captions are optional for audio posts
  - Update placeholder text to indicate optional caption
  - Test saving audio posts with empty captions
  - _Requirements: 2.8, 7.1_

- [x] 10.1 Update tests for empty audio captions

  - Add test for saving audio post with empty caption
  - Verify no validation error appears for empty audio caption
  - Verify save button is enabled for empty audio caption
  - Update existing tests that expect empty caption validation
  - _Requirements: 2.8_

- [x] 11. Add inline validation error messages for posts


  - Add error state to EditablePost component
  - Display validation errors inline below textarea in red text
  - Show "Content cannot be empty" error for text posts
  - Style error messages with red color and error icon
  - Ensure errors are accessible with proper ARIA attributes
  - Clear errors when user starts typing
  - Test error display on mobile devices
  - _Requirements: 1.6, 7.3, 7.8_

- [x] 11.1 Write tests for inline validation errors

  - Test empty content error displays inline for text posts
  - Test error clears when user types
  - Test error has proper ARIA attributes
  - Test error is visible and styled correctly
  - _Requirements: 7.3, 7.8_

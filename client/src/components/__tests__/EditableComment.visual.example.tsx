/**
 * Visual Example: Comment Editing Functionality
 * 
 * This file demonstrates the comment editing feature with inline edit mode,
 * validation, and optimistic updates.
 * 
 * To view this example:
 * 1. Import this component in a page
 * 2. Ensure you have a valid Supabase session
 * 3. The example shows various comment states
 */

'use client'
import { useState } from 'react';
import Comment from '@/components/Comment';
import { CommentWithProfile } from '@/types';

export default function EditableCommentVisualExample() {
  const [comments, setComments] = useState<CommentWithProfile[]>([
    {
      id: 'comment-1',
      post_id: 'post-1',
      user_id: 'current-user',
      content: 'This is my comment that I can edit. Click the Edit button to try it out!',
      parent_comment_id: null,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user_profiles: {
        id: 'profile-1',
        user_id: 'current-user',
        username: 'You',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      replies: [],
      reply_count: 0
    },
    {
      id: 'comment-2',
      post_id: 'post-1',
      user_id: 'current-user',
      content: 'This comment was edited and shows the edited badge.',
      parent_comment_id: null,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago (edited)
      user_profiles: {
        id: 'profile-1',
        user_id: 'current-user',
        username: 'You',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      replies: [],
      reply_count: 0
    },
    {
      id: 'comment-3',
      post_id: 'post-1',
      user_id: 'other-user',
      content: 'This is someone else\'s comment. You cannot edit it.',
      parent_comment_id: null,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      user_profiles: {
        id: 'profile-2',
        user_id: 'other-user',
        username: 'OtherUser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      replies: [],
      reply_count: 0
    },
    {
      id: 'comment-4',
      post_id: 'post-1',
      user_id: 'current-user',
      content: 'This comment has a nested reply that you can also edit.',
      parent_comment_id: null,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      user_profiles: {
        id: 'profile-1',
        user_id: 'current-user',
        username: 'You',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      replies: [
        {
          id: 'comment-5',
          post_id: 'post-1',
          user_id: 'current-user',
          content: 'This is a nested reply. You can edit this too!',
          parent_comment_id: 'comment-4',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          user_profiles: {
            id: 'profile-1',
            user_id: 'current-user',
            username: 'You',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          replies: [],
          reply_count: 0
        }
      ],
      reply_count: 1
    }
  ]);

  const handleDelete = (commentId: string, totalCount: number) => {
    console.log(`Deleting comment ${commentId} (${totalCount} total)`);
    // In a real app, this would remove the comment from state
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Comment Editing - Visual Example
        </h1>
        <p className="text-gray-400 mb-8">
          Demonstrates inline comment editing with validation and optimistic updates
        </p>

        {/* Feature Overview */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Features Demonstrated</h2>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Inline Edit Mode:</strong> Click "Edit" to edit comments inline</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Character Counter:</strong> Real-time character count (1000 max)</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Validation:</strong> Empty content and character limit validation</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Edited Badge:</strong> Shows "(Edited)" for modified comments</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Optimistic Updates:</strong> Instant UI feedback</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Error Handling:</strong> Preserves content on error for retry</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Owner-Only:</strong> Only comment owner can edit</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span><strong>Nested Comments:</strong> Works with threaded replies</span>
            </li>
          </ul>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">How to Use</h2>
          <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
            <li>Click the <strong>"Edit"</strong> button on any of your comments</li>
            <li>Modify the text in the textarea</li>
            <li>Watch the character counter update in real-time</li>
            <li>Try exceeding 1000 characters to see validation</li>
            <li>Try clearing all text to see empty validation</li>
            <li>Click <strong>"Save"</strong> to save changes (optimistic update)</li>
            <li>Click <strong>"Cancel"</strong> to discard changes</li>
            <li>Notice the <strong>"(Edited)"</strong> badge on edited comments</li>
          </ol>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mb-4">Comments</h2>
          
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              postId="post-1"
              currentUserId="current-user"
              onDelete={handleDelete}
              depth={0}
            />
          ))}
        </div>

        {/* Technical Notes */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Technical Implementation</h2>
          <div className="space-y-4 text-gray-300 text-sm">
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Edit State Management</h3>
              <p>Each comment maintains its own edit state, ensuring only one comment can be in edit mode at a time per component instance.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Optimistic Updates</h3>
              <p>Changes are applied immediately to the UI, then saved to the database. On error, the UI rolls back to the original state.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Validation</h3>
              <p>Real-time validation prevents empty content and enforces the 1000 character limit. Save button is disabled when validation fails.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Error Handling</h3>
              <p>On save failure, the edit mode remains active with the user's content preserved, allowing them to retry without losing their changes.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Cache Invalidation</h3>
              <p>After successful save, the query cache is invalidated to ensure fresh data on next fetch.</p>
            </div>
          </div>
        </div>

        {/* Requirements Coverage */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Requirements Coverage</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Functional Requirements</h3>
              <ul className="space-y-1 text-gray-400">
                <li>✓ 4.1 - Edit button for owner</li>
                <li>✓ 4.2 - Inline edit mode</li>
                <li>✓ 4.3 - Editable textarea</li>
                <li>✓ 4.4 - Save/Cancel buttons</li>
                <li>✓ 4.5 - Character counter</li>
                <li>✓ 4.6 - One edit at a time</li>
                <li>✓ 4.7 - EditedBadge integration</li>
                <li>✓ 4.8 - Owner-only editing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">Technical Requirements</h3>
              <ul className="space-y-1 text-gray-400">
                <li>✓ 6.1 - Real-time validation</li>
                <li>✓ 6.2 - Character count display</li>
                <li>✓ 6.3 - Optimistic updates</li>
                <li>✓ 6.4 - Error handling</li>
                <li>✓ 6.8 - Inline error messages</li>
                <li>✓ 6.9 - Content preservation</li>
                <li>✓ 7.1 - Empty validation</li>
                <li>✓ 7.2 - Length validation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

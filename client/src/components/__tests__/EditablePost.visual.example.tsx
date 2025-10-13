/**
 * Visual Example: EditablePost Component
 * 
 * This file demonstrates the EditablePost component in various states.
 * To view this example, import and render it in a test page.
 */

import EditablePost from '../EditablePost';
import { Post } from '@/types';

// Example post data
const textPost: Post = {
  id: '1',
  created_at: '2025-01-10T10:00:00Z',
  updated_at: '2025-01-10T10:00:00Z',
  content: 'This is a sample text post that can be edited.',
  user_id: 'user-123',
  post_type: 'text',
  user_profiles: {
    username: 'johndoe',
    user_id: 'user-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  like_count: 5,
  liked_by_user: false,
};

const audioPost: Post = {
  id: '2',
  created_at: '2025-01-10T11:00:00Z',
  updated_at: '2025-01-10T11:00:00Z',
  content: 'Check out my latest AI-generated track!',
  user_id: 'user-123',
  post_type: 'audio',
  audio_url: 'https://example.com/audio.mp3',
  audio_filename: 'my-track.mp3',
  audio_duration: 180,
  user_profiles: {
    username: 'johndoe',
    user_id: 'user-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  like_count: 12,
  liked_by_user: true,
};

const editedPost: Post = {
  id: '3',
  created_at: '2025-01-10T09:00:00Z',
  updated_at: '2025-01-10T12:00:00Z', // Updated 3 hours later
  content: 'This post has been edited to fix a typo.',
  user_id: 'user-123',
  post_type: 'text',
  user_profiles: {
    username: 'johndoe',
    user_id: 'user-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  like_count: 8,
  liked_by_user: false,
};

export function EditablePostExamples() {
  const currentUserId = 'user-123'; // Owner of all posts

  const handleUpdate = (postId: string, newContent: string) => {
    console.log(`Post ${postId} updated with content:`, newContent);
  };

  const handleDelete = (postId: string) => {
    console.log(`Post ${postId} deleted`);
  };

  return (
    <div className="space-y-8 p-6 bg-gray-900 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">
          EditablePost Component Examples
        </h1>

        {/* Example 1: Text Post (Owner) */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            1. Text Post (Owner View)
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Shows edit button for owner. Click to enter edit mode.
          </p>
          <EditablePost
            post={textPost}
            currentUserId={currentUserId}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        {/* Example 2: Audio Post (Owner) */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            2. Audio Post (Owner View)
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Audio posts can only edit captions, not the audio file.
          </p>
          <EditablePost
            post={audioPost}
            currentUserId={currentUserId}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        {/* Example 3: Edited Post */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            3. Previously Edited Post
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Shows EditedBadge when updated_at differs from created_at.
          </p>
          <EditablePost
            post={editedPost}
            currentUserId={currentUserId}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        {/* Example 4: Non-Owner View */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            4. Non-Owner View
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            No edit button visible when viewing someone else&apos;s post.
          </p>
          <EditablePost
            post={textPost}
            currentUserId="different-user-456"
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        {/* Usage Instructions */}
        <section className="bg-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Usage Instructions
          </h2>
          <div className="space-y-4 text-gray-300 text-sm">
            <div>
              <h3 className="font-semibold text-white mb-2">Edit Mode:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Click the edit button (pencil icon) to enter edit mode</li>
                <li>Modify the content in the textarea</li>
                <li>Click &quot;Save&quot; to save changes</li>
                <li>Click &quot;Cancel&quot; to discard changes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Loading state during save operation</li>
                <li>Error messages for failed saves</li>
                <li>Unsaved changes warning on cancel</li>
                <li>Browser warning before leaving with unsaved changes</li>
                <li>Audio posts show caption-only editing notice</li>
                <li>EditedBadge appears after successful edit</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Error Handling:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Empty content validation</li>
                <li>Network error detection with retry button</li>
                <li>Content preserved on error for retry</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default EditablePostExamples;

'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import EditablePost from '@/components/EditablePost';
import { deletePost } from '@/utils/posts';
import { useToast } from '@/contexts/ToastContext';
import type { Post } from '@/types';

interface PostDetailViewProps {
  post: Post & {
    user_profiles?: {
      username: string;
      user_id: string;
      created_at: string;
      updated_at?: string;
    };
    like_count?: number;
    liked_by_user?: boolean;
  };
  currentUserId?: string;
}

/**
 * PostDetailView Component
 * 
 * Client component that wraps the post detail page with navigation and layout.
 * Displays a single post with full functionality including comments, likes, and interactions.
 */
export default function PostDetailView({ post, currentUserId }: PostDetailViewProps) {
  const username = post.user_profiles?.username || 'Anonymous';
  const router = useRouter();
  const { showToast } = useToast();

  const handleDelete = useCallback(async (postId: string) => {
    try {
      await deletePost(postId);
      showToast('Post deleted successfully', 'success');
      // Redirect to dashboard after deletion
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Failed to delete post', 'error');
    }
  }, [router, showToast]);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-400">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-blue-400 transition-colors"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li>
              <Link
                href={`/profile/${username}`}
                className="hover:text-blue-400 transition-colors"
              >
                {username}
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-500" aria-current="page">
              Post
            </li>
          </ol>
        </nav>

        {/* Back to Dashboard Link */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Post Content */}
        <Suspense
          fallback={
            <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-8 text-center">
              <div className="animate-pulse">
                <div className="h-12 bg-gray-700 rounded mb-4"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
              </div>
              <p className="text-gray-400 mt-4">Loading post...</p>
            </div>
          }
        >
          <EditablePost
            post={post}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            showWaveform={true}
          />
        </Suspense>

        {/* Additional Context */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Tip:</span> You can share
            this post by copying the URL from your browser&apos;s address bar.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

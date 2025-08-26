'use client'
import { memo } from 'react';
import { formatTimeAgo, truncateText } from '@/utils/format';
import { Post } from '@/types';
import WavesurferPlayer from './WavesurferPlayer';
import LikeButton from './LikeButton';
import FollowButton from './FollowButton';
import UserStatsCard from './UserStatsCard';

interface PostItemProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
  showWaveform?: boolean;
}

const PostItem = memo(({ post, currentUserId, onDelete, showWaveform = true }: PostItemProps) => {
  const isOwner = currentUserId === post.user_id;
  const username = post.user_profiles?.username || 'Anonymous';

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete?.(post.id);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-gray-200 font-medium">{username}</p>
                {post.post_type === 'audio' && (
                  <span className="text-blue-400 text-xs bg-blue-900/30 px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>🎵</span>
                    <span>Audio</span>
                  </span>
                )}
              </div>
              
              {/* User Stats - Show for other users' posts */}
              {!isOwner && (
                <UserStatsCard 
                  userId={post.user_id} 
                  username={username} 
                  variant="compact"
                  className="mb-2"
                />
              )}
              
              <p className="text-gray-400 text-sm">
                {formatTimeAgo(post.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Follow Button */}
            {!isOwner && (
              <FollowButton
                userId={post.user_id}
                username={username}
                size="sm"
                variant="secondary"
                showFollowerCount={false}
              />
            )}
            
            {/* Delete Button */}
            {isOwner && onDelete && (
              <button
                onClick={handleDelete}
                className="text-gray-400 hover:text-red-400 p-2 rounded-full hover:bg-red-900/20 transition-colors"
                title="Delete post"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4 space-y-4">
        {/* Text Content */}
        {post.content && (
          <div className="text-gray-200 leading-relaxed">
            {truncateText(post.content, 500)}
          </div>
        )}

        {/* Audio Player - FIXED: Added unique key for proper React handling */}
        {post.post_type === 'audio' && post.audio_url && (
          <div key={`audio-player-container-${post.id}`}>
            <WavesurferPlayer
              key={`wavesurfer-${post.id}-${post.audio_url}`}
              audioUrl={post.audio_url}
              fileName={post.audio_filename}
              duration={post.audio_duration}
              showWaveform={showWaveform}
              theme="ai_music"
              className="audio-player-unique"
            />
          </div>
        )}
      </div>

      {/* Post Footer */}
      <div className="px-4 py-3 bg-gray-750 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Like Button */}
            <LikeButton
              postId={post.id}
              initialLikeCount={post.like_count}
              initialLiked={post.liked_by_user}
              size="sm"
            />
            
            {/* Future: Comment Button */}
            <button className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-900/10">
              <span>💬</span>
              <span>Comment</span>
            </button>
            
            {/* Future: Share Button */}
            <button className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors text-sm px-2 py-1 rounded hover:bg-green-900/10">
              <span>🔗</span>
              <span>Share</span>
            </button>
          </div>
          
          {/* File Info for Audio Posts */}
          {post.post_type === 'audio' && post.audio_file_size && (
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              <span>{(post.audio_file_size / (1024 * 1024)).toFixed(1)}MB</span>
              {post.audio_duration && (
                <span>• {Math.floor(post.audio_duration / 60)}:{String(Math.floor(post.audio_duration % 60)).padStart(2, '0')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PostItem.displayName = 'PostItem';

export default PostItem;
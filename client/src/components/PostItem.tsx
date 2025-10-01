'use client'
import { memo, useState, useCallback } from 'react';
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

// EGRESS OPTIMIZED Audio Player Section Component
interface AudioPlayerSectionProps {
  post: Post;
  showWaveform?: boolean;
}

const AudioPlayerSection = memo(({ post, showWaveform = true }: AudioPlayerSectionProps) => {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState(false);

  // Lazy load audio only when user intends to play
  const handlePlayIntention = useCallback(() => {
    if (!audioLoaded && post.audio_url) {
      console.log(`🎵 Loading audio on demand for post ${post.id}`);
      setAudioLoaded(true);
    }
  }, [audioLoaded, post.audio_url, post.id]);

  return (
    <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400">🎵</span>
          <div className="flex flex-col">
            <span className="text-sm text-gray-200 font-medium">
              {(() => {
                if (!post.audio_filename || post.audio_filename === '') return 'Audio Track';
                
                // Check if it's a storage path (contains UUID pattern)
                const isStoragePath = post.audio_filename.includes('/') && 
                  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(post.audio_filename);
                
                if (isStoragePath) {
                  // For storage paths, just show a generic title with the timestamp if available
                  const timestamp = post.audio_filename.match(/\d{13,}/)?.[0];
                  if (timestamp) {
                    const date = new Date(parseInt(timestamp));
                    return `Audio Track - ${date.toLocaleDateString()}`;
                  }
                  return 'Audio Track';
                } else {
                  // For proper filenames, remove the extension
                  return post.audio_filename.replace(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i, '');
                }
              })()}
            </span>
            {post.audio_mime_type && (
              <span className="text-xs text-gray-500">
                {post.audio_mime_type.split('/')[1]?.toUpperCase() || 'Audio'}
                {post.audio_file_size && ` • ${(post.audio_file_size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Optimized Audio Player Implementation */}
      <div className="relative">
        {!audioLoaded ? (
          // Show placeholder until user wants to play
          <div className="bg-gray-700 rounded p-8 text-center">
            <button
              onClick={handlePlayIntention}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              <span>▶️</span>
              <span>Load & Play Audio</span>
            </button>
            {post.audio_duration && (
              <p className="text-xs text-gray-500 mt-2">
                Duration: {Math.floor(post.audio_duration / 60)}:{String(Math.floor(post.audio_duration % 60)).padStart(2, '0')}
              </p>
            )}
          </div>
        ) : (
          // Load full WaveSurfer when user wants to play
          <div>
            {post.audio_url && (
              <WavesurferPlayer
                key={`wavesurfer-${post.id}-${post.audio_url}`}
                audioUrl={post.audio_url}
                fileName={post.audio_filename}
                duration={post.audio_duration}
                showWaveform={showWaveform}
                theme="ai_music"
                className="audio-player-unique"
              />
            )}
            
            {audioLoadError && (
              <div className="text-red-400 text-sm text-center mt-2">
                Failed to load audio. Please try again.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

AudioPlayerSection.displayName = 'AudioPlayerSection';

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
              
              {/* User Stats - Show for all posts (both audio and text) */}
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

        {/* Audio Player - EGRESS OPTIMIZED with Lazy Loading */}
        {post.post_type === 'audio' && post.audio_url && (
          <AudioPlayerSection 
            post={post} 
            showWaveform={showWaveform}
          />
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
          
          {/* Duration for Audio Posts (removed file size) */}
          {post.post_type === 'audio' && post.audio_duration && (
            <div className="text-xs text-gray-500">
              {Math.floor(post.audio_duration / 60)}:{String(Math.floor(post.audio_duration % 60)).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PostItem.displayName = 'PostItem';

export default PostItem;

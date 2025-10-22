'use client'
import { memo, useState, useCallback, useEffect } from 'react';
import { formatTimeAgo, truncateText } from '@/utils/format';
import { Post } from '@/types';
import WavesurferPlayer from './WavesurferPlayer';
import LikeButton from './LikeButton';
import FollowButton from './FollowButton';
import UserStatsCard from './UserStatsCard';
import CommentList from './CommentList';
import { AddToPlaylist } from './playlists/AddToPlaylist';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/queryCache';

interface PostItemProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
  showWaveform?: boolean;
  editButton?: React.ReactNode;
  editedBadge?: React.ReactNode;
}

// EGRESS OPTIMIZED Audio Player Section Component
interface AudioPlayerSectionProps {
  post: Post;
  showWaveform?: boolean;
}



const AudioPlayerSection = memo(({ post, showWaveform = true }: AudioPlayerSectionProps) => {
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Get audio data from track (new structure) with fallback to deprecated fields
  const audioUrl = post.track?.file_url || post.audio_url;
  const audioTitle = post.track?.title || post.audio_filename;
  const audioDuration = post.track?.duration || post.audio_duration;

  // Lazy load audio only when user intends to play
  const handlePlayIntention = useCallback(() => {
    if (!audioLoaded && audioUrl) {
      console.log(`🎵 Loading audio on demand for post ${post.id}`);
      setAudioLoaded(true);
    }
  }, [audioLoaded, audioUrl, post.id]);

  return (
    <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-blue-400">🎵</span>
          <div className="flex flex-col flex-1">
            <span className="text-sm text-gray-200 font-medium">
              {(() => {
                if (!audioTitle || audioTitle === '') return 'Audio Track';
                
                // Check if it's a storage path (contains UUID pattern)
                const isStoragePath = audioTitle.includes('/') && 
                  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(audioTitle);
                
                if (isStoragePath) {
                  // For storage paths, just show a generic title with the timestamp if available
                  const timestamp = audioTitle.match(/\d{13,}/)?.[0];
                  if (timestamp) {
                    const date = new Date(parseInt(timestamp));
                    return `Audio Track - ${date.toLocaleDateString()}`;
                  }
                  return 'Audio Track';
                } else {
                  // For proper filenames, remove the extension
                  return audioTitle.replace(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i, '');
                }
              })()}
            </span>
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
            {audioDuration && (
              <p className="text-xs text-gray-500 mt-2">
                Duration: {Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')}
              </p>
            )}
          </div>
        ) : (
          // Load full WaveSurfer when user wants to play
          <div>
            {audioUrl && (
              <WavesurferPlayer
                key={`wavesurfer-${post.id}-${audioUrl}`}
                audioUrl={audioUrl}
                fileName={undefined}  // Don't pass fileName to avoid duplicate display
                duration={audioDuration}
                showWaveform={showWaveform}
                theme="ai_music"
                className="audio-player-unique"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

AudioPlayerSection.displayName = 'AudioPlayerSection';

const PostItem = memo(({ post, currentUserId, onDelete, showWaveform = true, editButton, editedBadge }: PostItemProps) => {
  const isOwner = currentUserId === post.user_id;
  const username = post.user_profiles?.username || 'Anonymous';
  const [commentCount, setCommentCount] = useState<number>(0);
  const [showComments, setShowComments] = useState<boolean>(false);

  // Fetch comment count on mount and when comments visibility changes
  useEffect(() => {
    const fetchCommentCount = async () => {
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (!error && count !== null) {
        setCommentCount(count);
      }
    };

    fetchCommentCount();
  }, [post.id, showComments]); // Re-fetch when comments section is toggled

  // Real-time subscription for comment count (ONLY when comments are hidden)
  useEffect(() => {
    // Only subscribe when comments section is closed
    if (showComments) {
      return; // CommentList will handle updates when open
    }

    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // Increment counter when new comment is added
          setCommentCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // Decrement counter when comment is deleted
          setCommentCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, showComments]); // Re-subscribe when showComments changes

  // Callback to update comment count from CommentList (for optimistic updates)
  const handleCommentCountChange = useCallback((delta: number) => {
    setCommentCount((prev) => Math.max(0, prev + delta));
  }, []);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete?.(post.id);
    }
  };

  const handleToggleComments = () => {
    const newShowComments = !showComments;
    setShowComments(newShowComments);
    
    // When opening comments, invalidate cache to ensure fresh data
    if (newShowComments) {
      queryCache.invalidatePattern(`comments-${post.id}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
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
            
            {/* Edit Button (passed from EditablePost) */}
            {editButton}
            
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

        {/* Edited Badge (passed from EditablePost) - Show before audio player */}
        {editedBadge && (
          <div className={post.content ? "pt-2" : ""}>
            {editedBadge}
          </div>
        )}

        {/* Audio Player - EGRESS OPTIMIZED with Lazy Loading */}
        {post.post_type === 'audio' && (post.track?.file_url || post.audio_url) && (
          <AudioPlayerSection 
            post={post} 
            showWaveform={showWaveform}
          />
        )}
      </div>

      {/* Post Footer */}
      <div className="px-4 py-3 bg-gray-750 border-t border-gray-700 overflow-visible">
        <div className="flex items-center justify-between overflow-visible">
          <div className="flex items-center space-x-4">
            {/* Like Button */}
            <LikeButton
              postId={post.id}
              initialLikeCount={post.like_count}
              initialLiked={post.liked_by_user}
              size="sm"
            />
            
            {/* Comment Button with Count and Toggle */}
            <button 
              onClick={handleToggleComments}
              className={`flex items-center space-x-2 transition-colors text-sm px-2 py-1 rounded ${
                showComments 
                  ? 'text-blue-400 bg-blue-900/20' 
                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/10'
              }`}
            >
              <span>💬</span>
              <span>{showComments ? 'Hide Comments' : 'Comments'}</span>
              {commentCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {commentCount}
                </span>
              )}
            </button>
            
            {/* Add to Playlist Button - Only for audio posts and authenticated users */}
            {post.post_type === 'audio' && currentUserId && post.track_id && (
              <AddToPlaylist 
                trackId={post.track_id}
                onSuccess={() => {
                  console.log('✅ Track added to playlist successfully');
                }}
              />
            )}
            
            {/* Debug: Show if button should appear but doesn't */}
            {post.post_type === 'audio' && currentUserId && !post.track_id && (
              <div className="text-xs text-red-400">
                ⚠️ No track_id
              </div>
            )}
            
            {/* Future: Share Button */}
            <button className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors text-sm px-2 py-1 rounded hover:bg-green-900/10">
              <span>🔗</span>
              <span>Share</span>
            </button>
          </div>
          
          {/* Duration for Audio Posts (removed file size) */}
          {post.post_type === 'audio' && (post.track?.duration || post.audio_duration) && (
            <div className="text-xs text-gray-500">
              {(() => {
                const duration = post.track?.duration || post.audio_duration || 0;
                return `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-700">
          <CommentList 
            postId={post.id}
            currentUserId={currentUserId}
            onCommentCountChange={handleCommentCountChange}
          />
        </div>
      )}
    </div>
  );
});

PostItem.displayName = 'PostItem';

export default PostItem;

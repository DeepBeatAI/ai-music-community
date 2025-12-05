import { Track } from './track';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
  // New social fields
  follower_count?: number;
  following_count?: number;
  post_count?: number;
}

export interface CreatorProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  user_type: string;
  created_at: string;
  updated_at: string;
}

export interface CreatorStats {
  creator_score: number;
  follower_count: number;
  track_count: number;
  album_count: number;
  playlist_count: number;
  total_plays: number;
}

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  content: string;
  user_id: string;
  post_type: 'text' | 'audio';
  
  // NEW: Track reference for audio posts
  track_id?: string;
  track?: Track; // Joined track data
  
  // DEPRECATED: Keep temporarily for backward compatibility during migration
  // These fields will be removed after data migration is complete
  // Use post.track instead for audio posts
  /** @deprecated Use post.track.file_url instead */
  audio_url?: string;
  /** @deprecated Use post.track.title instead */
  audio_filename?: string;
  /** @deprecated Use post.track.file_size instead */
  audio_file_size?: number;
  /** @deprecated Use post.track.duration instead */
  audio_duration?: number;
  /** @deprecated Use post.track.mime_type instead */
  audio_mime_type?: string;
  
  // Joined user profile data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  // New interaction fields
  like_count?: number;
  liked_by_user?: boolean;
}

export interface PostLike {
  id: string;
  created_at: string;
  user_id: string;
  post_id: string;
}

export interface UserFollow {
  id: string;
  created_at: string;
  follower_id: string;
  following_id: string;
}

export interface SavedTrack {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

export interface SavedAlbum {
  id: string;
  user_id: string;
  album_id: string;
  created_at: string;
}

export interface SavedPlaylist {
  id: string;
  user_id: string;
  playlist_id: string;
  created_at: string;
}

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
  user_profiles: UserProfile;
  replies?: CommentWithProfile[];
  reply_count?: number;
}

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  type: 'like' | 'follow' | 'comment' | 'post' | 'mention' | 'system' | 'moderation';
  title: string;
  message?: string;
  read: boolean;
  related_post_id?: string;
  related_user_id?: string;
  related_username?: string; // Username of the related user
  related_notification_id?: string; // References original notification for reversals
  action_url?: string;
  icon?: string;
  priority?: number;
  data?: any;
}

export interface Activity {
  id: string;
  created_at: string;
  user_id: string;
  activity_type: 'post_created' | 'post_liked' | 'user_followed' | 'comment_created' | 'audio_uploaded';
  target_user_id?: string;
  target_post_id?: string;
  metadata?: any;
  is_public: boolean;
  // Joined data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  target_user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  posts?: {
    content: string;
    post_type: string;
    audio_filename?: string;
  };
}

export interface ActivityFeedItem {
  id: string;
  created_at: string;
  seen: boolean;
  relevance_score: number;
  activity: Activity;
}

export interface UserStats {
  id: string;
  user_id: string;
  posts_count: number;
  audio_posts_count: number;
  likes_given: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  total_plays: number;
  last_active: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  needsEmailVerification?: boolean;
}

// Re-export pagination types
export * from './pagination';

// Re-export playlist types
export * from './playlist';

// Re-export moderation types
export * from './moderation';
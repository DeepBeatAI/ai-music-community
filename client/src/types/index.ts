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

export interface Post {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  post_type: 'text' | 'audio';
  audio_url?: string;
  audio_filename?: string;
  audio_file_size?: number;
  audio_duration?: number;
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
  type: 'like' | 'follow' | 'comment' | 'post' | 'mention' | 'system';
  title: string;
  message?: string;
  read: boolean;
  related_post_id?: string;
  related_user_id?: string;
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
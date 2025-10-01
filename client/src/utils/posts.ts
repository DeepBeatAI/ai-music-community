import { supabase } from '@/lib/supabase';
import type { Post, UserProfile } from '@/types';

export interface PostWithProfile extends Post {
  user_profiles: UserProfile;
  likes_count: number;
  liked_by_user: boolean;
}

export async function fetchPosts(
  page: number = 1,
  limit: number = 15,
  userId?: string
): Promise<{ posts: PostWithProfile[]; hasMore: boolean }> {
  try {
    const offset = (page - 1) * limit;
    
    console.log(`🔍 Fetching posts: page ${page}, limit ${limit}, offset ${offset}`);
    
    // Fetch posts with user profiles
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    if (!posts || posts.length === 0) {
      console.log('No posts found');
      return { posts: [], hasMore: false };
    }

    // Add like counts and user like status
    const postsWithInteractions = await Promise.all(
      posts.map(async (post) => {
        try {
          // Get total like count
          const { count: likeCount } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Check if current user liked this post
          let likedByUser = false;
          if (userId) {
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .single();
            
            likedByUser = !!userLike;
          }

          return {
            ...post,
            likes_count: likeCount || 0,
            liked_by_user: likedByUser
          };
        } catch (error) {
          console.error(`Error fetching interactions for post ${post.id}:`, error);
          return {
            ...post,
            likes_count: 0,
            liked_by_user: false
          };
        }
      })
    );

    // Check if there are more posts
    const { count: totalCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true });

    const hasMore = (totalCount || 0) > offset + posts.length;

    console.log(`✅ Successfully fetched ${postsWithInteractions.length} posts, hasMore: ${hasMore}`);
    
    return {
      posts: postsWithInteractions,
      hasMore
    };
  } catch (error) {
    console.error('Error in fetchPosts:', error);
    throw error;
  }
}

export async function createTextPost(
  userId: string,
  content: string
): Promise<Post> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: content.trim(),
        post_type: 'text'
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating text post:', error);
    throw error;
  }
}

export async function createAudioPost(
  userId: string,
  storagePath: string,
  description?: string,
  fileSize?: number,
  duration?: number,
  mimeType?: string,
  originalFileName?: string
): Promise<Post> {
  try {
    // Generate the public URL for the audio file
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(storagePath);

    // Use original filename for display, or extract from storage path as fallback
    const displayName = originalFileName || storagePath.split('/').pop() || 'Audio Track';

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: description?.trim() || '',  // Use empty string instead of null since content is NOT NULL
        post_type: 'audio',
        audio_url: publicUrl,
        audio_filename: displayName,  // Store the original/display filename here
        audio_file_size: fileSize || null,
        audio_duration: duration || null,
        audio_mime_type: mimeType || null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating audio post:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating audio post:', error);
    throw error;
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}
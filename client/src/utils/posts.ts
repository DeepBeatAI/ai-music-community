import { supabase } from '@/lib/supabase';
import { creatorCache } from './creatorCache';
import { logger } from './logger';
import type { Post, UserProfile } from '@/types';

export interface PostWithProfile extends Post {
  user_profiles: UserProfile;
  likes_count: number;
  liked_by_user: boolean;
}

/**
 * Fetch posts with pagination
 * 
 * Retrieves posts from the database with user profiles and track data for audio posts.
 * Audio posts now reference tracks via track_id instead of storing audio data directly.
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Number of posts per page (default: 15)
 * @param userId - Optional user ID to check like status for each post
 * @returns Promise resolving to object with posts array and hasMore boolean
 * 
 * @example
 * ```typescript
 * const { posts, hasMore } = await fetchPosts(1, 15, currentUserId);
 * posts.forEach(post => {
 *   if (post.post_type === 'audio') {
 *     console.log('Audio track:', post.track?.title);
 *   }
 * });
 * ```
 * 
 * @remarks
 * - Audio posts include joined track data via post.track
 * - Each post includes likes_count and liked_by_user fields
 * - Results are ordered by created_at descending (newest first)
 */
/**
 * Fetch a single post by ID with all related data
 * 
 * Retrieves a single post from the database with user profile and track data for audio posts.
 * Includes like count and user like status calculation.
 * 
 * @param postId - The ID of the post to fetch
 * @param userId - Optional user ID to check like status
 * @returns Promise resolving to the post with profile and interactions, or null if not found
 * 
 * @example
 * ```typescript
 * const post = await fetchPostById(postId, currentUserId);
 * if (post) {
 *   console.log('Post content:', post.content);
 *   console.log('Liked by user:', post.liked_by_user);
 * }
 * ```
 * 
 * @remarks
 * - Returns null if post doesn't exist
 * - Audio posts include joined track data via post.track
 * - Includes likes_count and liked_by_user fields
 * - Respects RLS policies for access control
 * 
 * @throws {Error} Network errors or database connection issues
 */
export async function fetchPostById(
  postId: string,
  userId?: string
): Promise<PostWithProfile | null> {
  try {
    logger.debug(`Fetching post by ID: ${postId}`);
    
    // Fetch post with user profile and track data (for audio posts)
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching post by ID:', error);
      throw error;
    }

    if (!post) {
      logger.debug('Post not found');
      return null;
    }

    // Get total like count
    const { count: likeCount } = await supabase
      .from('post_likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post.id);

    // Check if current user liked this post
    let likedByUser = false;
    if (userId) {
      const { data: userLike, error: likeError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', userId)
        .maybeSingle();
      
      likedByUser = !likeError && !!userLike;
    }

    const postWithInteractions = {
      ...post,
      likes_count: likeCount || 0,
      liked_by_user: likedByUser
    };

    logger.debug(`Successfully fetched post ${postId}`);
    
    return postWithInteractions;
  } catch (error) {
    logger.error('Error in fetchPostById:', error);
    throw error;
  }
}

export async function fetchPosts(
  page: number = 1,
  limit: number = 15,
  userId?: string
): Promise<{ posts: PostWithProfile[]; hasMore: boolean }> {
  try {
    const offset = (page - 1) * limit;
    
    logger.debug(`Fetching posts: page ${page}, limit ${limit}, offset ${offset}`);
    
    // Fetch posts with user profiles and track data (for audio posts)
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*),
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
      logger.error('Error fetching posts:', error);
      throw error;
    }

    if (!posts || posts.length === 0) {
      logger.debug('No posts found');
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
            const { data: userLike, error: likeError } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .maybeSingle();
            
            likedByUser = !likeError && !!userLike;
          }

          return {
            ...post,
            likes_count: likeCount || 0,
            liked_by_user: likedByUser
          };
        } catch (error) {
          logger.error(`Error fetching interactions for post ${post.id}:`, error);
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

    logger.debug(`Successfully fetched ${postsWithInteractions.length} posts, hasMore: ${hasMore}`);
    
    return {
      posts: postsWithInteractions,
      hasMore
    };
  } catch (error) {
    logger.error('Error in fetchPosts:', error);
    throw error;
  }
}

export async function createTextPost(
  userId: string,
  content: string
): Promise<Post> {
  try {
    // Check if user is allowed to post (Requirements 6.1, 6.6)
    const { data: canPost, error: restrictionError } = await supabase
      .rpc('can_user_post', { p_user_id: userId });

    if (restrictionError) {
      logger.error('Error checking post restrictions:', restrictionError);
      throw new Error('Failed to verify posting permissions');
    }

    if (!canPost) {
      logger.warn(`User ${userId} attempted to post while restricted`);
      throw new Error('You are currently restricted from creating posts. Please contact support for more information.');
    }

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
    logger.error('Error creating text post:', error);
    throw error;
  }
}

/**
 * Create an audio post that references an existing track
 * 
 * This function creates a social media post that references a track from the tracks table.
 * The track must exist before creating the post. Use uploadTrack() first to create the track.
 * 
 * @param userId - The ID of the user creating the post
 * @param trackId - The ID of the track to reference (must exist in tracks table)
 * @param caption - Optional caption/description for the post
 * @returns Promise<Post> - The created post with joined track and user profile data
 * 
 * @throws {Error} If track doesn't exist
 * @throws {Error} If user doesn't have permission to use the track
 * 
 * @example
 * ```typescript
 * // First upload a track
 * const { track } = await uploadTrack(userId, {
 *   file: audioFile,
 *   title: 'My New Track',
 *   is_public: true,
 * });
 * 
 * // Then create a post referencing it
 * const post = await createAudioPost(userId, track.id, 'Check out my new track!');
 * ```
 * 
 * @remarks
 * - Replaces the old createAudioPost that accepted audio file data directly
 * - Tracks must be created separately before creating posts
 * - Users can reference their own tracks or public tracks from other users
 * - The same track can be referenced by multiple posts (track reuse)
 */
export async function createAudioPost(
  userId: string,
  trackId: string,
  caption?: string
): Promise<Post> {
  try {
    // 0. Check if user is allowed to post (Requirements 6.1, 6.6)
    const { data: canPost, error: restrictionError } = await supabase
      .rpc('can_user_post', { p_user_id: userId });

    if (restrictionError) {
      logger.error('Error checking post restrictions:', restrictionError);
      throw new Error('Failed to verify posting permissions');
    }

    if (!canPost) {
      logger.warn(`User ${userId} attempted to post while restricted`);
      throw new Error('You are currently restricted from creating posts. Please contact support for more information.');
    }

    // 1. Verify track exists and get track data
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, user_id, is_public')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      logger.error('Track not found:', trackError);
      throw new Error('Track not found');
    }

    // 2. Verify user has permission to use this track
    // User can use their own tracks or public tracks from others
    if (track.user_id !== userId && !track.is_public) {
      logger.error('User does not have permission to use this track');
      throw new Error('You do not have permission to use this track');
    }

    // 3. Create post with track reference
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: caption?.trim() || '',
        post_type: 'audio',
        track_id: trackId, // NEW: Reference to track
      })
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `)
      .single();

    if (error) {
      logger.error('Database error creating audio post:', error);
      throw error;
    }
    
    logger.debug(`Successfully created audio post ${data.id} with track ${trackId}`);
    return data;
  } catch (error) {
    logger.error('Error creating audio post:', error);
    throw error;
  }
}

/**
 * Fetch posts by a specific creator with pagination
 * 
 * Retrieves all posts from a specific creator with user profiles and track data.
 * Implements caching for the first page to improve performance.
 * 
 * @param creatorId - The ID of the creator whose posts to fetch
 * @param page - Page number (1-indexed, default: 1)
 * @param limit - Number of posts per page (default: 50)
 * @param currentUserId - Optional current user ID to check like status
 * @returns Promise resolving to object with posts array and hasMore boolean
 * 
 * @example
 * ```typescript
 * const { posts, hasMore } = await fetchPostsByCreator(creatorId, 1, 50, currentUserId);
 * ```
 * 
 * @remarks
 * - First page results are cached using creatorCache
 * - Audio posts include joined track data via post.track
 * - Results are ordered by created_at descending (newest first)
 * - Returns empty array if creator has no posts
 */
export async function fetchPostsByCreator(
  creatorId: string,
  page: number = 1,
  limit: number = 50,
  currentUserId?: string
): Promise<{ posts: PostWithProfile[]; hasMore: boolean }> {
  try {
    // Check cache first (only for first page)
    if (page === 1) {
      const cached = creatorCache.get(creatorId);
      if (cached) {
        // Return cached posts, sliced to the requested limit
        const cachedWithProfile = cached as PostWithProfile[];
        return { 
          posts: cachedWithProfile.slice(0, limit), 
          hasMore: cachedWithProfile.length > limit 
        };
      }
    }
    
    const offset = (page - 1) * limit;
    
    logger.debug(`Fetching posts by creator: ${creatorId}, page ${page}, limit ${limit}`);
    
    // Query posts specifically from this creator with track data
    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id,
          created_at
        )
      `, { count: 'exact' })
      .eq('user_id', creatorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching creator posts:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('No posts found for creator');
      // Cache empty result for first page
      if (page === 1) {
        creatorCache.set(creatorId, []);
      }
      return { posts: [], hasMore: false };
    }

    // Get interaction data
    const posts = await Promise.all(
      data.map(async (post) => {
        try {
          const [likeData, userLikeData] = await Promise.all([
            supabase
              .from('post_likes')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id),
            currentUserId
              ? supabase
                  .from('post_likes')
                  .select('id')
                  .eq('post_id', post.id)
                  .eq('user_id', currentUserId)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null })
          ]);

          return {
            ...post,
            user_profiles: post.user_profiles,
            likes_count: likeData.count || 0,
            liked_by_user: !userLikeData.error && !!userLikeData.data,
            like_count: likeData.count || 0 // Add both properties for compatibility
          };
        } catch (error) {
          logger.error(`Error fetching interactions for post ${post.id}:`, error);
          return {
            ...post,
            user_profiles: post.user_profiles,
            likes_count: 0,
            liked_by_user: false,
            like_count: 0
          };
        }
      })
    );

    const totalCount = count || 0;
    const hasMore = offset + limit < totalCount;

    logger.debug(`Fetched ${posts.length} posts from creator (total: ${totalCount}, hasMore: ${hasMore})`);

    // Cache the results if first page
    if (page === 1 && posts.length > 0) {
      creatorCache.set(creatorId, posts);
    }

    return { posts, hasMore };
  } catch (error) {
    logger.error('Error in fetchPostsByCreator:', error);
    return { posts: [], hasMore: false };
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
    logger.error('Error deleting post:', error);
    throw error;
  }
}

export interface UpdatePostResult {
  success: boolean;
  error?: string;
}

/**
 * Updates a post's content with validation
 * 
 * Updates the text content/caption of a post. For audio posts, this updates the caption only.
 * The track reference cannot be changed after post creation.
 * 
 * @param postId - The ID of the post to update
 * @param content - The new content for the post
 * @param userId - The ID of the user making the update (for authorization)
 * @param postType - Optional post type ('text' | 'audio') to determine validation rules
 * @returns Promise<UpdatePostResult> - Result object with success status and optional error message
 * 
 * @example
 * ```typescript
 * const result = await updatePost(postId, 'Updated caption', userId, 'audio');
 * if (result.success) {
 *   console.log('Post updated successfully');
 * } else {
 *   console.error('Update failed:', result.error);
 * }
 * ```
 * 
 * @remarks
 * - Text posts require non-empty content
 * - Audio posts can have empty captions (captions are optional)
 * - RLS policies enforce that users can only update their own posts
 * - The updated_at timestamp is automatically updated by database trigger
 */
export async function updatePost(
  postId: string,
  content: string,
  userId: string,
  postType?: 'text' | 'audio'
): Promise<UpdatePostResult> {
  try {
    // Validate content is not empty for text posts
    // Audio posts can have empty captions (captions are optional)
    if (postType !== 'audio' && !content.trim()) {
      return { 
        success: false, 
        error: 'Content cannot be empty' 
      };
    }

    // Update post in database
    // RLS policies will enforce that user can only update their own posts
    // The trigger will automatically update the updated_at timestamp
    const { error } = await supabase
      .from('posts')
      .update({ content: content.trim() })
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error updating post:', error);
      
      // Check for authorization errors
      if (error.code === 'PGRST301' || error.message.includes('permission')) {
        return { 
          success: false, 
          error: 'You do not have permission to edit this content' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to update post' 
      };
    }

    logger.debug(`Successfully updated post ${postId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error in updatePost:', error);
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Failed to save changes. Please check your connection.' 
      };
    }
    
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}
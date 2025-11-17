import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import PostDetailView from '@/components/posts/PostDetailView';
import PostAccessDenied from '@/components/posts/PostAccessDenied';
import PostNetworkError from '@/components/posts/PostNetworkError';

interface PostDetailPageProps {
  params: Promise<{
    postId: string;
  }>;
}

/**
 * Generate metadata for the post detail page
 * Includes Open Graph and Twitter Card tags for social sharing
 */
export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  try {
    const { postId } = await params;
    const cookieStore = await cookies();
    
    // Create Supabase server client for metadata generation
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in server component
            }
          },
        },
      }
    );

    // Fetch post for metadata
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

    if (error || !post) {
      return {
        title: 'Post Not Found - AI Music Community',
        description: 'The post you are looking for could not be found.',
      };
    }

    const username = post.user_profiles?.username || 'Anonymous';
    
    // Generate title based on post type
    let title: string;
    if (post.post_type === 'audio' && post.track?.title) {
      title = `${username}'s post: ${post.track.title}`;
    } else {
      title = `${username}'s post`;
    }

    // Generate description from post content (truncated to 160 characters)
    const description = post.content
      ? post.content.substring(0, 160) + (post.content.length > 160 ? '...' : '')
      : 'Check out this post on AI Music Community';

    // Get the post URL
    const postUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/posts/${postId}`;

    return {
      title: `${title} - AI Music Community`,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.created_at,
        authors: [username],
        url: postUrl,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Post - AI Music Community',
      description: 'View this post on AI Music Community',
    };
  }
}

/**
 * Post Detail Page - Server Component
 * 
 * Displays a single post with full content, comments, and interactions.
 * Implements server-side rendering for SEO and proper error handling.
 */
export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { postId } = await params;
  const cookieStore = await cookies();
  
  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Get current user session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  // Fetch post with user profile and track data directly using server client
  const { data: post, error: fetchError } = await supabase
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

  // Handle post not found - call notFound() before any error handling
  if (!post) {
    notFound();
  }

  // Handle database errors
  if (fetchError) {
    console.error('Error fetching post:', fetchError);
    
    // Check for RLS policy rejection (403)
    if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission')) {
      return <PostAccessDenied />;
    }
    
    // Handle other database errors
    return <PostNetworkError />;
  }

  try {
    // Get total like count
    const { count: likeCount } = await supabase
      .from('post_likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post.id);

    // Check if current user liked this post
    let likedByUser = false;
    if (currentUserId) {
      const { data: userLike, error: likeError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      
      likedByUser = !likeError && !!userLike;
    }

    const postWithInteractions = {
      ...post,
      like_count: likeCount || 0,
      liked_by_user: likedByUser
    };

    // Render post detail view
    return <PostDetailView post={postWithInteractions} currentUserId={currentUserId} />;
  } catch (error) {
    console.error('Error loading post interactions:', error);
    
    // If we fail to load interactions, still show the post but without interaction data
    const postWithInteractions = {
      ...post,
      like_count: 0,
      liked_by_user: false
    };

    return <PostDetailView post={postWithInteractions} currentUserId={currentUserId} />;
  }
}

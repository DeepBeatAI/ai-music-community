import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

/**
 * Posts API Route Handler
 * 
 * Provides paginated posts data for the load more functionality.
 * Matches the existing dashboard fetchPosts logic exactly.
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Posts API: Starting request...');
    
    // Test environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error - missing environment variables' },
        { status: 500 }
      );
    }
    
    console.log('✅ Environment variables OK');
    
    const { supabase } = createClient(request);
    console.log('✅ Supabase client created');
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    
    // Validate parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }
    
    // Calculate range for Supabase query
    const startRange = (page - 1) * limit;
    const endRange = startRange + limit - 1;
    
    console.log(`📊 API: Fetching posts - Page ${page} (${limit} per page) - Range: ${startRange}-${endRange}`);
    
    // Fetch posts with total count - matches dashboard logic exactly
    const { data: postsData, error: postsError, count } = await supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(startRange, endRange);

    if (postsError) {
      console.error('❌ API: Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts', details: postsError.message },
        { status: 500 }
      );
    }

    let processedPosts: any[] = [];
    
    if (postsData && postsData.length > 0) {
      // Get unique user IDs from posts
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      
      // Fetch usernames for these user IDs - matches dashboard logic
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      if (usersError) {
        console.warn('⚠️ API: Could not fetch user profiles:', usersError);
        // Continue with posts but without usernames
        processedPosts = postsData.map(post => ({
          ...post,
          user_profiles: { username: 'Unknown User', user_id: post.user_id, created_at: '', updated_at: '' }
        }));
      } else {
        // Create a map for quick lookup
        const usersMap = (usersData || []).reduce((acc: Record<string, any>, user: any) => {
          acc[user.user_id] = user;
          return acc;
        }, {} as Record<string, any>);
        
        // Join the data manually - matches dashboard logic
        processedPosts = postsData.map(post => ({
          ...post,
          user_profiles: usersMap[post.user_id] || { 
            username: 'Unknown User', 
            user_id: post.user_id, 
            created_at: '', 
            updated_at: '' 
          }
        }));
      }
    } else {
      processedPosts = postsData || [];
    }

    // Get current user for interaction data
    const { data: { user } } = await supabase.auth.getUser();
    
    // Add interaction data for each post - matches dashboard logic exactly
    const postsWithInteractions = await Promise.all(
      processedPosts.map(async (post) => {
        try {
          // Initialize default values
          let likeCount = 0;
          let userLiked = false;

          // Try to get like count
          try {
            const { count, error: likeCountError } = await supabase
              .from('post_likes')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id);

            if (!likeCountError) {
              likeCount = count || 0;
            }
          } catch (likeCountFetchError) {
            console.warn('⚠️ API: Could not fetch like count for post:', post.id, likeCountFetchError);
            // Use default value of 0
          }

          // Try to get user's like status only if user exists
          if (user) {
            try {
              const { data: likeData, error: userLikeError } = await supabase
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

              if (!userLikeError && likeData) {
                userLiked = true;
              }
            } catch (userLikeFetchError) {
              console.warn('⚠️ API: Could not fetch user like status for post:', post.id, userLikeFetchError);
              // Use default value of false
            }
          }

          return {
            ...post,
            like_count: likeCount,
            liked_by_user: userLiked
          };
        } catch (interactionError) {
          console.warn('⚠️ API: Error fetching interaction data for post:', post.id, interactionError);
          return {
            ...post,
            like_count: 0,
            liked_by_user: false
          };
        }
      })
    );

    // Calculate pagination metadata
    const totalPosts = count || 0;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasMore = page < totalPages;
    const hasNextPage = hasMore;
    const hasPreviousPage = page > 1;

    console.log(`✅ API: Successfully fetched ${postsWithInteractions.length} posts`);
    console.log(`📊 API: Pagination - Page ${page}/${totalPages}, Total: ${totalPosts}, Has More: ${hasMore}`);

    // Return response matching expected format
    return NextResponse.json({
      posts: postsWithInteractions,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        postsPerPage: limit,
        hasMore,
        hasNextPage,
        hasPreviousPage,
      },
      // Legacy fields for backward compatibility
      hasMore,
      totalCount: totalPosts,
      page,
      limit,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('❌ Posts API: Unexpected error:', error);
    console.error('❌ Posts API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Posts API internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
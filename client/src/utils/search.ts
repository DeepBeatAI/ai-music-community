import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';

export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio';
  aiTool?: string;
  sortBy?: 'relevance' | 'recent' | 'oldest' | 'popular' | 'likes';
  timeRange?: 'all' | 'today' | 'week' | 'month';
}

export interface SearchResults {
  posts: (Post & { user_profile: UserProfile; likes_count: number })[];
  users: (UserProfile & { posts_count: number; followers_count: number })[];
  totalResults: number;
}

export async function searchContent(
  filters: SearchFilters,
  page: number = 0,
  limit: number = 10
): Promise<SearchResults> {
  try {
    const offset = page * limit;
    
    // Initialize empty results
    let posts: any[] = [];
    let users: any[] = [];

    // Only search if we have a query or specific filters
    if (filters.query || filters.postType !== 'all' || filters.timeRange !== 'all') {
      
      // Build posts query with proper JOIN syntax
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          user_profiles!posts_user_id_fkey (
            id,
            username,
            user_id
          )
        `)
        .range(offset, offset + limit - 1);

      // Apply search filters
      if (filters.query && filters.query.trim()) {
        const query = filters.query.trim();
        postsQuery = postsQuery.or(
          `content.ilike.%${query}%,audio_filename.ilike.%${query}%`
        );
      }

      if (filters.postType && filters.postType !== 'all') {
        postsQuery = postsQuery.eq('post_type', filters.postType);
      }

      // Time range filtering
      if (filters.timeRange && filters.timeRange !== 'all') {
        const timeMap = {
          today: new Date(Date.now() - 24 * 60 * 60 * 1000),
          week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
        postsQuery = postsQuery.gte('created_at', timeMap[filters.timeRange].toISOString());
      }

      // Sorting
      switch (filters.sortBy) {
        case 'recent':
          postsQuery = postsQuery.order('created_at', { ascending: false });
          break;
        case 'oldest':
          postsQuery = postsQuery.order('created_at', { ascending: true });
          break;
        case 'popular':
        case 'likes':
          postsQuery = postsQuery.order('created_at', { ascending: false }); // Default to recent for now
          break;
        default:
          postsQuery = postsQuery.order('created_at', { ascending: false });
      }

      const { data: postsData, error: postsError } = await postsQuery;
      if (postsError) {
        console.error('Posts search error:', postsError);
        // Don't throw, continue with empty posts
      } else {
        posts = postsData || [];
      }

      // Search users only if we have a query
      if (filters.query && filters.query.trim()) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('username', `%${filters.query.trim()}%`)
          .range(0, 9); // Limit to 10 users

        if (usersError) {
          console.error('Users search error:', usersError);
          // Don't throw, continue with empty users
        } else {
          users = usersData || [];
        }
      }
    }

    // Transform posts data
    const transformedPosts = posts.map(post => ({
      ...post,
      user_profile: post.user_profiles,
      likes_count: 0 // Simplified for now
    }));

    // Transform users data with real stats
    const transformedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          // Get real post counts
          const { count: totalPosts } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id);
            
          const { count: audioPosts } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .eq('post_type', 'audio');
            
          const { count: textPosts } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .eq('post_type', 'text');
            
          // Get follower count
          const { count: followersCount } = await supabase
            .from('user_follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.user_id);

          return {
            ...user,
            posts_count: totalPosts || 0,
            audio_posts_count: audioPosts || 0,
            text_posts_count: textPosts || 0,
            followers_count: followersCount || 0
          };
        } catch (error) {
          console.error('Error fetching user stats:', error);
          return {
            ...user,
            posts_count: 0,
            audio_posts_count: 0,
            text_posts_count: 0,
            followers_count: 0
          };
        }
      })
    );

    return {
      posts: transformedPosts,
      users: transformedUsers,
      totalResults: transformedPosts.length + transformedUsers.length,
    };
  } catch (error) {
    console.error('Search error:', error);
    // Always return a valid SearchResults object
    return { 
      posts: [], 
      users: [], 
      totalResults: 0 
    };
  }
}

export async function getTrendingContent(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles!posts_user_id_fkey (
          id,
          username,
          user_id
        )
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Trending content error:', error);
      return [];
    }

    return (data || []).map(post => ({
      ...post,
      user_profile: post.user_profiles,
      likes_count: 0
    }));
  } catch (error) {
    console.error('Trending content error:', error);
    return [];
  }
}

export async function getFeaturedCreators(limit: number = 6) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Featured creators error:', error);
      return [];
    }

    return (data || []).map(creator => ({
      ...creator,
      user_stats: {
        posts_count: 0,
        audio_posts_count: 0,
        followers_count: 0,
        likes_received: 0
      }
    }));
  } catch (error) {
    console.error('Featured creators error:', error);
    return [];
  }
}

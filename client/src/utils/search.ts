import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// Use generated types
type Post = Database['public']['Tables']['posts']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio';
  aiTool?: string;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'likes';
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
    
    // Build posts query with corrected pagination
    let postsQuery = supabase
      .from('posts')
      .select(`
        *,
        user_profile:user_profiles(id, username),
        likes_count:post_likes(count)
      `)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.query) {
      postsQuery = postsQuery.or(
        `content.ilike.%${filters.query}%,audio_filename.ilike.%${filters.query}%`
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

    // Smart sorting algorithms
    switch (filters.sortBy) {
      case 'recent':
        postsQuery = postsQuery.order('created_at', { ascending: false });
        break;
      case 'popular':
      case 'likes':
        postsQuery = postsQuery.order('likes_count', { ascending: false });
        break;
      default:
        postsQuery = postsQuery.order('created_at', { ascending: false });
    }

    const { data: posts, error: postsError } = await postsQuery;
    if (postsError) throw postsError;

    // Build users query with corrected pagination
    let usersQuery = supabase
      .from('user_profiles')
      .select(`
        *,
        posts_count:user_stats(posts_count),
        followers_count:user_stats(followers_count)
      `)
      .range(0, 4); // Gets 5 records (0-4)

    if (filters.query) {
      usersQuery = usersQuery.ilike('username', `%${filters.query}%`);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    return {
      posts: posts || [],
      users: users || [],
      totalResults: (posts?.length || 0) + (users?.length || 0),
    };
  } catch (error) {
    console.error('Search error:', error);
    return { posts: [], users: [], totalResults: 0 };
  }
}

export async function getTrendingContent(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profile:user_profiles(id, username),
        likes_count:post_likes(count)
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('likes_count', { ascending: false })
      .range(0, limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Trending content error:', error);
    return [];
  }
}

export async function getFeaturedCreators(limit: number = 6) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_stats(posts_count, audio_posts_count, followers_count, likes_received)
      `)
      .order('user_stats(followers_count)', { ascending: false })
      .range(0, limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Featured creators error:', error);
    return [];
  }
}
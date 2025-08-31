import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';

export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio' | 'creators';
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

    // Handle "creators" filter - only search users, skip posts
    if (filters.postType === 'creators') {
      if (filters.query && filters.query.trim()) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('username', `%${filters.query.trim()}%`)
          .range(0, 19); // More users for creators-only search

        if (usersError) {
          console.error('Users search error:', usersError);
        } else {
          users = usersData || [];
        }
      }
      // Skip posts entirely when filtering for creators only
    } else {
      // Normal post search logic
      
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

      if (filters.postType && filters.postType !== 'all' && filters.postType !== 'creators') {
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

      // Initial ordering - we'll do final sorting after getting like counts
      postsQuery = postsQuery.order('created_at', { ascending: false });

      const { data: postsData, error: postsError } = await postsQuery;
      if (postsError) {
        console.error('Posts search error:', postsError);
        // Don't throw, continue with empty posts
      } else {
        posts = postsData || [];
      }

      // Search users only if we have a query and not filtering for creators only
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

    // Transform posts data with enhanced like counting
    const transformedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          // Get real like count for proper sorting
          const { count: likeCount, error: likeError } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            user_profile: post.user_profiles,
            likes_count: likeCount || 0
          };
        } catch (error) {
          console.error('Error fetching like count:', error);
          return {
            ...post,
            user_profile: post.user_profiles,
            likes_count: 0
          };
        }
      })
    );

    // Apply proper sorting after we have like counts
    let sortedPosts = [...transformedPosts];
    switch (filters.sortBy) {
      case 'recent':
        sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sortedPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'likes':
        sortedPosts.sort((a, b) => {
          const likeDiff = b.likes_count - a.likes_count;
          if (likeDiff === 0) {
            // If same likes, sort by most recent
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return likeDiff;
        });
        break;
      case 'popular':
        // Popular algorithm: combine likes and recency with weighted scoring
        sortedPosts.sort((a, b) => {
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          
          // Calculate recency score (higher for more recent posts, max 7 days)
          const aRecencyScore = Math.max(0, 7 - Math.floor((now - new Date(a.created_at).getTime()) / dayMs));
          const bRecencyScore = Math.max(0, 7 - Math.floor((now - new Date(b.created_at).getTime()) / dayMs));
          
          // Weighted score: likes * 2 + recency score
          const aScore = (a.likes_count * 2) + aRecencyScore;
          const bScore = (b.likes_count * 2) + bRecencyScore;
          
          return bScore - aScore;
        });
        break;
      case 'relevance':
        // For relevance, if we have a query, prioritize content matches
        if (filters.query && filters.query.trim()) {
          const queryLower = filters.query.toLowerCase();
          sortedPosts.sort((a, b) => {
            // Calculate relevance scores
            let aScore = 0;
            let bScore = 0;
            
            // Exact matches in content get highest score
            if (a.content.toLowerCase().includes(queryLower)) aScore += 10;
            if (b.content.toLowerCase().includes(queryLower)) bScore += 10;
            
            // Audio filename matches
            if (a.audio_filename && a.audio_filename.toLowerCase().includes(queryLower)) aScore += 8;
            if (b.audio_filename && b.audio_filename.toLowerCase().includes(queryLower)) bScore += 8;
            
            // Username matches
            if (a.user_profile?.username?.toLowerCase().includes(queryLower)) aScore += 5;
            if (b.user_profile?.username?.toLowerCase().includes(queryLower)) bScore += 5;
            
            // Add like bonus for equal relevance
            aScore += Math.min(a.likes_count, 5);
            bScore += Math.min(b.likes_count, 5);
            
            if (bScore === aScore) {
              // If equal relevance, sort by recency
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            
            return bScore - aScore;
          });
        } else {
          // No query - default to recent
          sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        break;
      default:
        // Default to recent
        sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

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
      posts: sortedPosts,
      users: transformedUsers,
      totalResults: sortedPosts.length + transformedUsers.length,
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

    // Get like counts for trending posts and sort by popularity
    const postsWithLikes = await Promise.all(
      (data || []).map(async (post) => {
        try {
          const { count: likeCount } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            user_profile: post.user_profiles,
            likes_count: likeCount || 0
          };
        } catch (error) {
          return {
            ...post,
            user_profile: post.user_profiles,
            likes_count: 0
          };
        }
      })
    );

    // Sort by trending algorithm (likes + recency)
    postsWithLikes.sort((a, b) => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      // Calculate recency score (higher for more recent posts)
      const aRecencyScore = Math.max(0, 7 - Math.floor((now - new Date(a.created_at).getTime()) / dayMs));
      const bRecencyScore = Math.max(0, 7 - Math.floor((now - new Date(b.created_at).getTime()) / dayMs));
      
      // Trending score: likes * 3 + recency score
      const aScore = (a.likes_count * 3) + aRecencyScore;
      const bScore = (b.likes_count * 3) + bRecencyScore;
      
      return bScore - aScore;
    });

    return postsWithLikes;
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
      .limit(limit * 2); // Get more to filter active ones

    if (error) {
      console.error('Featured creators error:', error);
      return [];
    }

    // Get stats for each creator and filter for active ones
    const creatorsWithStats = await Promise.all(
      (data || []).map(async (creator) => {
        try {
          const { count: postsCount } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', creator.user_id);
            
          const { count: audioPostsCount } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', creator.user_id)
            .eq('post_type', 'audio');
            
          const { count: followersCount } = await supabase
            .from('user_follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', creator.user_id);
            
          const { count: likesReceived } = await supabase
            .from('post_likes')
            .select('post_likes.id', { count: 'exact', head: true })
            .eq('posts.user_id', creator.user_id);

          return {
            ...creator,
            user_stats: {
              posts_count: postsCount || 0,
              audio_posts_count: audioPostsCount || 0,
              followers_count: followersCount || 0,
              likes_received: likesReceived || 0
            }
          };
        } catch (error) {
          console.error('Error fetching creator stats:', error);
          return {
            ...creator,
            user_stats: {
              posts_count: 0,
              audio_posts_count: 0,
              followers_count: 0,
              likes_received: 0
            }
          };
        }
      })
    );

    // Filter and sort creators by activity
    const activeCreators = creatorsWithStats
      .filter(creator => creator.user_stats.posts_count > 0)
      .sort((a, b) => {
        // Sort by engagement score
        const aScore = (a.user_stats.posts_count * 2) + a.user_stats.followers_count + a.user_stats.likes_received;
        const bScore = (b.user_stats.posts_count * 2) + b.user_stats.followers_count + b.user_stats.likes_received;
        return bScore - aScore;
      })
      .slice(0, limit);

    return activeCreators;
  } catch (error) {
    console.error('Featured creators error:', error);
    return [];
  }
}
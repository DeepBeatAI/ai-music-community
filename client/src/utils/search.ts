import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';
import { searchCache } from './searchCache';

export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio' | 'creators';
  aiTool?: string;
  sortBy?: 'relevance' | 'recent' | 'oldest' | 'popular' | 'likes';
  timeRange?: 'all' | 'today' | 'week' | 'month';
  creatorId?: string; // NEW: Filter by specific creator
  creatorUsername?: string; // NEW: For display purposes
}

export interface SearchResults {
  posts: (Post & { user_profile: UserProfile; likes_count: number })[];
  users: (UserProfile & { posts_count: number; followers_count: number; audio_posts_count?: number; text_posts_count?: number })[];
  totalResults: number;
}

// NEW: Enhanced function for dashboard filtering support
export async function getPostsForFiltering(
  postType: 'all' | 'text' | 'audio' = 'all',
  count: number = 100
): Promise<Post[]> {
  try {
    console.log(`🔍 getPostsForFiltering: Fetching ${count} posts of type '${postType}'`);
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        track:tracks(*),
        user_profiles!posts_user_id_fkey (
          username
        )
      `)
      .order('created_at', { ascending: false })
      .limit(count);

    if (postType !== 'all') {
      query = query.eq('post_type', postType);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching posts for filtering:', error);
      return [];
    }

    // Add interaction data
    const postsWithInteractions = await Promise.all(
      (data || []).map(async (post) => {
        try {
          const { count: likeCount } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            like_count: likeCount || 0,
            liked_by_user: false // Will be set properly in dashboard
          };
        } catch {
          return {
            ...post,
            like_count: 0,
            liked_by_user: false
          };
        }
      })
    );

    console.log(`✅ getPostsForFiltering: Successfully fetched ${postsWithInteractions.length} posts`);
    return postsWithInteractions;
  } catch (error) {
    console.error('Error in getPostsForFiltering:', error);
    return [];
  }
}

export async function searchContent(
  filters: SearchFilters,
  page: number = 0,
  limit: number = 200  // FIXED: Increased default limit to show more results when filtering
): Promise<SearchResults> {
  // Check cache first
  const cachedResults = searchCache.get(filters, page, limit);
  if (cachedResults) {
    console.log('Returning cached search results');
    return cachedResults;
  }

  try {
    const offset = page * limit;
    
    // Initialize empty results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let posts: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // FIXED: For filtering, get more results to ensure we capture all matching content
      const isFiltering = filters.postType !== 'all' || filters.timeRange !== 'all' || filters.query;
      const queryLimit = isFiltering ? Math.max(limit, 200) : limit; // Get significantly more when filtering
      
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          track:tracks(*),
          user_profiles!posts_user_id_fkey (
            id,
            username,
            user_id
          )
        `)
        .range(offset, offset + queryLimit - 1);

      // Apply search filters
      if (filters.query && filters.query.trim()) {
        const query = filters.query.trim();
        console.log('🔍 Search query construction:', {
          query,
          searchingColumns: ['content', 'audio_filename'],
          note: 'Track columns will be filtered client-side'
        });
        // FIXED: Only search posts table columns - track columns filtered client-side
        // PostgREST doesn't support .or() with related table columns
        postsQuery = postsQuery.or(
          `content.ilike.%${query}%,audio_filename.ilike.%${query}%`
        );
      }

      if (filters.postType && filters.postType !== 'all') {
        if (filters.postType === 'text' || filters.postType === 'audio') {
          postsQuery = postsQuery.eq('post_type', filters.postType);
        }
        // Note: 'creators' filter is handled separately in user search
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
        // Apply client-side filtering for track columns if we have a search query
        if (postsData && filters.query && filters.query.trim()) {
          const queryLower = filters.query.trim().toLowerCase();
          console.log('🔍 Applying client-side track filtering for query:', queryLower);
          
          // Filter to include posts that match in either posts columns OR track columns
          posts = postsData.filter(post => {
            // Check if already matched in posts table columns
            const matchesPostColumns = 
              post.content?.toLowerCase().includes(queryLower) ||
              post.audio_filename?.toLowerCase().includes(queryLower);
            
            // Check track columns if post has a track
            // Handles posts without tracks correctly by checking post.track first
            const matchesTrackColumns = post.track && (
              post.track.title?.toLowerCase().includes(queryLower) ||
              post.track.description?.toLowerCase().includes(queryLower)
            );
            
            // Preserve posts that match in EITHER posts columns OR track columns
            const isMatch = matchesPostColumns || matchesTrackColumns;
            
            if (matchesTrackColumns && !matchesPostColumns) {
              console.log('✅ Track match found:', {
                postId: post.id,
                trackTitle: post.track?.title,
                trackDescription: post.track?.description?.substring(0, 50),
                matchedIn: post.track?.title?.toLowerCase().includes(queryLower) ? 'title' : 'description'
              });
            }
            
            return isMatch;
          });
          
          console.log('🔍 Client-side filtering results:', {
            originalCount: postsData.length,
            filteredCount: posts.length,
            removedCount: postsData.length - posts.length,
            postsWithTracks: posts.filter(p => p.track).length,
            postsWithoutTracks: posts.filter(p => !p.track).length
          });
        } else {
          posts = postsData || [];
        }
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
    const sortedPosts = [...transformedPosts];
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
            
            // Track title matches (high priority for audio posts)
            if (a.track?.title && a.track.title.toLowerCase().includes(queryLower)) aScore += 9;
            if (b.track?.title && b.track.title.toLowerCase().includes(queryLower)) bScore += 9;
            
            // Track description matches
            if (a.track?.description && a.track.description.toLowerCase().includes(queryLower)) aScore += 7;
            if (b.track?.description && b.track.description.toLowerCase().includes(queryLower)) bScore += 7;
            
            // Audio filename matches (legacy support)
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

    const results = {
      posts: sortedPosts,
      users: transformedUsers,
      totalResults: sortedPosts.length + transformedUsers.length,
    };

    // Cache the results
    searchCache.set(filters, results, page, limit);
    
    return results;
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
        track:tracks(*),
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
        } catch {
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
            
          // Get likes received by joining posts with post_likes
          const { data: userPosts } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', creator.user_id);
          
          let likesReceived = 0;
          if (userPosts && userPosts.length > 0) {
            const postIds = userPosts.map(p => p.id);
            const { count } = await supabase
              .from('post_likes')
              .select('id', { count: 'exact', head: true })
              .in('post_id', postIds);
            likesReceived = count || 0;
          }

          return {
            ...creator,
            user_stats: {
              posts_count: postsCount || 0,
              audio_posts_count: audioPostsCount || 0,
              followers_count: followersCount || 0,
              likes_received: likesReceived
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
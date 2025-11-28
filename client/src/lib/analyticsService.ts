/**
 * Analytics Service
 * 
 * This service provides functions for fetching platform analytics and business metrics.
 * Includes user growth, content metrics, engagement, and revenue tracking.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import { supabase } from '@/lib/supabase';
import { AdminError, ADMIN_ERROR_CODES, PlatformAnalytics } from '@/types/admin';
import { 
  ADMIN_CACHE_KEYS, 
  ADMIN_CACHE_TTL,
  cachedFetch 
} from '@/utils/adminCache';

/**
 * Date range for analytics queries
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * User growth metrics
 */
export interface UserGrowthMetrics {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  growth_rate: number;
  daily_signups: Array<{ date: string; count: number }>;
}

/**
 * Content metrics
 */
export interface ContentMetrics {
  total_tracks: number;
  total_albums: number;
  total_playlists: number;
  total_posts: number;
  uploads_today: number;
  uploads_this_week: number;
  uploads_this_month: number;
  daily_uploads: Array<{ date: string; count: number }>;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  total_plays: number;
  total_likes: number;
  total_comments: number;
  total_follows: number;
  avg_plays_per_track: number;
  avg_engagement_rate: number;
  daily_engagement: Array<{ date: string; plays: number; likes: number; comments: number }>;
}

/**
 * Plan distribution
 */
export interface PlanDistribution {
  free_users: number;
  creator_pro: number;
  creator_premium: number;
}

/**
 * Revenue metrics
 */
export interface RevenueMetrics {
  mrr: number;
  arr: number;
  churn_rate: number;
  monthly_revenue: Array<{ month: string; revenue: number }>;
}

/**
 * Top creator information
 */
export interface TopCreator {
  user_id: string;
  username: string;
  followers: number;
  total_plays: number;
  total_tracks: number;
  engagement_rate: number;
  total_likes: number;
  creator_score: number;
  avatar_url: string | null;
}

/**
 * Fetch user growth metrics
 * Requirements: 7.1
 * Caching: 15 minute TTL
 */
export async function fetchUserGrowthMetrics(): Promise<UserGrowthMetrics> {
  try {
    const now = new Date();
    const dateRange = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const cacheKey = ADMIN_CACHE_KEYS.ANALYTICS_USER_GROWTH(dateRange);

    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.ANALYTICS,
      async () => {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch total users
    const { count: totalUsers, error: totalError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new AdminError(
        'Failed to fetch total users',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: totalError }
      );
    }

    // Fetch new users today
    const { count: newToday, error: todayError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) {
      throw new AdminError(
        'Failed to fetch new users today',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: todayError }
      );
    }

    // Fetch new users this week
    const { count: newThisWeek, error: weekError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    if (weekError) {
      throw new AdminError(
        'Failed to fetch new users this week',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: weekError }
      );
    }

    // Fetch new users this month
    const { count: newThisMonth, error: monthError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    if (monthError) {
      throw new AdminError(
        'Failed to fetch new users this month',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: monthError }
      );
    }

    // Calculate growth rate (month over month)
    const twoMonthsAgo = new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { count: previousMonth, error: prevError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', monthAgo.toISOString());

    if (prevError) {
      throw new AdminError(
        'Failed to fetch previous month users',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: prevError }
      );
    }

    const growthRate = previousMonth && previousMonth > 0
      ? ((newThisMonth || 0) - previousMonth) / previousMonth * 100
      : 0;

    // Fetch daily signups for the last 30 days
    const dailySignups: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      if (!error) {
        dailySignups.push({
          date: date.toISOString().split('T')[0],
          count: count || 0,
        });
      }
    }

        return {
          total_users: totalUsers || 0,
          new_users_today: newToday || 0,
          new_users_this_week: newThisWeek || 0,
          new_users_this_month: newThisMonth || 0,
          growth_rate: growthRate,
          daily_signups: dailySignups,
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching user growth metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch content metrics
 * Requirements: 7.2
 * Caching: 15 minute TTL
 * @param days - Number of days to look back (optional, defaults to all time)
 */
export async function fetchContentMetrics(days?: number): Promise<ContentMetrics> {
  try {
    const now = new Date();
    const dateRange = days ? `${days}days` : 'all';
    const cacheKey = ADMIN_CACHE_KEYS.ANALYTICS_CONTENT(dateRange);

    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.ANALYTICS,
      async () => {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Calculate start date for filtering if days parameter is provided
        const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

    // Fetch total counts (filtered by date range if specified)
    const tracksQuery = supabase.from('tracks').select('*', { count: 'exact', head: true });
    const albumsQuery = supabase.from('albums').select('*', { count: 'exact', head: true });
    const playlistsQuery = supabase.from('playlists').select('*', { count: 'exact', head: true });
    const postsQuery = supabase.from('posts').select('*', { count: 'exact', head: true });
    
    if (startDate) {
      tracksQuery.gte('created_at', startDate.toISOString());
      albumsQuery.gte('created_at', startDate.toISOString());
      playlistsQuery.gte('created_at', startDate.toISOString());
      postsQuery.gte('created_at', startDate.toISOString());
    }
    
    const [tracks, albums, playlists, posts] = await Promise.all([
      tracksQuery,
      albumsQuery,
      playlistsQuery,
      postsQuery,
    ]);

    // Fetch uploads today (tracks + albums)
    const [tracksToday, albumsToday] = await Promise.all([
      supabase.from('tracks').select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('albums').select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
    ]);

    // Fetch uploads this week
    const [tracksWeek, albumsWeek] = await Promise.all([
      supabase.from('tracks').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),
      supabase.from('albums').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),
    ]);

    // Fetch uploads this month
    const [tracksMonth, albumsMonth] = await Promise.all([
      supabase.from('tracks').select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString()),
      supabase.from('albums').select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString()),
    ]);

        return {
          total_tracks: tracks.count || 0,
          total_albums: albums.count || 0,
          total_playlists: playlists.count || 0,
          total_posts: posts.count || 0,
          uploads_today: (tracksToday.count || 0) + (albumsToday.count || 0),
          uploads_this_week: (tracksWeek.count || 0) + (albumsWeek.count || 0),
          uploads_this_month: (tracksMonth.count || 0) + (albumsMonth.count || 0),
          daily_uploads: [], // Would be populated with daily breakdown
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching content metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch engagement metrics
 * Requirements: 7.3
 * @param days - Number of days to look back (optional, defaults to all time)
 */
export async function fetchEngagementMetrics(days?: number): Promise<EngagementMetrics> {
  try {
    const now = new Date();
    const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
    
    // Fetch total plays from tracks table
    // Note: play_count is cumulative, so for time-filtered queries we'd need a plays history table
    // For now, we'll fetch all tracks and filter by creation date as a proxy
    const tracksQuery = supabase.from('tracks').select('play_count, created_at');
    
    if (startDate) {
      tracksQuery.gte('created_at', startDate.toISOString());
    }
    
    const { data: playData, error: playError } = await tracksQuery;

    if (playError) {
      throw new AdminError(
        'Failed to fetch play counts',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: playError }
      );
    }

    const totalPlays = (playData || []).reduce((sum, row: { play_count?: number }) => sum + (row.play_count || 0), 0);

    // Fetch total likes (filtered by date if specified)
    const likesQuery = supabase.from('post_likes').select('*', { count: 'exact', head: true });
    if (startDate) {
      likesQuery.gte('created_at', startDate.toISOString());
    }
    const { count: totalLikes, error: likesError } = await likesQuery;

    if (likesError) {
      throw new AdminError(
        'Failed to fetch likes count',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: likesError }
      );
    }

    // Fetch total comments (filtered by date if specified)
    const commentsQuery = supabase.from('comments').select('*', { count: 'exact', head: true });
    if (startDate) {
      commentsQuery.gte('created_at', startDate.toISOString());
    }
    const { count: totalComments, error: commentsError } = await commentsQuery;

    if (commentsError) {
      throw new AdminError(
        'Failed to fetch comments count',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: commentsError }
      );
    }

    // Fetch total follows (filtered by date if specified)
    const followsQuery = supabase.from('user_follows').select('*', { count: 'exact', head: true });
    if (startDate) {
      followsQuery.gte('created_at', startDate.toISOString());
    }
    const { count: totalFollows, error: followsError } = await followsQuery;

    if (followsError) {
      throw new AdminError(
        'Failed to fetch follows count',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: followsError }
      );
    }

    // Fetch total tracks for average calculation
    const { count: totalTracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true });

    if (tracksError) {
      throw new AdminError(
        'Failed to fetch tracks count',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: tracksError }
      );
    }

    const avgPlaysPerTrack = totalTracks && totalTracks > 0
      ? totalPlays / totalTracks
      : 0;

    // Calculate engagement rate (likes + comments) / plays
    const totalEngagements = (totalLikes || 0) + (totalComments || 0);
    const avgEngagementRate = totalPlays > 0
      ? (totalEngagements / totalPlays) * 100
      : 0;

    return {
      total_plays: totalPlays,
      total_likes: totalLikes || 0,
      total_comments: totalComments || 0,
      total_follows: totalFollows || 0,
      avg_plays_per_track: avgPlaysPerTrack,
      avg_engagement_rate: avgEngagementRate,
      daily_engagement: [], // Would be populated with daily breakdown
    };
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching engagement metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch plan distribution
 * Requirements: 7.4
 */
export async function fetchPlanDistribution(): Promise<PlanDistribution> {
  try {
    const { data, error } = await supabase
      .from('user_plan_tiers')
      .select('plan_tier');

    if (error) {
      throw new AdminError(
        'Failed to fetch plan distribution',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    const distribution: PlanDistribution = {
      free_users: 0,
      creator_pro: 0,
      creator_premium: 0,
    };

    (data || []).forEach((row: { plan_tier: string }) => {
      switch (row.plan_tier) {
        case 'free_user':
          distribution.free_users++;
          break;
        case 'creator_pro':
          distribution.creator_pro++;
          break;
        case 'creator_premium':
          distribution.creator_premium++;
          break;
      }
    });

    return distribution;
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching plan distribution',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch revenue metrics
 * Requirements: 7.5
 */
export async function fetchRevenueMetrics(): Promise<RevenueMetrics> {
  try {
    const distribution = await fetchPlanDistribution();

    // Calculate MRR based on plan pricing
    // Assuming: Creator Pro = $10/month, Creator Premium = $50/month
    const creatorProPrice = 10;
    const creatorPremiumPrice = 50;

    const mrr = (distribution.creator_pro * creatorProPrice) +
                (distribution.creator_premium * creatorPremiumPrice);
    const arr = mrr * 12;

    // Calculate churn rate (would need historical data in real implementation)
    const churnRate = 2.3; // Mock value, would be calculated from actual data

    return {
      mrr,
      arr,
      churn_rate: churnRate,
      monthly_revenue: [], // Would be populated with historical data
    };
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching revenue metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch top creators
 * Requirements: 7.7
 */
export async function fetchTopCreators(limit = 10): Promise<TopCreator[]> {
  try {
    // Use the same database function as the discover page
    // This ensures consistent ranking logic: creator_score = (total_plays × 0.6) + (total_likes × 0.4)
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 0, // 0 means all time
      result_limit: limit,
    });

    if (error) {
      throw new AdminError(
        'Failed to fetch top creators',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Transform to TopCreator format
    return (data || []).map((creator: {
      user_id: string;
      username: string;
      avatar_url: string | null;
      track_count: number;
      total_plays: number;
      total_likes: number;
      creator_score: number;
    }) => ({
      user_id: creator.user_id,
      username: creator.username,
      followers: 0, // Not used in new display
      total_plays: creator.total_plays,
      total_tracks: creator.track_count,
      engagement_rate: 0, // Not used in new display
      total_likes: creator.total_likes,
      creator_score: creator.creator_score,
      avatar_url: creator.avatar_url,
    }));
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching top creators',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Export analytics data to CSV
 * Requirements: 7.8
 */
export async function exportAnalyticsData(
  dataType: 'users' | 'content' | 'engagement' | 'revenue'
): Promise<string> {
  try {
    let csvData = '';

    switch (dataType) {
      case 'users': {
        const metrics = await fetchUserGrowthMetrics();
        csvData = 'Date,New Users\n';
        metrics.daily_signups.forEach(day => {
          csvData += `${day.date},${day.count}\n`;
        });
        break;
      }

      case 'content': {
        const metrics = await fetchContentMetrics();
        csvData = 'Metric,Value\n';
        csvData += `Total Tracks,${metrics.total_tracks}\n`;
        csvData += `Total Albums,${metrics.total_albums}\n`;
        csvData += `Total Playlists,${metrics.total_playlists}\n`;
        csvData += `Total Posts,${metrics.total_posts}\n`;
        csvData += `Uploads Today,${metrics.uploads_today}\n`;
        csvData += `Uploads This Week,${metrics.uploads_this_week}\n`;
        csvData += `Uploads This Month,${metrics.uploads_this_month}\n`;
        break;
      }

      case 'engagement': {
        const metrics = await fetchEngagementMetrics();
        csvData = 'Metric,Value\n';
        csvData += `Total Plays,${metrics.total_plays}\n`;
        csvData += `Total Likes,${metrics.total_likes}\n`;
        csvData += `Total Comments,${metrics.total_comments}\n`;
        csvData += `Total Follows,${metrics.total_follows}\n`;
        csvData += `Avg Plays Per Track,${metrics.avg_plays_per_track.toFixed(2)}\n`;
        csvData += `Avg Engagement Rate,${metrics.avg_engagement_rate.toFixed(2)}%\n`;
        break;
      }

      case 'revenue': {
        const metrics = await fetchRevenueMetrics();
        csvData = 'Metric,Value\n';
        csvData += `MRR,$${metrics.mrr.toFixed(2)}\n`;
        csvData += `ARR,$${metrics.arr.toFixed(2)}\n`;
        csvData += `Churn Rate,${metrics.churn_rate.toFixed(2)}%\n`;
        break;
      }
    }

    return csvData;
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while exporting analytics data',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch complete platform analytics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  try {
    const [userGrowth, content, engagement, planDist, revenue] = await Promise.all([
      fetchUserGrowthMetrics(),
      fetchContentMetrics(),
      fetchEngagementMetrics(),
      fetchPlanDistribution(),
      fetchRevenueMetrics(),
    ]);

    return {
      user_growth: {
        total_users: userGrowth.total_users,
        new_users_today: userGrowth.new_users_today,
        new_users_this_week: userGrowth.new_users_this_week,
        new_users_this_month: userGrowth.new_users_this_month,
        growth_rate: userGrowth.growth_rate,
      },
      content_metrics: {
        total_tracks: content.total_tracks,
        total_albums: content.total_albums,
        total_playlists: content.total_playlists,
        total_posts: content.total_posts,
        uploads_today: content.uploads_today,
        uploads_this_week: content.uploads_this_week,
        uploads_this_month: content.uploads_this_month,
      },
      engagement_metrics: {
        total_plays: engagement.total_plays,
        total_likes: engagement.total_likes,
        total_comments: engagement.total_comments,
        total_follows: engagement.total_follows,
        avg_plays_per_track: engagement.avg_plays_per_track,
        avg_engagement_rate: engagement.avg_engagement_rate,
      },
      plan_distribution: planDist,
      revenue_metrics: revenue,
    };
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching platform analytics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

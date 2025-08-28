import { supabase } from '@/lib/supabase';

export interface UserStats {
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

export const getUserStats = async (userId: string): Promise<{ data: UserStats | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats found, return calculated values from actual database
        return await calculateUserStatsFromDatabase(userId);
      }
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching user stats:', err);
    return { data: null, error: 'Failed to fetch user statistics' };
  }
};

// Calculate stats directly from database tables to ensure accuracy
export const calculateUserStatsFromDatabase = async (userId: string): Promise<{ data: UserStats | null; error: string | null }> => {
  try {
    // Get all stats by querying the actual source tables
    const [
      postsResult,
      audioPostsResult,
      likesGivenResult,
      likesReceivedResult,
      followersResult,
      followingResult
    ] = await Promise.all([
      // Posts count
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Audio posts count  
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('post_type', 'audio'),
      
      // Likes given
      supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Likes received (join with posts to get posts owned by user)
      supabase
        .from('post_likes')
        .select('posts!inner(*)', { count: 'exact', head: true })
        .eq('posts.user_id', userId),
      
      // Followers count
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      
      // Following count
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
    ]);

    const calculatedStats: UserStats = {
      posts_count: postsResult.count || 0,
      audio_posts_count: audioPostsResult.count || 0,
      likes_given: likesGivenResult.count || 0,
      likes_received: likesReceivedResult.count || 0,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
      total_plays: 0, // Will be implemented when audio player is added
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { data: calculatedStats, error: null };
  } catch (err) {
    console.error('Error calculating user stats from database:', err);
    return { data: null, error: 'Failed to calculate user statistics' };
  }
};

// Sync calculated stats to user_stats table (for current user only due to RLS)
export const syncMyStatsToDatabase = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Calculate actual stats from database
    const { data: calculatedStats, error: calcError } = await calculateUserStatsFromDatabase(user.id);
    
    if (calcError || !calculatedStats) {
      return { success: false, error: calcError || 'Failed to calculate stats' };
    }

    // Upsert the calculated stats to user_stats table
    const { error: upsertError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.id,
        posts_count: calculatedStats.posts_count,
        audio_posts_count: calculatedStats.audio_posts_count,
        likes_given: calculatedStats.likes_given,
        likes_received: calculatedStats.likes_received,
        followers_count: calculatedStats.followers_count,
        following_count: calculatedStats.following_count,
        total_plays: calculatedStats.total_plays,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error syncing stats to database:', upsertError);
      return { success: false, error: 'Failed to sync stats' };
    }

    console.log('Successfully synced stats to database for user:', user.id);
    return { success: true };

  } catch (error) {
    console.error('Error in syncMyStatsToDatabase:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Refresh user statistics - ensures accuracy by recalculating from source data
export const refreshUserStats = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // If this is the current user, sync their stats to ensure accuracy
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!authError && user && user.id === userId) {
      // For current user, sync calculated stats to database
      return await syncMyStatsToDatabase();
    } else {
      // For other users, we can't update their stats due to RLS, but we can still calculate them
      const { data: calculatedStats, error: calcError } = await calculateUserStatsFromDatabase(userId);
      
      if (calcError) {
        return { success: false, error: calcError };
      }

      console.log(`Calculated stats for user ${userId}:`, calculatedStats);
      return { success: true };
    }

  } catch (err) {
    console.error('Error refreshing user stats:', err);
    return { success: false, error: 'Failed to refresh user statistics' };
  }
};

// Trigger stats recalculation after user actions
export const triggerStatsUpdate = async (affectedUserIds: string[]): Promise<void> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Not authenticated for stats update');
      return;
    }

    // Update current user's stats (we can only update our own due to RLS)
    if (affectedUserIds.includes(user.id)) {
      syncMyStatsToDatabase().catch(err => 
        console.error('Failed to sync current user stats:', err)
      );
    }

    // For other affected users, we can't update their stored stats due to RLS
    // but the calculateUserStatsFromDatabase function will always return accurate data
    console.log(`Triggered stats update for users: ${affectedUserIds.join(', ')}`);

  } catch (error) {
    console.error('Error in triggerStatsUpdate:', error);
  }
};

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import MetricsGrid from '@/components/MetricsGrid';
import ActivityChart from '@/components/ActivityChart';

interface PlatformMetrics {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
}

interface ActivityDataPoint {
  date: string;
  posts: number;
  comments: number;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch platform metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        setMetricsLoading(true);
        setMetricsError(null);

        // Query total users count
        const { count: usersCount, error: usersError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Query total posts count
        const { count: postsCount, error: postsError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });

        if (postsError) throw postsError;

        // Query total comments count
        const { count: commentsCount, error: commentsError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });

        if (commentsError) throw commentsError;

        setMetrics({
          totalUsers: usersCount || 0,
          totalPosts: postsCount || 0,
          totalComments: commentsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching platform metrics:', error);
        setMetricsError('Failed to load platform metrics. Please try again.');
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  // Fetch activity data over time
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user) return;

      try {
        setActivityLoading(true);

        // Get data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch posts grouped by date
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (postsError) throw postsError;

        // Fetch comments grouped by date
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        // Group data by date
        const activityMap = new Map<string, { posts: number; comments: number }>();

        // Initialize all dates in the range
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toISOString().split('T')[0];
          activityMap.set(dateStr, { posts: 0, comments: 0 });
        }

        // Count posts by date
        postsData?.forEach((post) => {
          const dateStr = post.created_at.split('T')[0];
          const existing = activityMap.get(dateStr);
          if (existing) {
            existing.posts += 1;
          }
        });

        // Count comments by date
        commentsData?.forEach((comment) => {
          const dateStr = comment.created_at.split('T')[0];
          const existing = activityMap.get(dateStr);
          if (existing) {
            existing.comments += 1;
          }
        });

        // Convert to array format
        const activityArray: ActivityDataPoint[] = Array.from(activityMap.entries())
          .map(([date, counts]) => ({
            date,
            posts: counts.posts,
            comments: counts.comments,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setActivityData(activityArray);
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchActivityData();
  }, [user]);

  // Show loading state while checking auth
  if (!isClient || loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render content if not authenticated
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title and Description */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Platform Analytics
          </h1>
          <p className="text-gray-400">
            Track platform growth and user engagement metrics
          </p>
        </div>

        {/* Metrics Display */}
        {metricsError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">{metricsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        ) : metrics ? (
          <div className="mb-8">
            <MetricsGrid
              totalUsers={metrics.totalUsers}
              totalPosts={metrics.totalPosts}
              totalComments={metrics.totalComments}
            />
          </div>
        ) : null}

        {/* Activity Chart */}
        {activityLoading ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        ) : (
          <ActivityChart data={activityData} />
        )}
      </div>
    </MainLayout>
  );
}

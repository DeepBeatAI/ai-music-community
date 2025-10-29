'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import MetricsGrid from '@/components/MetricsGrid';
import ActivityChart from '@/components/ActivityChart';
import { fetchCurrentMetrics, fetchActivityData } from '@/lib/analytics';
import type { CurrentMetrics, ActivityDataPoint } from '@/types/analytics';
import MetricCollectionMonitor from '@/components/MetricCollectionMonitor';
import { TrendingSection } from '@/components/analytics/TrendingSection';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [metrics, setMetrics] = useState<CurrentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  /**
   * Retry utility function with exponential backoff
   * Attempts to execute a function with retries on failure
   */
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        
        // Don't wait after the last attempt
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError;
  };

  // Fetch platform metrics with retry logic
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;

      try {
        setMetricsLoading(true);
        setMetricsError(null);

        // Use the new analytics API to fetch current metrics with retry
        const currentMetrics = await retryWithBackoff(() => fetchCurrentMetrics());
        setMetrics(currentMetrics);
      } catch (error) {
        console.error('Error fetching platform metrics:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setMetricsError(`Failed to load platform metrics: ${errorMessage}`);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, [user, retryCount]);

  // Fetch activity data over time with retry logic
  useEffect(() => {
    const loadActivityData = async () => {
      if (!user) return;

      try {
        setActivityLoading(true);
        setActivityError(null);

        // Use the new analytics API to fetch activity data with retry
        const activityArray = await retryWithBackoff(() => fetchActivityData());
        setActivityData(activityArray);
      } catch (error) {
        console.error('Error fetching activity data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setActivityError(`Failed to load activity data: ${errorMessage}`);
      } finally {
        setActivityLoading(false);
      }
    };

    loadActivityData();
  }, [user, retryCount]);

  /**
   * Manual refresh handler
   * Increments retry count to trigger data refetch
   */
  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Platform Analytics
            </h1>
            <p className="text-gray-400">
              Track platform growth and user engagement metrics
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={metricsLoading || activityLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            title="Refresh analytics data"
          >
            <svg 
              className={`w-4 h-4 ${metricsLoading || activityLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            {metricsLoading || activityLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Display */}
        {(metricsError || activityError) && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-2">Error Loading Analytics</h3>
                {metricsError && (
                  <p className="text-red-300 text-sm mb-1">• {metricsError}</p>
                )}
                {activityError && (
                  <p className="text-red-300 text-sm mb-1">• {activityError}</p>
                )}
                <p className="text-gray-400 text-sm mt-2">
                  The system will automatically retry. You can also manually refresh the data.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={metricsLoading || activityLoading}
                className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
              >
                {metricsLoading || activityLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

        {/* Metrics Display */}

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
        ) : activityError ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Activity Over Time</h2>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Unable to load activity chart</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <ActivityChart data={activityData} />
        )}

        {/* Trending & Popular Section */}
        <div className="mt-8">
          <TrendingSection />
        </div>

        {/* Admin Monitoring Section */}
        <div className="mt-8">
          <MetricCollectionMonitor />
        </div>
      </div>
    </MainLayout>
  );
}

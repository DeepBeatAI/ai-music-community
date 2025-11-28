'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  fetchUserGrowthMetrics,
  fetchContentMetrics,
  fetchEngagementMetrics,
  fetchPlanDistribution,
  fetchTopCreators,
  exportAnalyticsData,
} from '@/lib/analyticsService';
import { fetchActivityData } from '@/lib/analytics';
import ActivityChart from '@/components/ActivityChart';
import type { PlatformAnalytics } from '@/types/admin';
import type { ActivityDataPoint } from '@/types/analytics';

// Smart number formatting utility
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [topCreators, setTopCreators] = useState<Array<{
    user_id: string;
    username: string;
    followers: number;
    total_tracks: number;
    total_plays: number;
    engagement_rate: number;
    total_likes: number;
    creator_score: number;
    avatar_url: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    engagement: true,
    content: true,
    trends: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert dateRange to days parameter
      const days = dateRange === 'all' ? undefined : parseInt(dateRange);
      
      const [userGrowth, content, engagement, planDist, creators] = await Promise.all([
        fetchUserGrowthMetrics(),
        fetchContentMetrics(days),
        fetchEngagementMetrics(days),
        fetchPlanDistribution(),
        fetchTopCreators(3),
      ]);

      setAnalytics({
        user_growth: userGrowth,
        content_metrics: content,
        engagement_metrics: engagement,
        plan_distribution: planDist,
        revenue_metrics: {
          mrr: 0, // Will be calculated from plan distribution
          arr: 0,
          churn_rate: 0,
        },
      });

      setTopCreators(creators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityData = async () => {
    setActivityLoading(true);
    try {
      // Convert dateRange to days parameter (null for 'all')
      const days = dateRange === 'all' ? null : parseInt(dateRange);
      const data = await fetchActivityData(days);
      setActivityData(data);
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadActivityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleExport = async () => {
    setExporting(true);

    try {
      const csvData = await exportAnalyticsData('users');

      // Create download link
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export analytics');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-8 text-gray-700">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            <span className="text-sm text-gray-600 italic">
              {dateRange === 'all' 
                ? 'Showing all-time data' 
                : `Showing data from the last ${dateRange} days`}
            </span>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded mx-1">All Time</span> 
            sections show cumulative data. 
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded mx-1">Filtered</span> 
            sections respect the selected timeframe.
          </span>
        </div>
      </div>

      {/* User Growth */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">All Time</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-700 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.user_growth.total_users.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">New Today</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.user_growth.new_users_today}</p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">New This Week</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.user_growth.new_users_this_week}</p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">New This Month</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.user_growth.new_users_this_month}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-gray-700">
              Growth Rate:{' '}
              <span
                className={`font-semibold ${
                  analytics.user_growth.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {analytics.user_growth.growth_rate >= 0 ? '+' : ''}
                {analytics.user_growth.growth_rate.toFixed(1)}%
              </span>
            </p>
            <div className="group relative">
              <svg className="w-4 h-4 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                (This Month - Previous Month) / Previous Month × 100
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">All Time</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            // Calculate total from plan distribution to ensure accuracy
            const totalWithPlans = 
              analytics.plan_distribution.free_users +
              analytics.plan_distribution.creator_pro +
              analytics.plan_distribution.creator_premium;
            
            return (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 text-sm mb-1">Free Users</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.plan_distribution.free_users.toLocaleString()}</p>
                  <p className="text-sm text-gray-700">
                    {totalWithPlans > 0
                      ? `${((analytics.plan_distribution.free_users / totalWithPlans) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700 text-sm mb-1">Creator Pro</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.plan_distribution.creator_pro.toLocaleString()}</p>
                  <p className="text-sm text-gray-700">
                    {totalWithPlans > 0
                      ? `${((analytics.plan_distribution.creator_pro / totalWithPlans) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-gray-700 text-sm mb-1">Creator Premium</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.plan_distribution.creator_premium.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    {totalWithPlans > 0
                      ? `${((analytics.plan_distribution.creator_premium / totalWithPlans) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Content Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Metrics</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
            {dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-700 text-sm">Total Tracks</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.content_metrics.total_tracks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Albums</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.content_metrics.total_albums.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Playlists</p>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.content_metrics.total_playlists.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.content_metrics.total_posts.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-700">Uploads Today</p>
            <p className="text-lg font-semibold text-gray-900">{analytics.content_metrics.uploads_today}</p>
          </div>
          <div>
            <p className="text-gray-700">Uploads This Week</p>
            <p className="text-lg font-semibold text-gray-900">{analytics.content_metrics.uploads_this_week}</p>
          </div>
          <div>
            <p className="text-gray-700">Uploads This Month</p>
            <p className="text-lg font-semibold text-gray-900">{analytics.content_metrics.uploads_this_month}</p>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Engagement Metrics</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
            {dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-700 text-sm">Total Plays</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(analytics.engagement_metrics.total_plays)}
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Likes</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(analytics.engagement_metrics.total_likes)}
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(analytics.engagement_metrics.total_comments)}
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Follows</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(analytics.engagement_metrics.total_follows)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-700">Avg Plays per Track</p>
            <p className="text-lg font-semibold text-gray-900">
              {analytics.engagement_metrics.avg_plays_per_track.toFixed(1)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-gray-700">Engagement Rate</p>
              <div className="group relative">
                <svg className="w-4 h-4 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                  (Likes + Comments) / Total Plays × 100
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {analytics.engagement_metrics.avg_engagement_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Top Creators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Creators</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">All Time</span>
        </div>
        {topCreators.length === 0 ? (
          <p className="text-gray-700 text-center py-4">No creator data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCreators.map((creator, index) => (
              <div
                key={creator.user_id}
                className="relative p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Rank Badge */}
                <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  #{index + 1}
                </div>

                {/* Creator Info */}
                <div className="flex items-center gap-3 mb-3">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.username}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{creator.username}</h4>
                    <p className="text-sm text-gray-600">{creator.total_tracks} tracks</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{formatNumber(creator.total_plays)}</div>
                    <div className="text-gray-600 text-xs">Total Plays</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{formatNumber(creator.total_likes)}</div>
                    <div className="text-gray-600 text-xs">Total Likes</div>
                  </div>
                </div>

                {/* Score */}
                <div className="pt-3 border-t border-gray-300">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {creator.creator_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">Creator Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Trends - Collapsible */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection('trends')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Activity Trends</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
              {dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-700 transition-transform ${expandedSections.trends ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.trends && (
          <div className="px-6 pb-6 border-t border-gray-200">
            {activityLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700">Loading activity data...</p>
              </div>
            ) : activityData.length > 0 ? (
              <div className="mt-4">
                <ActivityChart data={activityData} />
              </div>
            ) : (
              <div className="py-12 text-center text-gray-700">
                No activity data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

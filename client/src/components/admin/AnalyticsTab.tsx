'use client';

import { useState, useEffect } from 'react';
import {
  fetchUserGrowthMetrics,
  fetchContentMetrics,
  fetchEngagementMetrics,
  fetchPlanDistribution,
  fetchTopCreators,
  exportAnalyticsData,
} from '@/lib/analyticsService';
import type { PlatformAnalytics } from '@/types/admin';

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [topCreators, setTopCreators] = useState<Array<{
    user_id: string;
    username: string;
    followers: number;
    total_tracks: number;
    total_plays: number;
    engagement_rate: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [exporting, setExporting] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [userGrowth, content, engagement, planDist, creators] = await Promise.all([
        fetchUserGrowthMetrics(),
        fetchContentMetrics(),
        fetchEngagementMetrics(),
        fetchPlanDistribution(),
        fetchTopCreators(10),
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

  useEffect(() => {
    loadAnalytics();
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
      <div className="flex items-center justify-between">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* User Growth */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
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
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 text-sm mb-1">Free Users</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.plan_distribution.free_users.toLocaleString()}</p>
            <p className="text-sm text-gray-700">
              {(
                (analytics.plan_distribution.free_users / analytics.user_growth.total_users) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-700 text-sm mb-1">Creator Pro</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.plan_distribution.creator_pro.toLocaleString()}</p>
            <p className="text-sm text-gray-700">
              {(
                (analytics.plan_distribution.creator_pro / analytics.user_growth.total_users) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-gray-700 text-sm mb-1">Creator Premium</p>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.plan_distribution.creator_premium.toLocaleString()}
            </p>
            <p className="text-sm text-gray-700">
              {(
                (analytics.plan_distribution.creator_premium / analytics.user_growth.total_users) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Content Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Metrics</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-700 text-sm">Total Plays</p>
            <p className="text-2xl font-bold text-gray-900">
              {(analytics.engagement_metrics.total_plays / 1000).toFixed(1)}K
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Likes</p>
            <p className="text-2xl font-bold text-gray-900">
              {(analytics.engagement_metrics.total_likes / 1000).toFixed(1)}K
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">
              {(analytics.engagement_metrics.total_comments / 1000).toFixed(1)}K
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">Total Follows</p>
            <p className="text-2xl font-bold text-gray-900">
              {(analytics.engagement_metrics.total_follows / 1000).toFixed(1)}K
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
            <p className="text-gray-700">Engagement Rate</p>
            <p className="text-lg font-semibold text-gray-900">
              {analytics.engagement_metrics.avg_engagement_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Top Creators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Creators</h3>
        {topCreators.length === 0 ? (
          <p className="text-gray-700 text-center py-4">No creator data available</p>
        ) : (
          <div className="space-y-3">
            {topCreators.map((creator, index) => (
              <div
                key={creator.user_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{creator.username}</p>
                    <p className="text-sm text-gray-700">
                      {creator.followers} followers • {creator.total_tracks} tracks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">Total Plays</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(creator.total_plays / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

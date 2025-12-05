'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchPlatformConfig,
  updatePlatformConfig,
  updateFeatureFlag,
} from '@/lib/platformConfigService';
import type { PlatformConfig } from '@/types/admin';
import { supabase } from '@/lib/supabase';

interface ModerationStats {
  pending_reports: number;
  total_reports_today: number;
  total_actions_today: number;
}

export function PlatformAdminTab() {
  const router = useRouter();
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [moderationLoading, setModerationLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    moderation: false,
    featureFlags: true,
    uploadLimits: true,
    rateLimits: true,
    emailTemplates: true,
    systemSettings: true,
  });

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPlatformConfig();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStats = async () => {
    setModerationLoading(true);
    try {
      // Get pending reports count
      const { count: pendingCount } = await supabase
        .from('moderation_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);

      // Get today's reports count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayReportsCount } = await supabase
        .from('moderation_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get today's actions count
      const { count: todayActionsCount } = await supabase
        .from('moderation_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setModerationStats({
        pending_reports: pendingCount || 0,
        total_reports_today: todayReportsCount || 0,
        total_actions_today: todayActionsCount || 0,
      });
    } catch (err) {
      console.error('Failed to load moderation stats:', err);
      setModerationStats({
        pending_reports: 0,
        total_reports_today: 0,
        total_actions_today: 0,
      });
    } finally {
      setModerationLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadModerationStats();
  }, []);

  const handleEdit = (config: PlatformConfig) => {
    setEditingConfig(config.config_key);
    setEditValue(JSON.stringify(config.config_value, null, 2));
  };

  const handleSave = async (configKey: string) => {
    try {
      const value = JSON.parse(editValue);
      await updatePlatformConfig(configKey, value);
      setEditingConfig(null);
      loadConfigs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update configuration');
    }
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setEditValue('');
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleToggleFeatureFlag = async (flagKey: string, currentValue: boolean) => {
    try {
      await updateFeatureFlag(flagKey, !currentValue);
      loadConfigs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle feature flag');
    }
  };

  // Group configs by type
  const featureFlags = configs.filter((c) => c.config_type === 'feature_flag');
  const uploadLimits = configs.filter((c) => c.config_type === 'upload_limit');
  const rateLimits = configs.filter((c) => c.config_type === 'rate_limit');
  const emailTemplates = configs.filter((c) => c.config_type === 'email_template');
  const systemSettings = configs.filter((c) => c.config_type === 'system_setting');

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Loading platform configuration...</p>
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

  return (
    <div className="space-y-8">
      {/* Moderation Summary */}
      <div>
        <button
          onClick={() => toggleSection('moderation')}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          <span className="transform transition-transform" style={{ transform: collapsedSections['moderation'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span>🛡️ Moderation System</span>
        </button>
        {!collapsedSections['moderation'] && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {moderationLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-700">Loading moderation stats...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-yellow-800 font-medium mb-1">Pending Reports</div>
                    <div className="text-3xl font-bold text-yellow-900">
                      {moderationStats?.pending_reports || 0}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-800 font-medium mb-1">Reports Today</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {moderationStats?.total_reports_today || 0}
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-800 font-medium mb-1">Actions Today</div>
                    <div className="text-3xl font-bold text-green-900">
                      {moderationStats?.total_actions_today || 0}
                    </div>
                  </div>
                </div>

                {/* Link to Moderation Dashboard */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/moderation')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>🛡️</span>
                    <span>Open Moderation Dashboard</span>
                    <span>→</span>
                  </button>
                  <p className="text-sm text-gray-700 mt-2 text-center">
                    Access the full moderation dashboard to review reports, take actions, and view detailed metrics
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Flags */}
      <div>
        <button
          onClick={() => toggleSection('featureFlags')}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          <span className="transform transition-transform" style={{ transform: collapsedSections['featureFlags'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span>Feature Flags</span>
        </button>
        {!collapsedSections['featureFlags'] && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {featureFlags.length === 0 ? (
            <div className="p-4 text-gray-700 text-center">No feature flags configured</div>
          ) : (
            featureFlags.map((config) => (
              <div key={config.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{config.config_key}</div>
                  {config.description && (
                    <div className="text-sm text-gray-700">{config.description}</div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    {config.config_value?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() =>
                      handleToggleFeatureFlag(
                        config.config_key,
                        config.config_value?.enabled === true
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      config.config_value?.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.config_value?.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Upload Limits */}
      <div>
        <button
          onClick={() => toggleSection('uploadLimits')}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          <span className="transform transition-transform" style={{ transform: collapsedSections['uploadLimits'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span>Upload Limits by Plan Tier</span>
        </button>
        {!collapsedSections['uploadLimits'] && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {uploadLimits.length === 0 ? (
            <div className="p-4 text-gray-700 text-center">No upload limits configured</div>
          ) : (
            uploadLimits.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{config.config_key}</div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
                {editingConfig === config.config_key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm text-gray-900"
                      rows={5}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(config.config_key)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Rate Limiting */}
      <div>
        <button
          onClick={() => toggleSection('rateLimits')}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          <span className="transform transition-transform" style={{ transform: collapsedSections['rateLimits'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span>Rate Limiting</span>
        </button>
        {!collapsedSections['rateLimits'] && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {rateLimits.length === 0 ? (
            <div className="p-4 text-gray-700 text-center">No rate limits configured</div>
          ) : (
            rateLimits.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{config.config_key}</div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
                {editingConfig === config.config_key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm text-gray-900"
                      rows={5}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(config.config_key)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Email Templates */}
      <div>
        <button
          onClick={() => toggleSection('emailTemplates')}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
        >
          <span className="transform transition-transform" style={{ transform: collapsedSections['emailTemplates'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span>Email Templates</span>
        </button>
        {!collapsedSections['emailTemplates'] && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {emailTemplates.length === 0 ? (
            <div className="p-4 text-gray-700 text-center">No email templates configured</div>
          ) : (
            emailTemplates.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{config.config_key}</div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
                {editingConfig === config.config_key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm text-gray-900"
                      rows={10}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(config.config_key)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {config.description && (
                      <p className="mb-2 text-gray-700">{config.description}</p>
                    )}
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* System Settings */}
      {systemSettings.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('systemSettings')}
            className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
          >
            <span className="transform transition-transform" style={{ transform: collapsedSections['systemSettings'] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
            <span>System Settings</span>
          </button>
          {!collapsedSections['systemSettings'] && (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {systemSettings.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{config.config_key}</div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </div>
                {editingConfig === config.config_key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm text-gray-900"
                      rows={5}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(config.config_key)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {config.description && (
                      <p className="mb-2 text-gray-700">{config.description}</p>
                    )}
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

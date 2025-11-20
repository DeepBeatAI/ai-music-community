'use client';

import { useState, useEffect } from 'react';
import {
  fetchPlatformConfig,
  updatePlatformConfig,
  updateFeatureFlag,
} from '@/lib/platformConfigService';
import type { PlatformConfig } from '@/types/admin';

export function PlatformAdminTab() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

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

  useEffect(() => {
    loadConfigs();
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
      alert('Configuration updated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update configuration');
    }
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setEditValue('');
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
        <p className="text-gray-600">Loading platform configuration...</p>
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
      {/* Feature Flags */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Feature Flags</h3>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {featureFlags.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No feature flags configured</div>
          ) : (
            featureFlags.map((config) => (
              <div key={config.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{config.config_key}</div>
                  {config.description && (
                    <div className="text-sm text-gray-500">{config.description}</div>
                  )}
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.config_value?.enabled === true}
                    onChange={() =>
                      handleToggleFeatureFlag(
                        config.config_key,
                        config.config_value?.enabled === true
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm">
                    {config.config_value?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Limits */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Upload Limits by Plan Tier</h3>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {uploadLimits.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No upload limits configured</div>
          ) : (
            uploadLimits.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{config.config_key}</div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
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
      </div>

      {/* Rate Limiting */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Rate Limiting</h3>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {rateLimits.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No rate limits configured</div>
          ) : (
            rateLimits.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{config.config_key}</div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
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
      </div>

      {/* Email Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {emailTemplates.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No email templates configured</div>
          ) : (
            emailTemplates.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{config.config_key}</div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
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
                  <div className="text-sm text-gray-600">
                    {config.description && (
                      <p className="mb-2 text-gray-500">{config.description}</p>
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
      </div>

      {/* System Settings */}
      {systemSettings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">System Settings</h3>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {systemSettings.map((config) => (
              <div key={config.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{config.config_key}</div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
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
                    {config.description && (
                      <p className="mb-2 text-gray-500">{config.description}</p>
                    )}
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

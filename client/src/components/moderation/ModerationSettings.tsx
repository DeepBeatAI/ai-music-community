'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ModerationSettings {
  notifications: {
    newReports: boolean;
    highPriorityReports: boolean;
    actionTaken: boolean;
  };
  queueDisplay: {
    itemsPerPage: number;
    autoRefresh: boolean;
    autoRefreshInterval: number; // in seconds
    showResolvedReports: boolean;
  };
  quickActionTemplates: {
    enabled: boolean;
    templates: Array<{
      id: string;
      name: string;
      actionType: string;
      reason: string;
      internalNotes: string;
    }>;
  };
}

const DEFAULT_SETTINGS: ModerationSettings = {
  notifications: {
    newReports: true,
    highPriorityReports: true,
    actionTaken: false,
  },
  queueDisplay: {
    itemsPerPage: 20,
    autoRefresh: false,
    autoRefreshInterval: 30,
    showResolvedReports: false,
  },
  quickActionTemplates: {
    enabled: false,
    templates: [],
  },
};

const STORAGE_KEY = 'moderation_settings';

export function ModerationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ModerationSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!user) return;

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load moderation settings:', error);
    }
  }, [user]);

  // Save settings to localStorage
  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(settings));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save moderation settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaveMessage({ type: 'success', text: 'Settings reset to defaults' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Moderation Settings</h2>
        <p className="text-gray-400">
          Customize your moderation dashboard experience and preferences
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-900/20 border border-green-700 text-green-400'
              : 'bg-red-900/20 border border-red-700 text-red-400'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
        <p className="text-sm text-gray-400 mb-4">
          Configure which moderation events trigger notifications
        </p>

        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.newReports}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    newReports: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">New Reports</div>
              <div className="text-sm text-gray-400">
                Notify when new reports are submitted
              </div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.highPriorityReports}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    highPriorityReports: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">High Priority Reports</div>
              <div className="text-sm text-gray-400">
                Notify when P1 or P2 priority reports are created
              </div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.actionTaken}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    actionTaken: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Action Taken</div>
              <div className="text-sm text-gray-400">
                Notify when other moderators take actions
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Queue Display Options */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Queue Display Options</h3>
        <p className="text-sm text-gray-400 mb-4">
          Customize how the moderation queue is displayed
        </p>

        <div className="space-y-6">
          {/* Items Per Page */}
          <div>
            <label className="block text-white font-medium mb-2">
              Items Per Page
            </label>
            <select
              value={settings.queueDisplay.itemsPerPage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  queueDisplay: {
                    ...settings.queueDisplay,
                    itemsPerPage: parseInt(e.target.value),
                  },
                })
              }
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <p className="text-sm text-gray-400 mt-1">
              Number of reports to display per page
            </p>
          </div>

          {/* Auto Refresh */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={settings.queueDisplay.autoRefresh}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    queueDisplay: {
                      ...settings.queueDisplay,
                      autoRefresh: e.target.checked,
                    },
                  })
                }
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <div className="text-white font-medium">Auto Refresh Queue</div>
                <div className="text-sm text-gray-400">
                  Automatically refresh the queue at regular intervals
                </div>
              </div>
            </label>

            {settings.queueDisplay.autoRefresh && (
              <div className="ml-8">
                <label className="block text-white font-medium mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  step="10"
                  value={settings.queueDisplay.autoRefreshInterval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      queueDisplay: {
                        ...settings.queueDisplay,
                        autoRefreshInterval: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                  className="w-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Minimum: 10 seconds, Maximum: 300 seconds
                </p>
              </div>
            )}
          </div>

          {/* Show Resolved Reports */}
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.queueDisplay.showResolvedReports}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  queueDisplay: {
                    ...settings.queueDisplay,
                    showResolvedReports: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Show Resolved Reports</div>
              <div className="text-sm text-gray-400">
                Include resolved and dismissed reports in the queue
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Quick Action Templates (Optional Feature) */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Quick Action Templates
          <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-700 px-2 py-1 rounded">
            Optional
          </span>
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Create templates for common moderation actions to speed up your workflow
        </p>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.quickActionTemplates.enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                quickActionTemplates: {
                  ...settings.quickActionTemplates,
                  enabled: e.target.checked,
                },
              })
            }
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          />
          <div>
            <div className="text-white font-medium">Enable Quick Action Templates</div>
            <div className="text-sm text-gray-400">
              This feature will be available in a future update
            </div>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <button
          onClick={resetSettings}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Reset to Defaults
        </button>

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

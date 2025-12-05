'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isUserModeratorOrAdmin } from '@/lib/userTypeService';
import { ModerationQueue } from '@/components/moderation/ModerationQueue';
import { ModerationLogs } from '@/components/moderation/ModerationLogs';
import { ModerationMetrics } from '@/components/moderation/ModerationMetrics';
import { ModerationSettings } from '@/components/moderation/ModerationSettings';
import { MyActionsView } from '@/components/moderation/MyActionsView';

export default function ModerationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'logs' | 'myActions' | 'metrics' | 'settings'>('queue');

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // Redirect if not logged in
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is moderator or admin
      const hasAccess = await isUserModeratorOrAdmin(user.id);
      
      if (!hasAccess) {
        // Redirect non-moderators to home with error message
        router.push('/?error=unauthorized');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [user, authLoading, router]);

  // Show loading state while checking authorization
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authorized (will redirect)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-3xl font-bold text-white">Moderation Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Review reports, take moderation actions, and monitor platform activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8" aria-label="Moderation tabs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'queue'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'queue' ? 'page' : undefined}
            >
              Queue
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'logs' ? 'page' : undefined}
            >
              Action Logs
            </button>
            <button
              onClick={() => setActiveTab('myActions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'myActions'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'myActions' ? 'page' : undefined}
            >
              My Actions
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'metrics'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'metrics' ? 'page' : undefined}
            >
              Metrics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'settings' ? 'page' : undefined}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'queue' && (
            <ModerationQueue
              onReportSelect={(report) => {
                // TODO: Open action panel modal in future task (Task 9)
                console.log('Selected report:', report);
              }}
            />
          )}

          {activeTab === 'logs' && (
            <ModerationLogs
              onActionSelect={(action) => {
                // TODO: Open action details modal in future if needed
                console.log('Selected action:', action);
              }}
            />
          )}

          {activeTab === 'myActions' && (
            <MyActionsView
              onActionSelect={(action) => {
                // TODO: Open action details modal in future if needed
                console.log('Selected action:', action);
              }}
            />
          )}

          {activeTab === 'metrics' && <ModerationMetrics />}

          {activeTab === 'settings' && <ModerationSettings />}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isUserModeratorOrAdmin } from '@/lib/userTypeService';
import { isAdmin } from '@/lib/moderationService';
import { ModerationQueue } from '@/components/moderation/ModerationQueue';
import { ModerationLogs } from '@/components/moderation/ModerationLogs';
import { ModerationMetrics } from '@/components/moderation/ModerationMetrics';
import { UserStatusPanel } from '@/components/moderation/UserStatusPanel';
import { supabase } from '@/lib/supabase';

export default function ModerationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'logs' | 'userStatus' | 'metrics'>('queue');
  
  // User Status tab state
  const [searchUsername, setSearchUsername] = useState('');
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);

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

      // Check if user is admin (for Settings tab access)
      const adminStatus = await isAdmin(user.id);
      setIsAdminUser(adminStatus);

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [user, authLoading, router]);

  // Handle user search for User Status tab
  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchUsername.trim()) {
      setUserSearchError('Please enter a username');
      return;
    }

    try {
      setUserSearchLoading(true);
      setUserSearchError(null);
      setSearchedUserId(null);

      // Search for user by username
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .ilike('username', searchUsername.trim())
        .limit(1)
        .single();

      if (error || !data) {
        setUserSearchError(`User "${searchUsername}" not found`);
        return;
      }

      // Check if the searched user is an admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('user_id', data.user_id)
        .eq('role_type', 'admin')
        .eq('is_active', true)
        .maybeSingle();

      const targetIsAdmin = !!roleData;

      // Only admins can look up other admin users
      if (targetIsAdmin && !isAdminUser) {
        setUserSearchError('Only admins can look up admin users');
        return;
      }

      setSearchedUserId(data.user_id);
    } catch (error) {
      console.error('User search error:', error);
      setUserSearchError('Failed to search for user');
    } finally {
      setUserSearchLoading(false);
    }
  };

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
        {/* Back to Home Button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Home
        </button>

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
              onClick={() => setActiveTab('userStatus')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'userStatus'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'userStatus' ? 'page' : undefined}
            >
              User Status
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

          {activeTab === 'userStatus' && (
            <div>
              {/* User Search Form */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Look Up User</h2>
                <form onSubmit={handleUserSearch} className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Enter username..."
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={userSearchLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {userSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </form>
                {userSearchError && (
                  <p className="mt-2 text-red-400 text-sm">{userSearchError}</p>
                )}
              </div>

              {/* User Status Panel */}
              {searchedUserId ? (
                <UserStatusPanel
                  userId={searchedUserId}
                  onActionComplete={() => {
                    // Reload user status after action
                    console.log('Action completed, reloading user status');
                  }}
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-12 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg">
                    Search for a user to view their status and moderation history
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metrics' && <ModerationMetrics />}
        </div>
      </div>
    </div>
  );
}

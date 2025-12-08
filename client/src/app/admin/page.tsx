'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';

// Lazy load tab components for better performance
const UserManagementTab = lazy(() => import('@/components/admin/UserManagementTab').then(m => ({ default: m.UserManagementTab })));
const PlatformAdminTab = lazy(() => import('@/components/admin/PlatformAdminTab').then(m => ({ default: m.PlatformAdminTab })));
const SecurityTab = lazy(() => import('@/components/admin/SecurityTab').then(m => ({ default: m.SecurityTab })));
const PerformanceHealthTab = lazy(() => import('@/components/admin/PerformanceHealthTab').then(m => ({ default: m.PerformanceHealthTab })));
const AnalyticsTab = lazy(() => import('@/components/admin/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));

type TabType = 'users' | 'platform' | 'security' | 'performance' | 'analytics';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'users', label: 'User Management', icon: '👥' },
  { id: 'platform', label: 'Platform Admin', icon: '⚙️' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'performance', label: 'Performance & Health', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
];

// Loading fallback component for lazy-loaded tabs
function TabLoadingFallback() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, loading } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [error, setError] = useState<string | null>(null);

  // Check for unauthorized error from middleware
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setError('You do not have permission to access the admin dashboard.');
    }
  }, [searchParams]);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/?error=unauthorized');
    }
  }, [isAdmin, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state for unauthorized access
  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            {error || 'You do not have permission to access the admin dashboard.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Home Button */}
            <button
              onClick={() => router.push('/')}
              className="mb-4 flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>←</span>
              <span>Home</span>
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-700">
              Manage users, platform settings, security, and analytics
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
              <UserManagementTab />
            </div>
          )}

          {activeTab === 'platform' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Administration</h2>
              <PlatformAdminTab />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
              <SecurityTab />
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance & System Health</h2>
              <PerformanceHealthTab />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
              <AnalyticsTab />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

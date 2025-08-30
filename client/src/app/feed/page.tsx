'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import ActivityFeed from '@/components/ActivityFeed';

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Community Feed</h1>
          <p className="text-gray-400">Stay updated with community activities and interactions</p>
        </div>

        {/* Quick Navigation */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/discover')}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            🔍 Discover
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm"
          >
            ✨ Create Post
          </button>
          <button
            onClick={() => router.push('/notifications')}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            🔔 Notifications
          </button>
        </div>

        {/* Activity Feed - Using Your Existing Component */}
        <ActivityFeed 
          className="space-y-4" 
          showHeader={true}
          maxItems={20}
        />
      </div>
    </MainLayout>
  );
}
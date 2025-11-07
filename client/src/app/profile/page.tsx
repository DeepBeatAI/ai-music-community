'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

/**
 * Profile Redirect Page
 * 
 * Redirects authenticated users to their own creator profile page.
 * Redirects unauthenticated users to login with redirect back to profile.
 * 
 * Features:
 * - Authentication check
 * - Redirect to /profile/[username] for authenticated users
 * - Redirect to /login?redirect=/profile for unauthenticated users
 * - Loading spinner during redirect
 * 
 * Requirements: 1.2
 */
export default function ProfileRedirectPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user || !profile) {
      // Not authenticated, redirect to login
      router.push('/login?redirect=/profile');
      return;
    }

    // Authenticated, redirect to own profile
    router.push(`/profile/${profile.username}`);
  }, [user, profile, loading, router]);

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Redirecting to your profile...</p>
        </div>
      </div>
    </MainLayout>
  );
}

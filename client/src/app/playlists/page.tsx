'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect page for backward compatibility
 * /playlists now redirects to /library
 */
export default function PlaylistsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /library for backward compatibility
    router.replace('/library');
  }, [router]);

  // Show minimal loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Redirecting to My Library...</p>
      </div>
    </div>
  );
}

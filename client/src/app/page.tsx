'use client'

import MainLayout from '@/components/layout/MainLayout';
import AuthenticatedHome from '@/components/AuthenticatedHome';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading state while auth is being determined
  if (!isClient || loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-16 bg-gray-700 rounded mb-6"></div>
              <div className="h-4 bg-gray-700 rounded mb-8 max-w-3xl mx-auto"></div>
              <div className="flex justify-center space-x-4">
                <div className="h-12 w-32 bg-gray-700 rounded"></div>
                <div className="h-12 w-24 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {user ? (
        <AuthenticatedHome />
      ) : (
        <>
          {/* Hero Section for Unauthenticated Users */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Share Your <span className="text-blue-400">AI Music</span> Creations
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Join the community of AI music creators. Upload, discover, and connect with others who are pushing the boundaries of music creation with artificial intelligence.
              </p>
              
              <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                <Link
                  href="/signup"
                  className="block sm:inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Join the Community
                </Link>
                <Link
                  href="/login"
                  className="block sm:inline-block px-8 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </div>

              {/* Social Proof for New Users */}
              <div className="mt-12 text-center">
                <p className="text-gray-400 text-sm mb-4">Join thousands of AI music creators</p>
                <div className="flex justify-center items-center space-x-8 text-gray-500">
                  <div className="flex items-center">
                    <span className="text-lg">🎯</span>
                    <span className="ml-2 text-sm">10k+ tracks shared</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg">👥</span>
                    <span className="ml-2 text-sm">5k+ creators</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg">🌟</span>
                    <span className="ml-2 text-sm">Growing daily</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-gray-800 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Why AI Music Community?
                </h2>
                <p className="text-gray-300 text-lg">
                  The perfect platform for AI music creators and enthusiasts
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Create & Share</h3>
                  <p className="text-gray-300">
                    Upload your AI-generated music and share it with a community that understands your craft.
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Discover</h3>
                  <p className="text-gray-300">
                    Explore cutting-edge AI music from creators around the world and find your next inspiration.
                  </p>
                  <Link href="/discover" className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm">
                    Explore now →
                  </Link>
                </div>

                <div className="text-center">
                  <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Connect</h3>
                  <p className="text-gray-300">
                    Network with fellow AI music creators, collaborate, and grow your audience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call-to-Action Section */}
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Share Your AI Music?
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Join our growing community of AI music creators and start sharing your creations today.
              </p>
              <Link
                href="/signup"
                className="inline-block px-8 py-4 bg-white text-blue-900 font-bold rounded-lg hover:bg-gray-100 transition-colors text-lg"
              >
                Get Started Free
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-800 border-t border-gray-700 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-sm text-gray-400">
                <p>&copy; 2025 AI Music Community. Share your AI-generated music with the world.</p>
              </div>
            </div>
          </footer>
        </>
      )}
    </MainLayout>
  );
}

'use client'
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationCenter from '../NotificationCenter';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand - Same as AuthLayout */}
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🎵</span>
              <span className="text-xl font-bold text-white">AI Music Community</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              {user ? (
                // Authenticated user navigation
                <>
                  <div className="hidden md:flex items-center space-x-6">
                    <Link 
                      href="/" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Home
                    </Link>
                    <Link 
                      href="/discover" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/discover' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Discover
                    </Link>
                    <Link 
                      href="/feed" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/feed' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Feed
                    </Link>
                    <Link 
                      href="/notifications" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/notifications' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Notifications
                    </Link>
                    <Link 
                      href="/dashboard" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/dashboard' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/upload" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/upload' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Upload
                    </Link>
                  </div>

                  {/* Notification Center */}
                  <NotificationCenter />
                  
                  {/* User Menu */}
                  <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-600">
                    <Link 
                      href="/profile" 
                      className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                // Unauthenticated user navigation (same as AuthLayout)
                <>
                  <Link 
                    href="/login" 
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/signup" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
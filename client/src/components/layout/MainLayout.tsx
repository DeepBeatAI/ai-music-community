'use client'
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NotificationCenter from '../NotificationCenter';
import { useState, useRef, useEffect } from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAvatarDropdownOpen(false);
      }
    };

    if (isAvatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvatarDropdownOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAvatarDropdownOpen(false);
      }
    };

    if (isAvatarDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAvatarDropdownOpen]);

  const toggleAvatarDropdown = () => {
    setIsAvatarDropdownOpen(!isAvatarDropdownOpen);
  };

  const handleDropdownItemClick = (path: string) => {
    setIsAvatarDropdownOpen(false);
    router.push(path);
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
                      href="/library" 
                      className={`text-sm font-medium transition-colors ${
                        pathname?.startsWith('/library') 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      My Library
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
                      href="/dashboard" 
                      className={`text-sm font-medium transition-colors ${
                        pathname === '/dashboard' 
                          ? 'text-blue-400' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Community Board
                    </Link>
                  </div>

                  {/* Notification Center */}
                  <NotificationCenter />
                  
                  {/* User Menu */}
                  <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-600">
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={toggleAvatarDropdown}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleAvatarDropdown();
                          }
                        }}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-full"
                        aria-label="User menu"
                        aria-expanded={isAvatarDropdownOpen}
                        aria-haspopup="true"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </button>

                      {isAvatarDropdownOpen && (
                        <div
                          className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-[60]"
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby="user-menu"
                        >
                          <div className="py-1">
                            <button
                              onClick={() => handleDropdownItemClick('/profile')}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                              role="menuitem"
                            >
                              <svg
                                className="w-5 h-5 mr-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              My Creator Profile
                            </button>
                            <button
                              onClick={() => handleDropdownItemClick('/account')}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                              role="menuitem"
                            >
                              <svg
                                className="w-5 h-5 mr-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              Manage my Account
                            </button>
                            
                            {/* Admin Dashboard Link - Only visible to admins */}
                            {isAdmin && (
                              <>
                                <div className="border-t border-gray-600 my-1"></div>
                                <button
                                  onClick={() => handleDropdownItemClick('/admin')}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                  role="menuitem"
                                >
                                  <svg
                                    className="w-5 h-5 mr-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                  </svg>
                                  Admin Dashboard
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
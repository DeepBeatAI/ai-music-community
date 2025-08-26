'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand */}
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🎵</span>
              <span className="text-xl font-bold text-white">AI Music Community</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              {pathname === '/login' ? (
                // Show Sign Up button when on login page
                <>
                  <span className="text-gray-400 text-sm">New here?</span>
                  <Link 
                    href="/signup" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              ) : pathname === '/signup' ? (
                // Show Sign In button when on signup page
                <>
                  <span className="text-gray-400 text-sm">Already have an account?</span>
                  <Link 
                    href="/login" 
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                // Show both buttons on other pages (like verify-email)
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
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Page Title */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-gray-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-400">
            <p>&copy; 2025 AI Music Community. Share your AI-generated music with the world.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
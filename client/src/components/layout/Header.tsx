'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import NotificationCenter from '@/components/NotificationCenter'

export default function Header() {
  const [isMenuOpen, setlsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut()
    // Redirect to home page instead of login - home page will show marketing content
    router.push('/')
  }

  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-400">
              AI Music Community
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className={`transition-colors ${pathname === '/' ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
            >
              Home
            </Link>
            {user && (
                <Link 
                  href="/library" 
                  className={`transition-colors ${pathname?.startsWith('/library') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                >
                  My Library
                </Link>
            )}
            <Link 
              href="/discover" 
              className={`transition-colors ${pathname === '/discover' ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
            >
              Discover
            </Link>
            {user && (
                <Link 
                  href="/dashboard" 
                  className={`transition-colors ${pathname === '/dashboard' ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                >
                  Community Board
                </Link>
            )}
          </nav>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <NotificationCenter />
                <Link href="/profile" className="btn-secondary">
                  Profile
                </Link>
                <button onClick={handleLogout} className="btn-primary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setlsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              Home
            </Link>
            {user && (
                <Link 
                  href="/library" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${pathname?.startsWith('/library') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  My Library
                </Link>
            )}
            <Link 
              href="/discover" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/discover' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              Discover
            </Link>
            {user && (
                <Link 
                  href="/dashboard" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/dashboard' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  Community Board
                </Link>
            )}
            {user ? (
              <>
                <Link href="/profile" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Profile</Link>
                <button onClick={handleLogout} className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Login</Link>
                <Link href="/signup" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
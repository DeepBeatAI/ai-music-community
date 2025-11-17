import Link from 'next/link';

/**
 * PostAccessDenied Component
 * 
 * Displayed when a user doesn't have permission to view a post.
 * Provides a clear message and navigation options.
 */
export default function PostAccessDenied() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 text-center border border-gray-700">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6">
          You don&apos;t have permission to view this post.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

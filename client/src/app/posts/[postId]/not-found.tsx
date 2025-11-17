/**
 * 404 Not Found Page for Post Detail
 * 
 * Displayed when a post ID doesn't exist or has been deleted.
 */
export default function PostNotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 text-center border border-gray-700">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-2xl font-bold text-white mb-2">Post Not Found</h1>
        <p className="text-gray-400 mb-6">
          The post you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/dashboard"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

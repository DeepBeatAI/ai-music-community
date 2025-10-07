interface MetricsGridProps {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
}

export default function MetricsGrid({ totalUsers, totalPosts, totalComments }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Users Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-sm font-medium">Total Users</p>
          <span className="text-2xl">👥</span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {totalUsers.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">Registered accounts</p>
      </div>

      {/* Total Posts Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-sm font-medium">Total Posts</p>
          <span className="text-2xl">📝</span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {totalPosts.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">Content shared</p>
      </div>

      {/* Total Comments Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-sm font-medium">Total Comments</p>
          <span className="text-2xl">💬</span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {totalComments.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">Community discussions</p>
      </div>
    </div>
  );
}

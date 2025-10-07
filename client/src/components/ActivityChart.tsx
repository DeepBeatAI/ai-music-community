interface ActivityDataPoint {
  date: string;
  posts: number;
  comments: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No activity data available</p>
      </div>
    );
  }

  // Calculate chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max values for scaling
  const maxPosts = Math.max(...data.map((d) => d.posts), 1);
  const maxComments = Math.max(...data.map((d) => d.comments), 1);
  const maxValue = Math.max(maxPosts, maxComments);

  // Scale functions
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - (value / maxValue) * chartHeight;

  // Generate path for posts line
  const postsPath = data
    .map((d, i) => {
      const x = padding.left + xScale(i);
      const y = padding.top + yScale(d.posts);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Generate path for comments line
  const commentsPath = data
    .map((d, i) => {
      const x = padding.left + xScale(i);
      const y = padding.top + yScale(d.comments);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Activity Over Time</h3>
      
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-400">Posts</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-400">Comments</span>
        </div>
      </div>

      {/* Chart Container - Responsive */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ minWidth: '600px' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * ratio;
            const value = Math.round(maxValue * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize="12"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            // Show every other label to avoid crowding
            if (i % Math.ceil(data.length / 7) !== 0) return null;
            const x = padding.left + xScale(i);
            return (
              <text
                key={i}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="12"
              >
                {formatDate(d.date)}
              </text>
            );
          })}

          {/* Posts line */}
          <path
            d={postsPath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Comments line */}
          <path
            d={commentsPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points for posts */}
          {data.map((d, i) => {
            const x = padding.left + xScale(i);
            const y = padding.top + yScale(d.posts);
            return (
              <circle
                key={`post-${i}`}
                cx={x}
                cy={y}
                r="4"
                fill="#3B82F6"
                stroke="#1F2937"
                strokeWidth="2"
              >
                <title>{`${formatDate(d.date)}: ${d.posts} posts`}</title>
              </circle>
            );
          })}

          {/* Data points for comments */}
          {data.map((d, i) => {
            const x = padding.left + xScale(i);
            const y = padding.top + yScale(d.comments);
            return (
              <circle
                key={`comment-${i}`}
                cx={x}
                cy={y}
                r="4"
                fill="#10B981"
                stroke="#1F2937"
                strokeWidth="2"
              >
                <title>{`${formatDate(d.date)}: ${d.comments} comments`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

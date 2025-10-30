'use client';

import { useState } from 'react';

interface ActivityDataPoint {
  date: string;
  users: number;
  posts: number;
  comments: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

interface TooltipData {
  date: string;
  users: number;
  posts: number;
  comments: number;
  x: number;
  y: number;
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

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
  const maxUsers = Math.max(...data.map((d) => d.users), 1);
  const maxPosts = Math.max(...data.map((d) => d.posts), 1);
  const maxComments = Math.max(...data.map((d) => d.comments), 1);
  const maxValue = Math.max(maxUsers, maxPosts, maxComments);

  // Scale functions
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - (value / maxValue) * chartHeight;

  // Generate path for users line
  const usersPath = data
    .map((d, i) => {
      const x = padding.left + xScale(i);
      const y = padding.top + yScale(d.users);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

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
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></div>
          <span className="text-sm text-gray-400">Total Users</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-400">Posts</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(245, 158, 11)' }}></div>
          <span className="text-sm text-gray-400">Comments</span>
        </div>
      </div>

      {/* Chart Container - Responsive */}
      <div className="overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ minWidth: '600px' }}
          onMouseLeave={() => setTooltip(null)}
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

          {/* Users line */}
          <path
            d={usersPath}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Posts line */}
          <path
            d={postsPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Comments line */}
          <path
            d={commentsPath}
            fill="none"
            stroke="rgb(245, 158, 11)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Invisible hover areas for better interaction */}
          {data.map((d, i) => {
            const x = padding.left + xScale(i);
            return (
              <rect
                key={`hover-${i}`}
                x={x - 10}
                y={padding.top}
                width={20}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    date: d.date,
                    users: d.users,
                    posts: d.posts,
                    comments: d.comments,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Data points for users */}
          {data.map((d, i) => {
            const x = padding.left + xScale(i);
            const y = padding.top + yScale(d.users);
            return (
              <circle
                key={`user-${i}`}
                cx={x}
                cy={y}
                r="4"
                fill="rgb(59, 130, 246)"
                stroke="#1F2937"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

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
                fill="#10B981"
                stroke="#1F2937"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
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
                fill="rgb(245, 158, 11)"
                stroke="#1F2937"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
        </svg>

        {/* Custom Tooltip */}
        {tooltip && (
          <div
            className="fixed bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-50 pointer-events-none"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y - 100}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-xs font-semibold text-white mb-2">
              {formatDate(tooltip.date)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></div>
                <span className="text-gray-300">Total Users:</span>
                <span className="text-white font-semibold">{tooltip.users}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-300">Posts:</span>
                <span className="text-white font-semibold">{tooltip.posts}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(245, 158, 11)' }}></div>
                <span className="text-gray-300">Comments:</span>
                <span className="text-white font-semibold">{tooltip.comments}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

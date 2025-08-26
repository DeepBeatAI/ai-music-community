'use client'
import { useState, useEffect } from 'react';

interface FilterOptions {
  postType: 'all' | 'text' | 'audio';
  sortBy: 'newest' | 'oldest' | 'popular';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  currentFilters?: FilterOptions;
  className?: string;
}

export default function FilterBar({ 
  onFilterChange, 
  currentFilters,
  className = '' 
}: FilterBarProps) {
  const [filters, setFilters] = useState<FilterOptions>(
    currentFilters || {
      postType: 'all',
      sortBy: 'newest',
      timeRange: 'all'
    }
  );

  // Sync with external filter changes
  useEffect(() => {
    if (currentFilters && JSON.stringify(currentFilters) !== JSON.stringify(filters)) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const isDefaultFilters = () => {
    const defaultFilters = { postType: 'all', sortBy: 'newest', timeRange: 'all' };
    return JSON.stringify(filters) === JSON.stringify(defaultFilters);
  };

  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Post Type Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-300">Type:</label>
        <select
          value={filters.postType}
          onChange={(e) => handleFilterChange('postType', e.target.value)}
          className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Posts</option>
          <option value="text">Text Posts</option>
          <option value="audio">Audio Posts</option>
        </select>
      </div>

      {/* Sort Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-300">Sort:</label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-300">Time:</label>
        <select
          value={filters.timeRange}
          onChange={(e) => handleFilterChange('timeRange', e.target.value)}
          className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Filter Status Indicator */}
      {!isDefaultFilters() && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
            Filters Active
          </span>
        </div>
      )}

      {/* Future: AI Tool Filter */}
      <div className="flex items-center space-x-2 opacity-50">
        <label className="text-sm font-medium text-gray-300">AI Tool:</label>
        <select
          disabled
          className="bg-gray-700 border border-gray-600 text-gray-400 text-sm rounded px-2 py-1 cursor-not-allowed"
        >
          <option value="all">All Tools (Coming Soon)</option>
        </select>
      </div>
    </div>
  );
}
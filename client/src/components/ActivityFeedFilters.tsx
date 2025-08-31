'use client';

import { useState } from 'react';

export interface ActivityFilters {
  following?: boolean;
  activityTypes?: string[];
  timeRange?: 'all' | 'today' | 'week' | 'month';
}

interface ActivityFeedFiltersProps {
  onFiltersChange: (filters: ActivityFilters) => void;
  initialFilters?: ActivityFilters;
}

const activityTypeOptions = [
  { value: 'post_created', label: 'New Posts' },
  { value: 'audio_uploaded', label: 'New Audio' },
  { value: 'post_liked', label: 'Likes' },
  { value: 'user_followed', label: 'New Follows' },
];

export default function ActivityFeedFilters({ 
  onFiltersChange, 
  initialFilters = {} 
}: ActivityFeedFiltersProps) {
  const [following, setFollowing] = useState(initialFilters.following ?? false);
  const [activityTypes, setActivityTypes] = useState<string[]>(
    initialFilters.activityTypes || []
  );
  const [timeRange, setTimeRange] = useState<ActivityFilters['timeRange']>(
    initialFilters.timeRange || 'all'
  );

  const handleActivityTypeToggle = (type: string) => {
    const newTypes = activityTypes.includes(type)
      ? activityTypes.filter(t => t !== type)
      : [...activityTypes, type];
    
    setActivityTypes(newTypes);
    onFiltersChange({
      following,
      activityTypes: newTypes.length > 0 ? newTypes : undefined,
      timeRange,
    });
  };

  const handleFollowingToggle = () => {
    const newFollowing = !following;
    setFollowing(newFollowing);
    onFiltersChange({
      following: newFollowing,
      activityTypes: activityTypes.length > 0 ? activityTypes : undefined,
      timeRange,
    });
  };

  const handleTimeRangeChange = (newTimeRange: ActivityFilters['timeRange']) => {
    setTimeRange(newTimeRange);
    onFiltersChange({
      following,
      activityTypes: activityTypes.length > 0 ? activityTypes : undefined,
      timeRange: newTimeRange,
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Filter Activity</h3>
      
      <div className="space-y-4">
        {/* Following Filter */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="following"
            checked={following}
            onChange={handleFollowingToggle}
            className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="following" className="text-gray-300">
            Show only people I follow
          </label>
        </div>

        {/* Time Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as ActivityFilters['timeRange'])}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Activity Types */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Activity Types</label>
          <div className="grid grid-cols-2 gap-2">
            {activityTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={option.value}
                  checked={activityTypes.includes(option.value)}
                  onChange={() => handleActivityTypeToggle(option.value)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={option.value} className="text-gray-300 text-sm">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

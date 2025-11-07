'use client'

interface UserTypeBadgeProps {
  userType: string;
  userTypes?: string[];
}

export default function UserTypeBadge({ userType, userTypes }: UserTypeBadgeProps) {
  // Use userTypes array if provided, otherwise use single userType
  const badges = userTypes && userTypes.length > 0 ? userTypes : [userType];

  // Color coding based on user type
  const getBadgeStyles = (type: string) => {
    const normalizedType = type.toLowerCase();
    
    if (normalizedType.includes('free')) {
      return 'bg-gray-700 text-gray-300 border-gray-600';
    } else if (normalizedType.includes('premium')) {
      return 'bg-blue-700 text-blue-200 border-blue-600';
    } else if (normalizedType.includes('pro')) {
      return 'bg-yellow-700 text-yellow-200 border-yellow-600';
    } else if (normalizedType.includes('verified')) {
      return 'bg-green-700 text-green-200 border-green-600';
    }
    
    // Default styling for unknown types
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="User badges">
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
            ${getBadgeStyles(badge)}
            transition-colors duration-200
          `}
          role="listitem"
          aria-label={`${badge} badge`}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

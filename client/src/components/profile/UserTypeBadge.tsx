'use client'

import { 
  PlanTier, 
  RoleType, 
  PLAN_TIER_DISPLAY_NAMES, 
  ROLE_TYPE_DISPLAY_NAMES,
  PLAN_TIER_BADGE_STYLES,
  ROLE_TYPE_BADGE_STYLES
} from '@/types/userTypes';

interface UserTypeBadgeProps {
  planTier: PlanTier;
  roles?: RoleType[];
  size?: 'sm' | 'md' | 'lg';
  showPlanTier?: boolean;
  showRoles?: boolean;
  // Legacy props for backward compatibility
  userType?: string;
  userTypes?: string[];
}

/**
 * UserTypeBadge Component
 * 
 * Displays user type badges with plan tier and optional roles.
 * Supports the new user types system with backward compatibility.
 * 
 * Features:
 * - Color-coded badges based on type
 * - Responsive sizing (sm, md, lg)
 * - Accessible with ARIA labels
 * - Supports showing/hiding plan tier or roles independently
 * - Backward compatible with legacy userType prop
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export default function UserTypeBadge({ 
  planTier, 
  roles = [], 
  size = 'md',
  showPlanTier = true,
  showRoles = true,
  userType,
  userTypes
}: UserTypeBadgeProps) {
  // Size-specific styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  // Legacy support: if userType or userTypes provided, use old rendering
  if (userType || userTypes) {
    const badges = userTypes && userTypes.length > 0 ? userTypes : [userType || 'Free User'];
    
    const getLegacyBadgeStyles = (type: string) => {
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
      
      return 'bg-gray-700 text-gray-300 border-gray-600';
    };

    return (
      <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="User badges">
        {badges.map((badge, index) => (
          <span
            key={index}
            className={`
              inline-flex items-center rounded-full font-medium border
              ${sizeStyles[size]}
              ${getLegacyBadgeStyles(badge)}
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

  // Build badges array based on visibility settings
  const badges: Array<{ type: 'plan' | 'role', value: PlanTier | RoleType, displayName: string, styles: string }> = [];

  // Add plan tier badge if enabled
  if (showPlanTier && planTier) {
    badges.push({
      type: 'plan',
      value: planTier,
      displayName: PLAN_TIER_DISPLAY_NAMES[planTier],
      styles: PLAN_TIER_BADGE_STYLES[planTier]
    });
  }

  // Add role badges if enabled
  if (showRoles && roles && roles.length > 0) {
    roles.forEach(role => {
      badges.push({
        type: 'role',
        value: role,
        displayName: ROLE_TYPE_DISPLAY_NAMES[role],
        styles: ROLE_TYPE_BADGE_STYLES[role]
      });
    });
  }

  // Don't render anything if no badges to show
  if (badges.length === 0) {
    return null;
  }

  return (
    <div 
      className="flex flex-wrap gap-2 mb-4" 
      role="list" 
      aria-label="User type badges"
    >
      {badges.map((badge, index) => (
        <span
          key={`${badge.type}-${badge.value}-${index}`}
          className={`
            inline-flex items-center rounded-full font-medium border
            ${sizeStyles[size]}
            ${badge.styles}
            transition-colors duration-200
          `}
          role="listitem"
          aria-label={`${badge.displayName} ${badge.type === 'plan' ? 'plan tier' : 'role'}`}
        >
          {badge.displayName}
        </span>
      ))}
    </div>
  );
}

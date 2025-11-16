'use client';

import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';

/**
 * CreatorLink Component
 * 
 * A reusable component for displaying clickable creator names that navigate to creator profiles.
 * Provides consistent styling and behavior across the application.
 * 
 * Features:
 * - Navigates to creator profile using username (preferred) or userId (fallback)
 * - Prevents event propagation to avoid triggering parent click handlers (e.g., card clicks)
 * - Hover states for visual feedback
 * - Optional icon display
 * - Customizable styling via className prop
 * 
 * @example
 * ```tsx
 * // Basic usage with username
 * <CreatorLink 
 *   userId="user-123"
 *   username="johndoe"
 *   displayName="John Doe"
 * />
 * 
 * // With custom styling and icon
 * <CreatorLink 
 *   userId="user-123"
 *   username="johndoe"
 *   displayName="John Doe"
 *   className="text-sm font-semibold"
 *   showIcon={true}
 * />
 * 
 * // Fallback to userId when username not available
 * <CreatorLink 
 *   userId="user-123"
 *   displayName="John Doe"
 * />
 * ```
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4
 */

interface CreatorLinkProps {
  /** The user ID of the creator (used as fallback if username not available) */
  userId: string;
  /** The username of the creator (preferred for navigation) */
  username?: string;
  /** The display name of the creator (shown in the UI) */
  displayName?: string;
  /** Additional CSS classes to apply to the link */
  className?: string;
  /** Whether to show an icon next to the creator name */
  showIcon?: boolean;
}

export default function CreatorLink({
  userId,
  username,
  displayName,
  className = '',
  showIcon = false
}: CreatorLinkProps) {
  const router = useRouter();

  /**
   * Handle click event on creator link
   * - Stops event propagation to prevent parent handlers (e.g., card clicks)
   * - Navigates to creator profile using username (preferred) or userId (fallback)
   */
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Prefer username for cleaner URLs, fallback to userId
    const profilePath = username ? `/profile/${username}` : `/profile/${userId}`;
    router.push(profilePath);
  };

  // Determine display text: use displayName if available, otherwise username, otherwise "Unknown Creator"
  const displayText = displayName || username || 'Unknown Creator';

  return (
    <a
      href={username ? `/profile/${username}` : `/profile/${userId}`}
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1
        text-blue-400 hover:text-blue-300
        transition-colors duration-200
        cursor-pointer
        ${className}
      `}
      title={`View ${displayText}'s profile`}
    >
      {showIcon && (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      )}
      <span>{displayText}</span>
    </a>
  );
}

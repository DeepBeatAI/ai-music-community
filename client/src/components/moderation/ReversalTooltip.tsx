'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ModerationAction } from '@/types/moderation';

/**
 * Reversal information extracted from a moderation action
 */
interface ReversalInfo {
  moderatorId: string;
  moderatorUsername?: string;
  reversalTimestamp: string;
  reversalReason: string;
  isSelfReversal?: boolean;
}

/**
 * Props for the ReversalTooltip component
 */
interface ReversalTooltipProps {
  action: ModerationAction;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * ReversalTooltip Component
 * 
 * Displays detailed reversal information when hovering over reversed actions.
 * 
 * Features:
 * - Display moderator who reversed action
 * - Display reversal timestamp
 * - Display reversal reason
 * - Smooth fade-in animation
 * - Configurable position
 * 
 * Requirements: 15.5
 */
export function ReversalTooltip({
  action,
  children,
  className = '',
  position = 'top',
}: ReversalTooltipProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Extract reversal information from action
  const reversalInfo = getReversalInfo(action);

  /**
   * Calculate tooltip position based on trigger element
   */
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = 8;
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < scrollY) top = scrollY + 8;
    if (top + tooltipRect.height > scrollY + viewportHeight) {
      top = scrollY + viewportHeight - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  }, [position]);

  /**
   * Handle mouse enter
   */
  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  /**
   * Recalculate position when tooltip becomes visible
   */
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  /**
   * Recalculate position on window resize and scroll
   */
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  // Don't render tooltip if action is not reversed
  if (!reversalInfo) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Trigger element */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-block ${className}`}
      >
        {children}
      </div>

      {/* Tooltip portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div
            className={`
              bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-3 max-w-xs
              animate-fade-in
            `}
            style={{
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            {/* Tooltip content */}
            <div className="space-y-2 text-sm">
              {/* Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold text-gray-200">Action Reversed</span>
              </div>

              {/* Reversed by */}
              <div>
                <span className="text-gray-400">Reversed by:</span>
                <div className="text-white font-medium mt-0.5">
                  {reversalInfo.moderatorUsername || `Moderator ${reversalInfo.moderatorId.substring(0, 8)}...`}
                  {reversalInfo.isSelfReversal && (
                    <span className="ml-2 text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                      Self-Reversal
                    </span>
                  )}
                </div>
              </div>

              {/* Reversed on */}
              <div>
                <span className="text-gray-400">Reversed on:</span>
                <div className="text-white font-medium mt-0.5">
                  {formatDate(reversalInfo.reversalTimestamp)}
                </div>
              </div>

              {/* Reversal reason */}
              <div>
                <span className="text-gray-400">Reason:</span>
                <div className="text-white mt-0.5 break-words">
                  {reversalInfo.reversalReason || 'No reason provided'}
                </div>
              </div>
            </div>

            {/* Arrow indicator */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 border-gray-700 transform rotate-45 ${getArrowPosition(
                position
              )}`}
            />
          </div>
        </div>
      )}

      {/* CSS for fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

/**
 * Extract reversal information from a moderation action
 * 
 * @param action - The moderation action to extract reversal info from
 * @returns Reversal information or null if action is not reversed
 */
function getReversalInfo(action: ModerationAction): ReversalInfo | null {
  if (!action.revoked_at || !action.revoked_by) {
    return null;
  }

  const reversalReason = action.metadata?.reversal_reason || 'No reason provided';
  const isSelfReversal = action.moderator_id === action.revoked_by;

  return {
    moderatorId: action.revoked_by,
    moderatorUsername: action.metadata?.revoked_by_username,
    reversalTimestamp: action.revoked_at,
    reversalReason,
    isSelfReversal,
  };
}

/**
 * Format a date string for display
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Show relative time for recent reversals
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Show full date for older reversals
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get CSS classes for arrow position based on tooltip position
 * 
 * @param position - Tooltip position
 * @returns CSS classes for arrow positioning
 */
function getArrowPosition(position: 'top' | 'bottom' | 'left' | 'right'): string {
  switch (position) {
    case 'top':
      return 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r';
    case 'bottom':
      return 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l';
    case 'left':
      return 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-b';
    case 'right':
      return 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-t';
  }
}

/**
 * Utility function to check if an action has been reversed
 * 
 * @param action - The moderation action to check
 * @returns True if the action has been reversed
 */
export function hasReversalInfo(action: ModerationAction): boolean {
  return !!action.revoked_at && !!action.revoked_by;
}

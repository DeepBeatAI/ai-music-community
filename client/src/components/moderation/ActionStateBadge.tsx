'use client';

import { ModerationAction } from '@/types/moderation';

/**
 * Action state types for visual display
 * Requirements: 15.1, 15.4
 */
export type ActionState = 'active' | 'reversed' | 'expired';

interface ActionStateBadgeProps {
  action: ModerationAction;
  className?: string;
}

/**
 * ActionStateBadge Component
 * 
 * Displays a visual badge indicating the current state of a moderation action.
 * Provides consistent color coding and styling across all views.
 * 
 * States:
 * - ACTIVE: Red/Orange badge for currently active actions
 * - REVERSED: Gray badge with strikethrough for reversed actions
 * - EXPIRED: Blue badge for expired actions
 * 
 * Requirements: 15.1, 15.4
 */
export function ActionStateBadge({ action, className = '' }: ActionStateBadgeProps) {
  const state = getActionState(action);
  const { label, bgColor, textColor, strikethrough } = getStateStyles(state);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${
        strikethrough ? 'line-through' : ''
      } ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Determine the current state of a moderation action
 * 
 * @param action - The moderation action to evaluate
 * @returns The current state: 'active', 'reversed', or 'expired'
 */
function getActionState(action: ModerationAction): ActionState {
  // Check if action has been reversed
  if (action.revoked_at) {
    return 'reversed';
  }

  // Check if action has expired
  if (action.expires_at) {
    const expirationDate = new Date(action.expires_at);
    const now = new Date();
    if (expirationDate < now) {
      return 'expired';
    }
  }

  // Action is still active
  return 'active';
}

/**
 * Get styling configuration for each action state
 * 
 * Color coding:
 * - Active: Green (#16A34A)
 * - Reversed: Gray (#6B7280) with strikethrough
 * - Expired: Blue (#2563EB)
 * 
 * Requirements: 15.4
 */
function getStateStyles(state: ActionState): {
  label: string;
  bgColor: string;
  textColor: string;
  strikethrough: boolean;
} {
  switch (state) {
    case 'active':
      return {
        label: 'ACTIVE',
        bgColor: 'bg-green-900',
        textColor: 'text-green-200',
        strikethrough: false,
      };
    case 'reversed':
      return {
        label: 'REVERSED',
        bgColor: 'bg-gray-600',
        textColor: 'text-gray-300',
        strikethrough: true,
      };
    case 'expired':
      return {
        label: 'EXPIRED',
        bgColor: 'bg-blue-900',
        textColor: 'text-blue-200',
        strikethrough: false,
      };
  }
}

/**
 * Get the hex color code for an action state
 * Useful for charts and visualizations
 * 
 * Requirements: 15.4
 */
export function getStateColor(state: ActionState): string {
  switch (state) {
    case 'active':
      return '#16A34A'; // Green
    case 'reversed':
      return '#6B7280'; // Gray
    case 'expired':
      return '#2563EB'; // Blue
  }
}

/**
 * Utility function to check if an action is reversed
 * 
 * @param action - The moderation action to check
 * @returns True if the action has been reversed
 */
export function isActionReversed(action: ModerationAction): boolean {
  return !!action.revoked_at;
}

/**
 * Utility function to check if an action is expired
 * 
 * @param action - The moderation action to check
 * @returns True if the action has expired
 */
export function isActionExpired(action: ModerationAction): boolean {
  if (!action.expires_at) {
    return false;
  }
  const expirationDate = new Date(action.expires_at);
  const now = new Date();
  return expirationDate < now;
}

/**
 * Utility function to check if an action is active
 * 
 * @param action - The moderation action to check
 * @returns True if the action is currently active (not reversed or expired)
 */
export function isActionActive(action: ModerationAction): boolean {
  return !isActionReversed(action) && !isActionExpired(action);
}

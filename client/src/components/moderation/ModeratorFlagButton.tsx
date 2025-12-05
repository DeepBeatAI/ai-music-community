'use client';

import { useState, useEffect } from 'react';
import { ReportType } from '@/types/moderation';
import { ModeratorFlagModal } from './ModeratorFlagModal';
import { useAuth } from '@/contexts/AuthContext';
import { isModeratorOrAdmin, isAdmin } from '@/lib/moderationService';

interface ModeratorFlagButtonProps {
  reportType: ReportType;
  targetId: string;
  contentCreatorId?: string; // User ID of the content creator
  className?: string;
  iconOnly?: boolean;
}

/**
 * ModeratorFlagButton Component
 * 
 * Button that opens the moderator flag modal for moderators/admins to flag content.
 * Displays a warning icon (⚠️) and opens ModeratorFlagModal on click.
 * Only visible to users with moderator or admin role.
 * 
 * Features:
 * - Warning icon button
 * - Opens ModeratorFlagModal on click
 * - Passes content type and ID to modal
 * - Only visible to moderators and admins
 * - Role check using user_roles table
 * - Optional text label or icon-only mode
 * 
 * Requirements: 2.1, 2.2
 */
export function ModeratorFlagButton({ 
  reportType, 
  targetId,
  contentCreatorId,
  className = '',
  iconOnly = false 
}: ModeratorFlagButtonProps): React.ReactElement | null {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isCreatorAdmin, setIsCreatorAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is moderator or admin
  useEffect(() => {
    const checkModeratorRole = async (): Promise<void> => {
      if (!user) {
        setIsModerator(false);
        setIsLoading(false);
        return;
      }

      try {
        const isMod = await isModeratorOrAdmin(user.id);
        setIsModerator(isMod);
      } catch (error) {
        console.error('Failed to check moderator role:', error);
        setIsModerator(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkModeratorRole();
  }, [user]);

  // Check if content creator is an admin
  useEffect(() => {
    const checkCreatorAdminStatus = async () => {
      if (!contentCreatorId) {
        return;
      }

      try {
        const adminStatus = await isAdmin(contentCreatorId);
        setIsCreatorAdmin(adminStatus);
      } catch (error) {
        console.error('Failed to check creator admin status:', error);
        setIsCreatorAdmin(false);
      }
    };

    checkCreatorAdminStatus();
  }, [contentCreatorId]);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't render while loading role check
  if (isLoading) {
    return null;
  }

  // Don't render if user is not a moderator or admin
  if (!isModerator) {
    return null;
  }

  // Don't render if content creator is an admin
  if (isCreatorAdmin) {
    return null;
  }

  /**
   * Handles button click to open modal
   */
  const handleClick = (): void => {
    setIsModalOpen(true);
  };

  /**
   * Handles modal close
   */
  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors ${className}`}
        title="Flag for moderation review"
        aria-label={`Flag ${reportType} for review`}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
        {!iconOnly && <span>Flag</span>}
      </button>

      <ModeratorFlagModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reportType={reportType}
        targetId={targetId}
      />
    </>
  );
}

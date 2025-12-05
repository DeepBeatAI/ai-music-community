'use client';

import { useState, useEffect } from 'react';
import { ReportType } from '@/types/moderation';
import { ReportModal } from './ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/moderationService';

interface ReportButtonProps {
  reportType: ReportType;
  targetId: string;
  contentCreatorId?: string; // User ID of the content creator
  className?: string;
  iconOnly?: boolean;
}

/**
 * ReportButton Component
 * 
 * Button that opens the report modal for users to report content.
 * Displays a flag icon (🚩) and opens ReportModal on click.
 * 
 * Features:
 * - Flag icon button
 * - Opens ReportModal on click
 * - Passes content type and ID to modal
 * - Only visible to authenticated users
 * - Optional text label or icon-only mode
 * 
 * Requirements: 1.1
 */
export function ReportButton({ 
  reportType, 
  targetId,
  contentCreatorId,
  className = '',
  iconOnly = false 
}: ReportButtonProps): React.ReactElement | null {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatorAdmin, setIsCreatorAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check if content creator is an admin
  useEffect(() => {
    const checkCreatorAdminStatus = async () => {
      if (!contentCreatorId) {
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const adminStatus = await isAdmin(contentCreatorId);
        setIsCreatorAdmin(adminStatus);
      } catch (error) {
        console.error('Failed to check creator admin status:', error);
        setIsCreatorAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkCreatorAdminStatus();
  }, [contentCreatorId]);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't render while checking admin status
  if (isCheckingAdmin) {
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${className}`}
        title="Report this content"
        aria-label={`Report ${reportType}`}
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
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
          />
        </svg>
        {!iconOnly && <span>Report</span>}
      </button>

      <ReportModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reportType={reportType}
        targetId={targetId}
      />
    </>
  );
}

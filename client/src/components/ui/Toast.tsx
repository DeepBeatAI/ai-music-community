'use client';

import { useEffect, useState } from 'react';
import { Toast as ToastType } from '@/types/toast';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

/**
 * Toast Component
 * 
 * Displays a single toast notification with auto-dismiss and manual dismiss functionality.
 * Includes slide-in/fade-out animations and ARIA live regions for accessibility.
 * 
 * Features:
 * - Success/error/info variants with appropriate icons and colors
 * - Auto-dismiss after specified duration (default 3-5 seconds)
 * - Manual dismiss button
 * - Slide-in animation on mount
 * - Fade-out animation on dismiss
 * - ARIA live regions for screen reader announcements
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for animation to complete before removing
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  // Auto-dismiss after duration
  useEffect(() => {
    const duration = toast.duration || 4000; // Default 4 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.duration]);

  // Get icon and colors based on toast type
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: '✓',
          bgColor: 'bg-green-600',
          borderColor: 'border-green-500',
          iconBg: 'bg-green-700',
        };
      case 'error':
        return {
          icon: '✕',
          bgColor: 'bg-red-600',
          borderColor: 'border-red-500',
          iconBg: 'bg-red-700',
        };
      case 'info':
        return {
          icon: 'ℹ',
          bgColor: 'bg-blue-600',
          borderColor: 'border-blue-500',
          iconBg: 'bg-blue-700',
        };
      default:
        return {
          icon: 'ℹ',
          bgColor: 'bg-gray-600',
          borderColor: 'border-gray-500',
          iconBg: 'bg-gray-700',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`
        ${styles.bgColor} ${styles.borderColor}
        border-l-4 rounded-lg shadow-lg p-4 mb-3
        flex items-start space-x-3 min-w-[300px] max-w-[500px]
        transition-all duration-300 ease-in-out
        ${isExiting 
          ? 'opacity-0 translate-x-full' 
          : 'opacity-100 translate-x-0 animate-slide-in'
        }
      `}
    >
      {/* Icon */}
      <div 
        className={`${styles.iconBg} rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0`}
        aria-hidden="true"
      >
        <span className="text-white font-bold text-sm">
          {styles.icon}
        </span>
      </div>

      {/* Message */}
      <div className="flex-1 text-white text-sm md:text-base font-medium pt-0.5">
        {toast.message}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="text-white hover:text-gray-200 transition-colors flex-shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
        aria-label="Dismiss notification"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" 
          />
        </svg>
      </button>
    </div>
  );
}

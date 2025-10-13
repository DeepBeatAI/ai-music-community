'use client';

import Toast from './Toast';
import { Toast as ToastType } from '@/types/toast';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'bottom-center';
}

/**
 * ToastContainer Component
 * 
 * Container for managing and displaying multiple toast notifications.
 * Handles positioning and stacking of toasts.
 * 
 * Features:
 * - Configurable positioning (top-right or bottom-center)
 * - Stacks multiple toasts vertically
 * - Fixed positioning to stay visible during scroll
 * - Z-index management for proper layering
 * 
 * Requirements: 8.4, 8.7
 */
export default function ToastContainer({ 
  toasts, 
  onDismiss,
  position = 'top-right' 
}: ToastContainerProps) {
  const positionClasses = position === 'top-right'
    ? 'top-4 right-4'
    : 'bottom-4 left-1/2 -translate-x-1/2';

  return (
    <div
      className={`fixed ${positionClasses} z-50 flex flex-col items-end pointer-events-none`}
      aria-label="Notifications"
      role="region"
    >
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

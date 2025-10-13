'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastContainer from '@/components/ui/ToastContainer';
import { Toast, ToastType, ToastContextType } from '@/types/toast';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * ToastProvider Component
 * 
 * Provides toast notification functionality throughout the application.
 * Manages toast queue and handles auto-dismiss timing.
 * 
 * Features:
 * - Global toast state management
 * - Toast queue system for multiple notifications
 * - Auto-dismiss functionality (3-5 seconds configurable)
 * - Manual dismiss capability
 * - Unique ID generation for each toast
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.7
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Shows a new toast notification
   * 
   * @param message - The message to display
   * @param type - The type of toast (success, error, info)
   * @param duration - Optional duration in milliseconds (default: 4000ms)
   */
  const showToast = useCallback((
    message: string, 
    type: ToastType, 
    duration: number = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      message,
      type,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  /**
   * Dismisses a toast by ID
   * 
   * @param id - The ID of the toast to dismiss
   */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="top-right" />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 * 
 * @returns Toast context with showToast and dismissToast functions
 * @throws Error if used outside ToastProvider
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

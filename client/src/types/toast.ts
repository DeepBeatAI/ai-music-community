/**
 * Toast notification types and interfaces
 */

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

/**
 * Error Handling Utilities
 * 
 * This file contains utilities for handling errors throughout the application.
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
}

export const handleError = (error: unknown, context?: string): ErrorInfo => {
  console.error(`Error in ${context || 'unknown context'}:`, error);
  
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error
    };
  }
  
  return {
    message: 'An unknown error occurred',
    details: error
  };
};

export const logError = (error: unknown, context?: string): void => {
  const errorInfo = handleError(error, context);
  console.error('Error logged:', errorInfo);
};
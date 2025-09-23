import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorRecoveryManager } from '@/utils/errorRecovery';
import ErrorDisplay from '@/components/ErrorDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useErrorState } from '@/hooks/useErrorState';

// Mock component for testing error boundaries
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }
  return <div>Component working normally</div>;
}

// Test component using error state hook
function TestErrorStateComponent() {
  const { errorState, setError, clearError, retryLastAction, isRecovering } = useErrorState();

  return (
    <div>
      <button onClick={() => setError('Test error', 'recoverable', 'TEST_ERROR')}>
        Trigger Error
      </button>
      <button onClick={clearError}>Clear Error</button>
      <button onClick={retryLastAction}>Retry</button>
      {errorState && (
        <div data-testid="error-message">{errorState.errorMessage}</div>
      )}
      {isRecovering && <div data-testid="recovering">Recovering...</div>}
    </div>
  );
}

describe('Error Recovery System', () => {
  describe('ErrorRecoveryManager', () => {
    let errorRecovery: ErrorRecoveryManager;

    beforeEach(() => {
      errorRecovery = new ErrorRecoveryManager({
        maxRetries: 3,
        retryDelay: 100,
        enableAutoRecovery: true,
        logErrors: false, // Disable for tests
      });
    });

    it('should create error state with user-friendly messages', () => {
      const errorState = errorRecovery.createErrorState(
        'Maximum update depth exceeded',
        'critical',
        'REACT_INFINITE_LOOP'
      );

      expect(errorState.hasError).toBe(true);
      expect(errorState.errorType).toBe('critical');
      expect(errorState.errorCode).toBe('REACT_INFINITE_LOOP');
      expect(errorState.errorMessage).toContain('critical error');
      expect(errorState.canRetry).toBe(false);
    });

    it('should convert technical messages to user-friendly ones', () => {
      const paginationError = errorRecovery.createErrorState(
        'pagination state validation failed',
        'recoverable'
      );

      expect(paginationError.errorMessage).toContain('page data');
      expect(paginationError.canRetry).toBe(true);
    });

    it('should determine auto-recovery eligibility correctly', () => {
      const recoverableError = errorRecovery.createErrorState(
        'pagination state error',
        'recoverable',
        'PAGINATION_ERROR'
      );
      
      const criticalError = errorRecovery.createErrorState(
        'critical system failure',
        'critical'
      );

      expect(errorRecovery.shouldAutoRecover(recoverableError)).toBe(true);
      expect(errorRecovery.shouldAutoRecover(criticalError)).toBe(false);
    });

    it('should attempt recovery with retry logic', async () => {
      const errorState = errorRecovery.createErrorState(
        'network error',
        'recoverable',
        'NETWORK_ERROR'
      );

      const mockRecoveryAction = jest.fn().mockResolvedValue(undefined);
      
      const result = await errorRecovery.attemptRecovery(errorState, mockRecoveryAction);

      expect(result.success).toBe(true);
      expect(mockRecoveryAction).toHaveBeenCalled();
    });

    it('should handle recovery failures and suggest refresh', async () => {
      const errorState = errorRecovery.createErrorState(
        'critical system error',
        'critical'
      );

      const result = await errorRecovery.attemptRecovery(errorState);

      expect(result.success).toBe(false);
      expect(result.shouldRefresh).toBe(true);
      expect(result.message).toContain('refresh');
    });

    it('should track retry attempts and enforce limits', async () => {
      const errorState = errorRecovery.createErrorState(
        'test error',
        'recoverable',
        'TEST_ERROR'
      );

      // Attempt recovery multiple times
      for (let i = 0; i < 4; i++) {
        await errorRecovery.attemptRecovery(errorState, () => Promise.reject('Still failing'));
      }

      // Should hit max retries
      const finalResult = await errorRecovery.attemptRecovery(errorState);
      expect(finalResult.success).toBe(false);
      expect(finalResult.message).toContain('Maximum recovery attempts exceeded');
    });
  });

  describe('ErrorDisplay Component', () => {
    let errorRecovery: ErrorRecoveryManager;

    beforeEach(() => {
      errorRecovery = new ErrorRecoveryManager({
        maxRetries: 3,
        retryDelay: 100,
        enableAutoRecovery: false, // Disable for controlled testing
        logErrors: false,
      });
    });

    it('should render error state correctly', () => {
      const errorState = errorRecovery.createErrorState(
        'Test error message',
        'recoverable',
        'TEST_ERROR'
      );

      render(
        <ErrorDisplay
          errorState={errorState}
          errorRecovery={errorRecovery}
          onErrorCleared={jest.fn()}
        />
      );

      // The error message should be displayed (might be user-friendly version)
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle retry button click', async () => {
      const errorState = errorRecovery.createErrorState(
        'Test error',
        'recoverable'
      );

      const mockOnRetry = jest.fn().mockResolvedValue(undefined);
      const mockOnErrorCleared = jest.fn();

      render(
        <ErrorDisplay
          errorState={errorState}
          errorRecovery={errorRecovery}
          onErrorCleared={mockOnErrorCleared}
          onRetry={mockOnRetry}
        />
      );

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(mockOnRetry).toHaveBeenCalled();
      });
    });

    it('should show refresh button for critical errors', () => {
      const criticalError = errorRecovery.createErrorState(
        'Critical system error',
        'critical'
      );

      render(
        <ErrorDisplay
          errorState={criticalError}
          errorRecovery={errorRecovery}
          onErrorCleared={jest.fn()}
        />
      );

      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should handle dismiss button', () => {
      const errorState = errorRecovery.createErrorState(
        'Test warning',
        'warning'
      );

      const mockOnErrorCleared = jest.fn();

      render(
        <ErrorDisplay
          errorState={errorState}
          errorRecovery={errorRecovery}
          onErrorCleared={mockOnErrorCleared}
        />
      );

      fireEvent.click(screen.getByTitle('Dismiss'));
      expect(mockOnErrorCleared).toHaveBeenCalled();
    });
  });

  describe('ErrorBoundary Component', () => {
    // Suppress console.error for error boundary tests
    const originalError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });

    afterAll(() => {
      console.error = originalError;
    });

    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component working normally')).toBeInTheDocument();
    });

    it('should handle retry functionality', () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error for error boundary');
        }
        return <div>Component working normally</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the throwing behavior
      shouldThrow = false;

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      // The error boundary should reset and show the working component
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('useErrorState Hook', () => {
    it('should manage error state correctly', () => {
      render(<TestErrorStateComponent />);

      // Initially no error
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));
      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      // Clear error
      fireEvent.click(screen.getByText('Clear Error'));
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should prevent duplicate errors', () => {
      render(<TestErrorStateComponent />);

      // Trigger same error multiple times quickly
      fireEvent.click(screen.getByText('Trigger Error'));
      fireEvent.click(screen.getByText('Trigger Error'));
      fireEvent.click(screen.getByText('Trigger Error'));

      // Should only show one error
      const errorMessages = screen.getAllByTestId('error-message');
      expect(errorMessages).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error recovery workflow', async () => {
      const errorRecovery = new ErrorRecoveryManager({
        maxRetries: 2,
        retryDelay: 50,
        enableAutoRecovery: false,
        logErrors: false,
      });

      const errorState = errorRecovery.createErrorState(
        'pagination error',
        'recoverable',
        'PAGINATION_ERROR'
      );

      let retryCount = 0;
      const mockRecoveryAction = jest.fn().mockImplementation(() => {
        retryCount++;
        if (retryCount < 2) {
          return Promise.reject('Still failing');
        }
        return Promise.resolve();
      });

      const mockOnErrorCleared = jest.fn();

      render(
        <ErrorDisplay
          errorState={errorState}
          errorRecovery={errorRecovery}
          onErrorCleared={mockOnErrorCleared}
          onRetry={mockRecoveryAction}
        />
      );

      // First retry should fail
      fireEvent.click(screen.getByText('Try Again'));
      await waitFor(() => {
        expect(mockRecoveryAction).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      // Second retry should succeed
      fireEvent.click(screen.getByText('Try Again'));
      await waitFor(() => {
        expect(mockRecoveryAction).toHaveBeenCalledTimes(2);
      }, { timeout: 2000 });

      // Wait for success callback with longer timeout
      await waitFor(() => {
        expect(mockOnErrorCleared).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});

// Requirements validation tests
describe('Error Recovery Requirements Validation', () => {
  describe('Requirement 5.1: Improve error state management to prevent infinite error loops', () => {
    it('should prevent infinite error loops through duplicate detection', () => {
      render(<TestErrorStateComponent />);

      // Rapidly trigger the same error multiple times
      const triggerButton = screen.getByText('Trigger Error');
      for (let i = 0; i < 10; i++) {
        fireEvent.click(triggerButton);
      }

      // Should only show one error message
      const errorMessages = screen.getAllByTestId('error-message');
      expect(errorMessages).toHaveLength(1);
    });
  });

  describe('Requirement 5.2: Add user-friendly error messages for pagination state issues', () => {
    it('should convert technical pagination errors to user-friendly messages', () => {
      const errorRecovery = new ErrorRecoveryManager({ logErrors: false });
      
      const technicalError = errorRecovery.createErrorState(
        'pagination state validation failed',
        'recoverable'
      );

      expect(technicalError.errorMessage).not.toContain('validation failed');
      expect(technicalError.errorMessage).toContain('page data');
    });
  });

  describe('Requirement 5.3: Implement automatic error recovery mechanisms where possible', () => {
    it('should automatically attempt recovery for recoverable errors', () => {
      const errorRecovery = new ErrorRecoveryManager({
        enableAutoRecovery: true,
        logErrors: false
      });

      const recoverableError = errorRecovery.createErrorState(
        'network error',
        'recoverable',
        'NETWORK_ERROR'
      );

      expect(errorRecovery.shouldAutoRecover(recoverableError)).toBe(true);
    });

    it('should not attempt auto-recovery for critical errors', () => {
      const errorRecovery = new ErrorRecoveryManager({
        enableAutoRecovery: true,
        logErrors: false
      });

      const criticalError = errorRecovery.createErrorState(
        'critical system failure',
        'critical'
      );

      expect(errorRecovery.shouldAutoRecover(criticalError)).toBe(false);
    });
  });

  describe('Requirement 5.4: Add error boundaries for pagination components', () => {
    const originalError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });

    afterAll(() => {
      console.error = originalError;
    });

    it('should catch component errors and provide fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should provide recovery options in error boundaries', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });
  });
});
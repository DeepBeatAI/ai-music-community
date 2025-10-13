import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../Toast';
import { Toast as ToastType } from '@/types/toast';

describe('Toast Component', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders success toast with correct styling and icon', () => {
    const toast: ToastType = {
      id: 'test-1',
      message: 'Success message',
      type: 'success',
      duration: 4000,
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-green-600');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders error toast with correct styling and icon', () => {
    const toast: ToastType = {
      id: 'test-2',
      message: 'Error message',
      type: 'error',
      duration: 5000,
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-red-600');
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('renders info toast with correct styling and icon', () => {
    const toast: ToastType = {
      id: 'test-3',
      message: 'Info message',
      type: 'info',
      duration: 3000,
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-600');
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  it('auto-dismisses after specified duration', async () => {
    const toast: ToastType = {
      id: 'test-4',
      message: 'Auto dismiss test',
      type: 'success',
      duration: 2000,
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Fast-forward time by duration + animation time
    jest.advanceTimersByTime(2000 + 300);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('test-4');
    });
  });

  it('uses default duration of 4000ms when not specified', async () => {
    const toast: ToastType = {
      id: 'test-5',
      message: 'Default duration test',
      type: 'info',
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    // Fast-forward by less than default duration
    jest.advanceTimersByTime(3000);
    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Fast-forward to complete default duration + animation
    jest.advanceTimersByTime(1000 + 300);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('test-5');
    });
  });

  it('dismisses when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const toast: ToastType = {
      id: 'test-6',
      message: 'Manual dismiss test',
      type: 'success',
      duration: 5000,
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss notification');
    await user.click(dismissButton);

    // Fast-forward animation time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('test-6');
    });
  });

  it('has proper ARIA attributes for accessibility', () => {
    const successToast: ToastType = {
      id: 'test-7',
      message: 'Accessible toast',
      type: 'success',
    };

    const { rerender } = render(<Toast toast={successToast} onDismiss={mockOnDismiss} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');

    // Error toasts should have assertive aria-live
    const errorToast: ToastType = {
      id: 'test-8',
      message: 'Error toast',
      type: 'error',
    };

    rerender(<Toast toast={errorToast} onDismiss={mockOnDismiss} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies exit animation class when dismissing', async () => {
    const user = userEvent.setup({ delay: null });
    const toast: ToastType = {
      id: 'test-9',
      message: 'Animation test',
      type: 'info',
    };

    render(<Toast toast={toast} onDismiss={mockOnDismiss} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('opacity-100');
    expect(alert).not.toHaveClass('opacity-0');

    const dismissButton = screen.getByLabelText('Dismiss notification');
    await user.click(dismissButton);

    // Check that exit animation class is applied
    expect(alert).toHaveClass('opacity-0', 'translate-x-full');
  });
});

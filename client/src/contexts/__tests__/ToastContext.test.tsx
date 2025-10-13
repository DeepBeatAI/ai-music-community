import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../ToastContext';
import { ReactNode } from 'react';

// Test component that uses the toast context
function TestComponent() {
  const { showToast, toasts } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success', 3000)}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error', 5000)}>
        Show Error
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('throws error when useToast is used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('provides toast functionality to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
    expect(screen.getByText('Show Info')).toBeInTheDocument();
  });

  it('shows success toast when showToast is called', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Success');
    await user.click(showButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('shows error toast when showToast is called', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Error');
    await user.click(showButton);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('shows info toast when showToast is called', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Info');
    await user.click(showButton);

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('supports multiple toasts in queue', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show multiple toasts
    await user.click(screen.getByText('Show Success'));
    await user.click(screen.getByText('Show Error'));
    await user.click(screen.getByText('Show Info'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });

  it('auto-dismisses toasts after duration', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    // Fast-forward time by duration + animation time
    jest.advanceTimersByTime(3000 + 300);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  it('dismisses toast when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss notification');
    await user.click(dismissButton);

    // Fast-forward animation time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  it('generates unique IDs for each toast', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show same message multiple times
    await user.click(screen.getByText('Show Success'));
    await user.click(screen.getByText('Show Success'));

    const toasts = screen.getAllByText('Success message');
    expect(toasts).toHaveLength(2);
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
  });

  it('uses default duration when not specified', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();

    // Fast-forward by default duration (4000ms) + animation
    jest.advanceTimersByTime(4000 + 300);

    await waitFor(() => {
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    });
  });
});

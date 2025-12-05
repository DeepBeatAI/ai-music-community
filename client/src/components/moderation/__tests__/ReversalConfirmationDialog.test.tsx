import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReversalConfirmationDialog, OriginalActionDetails } from '../ReversalConfirmationDialog';

describe('ReversalConfirmationDialog', () => {
  const mockOriginalAction: OriginalActionDetails = {
    actionType: 'user_suspended',
    reason: 'Spam posting',
    appliedBy: 'moderator_jane',
    appliedAt: '2024-01-01T10:30:00Z',
    duration: '14 days',
    expiresAt: '2024-01-15T10:30:00Z',
    targetUser: 'john_doe',
  };

  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ReversalConfirmationDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    expect(screen.getByText('Test Reversal')).toBeInTheDocument();
  });

  it('should display original action details', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    expect(screen.getByText('User Suspended')).toBeInTheDocument();
    expect(screen.getByText('Spam posting')).toBeInTheDocument();
    expect(screen.getByText('moderator_jane')).toBeInTheDocument();
    expect(screen.getByText('john_doe')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
  });

  it('should disable confirm button when reason is empty', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const confirmButton = screen.getByText('Confirm Reversal');
    expect(confirmButton).toBeDisabled();
  });

  it('should show validation error for reason too short', async () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: 'Short' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Reason must be at least 10 characters')).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should call onConfirm with valid reason', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: 'Valid reason for reversal' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Valid reason for reversal');
    });
  });

  it('should show loading state during submission', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: 'Valid reason for reversal' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('should show success message after successful reversal', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: 'Valid reason for reversal' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Action Reversed Successfully')).toBeInTheDocument();
    });
  });

  it('should show error message on failure', async () => {
    mockOnConfirm.mockRejectedValue(new Error('Failed to reverse action'));

    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: 'Valid reason for reversal' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to reverse action')).toBeInTheDocument();
    });
  });

  it('should show irreversible warning when isIrreversible is true', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
        isIrreversible={true}
      />
    );

    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
  });

  it('should show custom warning message', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
        warningMessage="Custom warning message"
      />
    );

    expect(screen.getByText('Custom warning message')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should use custom confirm button text', () => {
    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
        confirmButtonText="Custom Confirm Text"
      />
    );

    expect(screen.getByText('Custom Confirm Text')).toBeInTheDocument();
  });

  it('should trim whitespace from reason before calling onConfirm', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    render(
      <ReversalConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Reversal"
        originalAction={mockOriginalAction}
      />
    );

    const textarea = screen.getByLabelText(/reason for reversal/i);
    fireEvent.change(textarea, { target: { value: '  Valid reason with spaces  ' } });

    const confirmButton = screen.getByText('Confirm Reversal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Valid reason with spaces');
    });
  });
});

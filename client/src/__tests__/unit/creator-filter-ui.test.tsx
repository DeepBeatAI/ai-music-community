import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatorFilterButton from '@/components/CreatorFilterButton';
import CreatorFilterIndicator from '@/components/CreatorFilterIndicator';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('CreatorFilterButton Component', () => {
  const mockOnFilterByCreator = jest.fn();
  const defaultProps = {
    creatorId: 'creator-123',
    creatorUsername: 'testcreator',
    onFilterByCreator: mockOnFilterByCreator
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<CreatorFilterButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('See posts')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      render(<CreatorFilterButton {...defaultProps} size="lg" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-base', 'px-4', 'py-2');
    });

    it('should render with primary variant', () => {
      render(<CreatorFilterButton {...defaultProps} variant="primary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should render with custom className', () => {
      render(<CreatorFilterButton {...defaultProps} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Active State', () => {
    it('should render active state correctly', () => {
      render(<CreatorFilterButton {...defaultProps} isActive={true} />);
      
      expect(screen.getByText('Currently viewing')).toBeInTheDocument();
      expect(screen.getByText('👁️')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Currently viewing posts by testcreator');
    });

    it('should render inactive state correctly', () => {
      render(<CreatorFilterButton {...defaultProps} isActive={false} />);
      
      expect(screen.getByText('See posts')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'See posts from testcreator');
    });

    it('should apply active styles for primary variant', () => {
      render(<CreatorFilterButton {...defaultProps} isActive={true} variant="primary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-700', 'shadow-md');
    });

    it('should apply active styles for secondary variant', () => {
      render(<CreatorFilterButton {...defaultProps} isActive={true} variant="secondary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-blue-400', 'text-blue-200', 'bg-blue-900/50');
    });
  });

  describe('Click Behavior', () => {
    it('should call onFilterByCreator when clicked', async () => {
      const user = userEvent.setup();
      render(<CreatorFilterButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(mockOnFilterByCreator).toHaveBeenCalledWith('creator-123', 'testcreator');
      expect(mockOnFilterByCreator).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during async operation', async () => {
      const slowMockFunction = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CreatorFilterButton {...defaultProps} onFilterByCreator={slowMockFunction} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show loading spinner
      expect(screen.getByRole('button')).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(screen.getByRole('button')).toBeDisabled();
      // Check for loading spinner element
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });

    it('should prevent multiple clicks during loading', async () => {
      const slowMockFunction = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 50))
      );
      
      render(<CreatorFilterButton {...defaultProps} onFilterByCreator={slowMockFunction} />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times quickly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.queryByTitle(/loading/i)).not.toBeInTheDocument();
      });
      
      // Should only be called once
      expect(slowMockFunction).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const errorMockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<CreatorFilterButton {...defaultProps} onFilterByCreator={errorMockFunction} />);
      
      const button = screen.getByRole('button');
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.queryByTitle(/loading/i)).not.toBeInTheDocument();
      });
      
      // Button should be clickable again after error
      expect(button).not.toHaveClass('opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<CreatorFilterButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it('should be disabled during loading', () => {
      const slowMockFunction = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CreatorFilterButton {...defaultProps} onFilterByCreator={slowMockFunction} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(button).toBeDisabled();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<CreatorFilterButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnFilterByCreator).toHaveBeenCalled();
    });
  });
});

describe('CreatorFilterIndicator Component', () => {
  const mockOnClearFilter = jest.fn();
  const defaultProps = {
    creatorUsername: 'testcreator',
    onClearFilter: mockOnClearFilter
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with creator username', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      expect(screen.getByText(/Showing posts by/)).toBeInTheDocument();
      expect(screen.getByText('testcreator')).toBeInTheDocument();
      expect(screen.getByText('Only posts from this creator are displayed')).toBeInTheDocument();
    });

    it('should render clear filter button', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveTextContent('Clear Filter');
    });

    it('should render target emoji icon', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('should have proper styling classes', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      // Find the main container div with the blue background
      const container = document.querySelector('.bg-blue-900\\/20');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('border-blue-700');
    });
  });

  describe('Clear Filter Functionality', () => {
    it('should call onClearFilter when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter/i });
      await user.click(clearButton);
      
      expect(mockOnClearFilter).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', async () => {
      const user = userEvent.setup();
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter/i });
      await user.click(clearButton);
      await user.click(clearButton);
      
      expect(mockOnClearFilter).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for clear button', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter for testcreator/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter/i });
      await user.tab();
      expect(clearButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnClearFilter).toHaveBeenCalled();
    });

    it('should have focus styles', () => {
      render(<CreatorFilterIndicator {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filter/i });
      expect(clearButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Different Creator Names', () => {
    it('should handle long creator names', () => {
      render(<CreatorFilterIndicator {...defaultProps} creatorUsername="verylongcreatorusernamethatmightoverflow" />);
      
      expect(screen.getByText('verylongcreatorusernamethatmightoverflow')).toBeInTheDocument();
    });

    it('should handle special characters in creator names', () => {
      render(<CreatorFilterIndicator {...defaultProps} creatorUsername="creator@123_test" />);
      
      expect(screen.getByText('creator@123_test')).toBeInTheDocument();
    });

    it('should handle empty creator name gracefully', () => {
      render(<CreatorFilterIndicator {...defaultProps} creatorUsername="" />);
      
      expect(screen.getByText(/Showing posts by/)).toBeInTheDocument();
      // Should still render the clear button
      expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument();
    });
  });
});

describe('Creator Filter UI Integration', () => {
  const mockOnFilterByCreator = jest.fn();
  const mockOnClearFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should work together in a typical workflow', async () => {
    const user = userEvent.setup();
    
    // Render both components as they would appear together
    const { rerender } = render(
      <div>
        <CreatorFilterButton
          creatorId="creator-123"
          creatorUsername="testcreator"
          onFilterByCreator={mockOnFilterByCreator}
          isActive={false}
        />
      </div>
    );

    // Click the filter button
    const filterButton = screen.getByRole('button');
    await user.click(filterButton);
    
    expect(mockOnFilterByCreator).toHaveBeenCalledWith('creator-123', 'testcreator');

    // Simulate the state change - now show active button and indicator
    rerender(
      <div>
        <CreatorFilterButton
          creatorId="creator-123"
          creatorUsername="testcreator"
          onFilterByCreator={mockOnFilterByCreator}
          isActive={true}
        />
        <CreatorFilterIndicator
          creatorUsername="testcreator"
          onClearFilter={mockOnClearFilter}
        />
      </div>
    );

    // Verify active state
    expect(screen.getByText('Currently viewing')).toBeInTheDocument();
    expect(screen.getByText(/Showing posts by/)).toBeInTheDocument();
    expect(screen.getByText('testcreator')).toBeInTheDocument();

    // Click clear filter
    const clearButton = screen.getByRole('button', { name: /clear filter/i });
    await user.click(clearButton);
    
    expect(mockOnClearFilter).toHaveBeenCalledTimes(1);
  });

  it('should handle error states in the workflow', async () => {
    const errorMockFunction = jest.fn().mockRejectedValue(new Error('Network error'));
    
    render(
      <CreatorFilterButton
        creatorId="creator-123"
        creatorUsername="testcreator"
        onFilterByCreator={errorMockFunction}
        isActive={false}
      />
    );

    const filterButton = screen.getByRole('button');
    fireEvent.click(filterButton);
    
    await waitFor(() => {
      expect(screen.queryByTitle(/loading/i)).not.toBeInTheDocument();
    });

    // Button should be clickable again after error
    expect(filterButton).not.toBeDisabled();
    expect(filterButton).not.toHaveClass('opacity-50');
  });
});
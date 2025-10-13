/**
 * EditedBadge Component Tests
 * 
 * Tests for the EditedBadge component that displays edit indicators
 * Requirements: 5.4
 */

import { render, screen } from '@testing-library/react';
import EditedBadge from '../EditedBadge';

describe('EditedBadge', () => {
  const baseDate = new Date('2024-01-01T12:00:00Z');
  
  beforeEach(() => {
    // Mock the current date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(baseDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Badge Visibility', () => {
    it('should show badge when timestamps differ', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      expect(screen.getByText('(Edited)')).toBeInTheDocument();
    });

    it('should not show badge when timestamps are identical', () => {
      const timestamp = '2024-01-01T10:00:00Z';
      
      const { container } = render(
        <EditedBadge createdAt={timestamp} updatedAt={timestamp} />
      );
      
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('(Edited)')).not.toBeInTheDocument();
    });

    it('should not show badge for unedited content', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T10:00:00Z';
      
      const { container } = render(
        <EditedBadge createdAt={createdAt} updatedAt={updatedAt} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should not show badge when updated_at is before created_at', () => {
      // Edge case: should not happen in practice, but test defensive behavior
      const createdAt = '2024-01-01T11:00:00Z';
      const updatedAt = '2024-01-01T10:00:00Z';
      
      const { container } = render(
        <EditedBadge createdAt={createdAt} updatedAt={updatedAt} />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tooltip Display', () => {
    it('should display correct tooltip for recent edit (minutes)', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:45:00Z'; // 15 minutes before current time
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 15 minutes ago');
    });

    it('should display "just now" for very recent edits', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:59:30Z'; // 30 seconds ago
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited just now');
    });

    it('should display correct tooltip for edit hours ago', () => {
      const createdAt = '2024-01-01T08:00:00Z';
      const updatedAt = '2024-01-01T09:00:00Z'; // 3 hours before current time
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 3 hours ago');
    });

    it('should display correct tooltip for edit days ago', () => {
      const createdAt = '2023-12-29T10:00:00Z';
      const updatedAt = '2023-12-30T10:00:00Z'; // 2 days before current time
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 2 days ago');
    });

    it('should display formatted date for edits over a week ago', () => {
      const createdAt = '2023-12-15T10:00:00Z';
      const updatedAt = '2023-12-20T10:00:00Z'; // 12 days before current time
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited on Dec 20, 2023');
    });

    it('should display formatted date without year for current year edits', () => {
      // Set current time to later in 2024
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-10T10:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited on Jan 10');
    });

    it('should use singular form for 1 minute ago', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:59:00Z'; // 1 minute ago
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 1 minute ago');
    });

    it('should use singular form for 1 hour ago', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z'; // 1 hour ago
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 1 hour ago');
    });

    it('should use singular form for 1 day ago', () => {
      const createdAt = '2023-12-30T10:00:00Z';
      const updatedAt = '2023-12-31T12:00:00Z'; // 1 day ago
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited 1 day ago');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with tooltip text', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:45:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('aria-label', 'Edited 15 minutes ago');
    });

    it('should have cursor-help class for tooltip indication', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveClass('cursor-help');
    });
  });

  describe('Styling', () => {
    it('should have subtle gray text styling', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveClass('text-gray-500');
    });

    it('should have small font size', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveClass('text-xs');
    });

    it('should apply custom className when provided', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(
        <EditedBadge 
          createdAt={createdAt} 
          updatedAt={updatedAt} 
          className="custom-class ml-2"
        />
      );
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveClass('custom-class', 'ml-2');
    });

    it('should have hover effect', () => {
      const createdAt = '2024-01-01T10:00:00Z';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveClass('hover:text-gray-400');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const createdAt = 'invalid-date';
      const updatedAt = '2024-01-01T11:00:00Z';
      
      // Should not crash, but behavior depends on Date constructor
      const { container } = render(
        <EditedBadge createdAt={createdAt} updatedAt={updatedAt} />
      );
      
      // Component should render something or nothing, but not crash
      expect(container).toBeInTheDocument();
    });

    it('should handle millisecond differences in timestamps', () => {
      const createdAt = '2024-01-01T10:00:00.000Z';
      const updatedAt = '2024-01-01T10:00:00.001Z'; // 1ms difference
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      // Should show badge even for tiny differences
      expect(screen.getByText('(Edited)')).toBeInTheDocument();
    });

    it('should handle very old edits', () => {
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      
      const createdAt = '2020-01-01T10:00:00Z';
      const updatedAt = '2020-06-15T10:00:00Z';
      
      render(<EditedBadge createdAt={createdAt} updatedAt={updatedAt} />);
      
      const badge = screen.getByText('(Edited)');
      expect(badge).toHaveAttribute('title', 'Edited on Jun 15, 2020');
    });
  });
});

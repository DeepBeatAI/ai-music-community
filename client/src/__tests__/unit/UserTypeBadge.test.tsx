/**
 * UserTypeBadge Component Test Suite
 * 
 * Tests the UserTypeBadge component functionality
 * Requirements: 2.1, 15.3, 15.4
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserTypeBadge from '@/components/profile/UserTypeBadge';

describe('UserTypeBadge Component', () => {
  describe('Single Badge Display', () => {
    test('should render a single badge with correct text', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toBeInTheDocument();
    });

    test('should render Free User badge with gray styling', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });

    test('should render Premium badge with blue styling', () => {
      render(<UserTypeBadge userType="Premium" />);
      
      const badge = screen.getByText('Premium');
      expect(badge).toHaveClass('bg-blue-700', 'text-blue-200', 'border-blue-600');
    });

    test('should render Pro badge with yellow styling', () => {
      render(<UserTypeBadge userType="Pro" />);
      
      const badge = screen.getByText('Pro');
      expect(badge).toHaveClass('bg-yellow-700', 'text-yellow-200', 'border-yellow-600');
    });

    test('should render Verified badge with green styling', () => {
      render(<UserTypeBadge userType="Verified" />);
      
      const badge = screen.getByText('Verified');
      expect(badge).toHaveClass('bg-green-700', 'text-green-200', 'border-green-600');
    });

    test('should render unknown badge type with default gray styling', () => {
      render(<UserTypeBadge userType="Unknown Type" />);
      
      const badge = screen.getByText('Unknown Type');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });

    test('should handle case-insensitive badge type matching', () => {
      render(<UserTypeBadge userType="FREE USER" />);
      
      const badge = screen.getByText('FREE USER');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });
  });

  describe('Multiple Badges Display', () => {
    test('should render multiple badges when userTypes array is provided', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['Premium', 'Verified']} />);
      
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.queryByText('Free User')).not.toBeInTheDocument();
    });

    test('should render all badges with correct styling', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['Premium', 'Pro', 'Verified']} />);
      
      const premiumBadge = screen.getByText('Premium');
      const proBadge = screen.getByText('Pro');
      const verifiedBadge = screen.getByText('Verified');
      
      expect(premiumBadge).toHaveClass('bg-blue-700');
      expect(proBadge).toHaveClass('bg-yellow-700');
      expect(verifiedBadge).toHaveClass('bg-green-700');
    });

    test('should fallback to single userType when userTypes array is empty', () => {
      render(<UserTypeBadge userType="Free User" userTypes={[]} />);
      
      expect(screen.getByText('Free User')).toBeInTheDocument();
    });

    test('should render multiple badges in correct order', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['First', 'Second', 'Third']} />);
      
      const badges = screen.getAllByRole('listitem');
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent('First');
      expect(badges[1]).toHaveTextContent('Second');
      expect(badges[2]).toHaveTextContent('Third');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA role for badge container', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const container = screen.getByRole('list');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'User badges');
    });

    test('should have proper ARIA role for each badge', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByRole('listitem');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Free User badge');
    });

    test('should have proper ARIA labels for multiple badges', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['Premium', 'Verified']} />);
      
      const badges = screen.getAllByRole('listitem');
      expect(badges[0]).toHaveAttribute('aria-label', 'Premium badge');
      expect(badges[1]).toHaveAttribute('aria-label', 'Verified badge');
    });
  });

  describe('Styling and Layout', () => {
    test('should have pill-shaped styling', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('rounded-full');
    });

    test('should have proper spacing and padding', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('px-3', 'py-1');
    });

    test('should have transition effects', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('transition-colors', 'duration-200');
    });

    test('should have proper text styling', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('text-sm', 'font-medium');
    });

    test('should have border styling', () => {
      render(<UserTypeBadge userType="Free User" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('border');
    });

    test('should have flex gap for multiple badges', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['Premium', 'Verified']} />);
      
      const container = screen.getByRole('list');
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string userType', () => {
      render(<UserTypeBadge userType="" />);
      
      const badge = screen.getByRole('listitem');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('');
    });

    test('should handle special characters in userType', () => {
      render(<UserTypeBadge userType="Premium+" />);
      
      expect(screen.getByText('Premium+')).toBeInTheDocument();
    });

    test('should handle very long userType text', () => {
      const longText = 'This is a very long user type name that should still render correctly';
      render(<UserTypeBadge userType={longText} />);
      
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    test('should handle userType with partial keyword match', () => {
      render(<UserTypeBadge userType="Premium User" />);
      
      const badge = screen.getByText('Premium User');
      expect(badge).toHaveClass('bg-blue-700'); // Should match "premium"
    });
  });
});

/**
 * UserTypeBadge Component Test Suite
 * 
 * Tests the UserTypeBadge component functionality with new user types system
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserTypeBadge from '@/components/profile/UserTypeBadge';
import { PlanTier, RoleType } from '@/types/userTypes';

describe('UserTypeBadge Component', () => {
  describe('New User Types System - Plan Tier Display', () => {
    test('should render Free User plan tier badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });

    test('should render Creator Pro plan tier badge', () => {
      render(<UserTypeBadge planTier={PlanTier.CREATOR_PRO} />);
      
      const badge = screen.getByText('Creator Pro');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-700', 'text-yellow-200', 'border-yellow-600');
    });

    test('should render Creator Premium plan tier badge', () => {
      render(<UserTypeBadge planTier={PlanTier.CREATOR_PREMIUM} />);
      
      const badge = screen.getByText('Creator Premium');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-700', 'text-blue-200', 'border-blue-600');
    });

    test('should have proper ARIA label for plan tier badge', () => {
      render(<UserTypeBadge planTier={PlanTier.CREATOR_PRO} />);
      
      const badge = screen.getByRole('listitem');
      expect(badge).toHaveAttribute('aria-label', 'Creator Pro plan tier');
    });
  });

  describe('New User Types System - Role Display', () => {
    test('should render Admin role badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} roles={[RoleType.ADMIN]} />);
      
      const badge = screen.getByText('Admin');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-700', 'text-red-200', 'border-red-600');
    });

    test('should render Moderator role badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} roles={[RoleType.MODERATOR]} />);
      
      const badge = screen.getByText('Moderator');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-purple-700', 'text-purple-200', 'border-purple-600');
    });

    test('should render Tester role badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} roles={[RoleType.TESTER]} />);
      
      const badge = screen.getByText('Tester');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-700', 'text-green-200', 'border-green-600');
    });

    test('should have proper ARIA label for role badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} roles={[RoleType.ADMIN]} />);
      
      const badges = screen.getAllByRole('listitem');
      const adminBadge = badges.find(b => b.textContent === 'Admin');
      expect(adminBadge).toHaveAttribute('aria-label', 'Admin role');
    });
  });

  describe('New User Types System - Multiple Badges', () => {
    test('should render plan tier and single role', () => {
      render(<UserTypeBadge planTier={PlanTier.CREATOR_PRO} roles={[RoleType.MODERATOR]} />);
      
      expect(screen.getByText('Creator Pro')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    test('should render plan tier and multiple roles', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PREMIUM} 
          roles={[RoleType.ADMIN, RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      expect(screen.getByText('Creator Premium')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Tester')).toBeInTheDocument();
    });

    test('should render badges in correct order (plan tier first, then roles)', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      const badges = screen.getAllByRole('listitem');
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent('Creator Pro');
      expect(badges[1]).toHaveTextContent('Moderator');
      expect(badges[2]).toHaveTextContent('Tester');
    });

    test('should apply correct styling to each badge type', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PREMIUM} 
          roles={[RoleType.ADMIN, RoleType.TESTER]} 
        />
      );
      
      const premiumBadge = screen.getByText('Creator Premium');
      const adminBadge = screen.getByText('Admin');
      const testerBadge = screen.getByText('Tester');
      
      expect(premiumBadge).toHaveClass('bg-blue-700');
      expect(adminBadge).toHaveClass('bg-red-700');
      expect(testerBadge).toHaveClass('bg-green-700');
    });
  });

  describe('New User Types System - Visibility Controls', () => {
    test('should hide plan tier when showPlanTier is false', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR]} 
          showPlanTier={false}
        />
      );
      
      expect(screen.queryByText('Creator Pro')).not.toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    test('should hide roles when showRoles is false', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR]} 
          showRoles={false}
        />
      );
      
      expect(screen.getByText('Creator Pro')).toBeInTheDocument();
      expect(screen.queryByText('Moderator')).not.toBeInTheDocument();
    });

    test('should render nothing when both showPlanTier and showRoles are false', () => {
      const { container } = render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR]} 
          showPlanTier={false}
          showRoles={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    test('should render nothing when no roles provided and showPlanTier is false', () => {
      const { container } = render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          showPlanTier={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('New User Types System - Size Variants', () => {
    test('should apply small size styling', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} size="sm" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    test('should apply medium size styling (default)', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} size="md" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
    });

    test('should apply large size styling', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} size="lg" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('px-4', 'py-1.5', 'text-base');
    });

    test('should default to medium size when size prop not provided', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
    });
  });

  describe('Legacy Support - Single Badge Display', () => {
    test('should render a single badge with correct text', () => {
      render(<UserTypeBadge userType="Free User" planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toBeInTheDocument();
    });

    test('should render Free User badge with gray styling', () => {
      render(<UserTypeBadge userType="Free User" planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });

    test('should render Premium badge with blue styling', () => {
      render(<UserTypeBadge userType="Premium" planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Premium');
      expect(badge).toHaveClass('bg-blue-700', 'text-blue-200', 'border-blue-600');
    });

    test('should render Pro badge with yellow styling', () => {
      render(<UserTypeBadge userType="Pro" planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Pro');
      expect(badge).toHaveClass('bg-yellow-700', 'text-yellow-200', 'border-yellow-600');
    });

    test('should handle case-insensitive badge type matching', () => {
      render(<UserTypeBadge userType="FREE USER" planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('FREE USER');
      expect(badge).toHaveClass('bg-gray-700', 'text-gray-300', 'border-gray-600');
    });
  });

  describe('Legacy Support - Multiple Badges Display', () => {
    test('should render multiple badges when userTypes array is provided', () => {
      render(<UserTypeBadge userType="Free User" userTypes={['Premium', 'Verified']} planTier={PlanTier.FREE_USER} />);
      
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.queryByText('Free User')).not.toBeInTheDocument();
    });

    test('should fallback to single userType when userTypes array is empty', () => {
      render(<UserTypeBadge userType="Free User" userTypes={[]} planTier={PlanTier.FREE_USER} />);
      
      expect(screen.getByText('Free User')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA role for badge container', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const container = screen.getByRole('list');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'User type badges');
    });

    test('should have proper ARIA role for each badge', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByRole('listitem');
      expect(badge).toBeInTheDocument();
    });

    test('should have proper ARIA labels for multiple badges', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      const badges = screen.getAllByRole('listitem');
      expect(badges[0]).toHaveAttribute('aria-label', 'Creator Pro plan tier');
      expect(badges[1]).toHaveAttribute('aria-label', 'Moderator role');
      expect(badges[2]).toHaveAttribute('aria-label', 'Tester role');
    });

    test('should maintain accessibility with legacy props', () => {
      render(<UserTypeBadge userType="Free User" planTier={PlanTier.FREE_USER} />);
      
      const container = screen.getByRole('list');
      expect(container).toHaveAttribute('aria-label', 'User badges');
      
      const badge = screen.getByRole('listitem');
      expect(badge).toHaveAttribute('aria-label', 'Free User badge');
    });
  });

  describe('Styling and Layout', () => {
    test('should have pill-shaped styling', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('rounded-full');
    });

    test('should have transition effects', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('transition-colors', 'duration-200');
    });

    test('should have proper text styling', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('font-medium');
    });

    test('should have border styling', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('border');
    });

    test('should have flex gap for multiple badges', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR]} 
        />
      );
      
      const container = screen.getByRole('list');
      expect(container).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });
  });

  describe('Responsive Behavior', () => {
    test('should use flex-wrap for responsive layout', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PREMIUM} 
          roles={[RoleType.ADMIN, RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      const container = screen.getByRole('list');
      expect(container).toHaveClass('flex-wrap');
    });

    test('should maintain consistent spacing across different badge counts', () => {
      const { rerender } = render(<UserTypeBadge planTier={PlanTier.FREE_USER} />);
      let container = screen.getByRole('list');
      expect(container).toHaveClass('gap-2');
      
      rerender(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.ADMIN, RoleType.MODERATOR]} 
        />
      );
      container = screen.getByRole('list');
      expect(container).toHaveClass('gap-2');
    });

    test('should render correctly with different size variants on mobile', () => {
      render(<UserTypeBadge planTier={PlanTier.FREE_USER} size="sm" />);
      
      const badge = screen.getByText('Free User');
      expect(badge).toHaveClass('text-xs');
    });
  });
});

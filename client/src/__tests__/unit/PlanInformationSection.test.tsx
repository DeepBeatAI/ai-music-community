/**
 * PlanInformationSection Component Test Suite
 * 
 * Tests the PlanInformationSection component functionality
 * Requirements: 4.1, 4.2, 4.3
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlanInformationSection from '@/components/account/PlanInformationSection';
import { PlanTier, RoleType } from '@/types/userTypes';

describe('PlanInformationSection Component', () => {
  describe('Plan Tier Display', () => {
    test('should render Free User plan tier name', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const heading = screen.getByRole('heading', { name: 'Free User' });
      expect(heading).toBeInTheDocument();
    });

    test('should render Creator Pro plan tier name', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PRO} roles={[]} />);
      
      const heading = screen.getByRole('heading', { name: 'Creator Pro' });
      expect(heading).toBeInTheDocument();
    });

    test('should render Creator Premium plan tier name', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PREMIUM} roles={[]} />);
      
      const heading = screen.getByRole('heading', { name: 'Creator Premium' });
      expect(heading).toBeInTheDocument();
    });

    test('should display plan tier name with correct styling', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PRO} roles={[]} />);
      
      const planName = screen.getByRole('heading', { name: 'Creator Pro' });
      expect(planName).toHaveClass('text-2xl', 'font-bold', 'text-white');
    });
  });

  describe('Plan Description Display', () => {
    test('should render Free User plan description', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getByText(/Access to basic features including track uploads/)).toBeInTheDocument();
    });

    test('should render Creator Pro plan description', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PRO} roles={[]} />);
      
      expect(screen.getByText(/Enhanced creator features with increased upload limits/)).toBeInTheDocument();
    });

    test('should render Creator Premium plan description', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PREMIUM} roles={[]} />);
      
      expect(screen.getByText(/Full platform access with unlimited uploads/)).toBeInTheDocument();
    });

    test('should display description with correct styling', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const description = screen.getByText(/Access to basic features including track uploads/);
      expect(description).toHaveClass('text-gray-300', 'text-sm');
    });
  });

  describe('Badge Display', () => {
    test('should render plan tier badge', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PRO} roles={[]} />);
      
      const badges = screen.getAllByRole('listitem');
      expect(badges.length).toBeGreaterThan(0);
      expect(screen.getAllByText('Creator Pro')).toHaveLength(2); // Once in title, once in badge
    });

    test('should render plan tier and role badges', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR]} 
        />
      );
      
      expect(screen.getAllByText('Creator Pro')).toHaveLength(2); // Once in title, once in badge
      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    test('should render multiple role badges', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PREMIUM} 
          roles={[RoleType.ADMIN, RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Tester')).toBeInTheDocument();
    });

    test('should render badges with medium size', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const badges = screen.getAllByRole('listitem');
      const badge = badges[0]; // Get the first badge
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
    });
  });

  describe('Change Plan Button', () => {
    test('should render Change Plan button', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Change Plan →');
    });

    test('should call onChangePlan callback when button clicked', () => {
      const mockOnChangePlan = jest.fn();
      render(
        <PlanInformationSection 
          planTier={PlanTier.FREE_USER} 
          roles={[]} 
          onChangePlan={mockOnChangePlan}
        />
      );
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      fireEvent.click(button);
      
      expect(mockOnChangePlan).toHaveBeenCalledTimes(1);
    });

    test('should show alert when no onChangePlan callback provided', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      fireEvent.click(button);
      
      expect(alertSpy).toHaveBeenCalledWith(
        'Plan management coming soon! You will be able to upgrade or change your plan here.'
      );
      
      alertSpy.mockRestore();
    });

    test('should have proper button styling', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'text-white', 'font-medium', 'rounded-lg');
    });

    test('should have proper ARIA label', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      expect(button).toHaveAttribute('aria-label', 'Change subscription plan');
    });
  });

  describe('Section Structure', () => {
    test('should render section title', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getByText('Plan & Subscription')).toBeInTheDocument();
    });

    test('should render Current Plan label', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });

    test('should have proper container styling', () => {
      const { container } = render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const planContainer = container.querySelector('.bg-gray-700\\/50');
      expect(planContainer).toBeInTheDocument();
      expect(planContainer).toHaveClass('rounded-lg', 'border', 'border-gray-600');
    });

    test('should render support text for desktop', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getByText(/Need help choosing a plan/)).toBeInTheDocument();
    });

    test('should render mobile info text', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getByText(/Manage your subscription and billing/)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('should have responsive button layout classes', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      expect(button).toHaveClass('w-full', 'sm:w-auto');
    });

    test('should have responsive flex direction for button container', () => {
      const { container } = render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const buttonContainer = container.querySelector('.flex.flex-col.sm\\:flex-row');
      expect(buttonContainer).toBeInTheDocument();
    });

    test('should hide mobile info on desktop', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const mobileInfo = screen.getByText(/Manage your subscription and billing/);
      expect(mobileInfo).toHaveClass('sm:hidden');
    });

    test('should hide desktop info on mobile', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const desktopInfo = screen.getByText(/Need help choosing a plan/);
      expect(desktopInfo.parentElement).toHaveClass('hidden', 'sm:block');
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const mainHeading = screen.getByRole('heading', { name: 'Plan & Subscription' });
      expect(mainHeading.tagName).toBe('H2');
      
      const planHeading = screen.getByRole('heading', { name: 'Free User' });
      expect(planHeading.tagName).toBe('H3');
    });

    test('should have proper label for Current Plan', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const label = screen.getByText('Current Plan');
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-gray-400');
    });

    test('should have focus styles on button', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    test('should maintain proper color contrast', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      const planHeading = screen.getByRole('heading', { name: 'Free User' });
      expect(planHeading).toHaveClass('text-white');
      
      const description = screen.getByText(/Access to basic features/);
      expect(description).toHaveClass('text-gray-300');
    });
  });

  describe('Integration with Different Plan Tiers', () => {
    test('should render correctly for Free User', () => {
      render(<PlanInformationSection planTier={PlanTier.FREE_USER} roles={[]} />);
      
      expect(screen.getAllByText('Free User')).toHaveLength(2); // Title and badge
      expect(screen.getByText(/Access to basic features/)).toBeInTheDocument();
    });

    test('should render correctly for Creator Pro', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PRO} roles={[]} />);
      
      expect(screen.getAllByText('Creator Pro')).toHaveLength(2); // Title and badge
      expect(screen.getByText(/Enhanced creator features/)).toBeInTheDocument();
    });

    test('should render correctly for Creator Premium', () => {
      render(<PlanInformationSection planTier={PlanTier.CREATOR_PREMIUM} roles={[]} />);
      
      expect(screen.getAllByText('Creator Premium')).toHaveLength(2); // Title and badge
      expect(screen.getByText(/Full platform access/)).toBeInTheDocument();
    });

    test('should render correctly with admin role', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PREMIUM} 
          roles={[RoleType.ADMIN]} 
        />
      );
      
      expect(screen.getAllByText('Creator Premium')).toHaveLength(2); // Title and badge
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    test('should render correctly with multiple roles', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PRO} 
          roles={[RoleType.MODERATOR, RoleType.TESTER]} 
        />
      );
      
      expect(screen.getAllByText('Creator Pro')).toHaveLength(2); // Title and badge
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Tester')).toBeInTheDocument();
    });
  });
});

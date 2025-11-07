/**
 * CreatorProfileHeader Component Test Suite
 * 
 * Tests the CreatorProfileHeader component functionality
 * Requirements: 2.1, 2.2, 4.1, 4.2
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatorProfileHeader from '@/components/profile/CreatorProfileHeader';
import type { CreatorProfile } from '@/types';

// Mock the FollowButton component
jest.mock('@/components/FollowButton', () => {
  return function MockFollowButton({ username }: { userId: string; username: string }) {
    return <button data-testid="follow-button">Follow {username}</button>;
  };
});

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('CreatorProfileHeader Component', () => {
  const mockProfile: CreatorProfile = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'This is a test bio',
    website: 'https://example.com',
    user_type: 'Free User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('Basic Rendering', () => {
    test('should render username', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    test('should render full name when provided', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    test('should not render full name when not provided', () => {
      const profileWithoutName = { ...mockProfile, full_name: null };
      render(<CreatorProfileHeader profile={profileWithoutName} isOwnProfile={false} />);
      
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    test('should render bio when provided', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      expect(screen.getByText('This is a test bio')).toBeInTheDocument();
    });

    test('should not render bio when not provided', () => {
      const profileWithoutBio = { ...mockProfile, bio: null };
      render(<CreatorProfileHeader profile={profileWithoutBio} isOwnProfile={false} />);
      
      expect(screen.queryByText('This is a test bio')).not.toBeInTheDocument();
    });

    test('should render website link when provided', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const websiteLink = screen.getByRole('link', { name: /Visit testuser's website/i });
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://example.com');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('should not render website link when not provided', () => {
      const profileWithoutWebsite = { ...mockProfile, website: null };
      render(<CreatorProfileHeader profile={profileWithoutWebsite} isOwnProfile={false} />);
      
      expect(screen.queryByRole('link', { name: /Visit testuser's website/i })).not.toBeInTheDocument();
    });
  });

  describe('Avatar Display', () => {
    test('should render avatar image when avatar_url is provided', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const avatar = screen.getByAltText("testuser's avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    test('should render fallback initial when avatar_url is not provided', () => {
      const profileWithoutAvatar = { ...mockProfile, avatar_url: null };
      render(<CreatorProfileHeader profile={profileWithoutAvatar} isOwnProfile={false} />);
      
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of username
    });

    test('should use uppercase first letter for fallback', () => {
      const profileWithLowercase = { ...mockProfile, username: 'lowercase', avatar_url: null };
      render(<CreatorProfileHeader profile={profileWithLowercase} isOwnProfile={false} />);
      
      expect(screen.getByText('L')).toBeInTheDocument();
    });
  });

  describe('Follow Button Display', () => {
    test('should show follow button when viewing another user profile', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const followButton = screen.getByTestId('follow-button');
      expect(followButton).toBeInTheDocument();
    });

    test('should hide follow button when viewing own profile', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={true} />);
      
      const followButton = screen.queryByTestId('follow-button');
      expect(followButton).not.toBeInTheDocument();
    });

    test('should pass correct props to FollowButton', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const followButton = screen.getByTestId('follow-button');
      expect(followButton).toHaveTextContent('Follow testuser');
    });
  });

  describe('Responsive Layout', () => {
    test('should have responsive flex layout classes', () => {
      const { container } = render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const mainContainer = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(mainContainer).toBeInTheDocument();
    });

    test('should have responsive avatar size classes', () => {
      const { container } = render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const avatarContainer = container.querySelector('.w-32.h-32.md\\:w-40.md\\:h-40');
      expect(avatarContainer).toBeInTheDocument();
    });

    test('should have responsive text size classes', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const username = screen.getByText('testuser');
      expect(username).toHaveClass('text-3xl', 'md:text-4xl');
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('testuser');
    });

    test('should have proper alt text for avatar', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const avatar = screen.getByAltText("testuser's avatar");
      expect(avatar).toBeInTheDocument();
    });

    test('should have proper aria-label for website link', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const websiteLink = screen.getByRole('link', { name: /Visit testuser's website/i });
      expect(websiteLink).toHaveAttribute('aria-label', "Visit testuser's website");
    });

    test('should have aria-hidden on decorative icons', () => {
      const { container } = render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach(svg => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Styling', () => {
    test('should have proper background and border styling', () => {
      const { container } = render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const mainContainer = container.querySelector('.bg-gray-800.rounded-lg');
      expect(mainContainer).toBeInTheDocument();
    });

    test('should have proper spacing classes', () => {
      const { container } = render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const mainContainer = container.querySelector('.p-6.mb-6');
      expect(mainContainer).toBeInTheDocument();
    });

    test('should have proper text color classes', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const username = screen.getByText('testuser');
      expect(username).toHaveClass('text-white');
      
      const fullName = screen.getByText('Test User');
      expect(fullName).toHaveClass('text-gray-300');
      
      const bio = screen.getByText('This is a test bio');
      expect(bio).toHaveClass('text-gray-300');
    });

    test('should have proper link styling', () => {
      render(<CreatorProfileHeader profile={mockProfile} isOwnProfile={false} />);
      
      const websiteLink = screen.getByRole('link', { name: /Visit testuser's website/i });
      expect(websiteLink).toHaveClass('text-blue-400', 'hover:text-blue-300');
    });
  });

  describe('Text Handling', () => {
    test('should handle long usernames with word break', () => {
      const profileWithLongUsername = { ...mockProfile, username: 'verylongusernamethatmightoverflow' };
      render(<CreatorProfileHeader profile={profileWithLongUsername} isOwnProfile={false} />);
      
      const username = screen.getByText('verylongusernamethatmightoverflow');
      expect(username).toHaveClass('break-words');
    });

    test('should handle long full names with word break', () => {
      const profileWithLongName = { ...mockProfile, full_name: 'Very Long Full Name That Might Overflow' };
      render(<CreatorProfileHeader profile={profileWithLongName} isOwnProfile={false} />);
      
      const fullName = screen.getByText('Very Long Full Name That Might Overflow');
      expect(fullName).toHaveClass('break-words');
    });

    test('should preserve whitespace in bio', () => {
      const profileWithMultilineBio = { ...mockProfile, bio: 'Line 1\nLine 2\nLine 3' };
      render(<CreatorProfileHeader profile={profileWithMultilineBio} isOwnProfile={false} />);
      
      const bio = screen.getByText((content, element) => {
        return element?.textContent === 'Line 1\nLine 2\nLine 3';
      });
      expect(bio).toHaveClass('whitespace-pre-wrap');
    });

    test('should handle long website URLs with word break', () => {
      const profileWithLongUrl = { ...mockProfile, website: 'https://verylongwebsiteurl.com/with/many/paths' };
      render(<CreatorProfileHeader profile={profileWithLongUrl} isOwnProfile={false} />);
      
      const websiteText = screen.getByText('https://verylongwebsiteurl.com/with/many/paths');
      expect(websiteText).toHaveClass('break-all');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings gracefully', () => {
      const profileWithEmptyStrings = {
        ...mockProfile,
        full_name: '',
        bio: '',
        website: '',
      };
      render(<CreatorProfileHeader profile={profileWithEmptyStrings} isOwnProfile={false} />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    test('should handle special characters in username', () => {
      const profileWithSpecialChars = { ...mockProfile, username: 'user_123-test' };
      render(<CreatorProfileHeader profile={profileWithSpecialChars} isOwnProfile={false} />);
      
      expect(screen.getByText('user_123-test')).toBeInTheDocument();
    });

    test('should handle special characters in bio', () => {
      const profileWithSpecialBio = { ...mockProfile, bio: 'Bio with <special> & "characters"' };
      render(<CreatorProfileHeader profile={profileWithSpecialBio} isOwnProfile={false} />);
      
      expect(screen.getByText('Bio with <special> & "characters"')).toBeInTheDocument();
    });
  });
});

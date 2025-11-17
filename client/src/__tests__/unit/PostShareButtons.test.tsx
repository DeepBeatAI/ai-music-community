/**
 * PostShareButtons Component Test Suite
 * 
 * Tests the PostShareButtons component functionality
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the contexts BEFORE imports
jest.mock('@/contexts/ToastContext');

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostShareButtons } from '@/components/posts/PostShareButtons';
import { useToast } from '@/contexts/ToastContext';

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('PostShareButtons Component', () => {
  const mockShowToast = jest.fn();
  const defaultProps = {
    postId: 'post-123',
    postContent: 'This is a test post content',
    username: 'testuser',
    postType: 'text' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ 
      showToast: mockShowToast,
      toasts: [],
      dismissToast: jest.fn(),
    } as ReturnType<typeof useToast>);
    
    // Reset clipboard API mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
    
    // Reset share API mock
    delete (navigator as any).share;
  });

  describe('Clipboard Copy Success', () => {
    test('should copy URL to clipboard when Copy URL button is clicked', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost/posts/post-123');
        expect(mockShowToast).toHaveBeenCalledWith('Post URL copied to clipboard', 'success');
      });
    });

    test('should generate correct URL for audio post', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(
        <PostShareButtons
          {...defaultProps}
          postType="audio"
          trackTitle="Test Track"
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost/posts/post-123');
      });
    });
  });

  describe('Clipboard Copy Failure with Manual Modal', () => {
    test('should show manual copy modal when clipboard API fails', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Copy Post URL')).toBeInTheDocument();
        expect(screen.getByDisplayValue('http://localhost/posts/post-123')).toBeInTheDocument();
      });
    });

    test('should close manual copy modal when Close button is clicked', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    test('should close manual copy modal when Escape key is pressed', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    test('should select text when input is clicked in manual copy modal', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('http://localhost/posts/post-123') as HTMLInputElement;
      const selectSpy = jest.spyOn(input, 'select');
      
      fireEvent.click(input);

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('Web Share API Success', () => {
    test('should use Web Share API when available and Share button is clicked', async () => {
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'testuser\'s post',
          text: 'This is a test post content',
          url: 'http://localhost/posts/post-123',
        });
        expect(mockShowToast).toHaveBeenCalledWith('Post shared successfully', 'success');
      });
    });

    test('should include track title in share title for audio posts', async () => {
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
      });

      render(
        <PostShareButtons
          {...defaultProps}
          postType="audio"
          trackTitle="Amazing Track"
        />
      );

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'testuser\'s post: Amazing Track',
          text: 'This is a test post content',
          url: 'http://localhost/posts/post-123',
        });
      });
    });

    test('should truncate long post content to 160 characters in share text', async () => {
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
      });

      const longContent = 'A'.repeat(200);
      render(
        <PostShareButtons
          {...defaultProps}
          postContent={longContent}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'testuser\'s post',
          text: 'A'.repeat(160),
          url: 'http://localhost/posts/post-123',
        });
      });
    });

    test('should not show notification when user cancels share', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = jest.fn().mockRejectedValue(abortError);
      Object.assign(navigator, {
        share: mockShare,
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });

      // Should not show any toast notification
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Web Share API Fallback to Clipboard', () => {
    test('should fall back to clipboard when Web Share API is not supported', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });
      // Ensure share is undefined
      delete (navigator as any).share;

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost/posts/post-123');
        expect(mockShowToast).toHaveBeenCalledWith('Post URL copied to clipboard', 'success');
      });
    });

    test('should fall back to clipboard when Web Share API fails with non-abort error', async () => {
      const mockShare = jest.fn().mockRejectedValue(new Error('Share failed'));
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost/posts/post-123');
        expect(mockShowToast).toHaveBeenCalledWith('Post URL copied to clipboard', 'success');
      });
    });

    test('should show manual copy modal when both Web Share and clipboard fail', async () => {
      const mockShare = jest.fn().mockRejectedValue(new Error('Share failed'));
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        share: mockShare,
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
        expect(mockWriteText).toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Toast Notification Triggers', () => {
    test('should show success toast after successful clipboard copy', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Post URL copied to clipboard', 'success');
      });
    });

    test('should show success toast after successful Web Share', async () => {
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Post shared successfully', 'success');
      });
    });

    test('should not show toast when share is cancelled', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = jest.fn().mockRejectedValue(abortError);
      Object.assign(navigator, {
        share: mockShare,
      });

      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Button Rendering', () => {
    test('should render Copy URL button with correct text and icon', () => {
      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      expect(copyButton).toBeInTheDocument();
      expect(screen.getByText('Copy post url')).toBeInTheDocument();
    });

    test('should render Share button with correct text and icon', () => {
      render(<PostShareButtons {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share this post/i });
      expect(shareButton).toBeInTheDocument();
      expect(screen.getByText('Share post')).toBeInTheDocument();
    });

    test('should have proper accessibility attributes', () => {
      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      const shareButton = screen.getByRole('button', { name: /share this post/i });

      expect(copyButton).toHaveAttribute('aria-label', 'Copy post URL to clipboard');
      expect(copyButton).toHaveAttribute('title', 'Copy post url');
      expect(shareButton).toHaveAttribute('aria-label', 'Share this post');
      expect(shareButton).toHaveAttribute('title', 'Share post');
    });
  });

  describe('Manual Copy Modal Accessibility', () => {
    test('should have proper ARIA attributes for modal', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'manual-copy-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'manual-copy-description');
      });
    });

    test('should have input ready for interaction in manual copy modal', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PostShareButtons {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy post url/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        const input = screen.getByDisplayValue('http://localhost/posts/post-123');
        // Verify input is present and has correct attributes for user interaction
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'manual-copy-input');
        expect(input).toHaveAttribute('readonly');
      });
    });
  });
});


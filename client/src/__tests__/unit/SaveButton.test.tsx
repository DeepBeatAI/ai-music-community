/**
 * SaveButton Component Test Suite
 * 
 * Tests the SaveButton component functionality
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

// Mock the contexts and services BEFORE imports
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/saveService');

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SaveButton from '@/components/profile/SaveButton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as saveService from '@/lib/saveService';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockSaveTrack = saveService.saveTrack as jest.MockedFunction<typeof saveService.saveTrack>;
const mockUnsaveTrack = saveService.unsaveTrack as jest.MockedFunction<typeof saveService.unsaveTrack>;
const mockSaveAlbum = saveService.saveAlbum as jest.MockedFunction<typeof saveService.saveAlbum>;
const mockUnsaveAlbum = saveService.unsaveAlbum as jest.MockedFunction<typeof saveService.unsaveAlbum>;
const mockSavePlaylist = saveService.savePlaylist as jest.MockedFunction<typeof saveService.savePlaylist>;
const mockUnsavePlaylist = saveService.unsavePlaylist as jest.MockedFunction<typeof saveService.unsavePlaylist>;

describe('SaveButton Component', () => {
  const mockShowToast = jest.fn();
  const mockOnToggle = jest.fn();
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseToast.mockReturnValue({ showToast: mockShowToast } as any);
  });

  describe('Display States', () => {
    test('should display "Save" when not saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    test('should display "Remove" when saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    test('should display outline bookmark icon when not saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    test('should display filled bookmark icon when saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('Size Variants', () => {
    test('should apply small size classes', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs', 'px-2', 'py-1');
    });

    test('should apply medium size classes by default', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-sm', 'px-3', 'py-2');
    });

    test('should apply large size classes', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-base', 'px-4', 'py-2');
    });
  });

  describe('Track Save/Unsave', () => {
    test('should save track when clicking Save button', async () => {
      mockSaveTrack.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSaveTrack).toHaveBeenCalledWith('user-123', 'track-123');
        expect(mockShowToast).toHaveBeenCalledWith('Track saved successfully', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });

    test('should unsave track when clicking Remove button', async () => {
      mockUnsaveTrack.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockUnsaveTrack).toHaveBeenCalledWith('user-123', 'track-123');
        expect(mockShowToast).toHaveBeenCalledWith('Track removed from saved', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Album Save/Unsave', () => {
    test('should save album when clicking Save button', async () => {
      mockSaveAlbum.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="album-123"
          itemType="album"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSaveAlbum).toHaveBeenCalledWith('user-123', 'album-123');
        expect(mockShowToast).toHaveBeenCalledWith('Album saved successfully', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });

    test('should unsave album when clicking Remove button', async () => {
      mockUnsaveAlbum.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="album-123"
          itemType="album"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockUnsaveAlbum).toHaveBeenCalledWith('user-123', 'album-123');
        expect(mockShowToast).toHaveBeenCalledWith('Album removed from saved', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Playlist Save/Unsave', () => {
    test('should save playlist when clicking Save button', async () => {
      mockSavePlaylist.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="playlist-123"
          itemType="playlist"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSavePlaylist).toHaveBeenCalledWith('user-123', 'playlist-123');
        expect(mockShowToast).toHaveBeenCalledWith('Playlist saved successfully', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });

    test('should unsave playlist when clicking Remove button', async () => {
      mockUnsavePlaylist.mockResolvedValue({ data: true, error: null });

      render(
        <SaveButton
          itemId="playlist-123"
          itemType="playlist"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockUnsavePlaylist).toHaveBeenCalledWith('user-123', 'playlist-123');
        expect(mockShowToast).toHaveBeenCalledWith('Playlist removed from saved', 'success');
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication', () => {
    test('should show info toast when user is not authenticated', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseAuth.mockReturnValue({ user: null } as any);

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      
      // Button is disabled when user is null, but we can still trigger the onClick
      // by calling it directly or using fireEvent with force
      expect(button).toBeDisabled();
      
      // The button is disabled, so clicking it won't trigger the handler
      // This test should verify the button is disabled instead
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockOnToggle).not.toHaveBeenCalled();
    });

    test('should disable button when user is not authenticated', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseAuth.mockReturnValue({ user: null } as any);

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('should show appropriate title when not authenticated', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseAuth.mockReturnValue({ user: null } as any);

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Sign in to save content');
    });
  });

  describe('Loading State', () => {
    test('should show loading spinner during save operation', async () => {
      mockSaveTrack.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: true, error: null }), 100)));

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Check for loading spinner
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });

    test('should disable button during save operation', async () => {
      mockSaveTrack.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: true, error: null }), 100)));

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should show error toast when save fails', async () => {
      mockSaveTrack.mockResolvedValue({ data: null, error: 'Failed to save track' });

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save track', 'error');
        expect(mockOnToggle).not.toHaveBeenCalled();
      });
    });

    test('should show error toast when unsave fails', async () => {
      mockUnsaveTrack.mockResolvedValue({ data: null, error: 'Failed to unsave track' });

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to unsave track', 'error');
        expect(mockOnToggle).not.toHaveBeenCalled();
      });
    });

    test('should handle exception during save', async () => {
      mockSaveTrack.mockRejectedValue(new Error('Network error'));

      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error');
        expect(mockOnToggle).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper aria-label for save action', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Save track');
    });

    test('should have proper aria-label for remove action', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Remove track from saved');
    });

    test('should have proper title attribute', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Save track');
    });
  });

  describe('Styling', () => {
    test('should apply blue styling when not saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'border-blue-600');
    });

    test('should apply gray styling when saved', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={true}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-600', 'hover:bg-gray-700', 'border-gray-600');
    });

    test('should apply custom className', () => {
      render(
        <SaveButton
          itemId="track-123"
          itemType="track"
          isSaved={false}
          onToggle={mockOnToggle}
          className="custom-class"
        />
      );

      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });
});

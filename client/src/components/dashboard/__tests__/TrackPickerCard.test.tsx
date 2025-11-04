import { render, screen, fireEvent } from '@testing-library/react';
import { TrackPickerCard } from '@/components/dashboard/TrackPickerCard';
import type { Track } from '@/types/track';

describe('TrackPickerCard', () => {
  const mockTrack = {
    id: 'track-1',
    user_id: 'user-1',
    title: 'Test Track',
    author: 'Test Author',
    description: 'Test description',
    file_url: 'https://example.com/track.mp3',
    duration: 180,
    genre: 'Electronic',
    is_public: true,
    play_count: 100,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    file_size: null,
    mime_type: null,
    tags: null,
    original_file_size: null,
    compression_applied: null,
    compression_ratio: null
  } as Track;

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with track data', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Test Track')).toBeInTheDocument();
      expect(screen.getByText('by Test Author')).toBeInTheDocument();
      expect(screen.getByText(/Duration: 3:00/)).toBeInTheDocument();
    });

    it('displays selected state when isSelected is true', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={true}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      expect(card).toHaveAttribute('aria-selected', 'true');
      // Check for the checkmark SVG instead of text
      const checkmark = card.querySelector('svg path[d="M5 13l4 4L19 7"]');
      expect(checkmark).toBeInTheDocument();
    });

    it('does not display selected indicator when isSelected is false', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      expect(card).toHaveAttribute('aria-selected', 'false');
      // Check that the checkmark SVG is not present
      const checkmark = card.querySelector('svg path[d="M5 13l4 4L19 7"]');
      expect(checkmark).not.toBeInTheDocument();
    });

    it('formats duration correctly for different lengths', () => {
      const { rerender } = render(
        <TrackPickerCard
          track={{ ...mockTrack, duration: 65 }}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );
      expect(screen.getByText(/Duration: 1:05/)).toBeInTheDocument();

      rerender(
        <TrackPickerCard
          track={{ ...mockTrack, duration: 3661 }}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );
      // 3661 seconds = 61 minutes and 1 second (component doesn't format hours)
      expect(screen.getByText(/Duration: 61:01/)).toBeInTheDocument();
    });
  });

  describe('Selection State Changes', () => {
    it('calls onSelect when clicked', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockTrack);
    });

    it('does not call onSelect when disabled', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.click(card);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Handlers', () => {
    it('calls onSelect when Enter key is pressed', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockTrack);
    });

    it('calls onSelect when Space key is pressed', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockTrack);
    });

    it('does not call onSelect for other keys', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.keyDown(card, { key: 'a', code: 'KeyA' });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('does not call onSelect when disabled and Enter is pressed', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const card = screen.getByRole('option');
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has correct ARIA label with track info', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      expect(card).toHaveAttribute('aria-label', 'Test Track by Test Author');
    });

    it('is keyboard focusable', () => {
      render(
        <TrackPickerCard
          track={mockTrack}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('option');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });
  });
});

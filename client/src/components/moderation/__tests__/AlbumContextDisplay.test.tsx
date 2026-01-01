import { render, screen } from '@testing-library/react';
import { AlbumContextDisplay } from '../AlbumContextDisplay';
import { AlbumContext } from '@/types/moderation';

const mockAlbumContext: AlbumContext = {
  id: 'album-123',
  name: 'Test Album',
  description: 'This is a test album description',
  cover_image_url: 'https://example.com/cover.jpg',
  user_id: 'user-456',
  is_public: true,
  created_at: '2024-01-15T10:30:00Z',
  tracks: [
    {
      id: 'track-1',
      title: 'First Track',
      duration: 180, // 3 minutes
      position: 1,
    },
    {
      id: 'track-2',
      title: 'Second Track',
      duration: 240, // 4 minutes
      position: 2,
    },
    {
      id: 'track-3',
      title: 'Third Track',
      duration: 300, // 5 minutes
      position: 3,
    },
  ],
  track_count: 3,
  total_duration: 720, // 12 minutes total
};

const mockAlbumWithoutCover: AlbumContext = {
  ...mockAlbumContext,
  cover_image_url: null,
};

const mockAlbumWithoutDescription: AlbumContext = {
  ...mockAlbumContext,
  description: null,
};

const mockPrivateAlbum: AlbumContext = {
  ...mockAlbumContext,
  is_public: false,
};

const mockEmptyAlbum: AlbumContext = {
  ...mockAlbumContext,
  tracks: [],
  track_count: 0,
  total_duration: null,
};

const mockAlbumWithNullDurations: AlbumContext = {
  ...mockAlbumContext,
  tracks: [
    {
      id: 'track-1',
      title: 'Track Without Duration',
      duration: null,
      position: 1,
    },
  ],
  track_count: 1,
  total_duration: null,
};

describe('AlbumContextDisplay', () => {
  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(<AlbumContextDisplay albumContext={null} loading={true} error={null} />);

      expect(screen.getByText('Album Context')).toBeInTheDocument();
      expect(screen.getByText('Loading album context...')).toBeInTheDocument();
    });

    it('should display loading spinner with animation', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={null} loading={true} error={null} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error is present', () => {
      const errorMessage = 'Failed to load album context';
      render(<AlbumContextDisplay albumContext={null} loading={false} error={errorMessage} />);

      expect(screen.getByText('Album Context')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display error icon with error message', () => {
      render(
        <AlbumContextDisplay
          albumContext={null}
          loading={false}
          error="Album not found"
        />
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Album not found')).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should render nothing when albumContext is null and not loading/error', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={null} loading={false} error={null} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Album Metadata Rendering', () => {
    it('should render album title', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Album Title:')).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('should render album description when present', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Description:')).toBeInTheDocument();
      expect(screen.getByText('This is a test album description')).toBeInTheDocument();
    });

    it('should not render description section when description is null', () => {
      render(
        <AlbumContextDisplay albumContext={mockAlbumWithoutDescription} loading={false} error={null} />
      );

      expect(screen.queryByText('Description:')).not.toBeInTheDocument();
    });

    it('should render album cover image when present', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      const coverImage = screen.getByAltText('Test Album cover');
      expect(coverImage).toBeInTheDocument();
      expect(coverImage).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('should not render cover image when cover_image_url is null', () => {
      render(
        <AlbumContextDisplay albumContext={mockAlbumWithoutCover} loading={false} error={null} />
      );

      expect(screen.queryByAltText('Test Album cover')).not.toBeInTheDocument();
    });

    it('should display Public visibility badge for public albums', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Visibility:')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('should display Private visibility badge for private albums', () => {
      render(<AlbumContextDisplay albumContext={mockPrivateAlbum} loading={false} error={null} />);

      expect(screen.getByText('Visibility:')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  describe('Album Statistics Rendering', () => {
    it('should render track count', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />
      );

      expect(screen.getByText('Track Count')).toBeInTheDocument();
      // Find the track count specifically in the statistics section
      const statsSection = container.querySelector('.bg-gray-800.rounded-lg.p-4');
      expect(statsSection).toHaveTextContent('3');
    });

    it('should render total duration in correct format', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Total Duration')).toBeInTheDocument();
      expect(screen.getByText('12m 0s')).toBeInTheDocument();
    });

    it('should render upload date', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Upload Date')).toBeInTheDocument();
      // Date format: "Jan 15, 2024, 10:30 AM" (locale-dependent)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('should display N/A for total duration when null', () => {
      render(<AlbumContextDisplay albumContext={mockEmptyAlbum} loading={false} error={null} />);

      expect(screen.getByText('Total Duration')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should display 0 for track count when empty', () => {
      render(<AlbumContextDisplay albumContext={mockEmptyAlbum} loading={false} error={null} />);

      expect(screen.getByText('Track Count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Track List Rendering', () => {
    it('should render track list header with count', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Tracks (3)')).toBeInTheDocument();
    });

    it('should render all tracks in the list', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('First Track')).toBeInTheDocument();
      expect(screen.getByText('Second Track')).toBeInTheDocument();
      expect(screen.getByText('Third Track')).toBeInTheDocument();
    });

    it('should render track positions (1-indexed)', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      // Check for position numbers in the table
      const table = screen.getByRole('table');
      expect(table).toHaveTextContent('1');
      expect(table).toHaveTextContent('2');
      expect(table).toHaveTextContent('3');
    });

    it('should render track durations in MM:SS format', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds
      expect(screen.getByText('4:00')).toBeInTheDocument(); // 240 seconds
      expect(screen.getByText('5:00')).toBeInTheDocument(); // 300 seconds
    });

    it('should render --:-- for null durations', () => {
      render(
        <AlbumContextDisplay albumContext={mockAlbumWithNullDurations} loading={false} error={null} />
      );

      expect(screen.getByText('--:--')).toBeInTheDocument();
    });

    it('should display empty state message when no tracks', () => {
      render(<AlbumContextDisplay albumContext={mockEmptyAlbum} loading={false} error={null} />);

      expect(screen.getByText('No tracks in this album')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('should format durations over 1 hour correctly', () => {
      const longAlbum: AlbumContext = {
        ...mockAlbumContext,
        total_duration: 3723, // 1h 2m 3s
      };
      render(<AlbumContextDisplay albumContext={longAlbum} loading={false} error={null} />);

      expect(screen.getByText('1h 2m')).toBeInTheDocument();
    });

    it('should format durations under 1 minute correctly', () => {
      const shortAlbum: AlbumContext = {
        ...mockAlbumContext,
        total_duration: 45, // 45 seconds
      };
      render(<AlbumContextDisplay albumContext={shortAlbum} loading={false} error={null} />);

      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('should format durations between 1 minute and 1 hour correctly', () => {
      const mediumAlbum: AlbumContext = {
        ...mockAlbumContext,
        total_duration: 723, // 12m 3s
      };
      render(<AlbumContextDisplay albumContext={mediumAlbum} loading={false} error={null} />);

      expect(screen.getByText('12m 3s')).toBeInTheDocument();
    });

    it('should pad seconds with leading zero in track durations', () => {
      const albumWithPadding: AlbumContext = {
        ...mockAlbumContext,
        tracks: [
          {
            id: 'track-1',
            title: 'Track',
            duration: 65, // 1:05
            position: 1,
          },
        ],
        track_count: 1,
        total_duration: 65,
      };
      render(<AlbumContextDisplay albumContext={albumWithPadding} loading={false} error={null} />);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have proper section headings', () => {
      render(<AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />);

      expect(screen.getByText('Album Context')).toBeInTheDocument();
      expect(screen.getByText('Album Statistics')).toBeInTheDocument();
      expect(screen.getByText('Tracks (3)')).toBeInTheDocument();
    });

    it('should apply proper styling classes', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />
      );

      const mainContainer = container.querySelector('.bg-gray-700');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('rounded-lg', 'p-5', 'space-y-4');
    });

    it('should have scrollable track list for many tracks', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />
      );

      const scrollableDiv = container.querySelector('.max-h-64.overflow-y-auto');
      expect(scrollableDiv).toBeInTheDocument();
    });

    it('should have scrollable description for long text', () => {
      const { container } = render(
        <AlbumContextDisplay albumContext={mockAlbumContext} loading={false} error={null} />
      );

      const scrollableDescription = container.querySelector('.max-h-32.overflow-y-auto');
      expect(scrollableDescription).toBeInTheDocument();
    });
  });
});

import { render, screen } from '@testing-library/react';
import { TrackPicker } from '@/components/dashboard/TrackPicker';

// Mock Supabase with a simple implementation that returns empty data immediately
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        }))
      }))
    }))
  }
}));

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('TrackPicker', () => {
  const mockOnTrackSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
  });

  it('renders without crashing', () => {
    render(
      <TrackPicker
        userId="user-1"
        onTrackSelect={mockOnTrackSelect}
      />
    );

    // Component should render
    expect(screen.getByText(/Select a track from your library/i)).toBeInTheDocument();
  });

  it('has listbox role', async () => {
    render(
      <TrackPicker
        userId="user-1"
        onTrackSelect={mockOnTrackSelect}
      />
    );

    // Wait for loading to complete and check for listbox
    const listbox = await screen.findByRole('listbox', {}, { timeout: 5000 });
    expect(listbox).toBeInTheDocument();
  });

  it('shows empty state when no tracks are available', async () => {
    render(
      <TrackPicker
        userId="user-1"
        onTrackSelect={mockOnTrackSelect}
      />
    );

    // Wait for empty state to appear
    const emptyMessage = await screen.findByText(/No tracks in your library/i, {}, { timeout: 5000 });
    expect(emptyMessage).toBeInTheDocument();
    
    const libraryLink = screen.getByRole('link', { name: /Go to Library/i });
    expect(libraryLink).toHaveAttribute('href', '/library');
  });

  it('can be disabled', () => {
    render(
      <TrackPicker
        userId="user-1"
        onTrackSelect={mockOnTrackSelect}
        disabled={true}
      />
    );

    // Component should render even when disabled
    expect(screen.getByText(/Select a track from your library/i)).toBeInTheDocument();
  });

  it('accepts selectedTrackId prop', () => {
    render(
      <TrackPicker
        userId="user-1"
        onTrackSelect={mockOnTrackSelect}
        selectedTrackId="track-123"
      />
    );

    // Component should render with selected track
    expect(screen.getByText(/Select a track from your library/i)).toBeInTheDocument();
  });
});

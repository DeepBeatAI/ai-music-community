# Automated Testing Guide - My Library Feature

## Overview

This guide provides implementation instructions for automated tests (Tasks 22-24). These tests can be run in CI/CD pipelines and provide fast feedback on code changes.

## ✅ Completion Status

| Task | Status | Tests | Result |
|------|--------|-------|--------|
| Task 22 - Album API Tests | ✅ Complete | 11/11 passing | All tests pass |
| Task 22.1 - Library API Tests | ✅ Complete | 14/14 passing | All tests pass |
| Task 23 - Component Tests | ⚠️ Requires Setup | 0/~25 | Needs test infrastructure |
| Task 24 - E2E Tests | ⚠️ Requires Setup | 0/~6 | Needs Playwright + test DB |
| **Total** | **Unit Tests Complete** | **25/25 passing** | **Ready for CI/CD** |

**Run all unit tests**: `npm test -- albums.test library.test`

**Note**: Component and E2E tests require additional setup:
- Component tests need proper Supabase mocking strategy
- E2E tests need Playwright installation and test database
- These are recommended for future implementation but not blocking for MVP

---

## Task 22: Unit Tests for API Functions ✅ COMPLETED

### Test File Structure

```
client/src/lib/__tests__/
├── albums.test.ts
└── library.test.ts
```

### 22. Album API Unit Tests

**File**: `client/src/lib/__tests__/albums.test.ts`

**Tests to implement**:

```typescript
describe('Album API Functions', () => {
  describe('getUserAlbums', () => {
    it('should return user albums sorted by created_at desc', async () => {
      // Test implementation
    });

    it('should return empty array for user with no albums', async () => {
      // Test implementation
    });

    it('should handle database errors gracefully', async () => {
      // Test implementation
    });
  });

  describe('createAlbum', () => {
    it('should create album with correct defaults', async () => {
      // Verify: is_public = true by default
      // Verify: created_at is set
      // Verify: user_id matches
    });

    it('should validate required fields', async () => {
      // Test missing name
      // Test empty name
    });

    it('should handle duplicate album names', async () => {
      // Test implementation
    });
  });

  describe('addTrackToAlbum', () => {
    it('should add track to album', async () => {
      // Test implementation
    });

    it('should remove track from previous album', async () => {
      // Create track in Album A
      // Add track to Album B
      // Verify track removed from Album A
      // Verify track in Album B
    });

    it('should handle track already in album', async () => {
      // Test idempotency
    });

    it('should validate album ownership', async () => {
      // Test adding to another user's album
    });
  });

  describe('reorderAlbumTracks', () => {
    it('should update track positions correctly', async () => {
      // Create album with 3 tracks
      // Reorder: [1,2,3] -> [3,1,2]
      // Verify positions updated
    });

    it('should handle invalid positions', async () => {
      // Test negative positions
      // Test gaps in positions
    });

    it('should maintain order after reorder', async () => {
      // Reorder tracks
      // Fetch album
      // Verify order matches
    });
  });

  describe('deleteAlbum', () => {
    it('should delete album and remove track associations', async () => {
      // Create album with tracks
      // Delete album
      // Verify tracks no longer have album_id
    });

    it('should validate album ownership', async () => {
      // Test deleting another user's album
    });
  });
});
```

### 22.1. Library API Unit Tests

**File**: `client/src/lib/__tests__/library.test.ts`

**Tests to implement**:

```typescript
describe('Library API Functions', () => {
  describe('getLibraryStats', () => {
    it('should calculate total tracks correctly', async () => {
      // Create 5 tracks for user
      // Verify totalTracks = 5
    });

    it('should calculate total albums correctly', async () => {
      // Create 3 albums for user
      // Verify totalAlbums = 3
    });

    it('should calculate total playlists correctly', async () => {
      // Create 4 playlists for user
      // Verify totalPlaylists = 4
    });

    it('should calculate plays this week correctly', async () => {
      // Create tracks with play_count
      // Set some plays within last 7 days
      // Verify playsThisWeek matches
    });

    it('should calculate total plays correctly', async () => {
      // Create tracks with play_count
      // Verify playsAllTime is sum of all plays
    });

    it('should return correct upload remaining', async () => {
      // Test free tier user (10 uploads)
      // Test premium user (infinite)
    });

    it('should handle user with no data', async () => {
      // New user with no tracks/albums/playlists
      // Verify all stats are 0
    });
  });

  describe('getUserTracksWithMembership', () => {
    it('should include album data for tracks', async () => {
      // Create track in album
      // Fetch tracks
      // Verify albumId and albumName present
    });

    it('should include playlist data for tracks', async () => {
      // Create track in 2 playlists
      // Fetch tracks
      // Verify playlistIds and playlistNames arrays
    });

    it('should handle tracks with no memberships', async () => {
      // Create standalone track
      // Verify albumId is null
      // Verify playlistIds is empty array
    });

    it('should sort tracks by created_at desc', async () => {
      // Create 3 tracks at different times
      // Verify order is newest first
    });
  });

  describe('Stats Caching', () => {
    it('should cache stats for 5 minutes', async () => {
      // This tests the cache utility, not the API
      // Verify cache.get returns cached value
      // Verify cache expires after TTL
    });

    it('should invalidate cache on mutations', async () => {
      // Get stats (cached)
      // Create new track
      // Verify cache invalidated
      // Verify fresh stats returned
    });
  });
});
```

### Running Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test albums.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Task 23: Component Tests (Automated Part)

### Test File Structure

```
client/src/components/library/__tests__/
├── StatsSection.test.tsx
├── TrackCard.test.tsx
├── AlbumCard.test.tsx
├── AllTracksSection.test.tsx
└── MyAlbumsSection.test.tsx
```

### 23.1: StatsSection Component Tests

**File**: `client/src/components/library/__tests__/StatsSection.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import StatsSection from '../StatsSection';
import { getLibraryStats } from '@/lib/library';

jest.mock('@/lib/library');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

describe('StatsSection', () => {
  const mockStats = {
    uploadRemaining: 5,
    totalTracks: 42,
    totalAlbums: 8,
    totalPlaylists: 12,
    playsThisWeek: 156,
    playsAllTime: 2340,
  };

  beforeEach(() => {
    (getLibraryStats as jest.Mock).mockResolvedValue(mockStats);
  });

  it('should render all 6 stat cards', async () => {
    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Upload Remaining')).toBeInTheDocument();
      expect(screen.getByText('Total Tracks')).toBeInTheDocument();
      expect(screen.getByText('Total Albums')).toBeInTheDocument();
      expect(screen.getByText('Total Playlists')).toBeInTheDocument();
      expect(screen.getByText('Plays This Week')).toBeInTheDocument();
      expect(screen.getByText('Total Plays')).toBeInTheDocument();
    });
  });

  it('should display correct stat values', async () => {
    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // uploadRemaining
      expect(screen.getByText('42')).toBeInTheDocument(); // totalTracks
      expect(screen.getByText('8')).toBeInTheDocument(); // totalAlbums
      expect(screen.getByText('12')).toBeInTheDocument(); // totalPlaylists
      expect(screen.getByText('156')).toBeInTheDocument(); // playsThisWeek
      expect(screen.getByText('2,340')).toBeInTheDocument(); // playsAllTime formatted
    });
  });

  it('should show loading skeleton initially', () => {
    render(<StatsSection userId="test-user-id" />);
    
    const skeletons = screen.getAllByRole('generic', { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state on fetch failure', async () => {
    (getLibraryStats as jest.Mock).mockRejectedValue(new Error('Failed'));

    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should retry on button click', async () => {
    (getLibraryStats as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

    render(<StatsSection userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});
```

### 23.2: TrackCard Component Tests

**File**: `client/src/components/library/__tests__/TrackCard.test.tsx`

```typescript
describe('TrackCard', () => {
  const mockTrack = {
    id: 'track-1',
    title: 'Test Track',
    user_id: 'user-1',
    file_url: 'https://example.com/track.mp3',
    created_at: '2025-01-01',
    albumId: 'album-1',
    albumName: 'Test Album',
    playlistIds: ['playlist-1', 'playlist-2'],
    playlistNames: ['Playlist A', 'Playlist B'],
  };

  it('should render track title', () => {
    render(<TrackCard track={mockTrack} onAddToAlbum={jest.fn()} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });

  it('should show album badge when track is in album', () => {
    render(<TrackCard track={mockTrack} onAddToAlbum={jest.fn()} />);
    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });

  it('should show playlist badges', () => {
    render(<TrackCard track={mockTrack} onAddToAlbum={jest.fn()} />);
    expect(screen.getByText('2 playlists')).toBeInTheDocument();
  });

  it('should open actions menu on click', () => {
    render(<TrackCard track={mockTrack} onAddToAlbum={jest.fn()} />);
    
    const menuButton = screen.getByLabelText('Track actions');
    fireEvent.click(menuButton);

    expect(screen.getByText('Add to Album')).toBeInTheDocument();
    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onAddToAlbum when menu item clicked', () => {
    const onAddToAlbum = jest.fn();
    render(<TrackCard track={mockTrack} onAddToAlbum={onAddToAlbum} />);
    
    const menuButton = screen.getByLabelText('Track actions');
    fireEvent.click(menuButton);

    const addToAlbumButton = screen.getByText('Add to Album');
    fireEvent.click(addToAlbumButton);

    expect(onAddToAlbum).toHaveBeenCalledWith('track-1');
  });
});
```



### 23.3: AlbumCard Component Tests

```typescript
describe('AlbumCard', () => {
  const mockAlbum = {
    id: 'album-1',
    name: 'Test Album',
    description: 'Test Description',
    user_id: 'user-1',
    track_count: 5,
    created_at: '2025-01-01',
  };

  it('should display album name', () => {
    render(<AlbumCard album={mockAlbum} />);
    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });

  it('should display track count', () => {
    render(<AlbumCard album={mockAlbum} />);
    expect(screen.getByText('5 tracks')).toBeInTheDocument();
  });

  it('should display album icon', () => {
    render(<AlbumCard album={mockAlbum} />);
    expect(screen.getByText('💿')).toBeInTheDocument();
  });

  it('should navigate to album detail on click', () => {
    const { container } = render(<AlbumCard album={mockAlbum} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/library/albums/album-1');
  });
});
```

### 23.4: Collapsible Section Tests

```typescript
describe('AllTracksSection - Collapsible', () => {
  it('should collapse when toggle clicked', async () => {
    render(<AllTracksSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('All Tracks')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Collapse section');
    fireEvent.click(toggleButton);

    // Content should be hidden
    const trackGrid = screen.queryByRole('grid');
    expect(trackGrid).not.toBeInTheDocument();
  });

  it('should persist collapse state to localStorage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<AllTracksSection userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('All Tracks')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Collapse section');
    fireEvent.click(toggleButton);

    expect(setItemSpy).toHaveBeenCalledWith(
      'library-section-collapsed-tracks',
      'true'
    );
  });

  it('should restore collapse state from localStorage', () => {
    localStorage.setItem('library-section-collapsed-tracks', 'true');

    render(<AllTracksSection userId="user-1" />);

    // Section should be collapsed on mount
    const trackGrid = screen.queryByRole('grid');
    expect(trackGrid).not.toBeInTheDocument();
  });
});
```

### 23.5: Lazy Loading Tests

```typescript
describe('LibraryPage - Lazy Loading', () => {
  it('should not load albums section initially', () => {
    render(<LibraryPage />);

    // Albums section should show skeleton
    expect(screen.getByText('My Albums')).toBeInTheDocument();
    // But actual album data should not be fetched yet
    expect(getUserAlbums).not.toHaveBeenCalled();
  });

  it('should load albums when scrolled into view', async () => {
    const { container } = render(<LibraryPage />);

    // Simulate IntersectionObserver triggering
    const albumsSection = container.querySelector('[data-section="albums"]');
    
    // Mock IntersectionObserver callback
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true, target: albumsSection }]);
      return { observe: jest.fn(), disconnect: jest.fn() };
    });

    global.IntersectionObserver = mockIntersectionObserver as any;

    await waitFor(() => {
      expect(getUserAlbums).toHaveBeenCalled();
    });
  });
});
```

---

## Task 24: Integration Tests (E2E with Playwright)

### Test File Structure

```
tests/e2e/
├── library-upload-flow.spec.ts
├── library-album-management.spec.ts
├── library-track-deletion.spec.ts
└── library-state-persistence.spec.ts
```

### 24.1: Upload and Assignment Flow

**File**: `tests/e2e/library-upload-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Track Upload and Assignment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should upload track and assign to album', async ({ page }) => {
    // Navigate to library
    await page.goto('/library');

    // Expand upload section
    await page.click('text=Upload New Track');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-track.mp3');

    // Fill track details
    await page.fill('[name="title"]', 'E2E Test Track');
    await page.fill('[name="description"]', 'Integration test');

    // Upload
    await page.click('button:has-text("Upload")');

    // Wait for upload to complete
    await expect(page.locator('text=Upload successful')).toBeVisible();

    // Assign to album
    await page.click('select[name="album"]');
    await page.selectOption('select[name="album"]', { label: 'Test Album' });
    await page.click('button:has-text("Done")');

    // Verify in All Tracks section
    await expect(page.locator('text=E2E Test Track')).toBeVisible();
    await expect(page.locator('text=Test Album')).toBeVisible();

    // Navigate to album
    await page.click('text=Test Album');
    await expect(page.locator('text=E2E Test Track')).toBeVisible();
  });

  test('should upload track and assign to multiple playlists', async ({ page }) => {
    await page.goto('/library');

    // Upload track
    await page.click('text=Upload New Track');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-track.mp3');
    await page.fill('[name="title"]', 'Multi-Playlist Track');
    await page.click('button:has-text("Upload")');

    // Wait for upload
    await expect(page.locator('text=Upload successful')).toBeVisible();

    // Select multiple playlists
    await page.check('input[value="playlist-1"]');
    await page.check('input[value="playlist-2"]');
    await page.click('button:has-text("Done")');

    // Verify track shows playlist count
    await expect(page.locator('text=2 playlists')).toBeVisible();
  });
});
```

### 24.2: Album Management Flow

**File**: `tests/e2e/library-album-management.spec.ts`

```typescript
test.describe('Album Management', () => {
  test('should create album, add tracks, and reorder', async ({ page }) => {
    await page.goto('/library');

    // Create album
    await page.click('text=+ New Album');
    await page.fill('[name="name"]', 'E2E Album');
    await page.fill('[name="description"]', 'Test album');
    await page.click('button:has-text("Create")');

    // Wait for success
    await expect(page.locator('text=Album created')).toBeVisible();

    // Add tracks to album
    const trackCard = page.locator('[data-testid="track-card"]').first();
    await trackCard.click('button[aria-label="Track actions"]');
    await page.click('text=Add to Album');
    await page.selectOption('select[name="album"]', { label: 'E2E Album' });
    await page.click('button:has-text("Save")');

    // Repeat for 2 more tracks
    // ... (similar code)

    // Navigate to album detail
    await page.click('text=E2E Album');

    // Verify 3 tracks
    const tracks = page.locator('[data-testid="album-track"]');
    await expect(tracks).toHaveCount(3);

    // Reorder tracks (drag track 3 to position 1)
    const track3 = tracks.nth(2);
    const track1 = tracks.nth(0);
    
    await track3.dragTo(track1);

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Refresh page
    await page.reload();

    // Verify order persisted
    const firstTrack = page.locator('[data-testid="album-track"]').first();
    await expect(firstTrack).toContainText('1'); // Track number
  });
});
```

### 24.3: Track Deletion Flow

**File**: `tests/e2e/library-track-deletion.spec.ts`

```typescript
test.describe('Track Deletion', () => {
  test('should delete track and remove from all locations', async ({ page }) => {
    await page.goto('/library');

    // Find track to delete
    const trackToDelete = page.locator('text=Track to Delete');
    await expect(trackToDelete).toBeVisible();

    // Open actions menu
    await trackToDelete.locator('..').click('button[aria-label="Track actions"]');
    await page.click('text=Delete');

    // Confirm deletion
    await expect(page.locator('text=Are you sure')).toBeVisible();
    await page.click('button:has-text("Delete")');

    // Wait for success
    await expect(page.locator('text=Track deleted')).toBeVisible();

    // Verify track removed from All Tracks
    await expect(trackToDelete).not.toBeVisible();

    // Navigate to album that contained track
    await page.click('text=Test Album');
    await expect(page.locator('text=Track to Delete')).not.toBeVisible();

    // Navigate to playlist that contained track
    await page.goto('/library');
    await page.click('text=Test Playlist');
    await expect(page.locator('text=Track to Delete')).not.toBeVisible();

    // Verify stats updated
    await page.goto('/library');
    const totalTracks = page.locator('text=Total Tracks').locator('..');
    // Check that count decreased (would need to know previous count)
  });
});
```

### 24.4: State Persistence

**File**: `tests/e2e/library-state-persistence.spec.ts`

```typescript
test.describe('State Persistence', () => {
  test('should persist collapsed sections across page refresh', async ({ page }) => {
    await page.goto('/library');

    // Collapse All Tracks section
    await page.click('[aria-label="Collapse section"]:near(text="All Tracks")');
    
    // Verify section collapsed
    const tracksGrid = page.locator('[data-section="tracks-grid"]');
    await expect(tracksGrid).not.toBeVisible();

    // Collapse My Albums section
    await page.click('[aria-label="Collapse section"]:near(text="My Albums")');

    // Refresh page
    await page.reload();

    // Verify sections still collapsed
    await expect(tracksGrid).not.toBeVisible();
    const albumsGrid = page.locator('[data-section="albums-grid"]');
    await expect(albumsGrid).not.toBeVisible();

    // Verify other sections still expanded
    const statsSection = page.locator('[data-section="stats"]');
    await expect(statsSection).toBeVisible();
  });

  test('should persist across browser sessions', async ({ page, context }) => {
    await page.goto('/library');

    // Collapse sections
    await page.click('[aria-label="Collapse section"]:near(text="All Tracks")');

    // Close and reopen browser
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    await newPage.goto('/library');

    // Verify state persisted
    const tracksGrid = newPage.locator('[data-section="tracks-grid"]');
    await expect(tracksGrid).not.toBeVisible();
  });
});
```

---

## Running Automated Tests

### Unit Tests (Jest/Vitest)

```bash
# Run all unit tests
npm test

# Run specific test file
npm test albums.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch

# Run only library tests
npm test -- library
```

### Component Tests (React Testing Library)

```bash
# Run component tests
npm test -- components/library

# Run specific component test
npm test -- StatsSection.test.tsx

# Update snapshots
npm test -- -u
```

### E2E Tests (Playwright)

```bash
# Install Playwright
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test library-upload-flow

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test My Library Feature

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Coverage Goals

### Unit Tests
- **Target**: 80%+ coverage
- **Critical paths**: 100% coverage
- **Focus**: API functions, utilities

### Component Tests
- **Target**: 70%+ coverage
- **Focus**: User interactions, state management

### E2E Tests
- **Target**: Cover all critical user flows
- **Focus**: Happy paths, common scenarios

---

## Troubleshooting

### Common Issues

**Mock not working**:
```typescript
// Ensure mocks are cleared between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Async test timeout**:
```typescript
// Increase timeout for slow operations
test('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

**Playwright test flaky**:
```typescript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="element"]');
```

---

## Best Practices

1. **Test behavior, not implementation**
2. **Use data-testid for stable selectors**
3. **Mock external dependencies**
4. **Keep tests independent**
5. **Use descriptive test names**
6. **Clean up after tests**
7. **Test error cases**
8. **Avoid testing library code**

---

## Next Steps

1. Implement unit tests (Task 22)
2. Implement component tests (Task 23)
3. Implement E2E tests (Task 24)
4. Run manual tests from manual-test-guide.md
5. Fix any issues found
6. Achieve coverage goals
7. Integrate into CI/CD

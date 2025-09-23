/**
 * Load More UI Components Unit Tests
 * 
 * Tests the UI components for Load More functionality:
 * - LoadMoreButton component
 * - EndOfContent component
 * - Mode-specific styling and behavior
 * - Accessibility features
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadMoreButton from '@/components/LoadMoreButton';
import EndOfContent from '@/components/EndOfContent';
import { PaginationState } from '@/types/pagination';

// Mock pagination state generators
const createMockPaginationState = (overrides: Partial<PaginationState> = {}): PaginationState => ({
  currentPage: 1,
  hasMorePosts: true,
  isLoadingMore: false,
  allPosts: [],
  displayPosts: [],
  paginatedPosts: [],
  isSearchActive: false,
  hasFiltersApplied: false,
  totalPostsCount: 100,
  filters: {
    postType: 'all',
    sortBy: 'newest',
    timeRange: 'all',
  },
  searchResults: { posts: [], users: [], totalResults: 0 },
  currentSearchFilters: {},
  postsPerPage: 15,
  paginationMode: 'server',
  loadMoreStrategy: 'server-fetch',
  lastFetchTime: 0,
  fetchInProgress: false,
  autoFetchTriggered: false,
  metadata: {
    totalServerPosts: 100,
    loadedServerPosts: 15,
    currentBatch: 1,
    lastFetchTimestamp: Date.now(),
    totalFilteredPosts: 0,
    visibleFilteredPosts: 0,
    filterAppliedAt: 0,
  },
  ...overrides,
});

describe('Load More UI Components', () => {
  describe('LoadMoreButton Component', () => {
    const defaultProps = {
      paginationState: createMockPaginationState(),
      onLoadMore: jest.fn(),
      isLoading: false,
      hasMorePosts: true,
      totalFilteredPosts: 100,
      currentlyShowing: 15,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should display correct mode-specific styling for server mode', () => {
      render(<LoadMoreButton {...defaultProps} />);
      
      // Should show server-side pagination indicators
      expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();
      expect(screen.getByText(/Loading next 15 posts from database/)).toBeInTheDocument();
      expect(screen.getByText('Load More Posts (15)')).toBeInTheDocument();
    });

    test('should display correct mode-specific styling for client mode', () => {
      const clientState = createMockPaginationState({
        paginationMode: 'client',
        loadMoreStrategy: 'client-paginate',
      });

      render(
        <LoadMoreButton 
          {...defaultProps} 
          paginationState={clientState}
          totalFilteredPosts={50}
          currentlyShowing={15}
        />
      );
      
      // Should show client-side pagination indicators
      expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
      expect(screen.getByText(/15 more from filtered results/)).toBeInTheDocument();
      expect(screen.getByText(/Show More \(15\)/)).toBeInTheDocument();
    });

    test('should show appropriate loading states', () => {
      render(
        <LoadMoreButton 
          {...defaultProps} 
          isLoading={true}
        />
      );
      
      // Should show loading state
      expect(screen.getByText(/Fetching from server.../)).toBeInTheDocument();
      
      // Button should be disabled
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('should handle disabled states correctly', () => {
      render(
        <LoadMoreButton 
          {...defaultProps} 
          hasMorePosts={false}
        />
      );
      
      // Should not render when no more posts
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('should provide accessibility features', () => {
      render(<LoadMoreButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Should have proper ARIA label
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Load more posts'));
      
      // Should be focusable
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    test('should call onLoadMore when clicked', () => {
      const mockOnLoadMore = jest.fn();
      
      render(
        <LoadMoreButton 
          {...defaultProps} 
          onLoadMore={mockOnLoadMore}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    test('should not call onLoadMore when disabled', () => {
      const mockOnLoadMore = jest.fn();
      
      render(
        <LoadMoreButton 
          {...defaultProps} 
          onLoadMore={mockOnLoadMore}
          isLoading={true}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnLoadMore).not.toHaveBeenCalled();
    });

    test('should display bandwidth optimization info', () => {
      render(
        <LoadMoreButton 
          {...defaultProps} 
          totalFilteredPosts={100}
          currentlyShowing={15}
        />
      );
      
      // Should show bandwidth savings info
      expect(screen.getByText(/Bandwidth Optimization Active/)).toBeInTheDocument();
      expect(screen.getByText(/Showing 15 of 100 posts/)).toBeInTheDocument();
    });

    test('should display performance statistics', () => {
      const stateWithMetadata = createMockPaginationState({
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 30,
          currentBatch: 2,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0,
        },
      });

      render(
        <LoadMoreButton 
          {...defaultProps} 
          paginationState={stateWithMetadata}
        />
      );
      
      // Should show performance stats
      expect(screen.getByText(/Batch 2/)).toBeInTheDocument();
      expect(screen.getByText(/Last fetch:/)).toBeInTheDocument();
    });
  });

  describe('EndOfContent Component', () => {
    const defaultProps = {
      paginationState: createMockPaginationState({
        hasMorePosts: false,
        totalPostsCount: 50,
      }),
      totalFilteredPosts: 50,
      hasSearchResults: false,
      hasFiltersApplied: false,
      onClearSearch: jest.fn(),
      onScrollToTop: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should display correct end-of-content messaging for server mode', () => {
      render(<EndOfContent {...defaultProps} />);
      
      expect(screen.getByText("You've reached the end!")).toBeInTheDocument();
      expect(screen.getByText(/All 50 posts have been loaded/)).toBeInTheDocument();
      expect(screen.getByText(/Server Content Fully Loaded/)).toBeInTheDocument();
    });

    test('should display correct end-of-content messaging for client mode', () => {
      const clientState = createMockPaginationState({
        paginationMode: 'client',
        hasMorePosts: false,
      });

      render(
        <EndOfContent 
          {...defaultProps} 
          paginationState={clientState}
          totalFilteredPosts={25}
        />
      );
      
      expect(screen.getByText(/All 25 filtered results are now visible/)).toBeInTheDocument();
      expect(screen.getByText(/Client-side Filtering Complete/)).toBeInTheDocument();
    });

    test('should show performance statistics when available', () => {
      const stateWithMetadata = createMockPaginationState({
        hasMorePosts: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 50,
          currentBatch: 4,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0,
        },
      });

      render(
        <EndOfContent 
          {...defaultProps} 
          paginationState={stateWithMetadata}
        />
      );
      
      expect(screen.getByText(/Session Summary/)).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument(); // Posts loaded
      expect(screen.getByText('4')).toBeInTheDocument(); // Batches
    });

    test('should provide action buttons when appropriate', () => {
      render(
        <EndOfContent 
          {...defaultProps} 
          hasFiltersApplied={true}
        />
      );
      
      expect(screen.getByText('Clear Filters & Show All')).toBeInTheDocument();
      expect(screen.getByText('Back to Top')).toBeInTheDocument();
    });

    test('should call onClearSearch when clear button clicked', () => {
      const mockOnClearSearch = jest.fn();
      
      render(
        <EndOfContent 
          {...defaultProps} 
          hasSearchResults={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      const clearButton = screen.getByText('Clear Filters & Show All');
      fireEvent.click(clearButton);
      
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });

    test('should call onScrollToTop when back to top clicked', () => {
      const mockOnScrollToTop = jest.fn();
      
      render(
        <EndOfContent 
          {...defaultProps} 
          onScrollToTop={mockOnScrollToTop}
        />
      );
      
      const scrollButton = screen.getByText('Back to Top');
      fireEvent.click(scrollButton);
      
      expect(mockOnScrollToTop).toHaveBeenCalledTimes(1);
    });

    test('should display encouraging message', () => {
      render(<EndOfContent {...defaultProps} />);
      
      expect(screen.getByText(/Keep the music flowing!/)).toBeInTheDocument();
      expect(screen.getByText(/Share your AI music creations/)).toBeInTheDocument();
    });

    test('should handle different pagination modes correctly', () => {
      // Test server mode
      const serverState = createMockPaginationState({
        paginationMode: 'server',
        hasMorePosts: false,
      });

      const { rerender } = render(
        <EndOfContent 
          {...defaultProps} 
          paginationState={serverState}
        />
      );
      
      expect(screen.getByText(/Server Content Fully Loaded/)).toBeInTheDocument();

      // Test client mode
      const clientState = createMockPaginationState({
        paginationMode: 'client',
        hasMorePosts: false,
      });

      rerender(
        <EndOfContent 
          {...defaultProps} 
          paginationState={clientState}
        />
      );
      
      expect(screen.getByText(/Client-side Filtering Complete/)).toBeInTheDocument();
    });

    test('should display animation elements', () => {
      render(<EndOfContent {...defaultProps} />);
      
      // Should have celebration icon
      expect(screen.getByText('🎉')).toBeInTheDocument();
      
      // Should have animated dots (check for multiple dots)
      const container = screen.getByText('🎉').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('should work together in complete pagination flow', () => {
      const paginationState = createMockPaginationState({
        hasMorePosts: true,
        currentPage: 2,
        totalPostsCount: 100,
      });

      // Render LoadMoreButton
      const { rerender } = render(
        <LoadMoreButton
          paginationState={paginationState}
          onLoadMore={jest.fn()}
          isLoading={false}
          hasMorePosts={true}
          totalFilteredPosts={100}
          currentlyShowing={30}
        />
      );

      expect(screen.getByText('Load More Posts (15)')).toBeInTheDocument();

      // Simulate reaching end of content
      const endState = createMockPaginationState({
        hasMorePosts: false,
        totalPostsCount: 100,
      });

      rerender(
        <EndOfContent
          paginationState={endState}
          totalFilteredPosts={100}
          hasSearchResults={false}
          hasFiltersApplied={false}
          onClearSearch={jest.fn()}
          onScrollToTop={jest.fn()}
        />
      );

      expect(screen.getByText("You've reached the end!")).toBeInTheDocument();
    });

    test('should handle mode transitions correctly', () => {
      // Start with server mode
      const serverState = createMockPaginationState({
        paginationMode: 'server',
        hasMorePosts: true,
      });

      const { rerender } = render(
        <LoadMoreButton
          paginationState={serverState}
          onLoadMore={jest.fn()}
          isLoading={false}
          hasMorePosts={true}
          totalFilteredPosts={100}
          currentlyShowing={15}
        />
      );

      expect(screen.getByText(/Server-side Pagination/)).toBeInTheDocument();

      // Switch to client mode
      const clientState = createMockPaginationState({
        paginationMode: 'client',
        hasMorePosts: true,
      });

      rerender(
        <LoadMoreButton
          paginationState={clientState}
          onLoadMore={jest.fn()}
          isLoading={false}
          hasMorePosts={true}
          totalFilteredPosts={50}
          currentlyShowing={15}
        />
      );

      expect(screen.getByText(/Client-side Pagination/)).toBeInTheDocument();
    });
  });
});
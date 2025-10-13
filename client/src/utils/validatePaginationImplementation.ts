/**
 * Validation Script for Unified Pagination State Management System
 * 
 * This script validates that the implementation meets all requirements
 * from task 1 of the dashboard-load-more-integration-fix spec.
 */

import { createUnifiedPaginationState } from './unifiedPaginationState';
import { validateStateConsistency } from './paginationStateValidation';
import { detectPaginationMode, createModeDetectionContext } from './paginationModeDetection';
import { Post } from '../types';

// Mock posts for validation
const createMockPost = (id: string, postType: 'text' | 'audio' = 'text'): Post => ({
  id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  content: `Test post ${id}`,
  user_id: 'user1',
  post_type: postType,
  like_count: Math.floor(Math.random() * 10),
  liked_by_user: false,
});

const mockPosts: Post[] = Array.from({ length: 50 }, (_, i) => 
  createMockPost(`post-${i + 1}`, i % 3 === 0 ? 'audio' : 'text')
);

/**
 * Validates the unified pagination state management system implementation
 */
export function validatePaginationImplementation(): {
  success: boolean;
  results: Record<string, boolean>;
  errors: string[];
} {
  const results: Record<string, boolean> = {};
  const errors: string[] = [];
  
  console.log('🧪 Validating Unified Pagination State Management System...');
  
  try {
    // Test 1: Centralized pagination state interface with proper TypeScript definitions
    console.log('📋 Test 1: Centralized pagination state interface');
    const paginationManager = createUnifiedPaginationState();
    const initialState = paginationManager.getState();
    
    // Verify all required state properties exist
    const requiredStateProps = [
      'currentPage', 'hasMorePosts', 'isLoadingMore',
      'allPosts', 'displayPosts', 'paginatedPosts',
      'isSearchActive', 'hasFiltersApplied', 'totalPostsCount',
      'filters', 'searchResults', 'currentSearchFilters',
      'paginationMode', 'loadMoreStrategy'
    ];
    
    const missingProps = requiredStateProps.filter(prop => !(prop in initialState));
    if (missingProps.length === 0) {
      results['centralized_state_interface'] = true;
      console.log('✅ Centralized state interface: All required properties present');
    } else {
      results['centralized_state_interface'] = false;
      errors.push(`Missing state properties: ${missingProps.join(', ')}`);
      console.log('❌ Centralized state interface: Missing properties');
    }
    
    // Test 2: Pagination mode detection logic
    console.log('📋 Test 2: Pagination mode detection logic');
    
    // Test server-side detection (unfiltered)
    const serverContext = createModeDetectionContext({
      isSearchActive: false,
      searchFilters: {},
      filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
      allPosts: mockPosts,
      displayPosts: mockPosts,
      currentPage: 1,
    });
    
    const serverMode = detectPaginationMode(serverContext);
    if (serverMode === 'server') {
      console.log('✅ Server-side mode detection: Correct');
    } else {
      errors.push('Server-side mode detection failed');
      console.log('❌ Server-side mode detection: Failed');
    }
    
    // Test client-side detection (filtered)
    const clientContext = createModeDetectionContext({
      isSearchActive: false,
      searchFilters: {},
      filters: { postType: 'audio', sortBy: 'newest', timeRange: 'all' },
      allPosts: mockPosts,
      displayPosts: mockPosts.filter(p => p.post_type === 'audio'),
      currentPage: 1,
    });
    
    const clientMode = detectPaginationMode(clientContext);
    if (clientMode === 'client') {
      console.log('✅ Client-side mode detection: Correct');
    } else {
      errors.push('Client-side mode detection failed');
      console.log('❌ Client-side mode detection: Failed');
    }
    
    // Test search mode detection
    const searchContext = createModeDetectionContext({
      isSearchActive: true,
      searchFilters: { query: 'test' },
      filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
      allPosts: mockPosts,
      displayPosts: mockPosts.slice(0, 5),
      currentPage: 1,
    });
    
    const searchMode = detectPaginationMode(searchContext);
    if (searchMode === 'client') {
      results['pagination_mode_detection'] = true;
      console.log('✅ Search mode detection: Correct');
    } else {
      results['pagination_mode_detection'] = false;
      errors.push('Search mode detection failed');
      console.log('❌ Search mode detection: Failed');
    }
    
    // Test 3: State validation functions
    console.log('📋 Test 3: State validation functions');
    
    // Test initial state validation
    const initialValidation = validateStateConsistency(initialState);
    if (initialValidation.isValid) {
      console.log('✅ Initial state validation: Valid');
    } else {
      errors.push(`Initial state validation failed: ${initialValidation.errors.join(', ')}`);
      console.log('❌ Initial state validation: Failed');
    }
    
    // Test state after posts update
    paginationManager.updatePosts({
      newPosts: mockPosts.slice(0, 15),
      resetPagination: true,
    });
    
    const updatedState = paginationManager.getState();
    const updatedValidation = validateStateConsistency(updatedState);
    if (updatedValidation.isValid) {
      console.log('✅ Updated state validation: Valid');
    } else {
      errors.push(`Updated state validation failed: ${updatedValidation.errors.join(', ')}`);
      console.log('❌ Updated state validation: Failed');
    }
    
    // Test mode transitions
    paginationManager.updateFilters({
      postType: 'audio',
      sortBy: 'newest',
      timeRange: 'all',
    });
    
    const filteredState = paginationManager.getState();
    if (filteredState.paginationMode === 'client' && filteredState.loadMoreStrategy === 'client-paginate') {
      results['state_validation_functions'] = true;
      console.log('✅ Mode transition validation: Correct');
    } else {
      results['state_validation_functions'] = false;
      errors.push('Mode transition validation failed');
      console.log('❌ Mode transition validation: Failed');
    }
    
    // Test 4: Consistency across mode transitions
    console.log('📋 Test 4: Consistency across mode transitions');
    
    // Test server to client transition
    paginationManager.reset();
    paginationManager.updatePosts({
      newPosts: mockPosts.slice(0, 30),
      resetPagination: true,
    });
    
    const serverState = paginationManager.getState();
    console.log(`Server mode state: ${serverState.paginationMode}, posts: ${serverState.paginatedPosts.length}`);
    
    // Switch to client mode
    paginationManager.updateFilters({
      postType: 'all',
      sortBy: 'newest',
      timeRange: 'week', // Non-default to trigger client mode
    });
    
    const clientState = paginationManager.getState();
    console.log(`Client mode state: ${clientState.paginationMode}, posts: ${clientState.paginatedPosts.length}`);
    
    // Validate consistency
    const transitionValidation = validateStateConsistency(clientState);
    if (transitionValidation.isValid && clientState.paginationMode === 'client') {
      results['mode_transition_consistency'] = true;
      console.log('✅ Mode transition consistency: Valid');
    } else {
      results['mode_transition_consistency'] = false;
      errors.push('Mode transition consistency failed');
      console.log('❌ Mode transition consistency: Failed');
    }
    
    // Test 5: Load More functionality in both modes
    console.log('📋 Test 5: Load More functionality');
    
    // Test client-side Load More
    const { canLoadMore: clientCanLoad, strategy: clientStrategy } = paginationManager.loadMore();
    const afterClientLoadMore = paginationManager.getState();
    
    if (clientCanLoad && clientStrategy === 'client-paginate' && afterClientLoadMore.currentPage === 2) {
      console.log('✅ Client-side Load More: Working');
    } else {
      errors.push('Client-side Load More failed');
      console.log('❌ Client-side Load More: Failed');
    }
    
    // Test server-side Load More (reset to server mode)
    paginationManager.clearSearch(); // This should reset to server mode
    const serverModeState = paginationManager.getState();
    
    const { canLoadMore: serverCanLoad, strategy: serverStrategy } = paginationManager.loadMore();
    
    if (serverCanLoad && serverStrategy === 'server-fetch') {
      results['load_more_functionality'] = true;
      console.log('✅ Server-side Load More: Working');
    } else {
      results['load_more_functionality'] = false;
      errors.push('Server-side Load More failed');
      console.log('❌ Server-side Load More: Failed');
    }
    
    // Final validation
    const allTestsPassed = Object.values(results).every(result => result === true);
    
    console.log('\n📊 Validation Summary:');
    console.log(`✅ Centralized State Interface: ${results.centralized_state_interface ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Pagination Mode Detection: ${results.pagination_mode_detection ? 'PASS' : 'FAIL'}`);
    console.log(`✅ State Validation Functions: ${results.state_validation_functions ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Mode Transition Consistency: ${results.mode_transition_consistency ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Load More Functionality: ${results.load_more_functionality ? 'PASS' : 'FAIL'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 All validation tests PASSED! Unified pagination state management system is working correctly.');
    } else {
      console.log('\n❌ Some validation tests FAILED. Check errors for details.');
    }
    
    return {
      success: allTestsPassed,
      results,
      errors,
    };
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    return {
      success: false,
      results,
      errors: [...errors, `Validation error: ${error}`],
    };
  }
}

// Run validation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  validatePaginationImplementation();
}
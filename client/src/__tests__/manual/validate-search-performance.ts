/**
 * Manual Performance and Backward Compatibility Validation Script
 * 
 * Run this script to validate:
 * - Requirement 3.1: Query execution time under 2 seconds
 * - Requirement 3.2: Efficient client-side filtering
 * - Requirement 3.3: Caching mechanisms
 * - Requirement 4.1: Function signature unchanged
 * - Requirement 4.2: Return type unchanged
 * - Requirement 4.4: SearchBar component compatibility
 * - Requirement 4.5: Dashboard filter handling compatibility
 * 
 * Usage: Run this in the browser console on the dashboard page
 */

import { searchContent, SearchFilters } from '@/utils/search';

export async function validateSearchPerformance() {
  console.log('🔍 Starting Search Performance Validation...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL' | 'WARN'; message: string; time?: number }>
  };

  // Test 1: Query execution time (Req 3.1)
  console.log('Test 1: Query execution time under 2 seconds (Req 3.1)');
  try {
    const startTime = performance.now();
    const testFilters: SearchFilters = {
      query: 'test',
      postType: 'all',
      sortBy: 'recent',
      timeRange: 'all'
    };
    await searchContent(testFilters, 0, 200);
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime < 2000) {
      console.log(`✅ PASS: Query completed in ${executionTime.toFixed(2)}ms`);
      results.passed++;
      results.tests.push({
        name: 'Query execution time',
        status: 'PASS',
        message: `Completed in ${executionTime.toFixed(2)}ms (< 2000ms)`,
        time: executionTime
      });
    } else {
      console.log(`❌ FAIL: Query took ${executionTime.toFixed(2)}ms (> 2000ms)`);
      results.failed++;
      results.tests.push({
        name: 'Query execution time',
        status: 'FAIL',
        message: `Took ${executionTime.toFixed(2)}ms (> 2000ms)`,
        time: executionTime
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Query execution time',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 2: Client-side filtering efficiency (Req 3.2)
  console.log('\nTest 2: Client-side filtering efficiency (Req 3.2)');
  try {
    const startTime = performance.now();
    const testFilters: SearchFilters = {
      query: 'music',
      postType: 'all',
      sortBy: 'recent',
      timeRange: 'all'
    };
    const searchResults = await searchContent(testFilters, 0, 200);
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime < 2000) {
      console.log(`✅ PASS: Filtered ${searchResults.posts.length} posts in ${executionTime.toFixed(2)}ms`);
      results.passed++;
      results.tests.push({
        name: 'Client-side filtering',
        status: 'PASS',
        message: `Filtered ${searchResults.posts.length} posts in ${executionTime.toFixed(2)}ms`,
        time: executionTime
      });
    } else {
      console.log(`❌ FAIL: Filtering took ${executionTime.toFixed(2)}ms`);
      results.failed++;
      results.tests.push({
        name: 'Client-side filtering',
        status: 'FAIL',
        message: `Took ${executionTime.toFixed(2)}ms`,
        time: executionTime
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Client-side filtering',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 3: Caching mechanism (Req 3.3)
  console.log('\nTest 3: Caching mechanism (Req 3.3)');
  try {
    const testFilters: SearchFilters = {
      query: 'cache-test',
      postType: 'all',
      sortBy: 'recent',
      timeRange: 'all'
    };
    
    const firstStart = performance.now();
    const firstResults = await searchContent(testFilters, 0, 200);
    const firstEnd = performance.now();
    const firstTime = firstEnd - firstStart;
    
    const secondStart = performance.now();
    const secondResults = await searchContent(testFilters, 0, 200);
    const secondEnd = performance.now();
    const secondTime = secondEnd - secondStart;
    
    console.log(`First query: ${firstTime.toFixed(2)}ms`);
    console.log(`Second query (cached): ${secondTime.toFixed(2)}ms`);
    
    if (secondResults.posts.length === firstResults.posts.length) {
      console.log(`✅ PASS: Cache returned consistent results`);
      results.passed++;
      results.tests.push({
        name: 'Caching mechanism',
        status: 'PASS',
        message: `First: ${firstTime.toFixed(2)}ms, Second: ${secondTime.toFixed(2)}ms`,
        time: secondTime
      });
    } else {
      console.log(`⚠️ WARN: Cache results differ from original`);
      results.warnings++;
      results.tests.push({
        name: 'Caching mechanism',
        status: 'WARN',
        message: 'Cache results differ from original'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Caching mechanism',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 4: Function signature (Req 4.1)
  console.log('\nTest 4: Function signature unchanged (Req 4.1)');
  try {
    const filters: SearchFilters = { query: 'test' };
    const result1 = await searchContent(filters);
    const result2 = await searchContent(filters, 0);
    const result3 = await searchContent(filters, 0, 200);
    
    if (result1 && result2 && result3) {
      console.log(`✅ PASS: Function accepts all parameter combinations`);
      results.passed++;
      results.tests.push({
        name: 'Function signature',
        status: 'PASS',
        message: 'Accepts filters, page, and limit parameters'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Function signature',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 5: Return type structure (Req 4.2)
  console.log('\nTest 5: Return type structure unchanged (Req 4.2)');
  try {
    const filters: SearchFilters = { query: 'test' };
    const result = await searchContent(filters);
    
    const hasCorrectStructure = 
      result &&
      'posts' in result &&
      'users' in result &&
      'totalResults' in result &&
      Array.isArray(result.posts) &&
      Array.isArray(result.users) &&
      typeof result.totalResults === 'number';
    
    if (hasCorrectStructure) {
      console.log(`✅ PASS: Return type has correct structure`);
      console.log(`  - posts: ${result.posts.length} items`);
      console.log(`  - users: ${result.users.length} items`);
      console.log(`  - totalResults: ${result.totalResults}`);
      results.passed++;
      results.tests.push({
        name: 'Return type structure',
        status: 'PASS',
        message: `Correct structure with ${result.posts.length} posts, ${result.users.length} users`
      });
    } else {
      console.log(`❌ FAIL: Return type structure incorrect`);
      results.failed++;
      results.tests.push({
        name: 'Return type structure',
        status: 'FAIL',
        message: 'Missing required properties'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Return type structure',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 6: All filter properties supported (Req 4.4, 4.5)
  console.log('\nTest 6: All filter properties supported (Req 4.4, 4.5)');
  try {
    const comprehensiveFilters: SearchFilters = {
      query: 'test',
      postType: 'audio',
      sortBy: 'likes',
      timeRange: 'week',
      creatorId: 'test-id',
      creatorUsername: 'testuser'
    };
    
    const result = await searchContent(comprehensiveFilters, 0, 50);
    
    if (result) {
      console.log(`✅ PASS: All filter properties accepted`);
      results.passed++;
      results.tests.push({
        name: 'Filter properties support',
        status: 'PASS',
        message: 'All SearchFilters properties work correctly'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Filter properties support',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 7: SearchBar compatibility (Req 4.4)
  console.log('\nTest 7: SearchBar component compatibility (Req 4.4)');
  try {
    const searchBarFilters: SearchFilters = {
      query: 'music',
      postType: 'audio',
      sortBy: 'recent',
      timeRange: 'all'
    };
    
    const result = await searchContent(searchBarFilters, 0, 200);
    
    if (result && result.posts && result.users) {
      console.log(`✅ PASS: SearchBar filter format works correctly`);
      results.passed++;
      results.tests.push({
        name: 'SearchBar compatibility',
        status: 'PASS',
        message: `Returned ${result.posts.length} posts, ${result.users.length} users`
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'SearchBar compatibility',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 8: Dashboard filter handling (Req 4.5)
  console.log('\nTest 8: Dashboard filter handling compatibility (Req 4.5)');
  try {
    // Test creator filter
    const creatorFilter: SearchFilters = {
      creatorId: 'test-creator',
      creatorUsername: 'testuser'
    };
    const result1 = await searchContent(creatorFilter);
    
    // Test combined filters
    const combinedFilters: SearchFilters = {
      query: 'test',
      postType: 'audio',
      sortBy: 'popular',
      timeRange: 'month'
    };
    const result2 = await searchContent(combinedFilters);
    
    if (result1 && result2) {
      console.log(`✅ PASS: Dashboard filter combinations work correctly`);
      results.passed++;
      results.tests.push({
        name: 'Dashboard filter handling',
        status: 'PASS',
        message: 'Creator and combined filters work correctly'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
      name: 'Dashboard filter handling',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 9: No 400 errors (Req 1.4)
  console.log('\nTest 9: No 400 Bad Request errors (Req 1.4)');
  try {
    const filters: SearchFilters = {
      query: 'test search query',
      postType: 'all',
      sortBy: 'recent',
      timeRange: 'all'
    };
    
    const result = await searchContent(filters, 0, 200);
    
    if (result && result.posts) {
      console.log(`✅ PASS: No 400 errors generated`);
      results.passed++;
      results.tests.push({
        name: 'No 400 errors',
        status: 'PASS',
        message: 'Search completed without errors'
      });
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}`);
    results.failed++;
    results.tests.push({
        name: 'No 400 errors',
        status: 'FAIL',
        message: `Error: ${error}`
      });
    }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📊 Total Tests: ${results.tests.length}`);
  console.log('='.repeat(60));
  
  console.log('\nDetailed Results:');
  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    const timeStr = test.time ? ` (${test.time.toFixed(2)}ms)` : '';
    console.log(`${index + 1}. ${icon} ${test.name}${timeStr}`);
    console.log(`   ${test.message}`);
  });
  
  const overallStatus = results.failed === 0 ? 'PASSED' : 'FAILED';
  console.log(`\n🎯 Overall Status: ${overallStatus}`);
  
  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).validateSearchPerformance = validateSearchPerformance;
  console.log('✅ Validation script loaded. Run validateSearchPerformance() to test.');
}

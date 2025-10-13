/**
 * Analytics Performance Validation Script
 * 
 * This script validates that the analytics system meets all performance requirements:
 * - Query times < 100ms
 * - Collection function < 30s
 * - Dashboard load performance
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 * 
 * Prerequisites:
 * - Run from client directory where @supabase/supabase-js is installed
 * - Set environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PerformanceResult {
  testName: string;
  duration: number;
  passed: boolean;
  threshold: number;
  details?: any;
}

const results: PerformanceResult[] = [];

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Test 1: Fetch 30 days of activity data
 * Requirement: < 100ms
 */
async function test30DayActivityQuery() {
  console.log('\n📊 Test 1: Fetch 30 days of activity data');
  
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('metric_date, metric_category, value')
      .in('metric_category', ['posts_created', 'comments_created'])
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return data;
  });

  const passed = duration < 100;
  results.push({
    testName: '30-day activity query',
    duration,
    passed,
    threshold: 100,
    details: { recordCount: result?.length || 0 }
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Records: ${result?.length || 0}`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 100ms)`);
}

/**
 * Test 2: Fetch current metrics (latest totals)
 * Requirement: < 100ms
 */
async function testCurrentMetricsQuery() {
  console.log('\n📊 Test 2: Fetch current metrics');

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('metric_category, value, metric_date')
      .in('metric_category', ['users_total', 'posts_total', 'comments_total'])
      .order('metric_date', { ascending: false })
      .limit(3);

    if (error) throw error;
    return data;
  });

  const passed = duration < 100;
  results.push({
    testName: 'Current metrics query',
    duration,
    passed,
    threshold: 100,
    details: { recordCount: result?.length || 0 }
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Records: ${result?.length || 0}`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 100ms)`);
}

/**
 * Test 3: Date range query with filtering
 * Requirement: < 100ms
 */
async function testDateRangeQuery() {
  console.log('\n📊 Test 3: Date range query with category filter');

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('metric_date, metric_type, metric_category, value')
      .gte('metric_date', '2025-01-01')
      .lte('metric_date', '2025-01-31')
      .eq('metric_category', 'posts_total')
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return data;
  });

  const passed = duration < 100;
  results.push({
    testName: 'Date range with filter query',
    duration,
    passed,
    threshold: 100,
    details: { recordCount: result?.length || 0 }
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Records: ${result?.length || 0}`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 100ms)`);
}

/**
 * Test 4: Collection log monitoring query
 * Requirement: < 100ms
 */
async function testCollectionLogQuery() {
  console.log('\n📊 Test 4: Latest collection status');

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase
      .from('metric_collection_log')
      .select('collection_date, started_at, completed_at, status, metrics_collected')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
    return data;
  });

  const passed = duration < 100;
  results.push({
    testName: 'Collection log query',
    duration,
    passed,
    threshold: 100,
    details: result ? { status: result.status } : { status: 'no data' }
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 100ms)`);
}

/**
 * Test 5: Aggregate query for metrics
 * Requirement: < 100ms
 */
async function testAggregateQuery() {
  console.log('\n📊 Test 5: Aggregate metrics by category');

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase.rpc('get_metrics_summary');

    // If RPC doesn't exist, use a regular query
    if (error && error.code === '42883') {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('daily_metrics')
        .select('metric_category, metric_date')
        .order('metric_category');

      if (fallbackError) throw fallbackError;
      
      // Group by category manually
      const grouped = (fallbackData || []).reduce((acc: any, row: any) => {
        if (!acc[row.metric_category]) {
          acc[row.metric_category] = { count: 0, dates: [] };
        }
        acc[row.metric_category].count++;
        acc[row.metric_category].dates.push(row.metric_date);
        return acc;
      }, {});

      return Object.entries(grouped).map(([category, info]: [string, any]) => ({
        metric_category: category,
        record_count: info.count,
        earliest_date: info.dates.sort()[0],
        latest_date: info.dates.sort().reverse()[0]
      }));
    }

    if (error) throw error;
    return data;
  });

  const passed = duration < 100;
  results.push({
    testName: 'Aggregate metrics query',
    duration,
    passed,
    threshold: 100,
    details: { categories: result?.length || 0 }
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms`);
  console.log(`   Categories: ${result?.length || 0}`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 100ms)`);
}

/**
 * Test 6: Collection function execution time
 * Requirement: < 30 seconds
 */
async function testCollectionFunction() {
  console.log('\n⚙️  Test 6: Collection function execution time');
  console.log('   Running collect_daily_metrics...');

  const { result, duration } = await measureTime(async () => {
    const { data, error } = await supabase.rpc('collect_daily_metrics', {
      target_date: new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data;
  });

  const passed = duration < 30000; // 30 seconds
  results.push({
    testName: 'Collection function execution',
    duration,
    passed,
    threshold: 30000,
    details: result
  });

  console.log(`   Duration: ${duration.toFixed(2)}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log(`   Metrics collected: ${result?.[0]?.metrics_collected || 'N/A'}`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (threshold: 30s)`);
}

/**
 * Test 7: Multiple concurrent queries (load test)
 * Requirement: System should handle concurrent requests
 */
async function testConcurrentQueries() {
  console.log('\n🔄 Test 7: Concurrent query load test');
  console.log('   Running 10 concurrent queries...');

  const queries = Array(10).fill(null).map((_, i) => {
    const daysAgo = i * 3; // Vary the date ranges
    const endDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const startDate = new Date(Date.now() - (daysAgo + 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return supabase
      .from('daily_metrics')
      .select('metric_date, metric_category, value')
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .limit(100);
  });

  const { result, duration } = await measureTime(async () => {
    return await Promise.all(queries);
  });

  const avgDuration = duration / 10;
  const passed = avgDuration < 100;
  
  results.push({
    testName: 'Concurrent queries (10x)',
    duration: avgDuration,
    passed,
    threshold: 100,
    details: { 
      totalDuration: duration,
      queriesRun: 10,
      avgPerQuery: avgDuration
    }
  });

  console.log(`   Total duration: ${duration.toFixed(2)}ms`);
  console.log(`   Average per query: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'} (avg threshold: 100ms)`);
}

/**
 * Print summary of all test results
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\n' + '-'.repeat(60));
  console.log('Detailed Results:');
  console.log('-'.repeat(60));

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    const durationStr = result.duration < 1000 
      ? `${result.duration.toFixed(2)}ms`
      : `${(result.duration / 1000).toFixed(2)}s`;
    const thresholdStr = result.threshold < 1000
      ? `${result.threshold}ms`
      : `${result.threshold / 1000}s`;

    console.log(`\n${index + 1}. ${result.testName}`);
    console.log(`   ${status} ${durationStr} / ${thresholdStr}`);
    
    if (result.details) {
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
  });

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some performance tests failed!');
    console.log('Review the results above and consider:');
    console.log('- Running VACUUM ANALYZE on tables');
    console.log('- Checking index usage with EXPLAIN ANALYZE');
    console.log('- Reviewing query patterns for optimization');
    console.log('- Checking database connection and network latency');
  } else {
    console.log('\n🎉 All performance tests passed!');
    console.log('The analytics system meets all performance requirements.');
  }

  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Analytics Performance Validation');
  console.log('='.repeat(60));

  try {
    // Run all performance tests
    await test30DayActivityQuery();
    await testCurrentMetricsQuery();
    await testDateRangeQuery();
    await testCollectionLogQuery();
    await testAggregateQuery();
    await testCollectionFunction();
    await testConcurrentQueries();

    // Print summary
    printSummary();

    // Exit with appropriate code
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Performance validation failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as validatePerformance };

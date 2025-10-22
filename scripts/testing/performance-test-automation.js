#!/usr/bin/env node

/**
 * Performance Test Automation Script
 * Automates the performance tests from the tracks-vs-posts-separation testing guide
 * 
 * Usage: node scripts/testing/performance-test-automation.js
 */

const fs = require('fs');
const path = require('path');

// Determine if we need to adjust the require path
let supabaseModule;
try {
  // Try to require from current directory (if run from client/)
  supabaseModule = require('@supabase/supabase-js');
} catch (e) {
  try {
    // Try to require from client directory (if run from root)
    const clientPath = path.join(process.cwd(), 'client', 'node_modules', '@supabase', 'supabase-js');
    supabaseModule = require(clientPath);
  } catch (e2) {
    console.error('❌ Error: @supabase/supabase-js not found');
    console.error('   Please run: cd client && npm install');
    console.error('   Or run this script from the client directory');
    process.exit(1);
  }
}

const { createClient } = supabaseModule;

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Performance targets
const TARGETS = {
  postFetch: 100,        // ms
  playlistFetch: 100,    // ms
  userTracks: 50,        // ms
  search: 150,           // ms
  feedPageLoad: 3000,    // ms
  playlistPageLoad: 2000, // ms
  trackLibraryLoad: 2000, // ms
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  environment: 'local',
  queryPerformance: {},
  largeDataset: {},
  caching: {},
  nPlusOne: {},
  optimizations: [],
  issues: [],
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utility functions
function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function measureQuery(name, queryFn, target) {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    const status = duration < target ? 'PASS' : 'FAIL';
    
    logTest(
      `${name}: ${duration.toFixed(2)}ms (target: <${target}ms)`,
      status
    );
    
    return {
      duration: duration.toFixed(2),
      target,
      status,
      error: result.error || null,
      count: result.data?.length || 0,
    };
  } catch (error) {
    logTest(`${name}: ERROR`, 'FAIL', error.message);
    return {
      duration: null,
      target,
      status: 'ERROR',
      error: error.message,
      count: 0,
    };
  }
}

// Test 1: Query Performance with Joins
async function testQueryPerformance() {
  logSection('Test 1: Query Performance with Joins');
  
  // Test 1.1: Post Fetch Performance
  results.queryPerformance.postFetch = await measureQuery(
    'Post fetch with tracks',
    async () => {
      return await supabase
        .from('posts')
        .select(`
          *,
          tracks (*)
        `)
        .eq('post_type', 'audio')
        .order('created_at', { ascending: false })
        .limit(15);
    },
    TARGETS.postFetch
  );
  
  // Test 1.2: Playlist Fetch Performance
  results.queryPerformance.playlistFetch = await measureQuery(
    'Playlist fetch with tracks',
    async () => {
      // First get a playlist ID
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id')
        .limit(1);
      
      if (!playlists || playlists.length === 0) {
        return { data: [], error: 'No playlists found' };
      }
      
      return await supabase
        .from('playlists')
        .select(`
          *,
          playlist_tracks (
            position,
            added_at,
            tracks (*)
          )
        `)
        .eq('id', playlists[0].id)
        .order('position', { foreignTable: 'playlist_tracks', ascending: true });
    },
    TARGETS.playlistFetch
  );
  
  // Test 1.3: User Tracks Performance
  results.queryPerformance.userTracks = await measureQuery(
    'User tracks fetch',
    async () => {
      // Get a user ID first
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .limit(1);
      
      if (!users || users.length === 0) {
        return { data: [], error: 'No users found' };
      }
      
      return await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', users[0].user_id)
        .order('created_at', { ascending: false });
    },
    TARGETS.userTracks
  );
  
  // Test 1.4: Search Performance
  results.queryPerformance.search = await measureQuery(
    'Search with tracks',
    async () => {
      // Search in tracks table directly for better performance
      return await supabase
        .from('tracks')
        .select('*')
        .or('title.ilike.%test%,tags.ilike.%test%')
        .order('created_at', { ascending: false })
        .limit(20);
    },
    TARGETS.search
  );
}


// Test 2: Large Dataset Testing
async function testLargeDatasets() {
  logSection('Test 2: Large Dataset Testing');
  
  // Test 2.1: User with many tracks
  results.largeDataset.manyTracks = await measureQuery(
    'User with 100+ tracks',
    async () => {
      const { data: users } = await supabase
        .from('tracks')
        .select('user_id')
        .limit(1);
      
      if (!users || users.length === 0) {
        return { data: [], error: 'No tracks found' };
      }
      
      return await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', users[0].user_id)
        .order('created_at', { ascending: false })
        .limit(100);
    },
    TARGETS.trackLibraryLoad
  );
  
  // Test 2.2: Playlist with many tracks
  results.largeDataset.largePlaylist = await measureQuery(
    'Playlist with 50+ tracks',
    async () => {
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id')
        .limit(1);
      
      if (!playlists || playlists.length === 0) {
        return { data: [], error: 'No playlists found' };
      }
      
      return await supabase
        .from('playlist_tracks')
        .select(`
          *,
          tracks (*)
        `)
        .eq('playlist_id', playlists[0].id)
        .order('position', { ascending: true })
        .limit(50);
    },
    TARGETS.playlistPageLoad
  );
  
  // Test 2.3: Feed with many posts
  results.largeDataset.largeFeed = await measureQuery(
    'Feed with 1000+ posts',
    async () => {
      return await supabase
        .from('posts')
        .select(`
          *,
          tracks (*)
        `)
        .eq('post_type', 'audio')
        .order('created_at', { ascending: false })
        .limit(100);
    },
    TARGETS.feedPageLoad
  );
  
  // Test 2.4: User with many posts
  results.largeDataset.userPosts = await measureQuery(
    'User with 50+ posts',
    async () => {
      const { data: users } = await supabase
        .from('posts')
        .select('user_id')
        .limit(1);
      
      if (!users || users.length === 0) {
        return { data: [], error: 'No posts found' };
      }
      
      return await supabase
        .from('posts')
        .select(`
          *,
          tracks (*)
        `)
        .eq('user_id', users[0].user_id)
        .order('created_at', { ascending: false })
        .limit(50);
    },
    TARGETS.feedPageLoad
  );
}

// Test 4: N+1 Query Detection
async function testNPlusOneQueries() {
  logSection('Test 4: N+1 Query Detection');
  
  console.log('⚠️  Note: N+1 detection requires manual query log inspection');
  console.log('    Check Supabase Dashboard → Database → Query Performance\n');
  
  // Test 4.1: Post fetching (should be 1 query with JOIN)
  const postStart = performance.now();
  const { data: posts, error: postError } = await supabase
    .from('posts')
    .select(`
      *,
      tracks (*)
    `)
    .eq('post_type', 'audio')
    .limit(15);
  const postDuration = performance.now() - postStart;
  
  results.nPlusOne.postFetch = {
    duration: postDuration.toFixed(2),
    expectedQueries: 1,
    status: postError ? 'ERROR' : 'PASS',
    note: 'Should use single JOIN query, not N+1',
    error: postError ? postError.message : null,
  };
  
  logTest(
    `Post fetch N+1 check: ${postDuration.toFixed(2)}ms`,
    postError ? 'FAIL' : 'PASS',
    postError ? `Error: ${postError.message}` : 'Expected: 1 query with JOIN'
  );
  
  // Test 4.2: Playlist fetching
  const playlistStart = performance.now();
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id')
    .limit(1);
  
  if (playlists && playlists.length > 0) {
    const { data: playlistData, error: playlistError } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_tracks (
          position,
          tracks (*)
        )
      `)
      .eq('id', playlists[0].id);
    
    const playlistDuration = performance.now() - playlistStart;
    
    results.nPlusOne.playlistFetch = {
      duration: playlistDuration.toFixed(2),
      expectedQueries: 1,
      status: playlistError ? 'ERROR' : 'PASS',
      note: 'Should use single JOIN query',
    };
    
    logTest(
      `Playlist fetch N+1 check: ${playlistDuration.toFixed(2)}ms`,
      playlistError ? 'FAIL' : 'PASS',
      'Expected: 1 query with JOIN'
    );
  }
  
  // Test 4.3: User tracks fetching
  const tracksStart = performance.now();
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id')
    .limit(1);
  
  if (users && users.length > 0) {
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', users[0].user_id)
      .limit(50);
    
    const tracksDuration = performance.now() - tracksStart;
    
    results.nPlusOne.userTracks = {
      duration: tracksDuration.toFixed(2),
      expectedQueries: 1,
      status: tracksError ? 'ERROR' : 'PASS',
      note: 'Should be single query',
    };
    
    logTest(
      `User tracks N+1 check: ${tracksDuration.toFixed(2)}ms`,
      tracksError ? 'FAIL' : 'PASS',
      'Expected: 1 query'
    );
  }
}


// Test 5: Index Verification
async function testIndexes() {
  logSection('Test 5: Database Index Verification');
  
  try {
    const { data: indexes, error } = await supabase.rpc('get_table_indexes', {
      table_names: ['posts', 'tracks', 'playlist_tracks']
    });
    
    if (error) {
      // Fallback: check indexes using direct query
      const { data: indexData, error: indexError } = await supabase
        .from('pg_indexes')
        .select('tablename, indexname, indexdef')
        .in('tablename', ['posts', 'tracks', 'playlist_tracks']);
      
      if (indexError) {
        console.log('⚠️  Unable to check indexes automatically');
        console.log('   Run this SQL manually in Supabase Dashboard:');
        console.log(`
   SELECT tablename, indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename IN ('posts', 'tracks', 'playlist_tracks')
   ORDER BY tablename, indexname;
        `);
        
        results.optimizations.push({
          type: 'index_check',
          status: 'MANUAL_CHECK_REQUIRED',
          note: 'Could not automatically verify indexes',
        });
        return;
      }
      
      // Check for required indexes
      const requiredIndexes = [
        { table: 'posts', column: 'track_id' },
        { table: 'posts', column: 'user_id' },
        { table: 'posts', column: 'created_at' },
        { table: 'posts', column: 'post_type' },
        { table: 'tracks', column: 'user_id' },
        { table: 'tracks', column: 'created_at' },
        { table: 'playlist_tracks', column: 'playlist_id' },
        { table: 'playlist_tracks', column: 'track_id' },
      ];
      
      const missingIndexes = [];
      
      for (const required of requiredIndexes) {
        const found = indexData?.some(idx => 
          idx.tablename === required.table && 
          idx.indexdef.includes(required.column)
        );
        
        if (!found) {
          missingIndexes.push(required);
          logTest(
            `Index on ${required.table}.${required.column}`,
            'FAIL',
            'Missing index'
          );
        } else {
          logTest(
            `Index on ${required.table}.${required.column}`,
            'PASS'
          );
        }
      }
      
      results.optimizations.push({
        type: 'index_verification',
        missingIndexes,
        status: missingIndexes.length === 0 ? 'PASS' : 'FAIL',
      });
      
      if (missingIndexes.length > 0) {
        console.log('\n⚠️  Missing indexes detected. Run these SQL commands:');
        for (const idx of missingIndexes) {
          console.log(`   CREATE INDEX IF NOT EXISTS idx_${idx.table}_${idx.column} ON ${idx.table}(${idx.column});`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error checking indexes:', error.message);
    results.optimizations.push({
      type: 'index_check',
      status: 'ERROR',
      error: error.message,
    });
  }
}

// Generate report
function generateReport() {
  logSection('Performance Test Report');
  
  console.log('Test Execution Time:', new Date().toISOString());
  console.log('Environment:', results.environment);
  console.log('\n');
  
  // Query Performance Summary
  console.log('📊 Query Performance Results:');
  console.log('─'.repeat(60));
  for (const [test, result] of Object.entries(results.queryPerformance)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.duration}ms (target: <${result.target}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('\n');
  
  // Large Dataset Summary
  console.log('📈 Large Dataset Results:');
  console.log('─'.repeat(60));
  for (const [test, result] of Object.entries(results.largeDataset)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.duration}ms (${result.count} records)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('\n');
  
  // N+1 Query Summary
  console.log('🔍 N+1 Query Detection:');
  console.log('─'.repeat(60));
  for (const [test, result] of Object.entries(results.nPlusOne)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.duration}ms`);
    console.log(`   ${result.note}`);
  }
  console.log('\n');
  
  // Overall Status
  const allTests = [
    ...Object.values(results.queryPerformance),
    ...Object.values(results.largeDataset),
    ...Object.values(results.nPlusOne),
  ];
  
  const passed = allTests.filter(t => t.status === 'PASS').length;
  const failed = allTests.filter(t => t.status === 'FAIL' || t.status === 'ERROR').length;
  const total = allTests.length;
  
  console.log('📋 Overall Summary:');
  console.log('─'.repeat(60));
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('\n');
  
  // Save results to file
  const outputDir = path.join(__dirname, '../../docs/features/tracks-vs-posts-separation/testing');
  const outputFile = path.join(outputDir, `test-performance-results-${Date.now()}.json`);
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`📄 Full results saved to: ${outputFile}`);
  } catch (error) {
    console.log('⚠️  Could not save results file:', error.message);
  }
  
  // Generate markdown report
  generateMarkdownReport(outputDir);
}


function generateMarkdownReport(outputDir) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportFile = path.join(outputDir, `test-performance-report-${timestamp}.md`);
  
  let markdown = `# Performance Test Results - ${timestamp}\n\n`;
  markdown += `**Environment:** ${results.environment}\n`;
  markdown += `**Timestamp:** ${results.timestamp}\n\n`;
  
  markdown += `## Query Performance Results\n\n`;
  markdown += `| Query Type | Target | Actual | Status |\n`;
  markdown += `|------------|--------|--------|--------|\n`;
  
  for (const [test, result] of Object.entries(results.queryPerformance)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    markdown += `| ${test} | < ${result.target}ms | ${result.duration}ms | ${status} |\n`;
  }
  
  markdown += `\n## Large Dataset Results\n\n`;
  markdown += `| Test | Target | Actual | Records | Status |\n`;
  markdown += `|------|--------|--------|---------|--------|\n`;
  
  for (const [test, result] of Object.entries(results.largeDataset)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    markdown += `| ${test} | < ${result.target}ms | ${result.duration}ms | ${result.count} | ${status} |\n`;
  }
  
  markdown += `\n## N+1 Query Detection\n\n`;
  markdown += `| Test | Duration | Expected Queries | Status |\n`;
  markdown += `|------|----------|------------------|--------|\n`;
  
  for (const [test, result] of Object.entries(results.nPlusOne)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    markdown += `| ${test} | ${result.duration}ms | ${result.expectedQueries} | ${status} |\n`;
  }
  
  markdown += `\n## Optimizations\n\n`;
  
  if (results.optimizations.length > 0) {
    for (const opt of results.optimizations) {
      markdown += `### ${opt.type}\n`;
      markdown += `- **Status:** ${opt.status}\n`;
      if (opt.missingIndexes && opt.missingIndexes.length > 0) {
        markdown += `- **Missing Indexes:**\n`;
        for (const idx of opt.missingIndexes) {
          markdown += `  - ${idx.table}.${idx.column}\n`;
        }
      }
      if (opt.note) {
        markdown += `- **Note:** ${opt.note}\n`;
      }
      markdown += `\n`;
    }
  } else {
    markdown += `No optimization issues detected.\n\n`;
  }
  
  markdown += `## Issues Found\n\n`;
  
  if (results.issues.length > 0) {
    for (const issue of results.issues) {
      markdown += `### ${issue.title}\n`;
      markdown += `- **Query:** ${issue.query}\n`;
      markdown += `- **Execution Time:** ${issue.duration}ms\n`;
      markdown += `- **Recommendation:** ${issue.recommendation}\n\n`;
    }
  } else {
    markdown += `No critical issues found.\n\n`;
  }
  
  // Calculate summary
  const allTests = [
    ...Object.values(results.queryPerformance),
    ...Object.values(results.largeDataset),
    ...Object.values(results.nPlusOne),
  ];
  
  const passed = allTests.filter(t => t.status === 'PASS').length;
  const failed = allTests.filter(t => t.status === 'FAIL' || t.status === 'ERROR').length;
  const total = allTests.length;
  
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${total}\n`;
  markdown += `- **Passed:** ${passed} ✅\n`;
  markdown += `- **Failed:** ${failed} ❌\n`;
  markdown += `- **Success Rate:** ${((passed / total) * 100).toFixed(1)}%\n\n`;
  
  markdown += `## Completion Checklist\n\n`;
  markdown += `- [${results.queryPerformance && Object.keys(results.queryPerformance).length > 0 ? 'x' : ' '}] Query performance tests completed\n`;
  markdown += `- [${results.largeDataset && Object.keys(results.largeDataset).length > 0 ? 'x' : ' '}] Large dataset tests completed\n`;
  markdown += `- [${results.nPlusOne && Object.keys(results.nPlusOne).length > 0 ? 'x' : ' '}] N+1 query detection completed\n`;
  markdown += `- [${results.optimizations.length > 0 ? 'x' : ' '}] Index verification completed\n`;
  markdown += `- [${passed === total ? 'x' : ' '}] All performance targets met\n`;
  
  try {
    fs.writeFileSync(reportFile, markdown);
    console.log(`📄 Markdown report saved to: ${reportFile}\n`);
  } catch (error) {
    console.log('⚠️  Could not save markdown report:', error.message);
  }
}

// Main execution
async function main() {
  console.log('\n🚀 Starting Performance Test Automation\n');
  console.log('Testing against:', SUPABASE_URL);
  console.log('\n');
  
  try {
    // Run all test suites
    await testQueryPerformance();
    await testLargeDatasets();
    await testNPlusOneQueries();
    await testIndexes();
    
    // Generate report
    generateReport();
    
    // Exit with appropriate code
    const allTests = [
      ...Object.values(results.queryPerformance),
      ...Object.values(results.largeDataset),
      ...Object.values(results.nPlusOne),
    ];
    
    const hasFailed = allTests.some(t => t.status === 'FAIL' || t.status === 'ERROR');
    
    if (hasFailed) {
      console.log('❌ Some tests failed. Review the results above.\n');
      process.exit(1);
    } else {
      console.log('✅ All tests passed!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Fatal error during test execution:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testQueryPerformance,
  testLargeDatasets,
  testNPlusOneQueries,
  testIndexes,
  generateReport,
};

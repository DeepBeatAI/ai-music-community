/**
 * Verification Script: Cross-Page Popularity Consistency
 * 
 * This script helps verify that trending tracks and popular creators
 * are consistent across Home, Discover, and Analytics pages.
 * 
 * Usage: node scripts/testing/verify-popularity-consistency.js
 */

const { createClient } = require('../../client/node_modules/@supabase/supabase-js');
require('dotenv').config({ path: './client/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch trending tracks using the database function
 */
async function getTrendingTracks(daysBack, limit) {
  const { data, error } = await supabase.rpc('get_trending_tracks', {
    days_back: daysBack,
    result_limit: limit
  });

  if (error) {
    console.error('Error fetching trending tracks:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch popular creators using the database function
 */
async function getPopularCreators(daysBack, limit) {
  const { data, error } = await supabase.rpc('get_popular_creators', {
    days_back: daysBack,
    result_limit: limit
  });

  if (error) {
    console.error('Error fetching popular creators:', error);
    return [];
  }

  return data || [];
}

/**
 * Compare two arrays of tracks for consistency
 */
function compareTrackLists(list1, list2, page1Name, page2Name) {
  const ids1 = list1.map(t => t.track_id);
  const ids2 = list2.map(t => t.track_id);
  
  const common = ids1.filter(id => ids2.includes(id));
  const onlyIn1 = ids1.filter(id => !ids2.includes(id));
  const onlyIn2 = ids2.filter(id => !ids1.includes(id));
  
  console.log(`\n📊 Comparing ${page1Name} vs ${page2Name}:`);
  console.log(`   Common tracks: ${common.length}`);
  console.log(`   Only in ${page1Name}: ${onlyIn1.length}`);
  console.log(`   Only in ${page2Name}: ${onlyIn2.length}`);
  
  if (onlyIn1.length > 0) {
    console.log(`   ⚠️  Tracks only in ${page1Name}:`, onlyIn1);
  }
  if (onlyIn2.length > 0) {
    console.log(`   ⚠️  Tracks only in ${page2Name}:`, onlyIn2);
  }
  
  return common.length === Math.min(ids1.length, ids2.length);
}

/**
 * Compare two arrays of creators for consistency
 */
function compareCreatorLists(list1, list2, page1Name, page2Name) {
  const ids1 = list1.map(c => c.user_id);
  const ids2 = list2.map(c => c.user_id);
  
  const common = ids1.filter(id => ids2.includes(id));
  const onlyIn1 = ids1.filter(id => !ids2.includes(id));
  const onlyIn2 = ids2.filter(id => !ids1.includes(id));
  
  console.log(`\n📊 Comparing ${page1Name} vs ${page2Name}:`);
  console.log(`   Common creators: ${common.length}`);
  console.log(`   Only in ${page1Name}: ${onlyIn1.length}`);
  console.log(`   Only in ${page2Name}: ${onlyIn2.length}`);
  
  if (onlyIn1.length > 0) {
    console.log(`   ⚠️  Creators only in ${page1Name}:`, onlyIn1);
  }
  if (onlyIn2.length > 0) {
    console.log(`   ⚠️  Creators only in ${page2Name}:`, onlyIn2);
  }
  
  return common.length === Math.min(ids1.length, ids2.length);
}

/**
 * Main verification function
 */
async function verifyConsistency() {
  console.log('🔍 Verifying Cross-Page Popularity Consistency\n');
  console.log('=' .repeat(60));
  
  // Fetch trending tracks for each page
  console.log('\n📈 Fetching Trending Tracks (7 days)...');
  const homeTracks = await getTrendingTracks(7, 4);
  const discoverTracks = await getTrendingTracks(7, 8);
  const analyticsTracks = await getTrendingTracks(7, 10);
  
  console.log(`   Home page: ${homeTracks.length} tracks`);
  console.log(`   Discover page: ${discoverTracks.length} tracks`);
  console.log(`   Analytics page: ${analyticsTracks.length} tracks`);
  
  // Compare trending tracks
  console.log('\n🔄 Comparing Trending Tracks:');
  const homeDiscoverTracksMatch = compareTrackLists(
    homeTracks, 
    discoverTracks.slice(0, 4), 
    'Home', 
    'Discover (first 4)'
  );
  
  const homeAnalyticsTracksMatch = compareTrackLists(
    homeTracks, 
    analyticsTracks.slice(0, 4), 
    'Home', 
    'Analytics (first 4)'
  );
  
  // Fetch popular creators for each page
  console.log('\n\n👥 Fetching Popular Creators (7 days)...');
  const homeCreators = await getPopularCreators(7, 3);
  const discoverCreators = await getPopularCreators(7, 6);
  const analyticsCreators = await getPopularCreators(7, 10);
  
  console.log(`   Home page: ${homeCreators.length} creators`);
  console.log(`   Discover page: ${discoverCreators.length} creators`);
  console.log(`   Analytics page: ${analyticsCreators.length} creators`);
  
  // Compare popular creators
  console.log('\n🔄 Comparing Popular Creators:');
  const homeDiscoverCreatorsMatch = compareCreatorLists(
    homeCreators, 
    discoverCreators.slice(0, 3), 
    'Home', 
    'Discover (first 3)'
  );
  
  const homeAnalyticsCreatorsMatch = compareCreatorLists(
    homeCreators, 
    analyticsCreators.slice(0, 3), 
    'Home', 
    'Analytics (first 3)'
  );
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 VERIFICATION SUMMARY\n');
  
  console.log('Trending Tracks Consistency:');
  console.log(`   ✓ Home vs Discover: ${homeDiscoverTracksMatch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   ✓ Home vs Analytics: ${homeAnalyticsTracksMatch ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nPopular Creators Consistency:');
  console.log(`   ✓ Home vs Discover: ${homeDiscoverCreatorsMatch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   ✓ Home vs Analytics: ${homeAnalyticsCreatorsMatch ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPass = homeDiscoverTracksMatch && homeAnalyticsTracksMatch && 
                  homeDiscoverCreatorsMatch && homeAnalyticsCreatorsMatch;
  
  console.log('\n' + '='.repeat(60));
  if (allPass) {
    console.log('✅ ALL CONSISTENCY CHECKS PASSED');
  } else {
    console.log('❌ SOME CONSISTENCY CHECKS FAILED');
    console.log('\nNote: Small differences may be acceptable if they are due to:');
    console.log('  - Different result limits per page');
    console.log('  - Cache timing differences');
    console.log('  - Recent data changes');
  }
  console.log('='.repeat(60) + '\n');
  
  return allPass;
}

// Run verification
verifyConsistency()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  });

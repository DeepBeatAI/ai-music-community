#!/usr/bin/env node

/**
 * Backfill Analytics Script
 * 
 * This script backfills historical daily metrics by:
 * 1. Querying the earliest post/comment date from the database
 * 2. Calling the backfill_daily_metrics RPC function
 * 3. Logging progress and handling errors
 * 
 * Requirements: 8.1, 8.2
 * 
 * IMPORTANT: This script must be run from the client directory where
 * @supabase/supabase-js is installed as a dependency.
 * 
 * Usage:
 *   cd client
 *   npx ts-node ../scripts/database/backfill-analytics.ts
 *   
 * Or with custom date range:
 *   cd client
 *   npx ts-node ../scripts/database/backfill-analytics.ts --start-date 2024-01-01 --end-date 2024-12-31
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure to set these in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface BackfillResult {
  dates_processed: number;
  total_metrics: number;
  execution_time_ms: number;
  status: string;
}

/**
 * Get the earliest date from posts and comments tables
 */
async function getEarliestDate(): Promise<string> {
  console.log('📅 Finding earliest post/comment date...');

  // Query earliest post
  const { data: earliestPost, error: postError } = await supabase
    .from('posts')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (postError && postError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('❌ Error querying posts:', postError);
  }

  // Query earliest comment
  const { data: earliestComment, error: commentError } = await supabase
    .from('comments')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (commentError && commentError.code !== 'PGRST116') {
    console.error('❌ Error querying comments:', commentError);
  }

  // Determine the earliest date
  const dates: Date[] = [];
  if (earliestPost?.created_at) {
    dates.push(new Date(earliestPost.created_at));
  }
  if (earliestComment?.created_at) {
    dates.push(new Date(earliestComment.created_at));
  }

  if (dates.length === 0) {
    // No data found, default to 30 days ago
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 30);
    console.log('⚠️  No posts or comments found, using default start date (30 days ago)');
    return defaultDate.toISOString().split('T')[0];
  }

  const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const dateString = earliestDate.toISOString().split('T')[0];
  
  console.log(`✅ Earliest date found: ${dateString}`);
  return dateString;
}

/**
 * Run the backfill process
 */
async function runBackfill(startDate: string, endDate: string): Promise<void> {
  console.log('\n🚀 Starting analytics backfill...');
  console.log(`   Start Date: ${startDate}`);
  console.log(`   End Date: ${endDate}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Call the backfill_daily_metrics RPC function
    const { data, error } = await supabase.rpc('backfill_daily_metrics', {
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      throw error;
    }

    const result = data as BackfillResult[];
    
    if (!result || result.length === 0) {
      throw new Error('No result returned from backfill function');
    }

    const backfillResult = result[0];
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Backfill completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Dates Processed: ${backfillResult.dates_processed}`);
    console.log(`   Total Metrics: ${backfillResult.total_metrics}`);
    console.log(`   Database Execution Time: ${backfillResult.execution_time_ms}ms`);
    console.log(`   Total Script Time: ${executionTime}s`);
    console.log(`   Status: ${backfillResult.status}`);
    console.log('');

    if (backfillResult.status === 'completed_with_errors') {
      console.log('⚠️  Warning: Backfill completed with some errors');
      console.log('   Check the database logs for details');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Backfill failed:');
    console.error(error);
    console.error('');
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Verify the backfill_daily_metrics function exists in the database');
    console.error('   2. Check that the collect_daily_metrics function is working');
    console.error('   3. Ensure the service role key has proper permissions');
    console.error('   4. Review database logs for detailed error messages');
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { startDate?: string; endDate?: string } {
  const args = process.argv.slice(2);
  const result: { startDate?: string; endDate?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start-date' && args[i + 1]) {
      result.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      result.endDate = args[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Analytics Metrics Backfill Script');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    // Parse command line arguments
    const args = parseArgs();

    // Get start date (from args or query database)
    const startDate = args.startDate || await getEarliestDate();

    // Get end date (from args or use current date)
    const endDate = args.endDate || new Date().toISOString().split('T')[0];

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      console.error('❌ Error: Start date cannot be after end date');
      process.exit(1);
    }

    // Run the backfill
    await runBackfill(startDate, endDate);

    console.log('✨ All done! Your analytics metrics are now up to date.');
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main();

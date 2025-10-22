/**
 * Apply Migration to Remote Supabase Database
 * 
 * This script applies the tracks-posts separation migration to the remote database.
 * It reads the migration SQL file and executes it using the Supabase service role key.
 * 
 * Usage: node scripts/database/apply-migration-remote.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from client/.env.local
const envPath = path.join(__dirname, '../../client/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in client/.env.local');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '../../supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Applying migration to remote database...');
console.log(`📁 Migration file: 20250122000000_prepare_tracks_posts_separation.sql`);
console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
console.log('');
console.log('⏳ Executing SQL migration...');

// Use Supabase client to execute the migration
async function applyMigration() {
  try {
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we need to use a different approach
      if (error.message.includes('function') || error.code === '42883') {
        console.log('⚠️  exec_sql function not available, using alternative method...');
        console.log('');
        console.log('📋 Manual Migration Required:');
        console.log('');
        console.log('Please follow these steps:');
        console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/' + SUPABASE_URL.split('//')[1].split('.')[0]);
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the migration SQL from:');
        console.log('   supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql');
        console.log('4. Click "Run" to execute the migration');
        console.log('');
        console.log('Or use the Supabase CLI:');
        console.log('   npm install -g supabase');
        console.log('   supabase link --project-ref ' + SUPABASE_URL.split('//')[1].split('.')[0]);
        console.log('   supabase db push');
        console.log('');
        process.exit(1);
      }
      throw error;
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Verify the migration with: node scripts/database/verify-migration-remote.js');
    console.log('   2. Check the tracks table has the new columns');
    console.log('   3. Mark task 1.1 as complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('');
    console.log('📋 Manual Migration Required:');
    console.log('');
    console.log('Please follow these steps:');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/' + SUPABASE_URL.split('//')[1].split('.')[0]);
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the migration SQL from:');
    console.log('   supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql');
    console.log('4. Click "Run" to execute the migration');
    console.log('');
    process.exit(1);
  }
}

applyMigration();

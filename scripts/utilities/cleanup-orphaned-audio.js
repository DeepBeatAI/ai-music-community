/**
 * Cleanup Orphaned Audio Files
 * 
 * This script identifies and deletes audio files in Supabase Storage
 * that are not referenced by any tracks in the database.
 * 
 * Usage:
 *   From project root: node scripts/utilities/cleanup-orphaned-audio.js [--dry-run] [--limit=N]
 *   From client dir:   node ../scripts/utilities/cleanup-orphaned-audio.js [--dry-run] [--limit=N]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --limit=N    Limit the number of files to delete (default: no limit)
 *   --help       Show this help message
 */

const path = require('path');
const fs = require('fs');

// Try to load @supabase/supabase-js from client/node_modules
let createClient;
try {
  // Try from current directory first
  createClient = require('@supabase/supabase-js').createClient;
} catch (err) {
  // Try from client/node_modules
  const clientModulePath = path.join(__dirname, '../../client/node_modules/@supabase/supabase-js');
  try {
    createClient = require(clientModulePath).createClient;
  } catch (err2) {
    console.error('❌ Error: Cannot find @supabase/supabase-js module');
    console.error('   Please run this script from the client directory:');
    console.error('   cd client && node ../scripts/utilities/cleanup-orphaned-audio.js');
    console.error('   Or ensure dependencies are installed: npm install');
    process.exit(1);
  }
}

// Load environment variables from client/.env.local if not already set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(__dirname, '../../client/.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'audio-files';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showHelp = args.includes('--help');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

if (showHelp) {
  console.log(`
Cleanup Orphaned Audio Files

This script identifies and deletes audio files in Supabase Storage
that are not referenced by any tracks in the database.

Usage:
  node scripts/utilities/cleanup-orphaned-audio.js [--dry-run] [--limit=N]

Options:
  --dry-run    Show what would be deleted without actually deleting
  --limit=N    Limit the number of files to delete (default: no limit)
  --help       Show this help message

Examples:
  # Preview what would be deleted
  node scripts/utilities/cleanup-orphaned-audio.js --dry-run

  # Delete up to 10 orphaned files
  node scripts/utilities/cleanup-orphaned-audio.js --limit=10

  # Delete all orphaned files
  node scripts/utilities/cleanup-orphaned-audio.js
  `);
  process.exit(0);
}

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Check your .env.local file in the client directory');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Find orphaned audio files
 */
async function findOrphanedFiles() {
  console.log('🔍 Searching for orphaned audio files...\n');

  // Query to find files not referenced by any tracks
  const { data: orphanedFiles, error } = await supabase.rpc('find_orphaned_audio_files');

  if (error) {
    // If the function doesn't exist, use a direct query approach
    console.log('⚠️  RPC function not found, using direct query...\n');
    return await findOrphanedFilesDirect();
  }

  return orphanedFiles;
}

/**
 * Direct query approach to find orphaned files
 */
async function findOrphanedFilesDirect() {
  // Get all audio files from storage
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (storageError) {
    throw new Error(`Failed to list storage files: ${storageError.message}`);
  }

  // Get all track file URLs
  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select('file_url');

  if (tracksError) {
    throw new Error(`Failed to fetch tracks: ${tracksError.message}`);
  }

  // Extract file names from track URLs
  const referencedFiles = new Set(
    tracks
      .map(t => {
        if (!t.file_url) return null;
        // Extract filename from URL
        const match = t.file_url.match(/audio-files\/(.+?)(\?|$)/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
  );

  // Find orphaned files
  const orphanedFiles = [];
  
  for (const file of storageFiles) {
    // Skip folders
    if (!file.name || file.name.endsWith('/')) continue;
    
    // Check if file is referenced
    const isReferenced = referencedFiles.has(file.name) || 
                        referencedFiles.has(decodeURIComponent(file.name));
    
    if (!isReferenced) {
      orphanedFiles.push({
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at
      });
    }
  }

  return orphanedFiles;
}

/**
 * Delete orphaned files
 */
async function deleteOrphanedFiles(files) {
  const filesToDelete = limit ? files.slice(0, limit) : files;
  const totalSize = filesToDelete.reduce((sum, f) => sum + (f.size || 0), 0);

  console.log(`\n📊 Summary:`);
  console.log(`   Files to delete: ${filesToDelete.length}`);
  console.log(`   Total size: ${formatBytes(totalSize)}`);
  console.log(`   Bucket: ${BUCKET_NAME}\n`);

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
    console.log('Files that would be deleted:');
    filesToDelete.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${formatBytes(file.size || 0)})`);
    });
    console.log(`\n✅ Dry run complete. Run without --dry-run to actually delete files.`);
    return;
  }

  // Confirm deletion
  console.log('⚠️  WARNING: This will permanently delete these files!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Deleting files...\n');

  let deletedCount = 0;
  let deletedSize = 0;
  let failedCount = 0;

  for (const file of filesToDelete) {
    try {
      const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([file.name]);

      if (error) {
        console.log(`   ❌ Failed to delete: ${file.name}`);
        console.log(`      Error: ${error.message}`);
        failedCount++;
      } else {
        console.log(`   ✅ Deleted: ${file.name} (${formatBytes(file.size || 0)})`);
        deletedCount++;
        deletedSize += file.size || 0;
      }
    } catch (err) {
      console.log(`   ❌ Error deleting ${file.name}: ${err.message}`);
      failedCount++;
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Successfully deleted: ${deletedCount} files (${formatBytes(deletedSize)})`);
  if (failedCount > 0) {
    console.log(`   Failed to delete: ${failedCount} files`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🧹 Supabase Storage Cleanup Tool\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'DELETE'}`);
    if (limit) {
      console.log(`Limit: ${limit} files`);
    }
    console.log('');

    const orphanedFiles = await findOrphanedFiles();

    if (!orphanedFiles || orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found! Your storage is clean.');
      return;
    }

    console.log(`Found ${orphanedFiles.length} orphaned files\n`);

    // Sort by size (largest first)
    orphanedFiles.sort((a, b) => (b.size || 0) - (a.size || 0));

    // Show top 10 largest files
    console.log('Top 10 largest orphaned files:');
    orphanedFiles.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`      Size: ${formatBytes(file.size || 0)}`);
      console.log(`      Created: ${new Date(file.created_at).toLocaleString()}`);
    });

    await deleteOrphanedFiles(orphanedFiles);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();

# Migration Testing Script (PowerShell)
# Description: Automated testing for tracks-posts separation migration
# Usage: .\scripts\database\test-migration.ps1

# Database connection string (local Supabase)
$DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"

# Log file
$LOG_FILE = "migration-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Function to print colored output
function Print-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
    Add-Content -Path $LOG_FILE -Value "[INFO] $Message"
}

function Print-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
    Add-Content -Path $LOG_FILE -Value "[SUCCESS] $Message"
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
    Add-Content -Path $LOG_FILE -Value "[WARNING] $Message"
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Add-Content -Path $LOG_FILE -Value "[ERROR] $Message"
}

# Function to run SQL query
function Run-Query {
    param([string]$Query)
    $result = & psql $DB_URL -t -c $Query 2>&1
    Add-Content -Path $LOG_FILE -Value $result
    return $result
}

# Function to check if count is zero
function Check-ZeroCount {
    param(
        [string]$Query,
        [string]$Description
    )
    $result = Run-Query -Query $Query
    $count = $result.Trim()
    
    if ($count -eq "0") {
        Print-Success "$Description`: PASS (count: 0)"
        return $true
    } else {
        Print-Error "$Description`: FAIL (count: $count)"
        return $false
    }
}

# Start testing
Print-Status "========================================="
Print-Status "Migration Testing Started"
Print-Status "Timestamp: $(Get-Date)"
Print-Status "Log file: $LOG_FILE"
Print-Status "========================================="

# Phase 1: Pre-Migration Baseline
Print-Status ""
Print-Status "Phase 1: Pre-Migration Baseline"
Print-Status "---------------------------------"

Print-Status "Collecting baseline counts..."

$AUDIO_POSTS = (Run-Query -Query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio';").Trim()
$EXISTING_TRACKS = (Run-Query -Query "SELECT COUNT(*) FROM public.tracks;").Trim()
$PLAYLIST_TRACKS = (Run-Query -Query "SELECT COUNT(*) FROM public.playlist_tracks;").Trim()

Print-Status "Audio posts: $AUDIO_POSTS"
Print-Status "Existing tracks: $EXISTING_TRACKS"
Print-Status "Playlist tracks: $PLAYLIST_TRACKS"

# Phase 2: Run Migration 002
Print-Status ""
Print-Status "Phase 2: Running Migration 002"
Print-Status "-------------------------------"

Print-Status "Applying migration 002..."
try {
    $output = & supabase migration up --file 20250122000002_migrate_audio_posts_to_tracks.sql 2>&1
    Add-Content -Path $LOG_FILE -Value $output
    Print-Success "Migration 002 applied successfully"
} catch {
    Print-Error "Migration 002 failed: $_"
    exit 1
}

# Verify Migration 002
Print-Status ""
Print-Status "Verifying Migration 002..."

$test1 = Check-ZeroCount `
    -Query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL;" `
    -Description "Orphaned audio posts check"

$test2 = Check-ZeroCount `
    -Query "SELECT COUNT(*) FROM public.tracks WHERE file_url IS NULL OR file_url = '';" `
    -Description "Tracks without file_url check"

$test3 = Check-ZeroCount `
    -Query "SELECT COUNT(*) FROM public.tracks WHERE user_id IS NULL;" `
    -Description "Tracks without user_id check"

# Phase 3: Run Migration 003
Print-Status ""
Print-Status "Phase 3: Running Migration 003"
Print-Status "-------------------------------"

Print-Status "Applying migration 003..."
try {
    $output = & supabase migration up --file 20250122000003_update_playlist_track_references.sql 2>&1
    Add-Content -Path $LOG_FILE -Value $output
    Print-Success "Migration 003 applied successfully"
} catch {
    Print-Error "Migration 003 failed: $_"
    exit 1
}

# Verify Migration 003
Print-Status ""
Print-Status "Verifying Migration 003..."

$test4 = Check-ZeroCount `
    -Query "SELECT COUNT(*) FROM public.playlist_tracks pt WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id);" `
    -Description "Invalid playlist references check"

# Phase 4: Comprehensive Verification
Print-Status ""
Print-Status "Phase 4: Comprehensive Verification"
Print-Status "------------------------------------"

Print-Status "Running verification queries..."
$verificationFile = "verification-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
& psql $DB_URL -f scripts/database/verify-tracks-posts-migration.sql > $verificationFile 2>&1

# Get final counts
$FINAL_AUDIO_POSTS = (Run-Query -Query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio';").Trim()
$FINAL_TRACKS = (Run-Query -Query "SELECT COUNT(*) FROM public.tracks;").Trim()
$POSTS_WITH_TRACKS = (Run-Query -Query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL;").Trim()
$FINAL_PLAYLIST_TRACKS = (Run-Query -Query "SELECT COUNT(*) FROM public.playlist_tracks;").Trim()

# Phase 5: Summary Report
Print-Status ""
Print-Status "========================================="
Print-Status "Migration Summary"
Print-Status "========================================="
Print-Status "Before Migration:"
Print-Status "  Audio posts: $AUDIO_POSTS"
Print-Status "  Existing tracks: $EXISTING_TRACKS"
Print-Status "  Playlist tracks: $PLAYLIST_TRACKS"
Print-Status ""
Print-Status "After Migration:"
Print-Status "  Audio posts: $FINAL_AUDIO_POSTS"
Print-Status "  Total tracks: $FINAL_TRACKS"
Print-Status "  Posts with tracks: $POSTS_WITH_TRACKS"
Print-Status "  Playlist tracks: $FINAL_PLAYLIST_TRACKS"
Print-Status ""

# Check migration success
if ($FINAL_AUDIO_POSTS -eq $POSTS_WITH_TRACKS) {
    Print-Success "All audio posts have track references"
    $migrationSuccess = $true
} else {
    Print-Error "Some audio posts missing track references"
    Print-Error "Audio posts: $FINAL_AUDIO_POSTS, Posts with tracks: $POSTS_WITH_TRACKS"
    $migrationSuccess = $false
}

# Final status
Print-Status ""
Print-Status "========================================="
if ($migrationSuccess) {
    Print-Success "MIGRATION TEST PASSED"
    Print-Status "========================================="
    exit 0
} else {
    Print-Error "MIGRATION TEST FAILED"
    Print-Status "========================================="
    Print-Status "Check log file for details: $LOG_FILE"
    exit 1
}

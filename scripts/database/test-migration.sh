#!/bin/bash

# Migration Testing Script
# Description: Automated testing for tracks-posts separation migration
# Usage: bash scripts/database/test-migration.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection string (local Supabase)
DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Log file
LOG_FILE="migration-test-$(date +%Y%m%d-%H%M%S).log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to run SQL query and capture result
run_query() {
    local query="$1"
    psql "$DB_URL" -t -c "$query" 2>&1 | tee -a "$LOG_FILE"
}

# Function to check if count is zero
check_zero_count() {
    local query="$1"
    local description="$2"
    local result=$(psql "$DB_URL" -t -c "$query" 2>&1)
    local count=$(echo "$result" | tr -d ' ')
    
    if [ "$count" = "0" ]; then
        print_success "$description: PASS (count: 0)"
        return 0
    else
        print_error "$description: FAIL (count: $count)"
        return 1
    fi
}

# Start testing
print_status "========================================="
print_status "Migration Testing Started"
print_status "Timestamp: $(date)"
print_status "Log file: $LOG_FILE"
print_status "========================================="

# Phase 1: Pre-Migration Baseline
print_status ""
print_status "Phase 1: Pre-Migration Baseline"
print_status "---------------------------------"

print_status "Collecting baseline counts..."

AUDIO_POSTS=$(run_query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio';")
EXISTING_TRACKS=$(run_query "SELECT COUNT(*) FROM public.tracks;")
PLAYLIST_TRACKS=$(run_query "SELECT COUNT(*) FROM public.playlist_tracks;")

print_status "Audio posts: $AUDIO_POSTS"
print_status "Existing tracks: $EXISTING_TRACKS"
print_status "Playlist tracks: $PLAYLIST_TRACKS"

# Phase 2: Run Migration 002
print_status ""
print_status "Phase 2: Running Migration 002"
print_status "-------------------------------"

print_status "Applying migration 002..."
if supabase migration up --file 20250122000002_migrate_audio_posts_to_tracks.sql 2>&1 | tee -a "$LOG_FILE"; then
    print_success "Migration 002 applied successfully"
else
    print_error "Migration 002 failed"
    exit 1
fi

# Verify Migration 002
print_status ""
print_status "Verifying Migration 002..."

check_zero_count \
    "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL;" \
    "Orphaned audio posts check"

check_zero_count \
    "SELECT COUNT(*) FROM public.tracks WHERE file_url IS NULL OR file_url = '';" \
    "Tracks without file_url check"

check_zero_count \
    "SELECT COUNT(*) FROM public.tracks WHERE user_id IS NULL;" \
    "Tracks without user_id check"

# Phase 3: Run Migration 003
print_status ""
print_status "Phase 3: Running Migration 003"
print_status "-------------------------------"

print_status "Applying migration 003..."
if supabase migration up --file 20250122000003_update_playlist_track_references.sql 2>&1 | tee -a "$LOG_FILE"; then
    print_success "Migration 003 applied successfully"
else
    print_error "Migration 003 failed"
    exit 1
fi

# Verify Migration 003
print_status ""
print_status "Verifying Migration 003..."

check_zero_count \
    "SELECT COUNT(*) FROM public.playlist_tracks pt WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id);" \
    "Invalid playlist references check"

# Phase 4: Comprehensive Verification
print_status ""
print_status "Phase 4: Comprehensive Verification"
print_status "------------------------------------"

print_status "Running verification queries..."
psql "$DB_URL" -f scripts/database/verify-tracks-posts-migration.sql > "verification-results-$(date +%Y%m%d-%H%M%S).txt" 2>&1

# Get final counts
FINAL_AUDIO_POSTS=$(run_query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio';")
FINAL_TRACKS=$(run_query "SELECT COUNT(*) FROM public.tracks;")
POSTS_WITH_TRACKS=$(run_query "SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL;")
FINAL_PLAYLIST_TRACKS=$(run_query "SELECT COUNT(*) FROM public.playlist_tracks;")

# Phase 5: Summary Report
print_status ""
print_status "========================================="
print_status "Migration Summary"
print_status "========================================="
print_status "Before Migration:"
print_status "  Audio posts: $AUDIO_POSTS"
print_status "  Existing tracks: $EXISTING_TRACKS"
print_status "  Playlist tracks: $PLAYLIST_TRACKS"
print_status ""
print_status "After Migration:"
print_status "  Audio posts: $FINAL_AUDIO_POSTS"
print_status "  Total tracks: $FINAL_TRACKS"
print_status "  Posts with tracks: $POSTS_WITH_TRACKS"
print_status "  Playlist tracks: $FINAL_PLAYLIST_TRACKS"
print_status ""

# Check migration success
if [ "$FINAL_AUDIO_POSTS" = "$POSTS_WITH_TRACKS" ]; then
    print_success "All audio posts have track references"
else
    print_error "Some audio posts missing track references"
    print_error "Audio posts: $FINAL_AUDIO_POSTS, Posts with tracks: $POSTS_WITH_TRACKS"
fi

# Final status
print_status ""
print_status "========================================="
if [ "$FINAL_AUDIO_POSTS" = "$POSTS_WITH_TRACKS" ]; then
    print_success "MIGRATION TEST PASSED"
    print_status "========================================="
    exit 0
else
    print_error "MIGRATION TEST FAILED"
    print_status "========================================="
    print_status "Check log file for details: $LOG_FILE"
    exit 1
fi

#!/bin/bash

# Script to run tracks-posts separation schema tests
# This script applies the migrations and runs the test suite

set -e

echo "============================================================"
echo "Tracks-Posts Separation Schema Tests"
echo "============================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g @supabase/cli"
    exit 1
fi

# Check if Supabase is running
if ! supabase status &> /dev/null; then
    echo "Error: Supabase is not running"
    echo "Start it with: supabase start"
    exit 1
fi

echo "Step 1: Applying migrations..."
echo "------------------------------------------------------------"
supabase db reset

echo ""
echo "Step 2: Running schema tests..."
echo "------------------------------------------------------------"
supabase db execute --file scripts/database/test-tracks-posts-separation-schema.sql

echo ""
echo "============================================================"
echo "Tests Complete!"
echo "============================================================"
echo ""
echo "Review the output above for test results."
echo "All tests should show PASS status."
echo ""

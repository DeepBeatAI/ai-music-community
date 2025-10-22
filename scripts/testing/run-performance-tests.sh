#!/bin/bash

# Performance Test Automation Runner
# Runs the automated performance test suite and generates reports

set -e

echo ""
echo "🚀 Performance Test Automation Runner"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if we're in the project root
if [ ! -f "client/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "client/.env.local" ]; then
    echo "⚠️  Warning: client/.env.local not found"
    echo "   Using default local Supabase configuration"
fi

# Load environment variables from .env.local if it exists
if [ -f "client/.env.local" ]; then
    echo "📄 Loading environment variables from client/.env.local"
    echo ""
    export $(cat client/.env.local | grep -v '^#' | xargs)
fi

# Check if Supabase is running (local)
echo "🔍 Checking Supabase connection..."
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-"http://127.0.0.1:54321"}

if curl -s -f -o /dev/null "$SUPABASE_URL/rest/v1/" --max-time 5; then
    echo "✅ Supabase is accessible at $SUPABASE_URL"
    echo ""
else
    echo "⚠️  Warning: Could not connect to Supabase at $SUPABASE_URL"
    echo "   Make sure Supabase is running (supabase start)"
    echo ""
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
cd client
if [ ! -d "node_modules/@supabase/supabase-js" ]; then
    echo "Installing dependencies..."
    npm install
fi
cd ..

echo "✅ Dependencies ready"
echo ""

# Run the performance tests
echo "🧪 Running performance tests..."
echo ""
echo "============================================================"

node scripts/testing/performance-test-automation.js

EXIT_CODE=$?

echo "============================================================"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Performance tests completed successfully!"
    echo ""
else
    echo "❌ Performance tests completed with failures"
    echo ""
fi

# Show where reports are saved
REPORT_DIR="docs/features/tracks-vs-posts-separation/testing"
if [ -d "$REPORT_DIR" ]; then
    echo "📊 Reports saved to: $REPORT_DIR"
    LATEST_REPORT=$(ls -t "$REPORT_DIR"/test-performance-report-*.md 2>/dev/null | head -n 1)
    if [ -n "$LATEST_REPORT" ]; then
        echo "   Latest report: $(basename "$LATEST_REPORT")"
        echo ""
    fi
fi

exit $EXIT_CODE

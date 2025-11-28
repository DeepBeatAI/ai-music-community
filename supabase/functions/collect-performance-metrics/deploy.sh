#!/bin/bash

# Performance Metrics Collection - Deployment Script
# This script deploys the Edge Function and sets up automatic collection

set -e

echo "🚀 Deploying Performance Metrics Collection..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Deploy the function
echo "📦 Deploying Edge Function..."
supabase functions deploy collect-performance-metrics

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the function manually (see DEPLOYMENT.md)"
echo "2. Set up cron schedule in Supabase Dashboard:"
echo "   - Go to Edge Functions > collect-performance-metrics"
echo "   - Add schedule: */1 * * * * (every minute)"
echo "   - Enable the schedule"
echo "3. Wait 2-3 minutes and check metrics in admin dashboard"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"

#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Run automated performance tests for tracks-vs-posts-separation feature
.DESCRIPTION
    This script runs the automated performance test suite and generates reports
.EXAMPLE
    .\run-performance-tests.ps1
#>

Write-Host "`n🚀 Performance Test Automation Runner`n" -ForegroundColor Cyan

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the project root
if (-not (Test-Path "client/package.json")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if .env.local exists
if (-not (Test-Path "client/.env.local")) {
    Write-Host "⚠️  Warning: client/.env.local not found" -ForegroundColor Yellow
    Write-Host "   Using default local Supabase configuration" -ForegroundColor Yellow
}

# Load environment variables from .env.local if it exists
if (Test-Path "client/.env.local") {
    Write-Host "📄 Loading environment variables from client/.env.local`n" -ForegroundColor Green
    Get-Content "client/.env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check if Supabase is running (local)
Write-Host "🔍 Checking Supabase connection..." -ForegroundColor Cyan
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
if (-not $supabaseUrl) {
    $supabaseUrl = "http://127.0.0.1:54321"
}

try {
    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Supabase is accessible at $supabaseUrl`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Could not connect to Supabase at $supabaseUrl" -ForegroundColor Yellow
    Write-Host "   Make sure Supabase is running (supabase start)`n" -ForegroundColor Yellow
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan
Push-Location client
if (-not (Test-Path "node_modules/@supabase/supabase-js")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Pop-Location

Write-Host "✅ Dependencies ready`n" -ForegroundColor Green

# Run the performance tests
Write-Host "🧪 Running performance tests...`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

node scripts/testing/performance-test-automation.js

$exitCode = $LASTEXITCODE

Write-Host "`n" + "=" * 60 -ForegroundColor Gray

if ($exitCode -eq 0) {
    Write-Host "`n✅ Performance tests completed successfully!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Performance tests completed with failures`n" -ForegroundColor Red
}

# Show where reports are saved
$reportDir = "docs/features/tracks-vs-posts-separation/testing"
if (Test-Path $reportDir) {
    Write-Host "📊 Reports saved to: $reportDir" -ForegroundColor Cyan
    $latestReport = Get-ChildItem $reportDir -Filter "test-performance-report-*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestReport) {
        Write-Host "   Latest report: $($latestReport.Name)`n" -ForegroundColor Cyan
    }
}

exit $exitCode

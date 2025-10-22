@echo off
REM Script to run tracks-posts separation schema tests
REM This script applies the migrations and runs the test suite

echo ============================================================
echo Tracks-Posts Separation Schema Tests
echo ============================================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase CLI is not installed
    echo Install it with: npm install -g @supabase/cli
    exit /b 1
)

REM Check if Supabase is running
supabase status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase is not running
    echo Start it with: supabase start
    exit /b 1
)

echo Step 1: Applying migrations...
echo ------------------------------------------------------------
supabase db reset

echo.
echo Step 2: Running schema tests...
echo ------------------------------------------------------------
supabase db execute --file scripts/database/test-tracks-posts-separation-schema.sql

echo.
echo ============================================================
echo Tests Complete!
echo ============================================================
echo.
echo Review the output above for test results.
echo All tests should show PASS status.
echo.

pause

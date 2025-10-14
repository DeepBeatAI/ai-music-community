#!/bin/bash
# File Organization Script
# Automatically moves non-code files to their correct locations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking for misplaced non-code files...${NC}"

MOVED_COUNT=0
ISSUES_FOUND=0

# Function to move file and report
move_file() {
    local source=$1
    local dest=$2
    local reason=$3
    
    if [ -f "$source" ]; then
        echo -e "${YELLOW}📦 Moving: $source → $dest${NC}"
        echo -e "   Reason: $reason"
        
        # Create destination directory if it doesn't exist
        mkdir -p "$(dirname "$dest")"
        
        # Move the file
        mv "$source" "$dest"
        
        MOVED_COUNT=$((MOVED_COUNT + 1))
        return 0
    fi
    return 1
}

# Check root directory for misplaced files
echo -e "\n${BLUE}Checking root directory...${NC}"

# Documentation files
for file in *.md; do
    # Skip essential files
    if [[ "$file" == "README.md" || "$file" == "CHANGELOG.md" ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        
        # Determine destination based on filename
        case "$file" in
            *test*|*TEST*)
                move_file "$file" "docs/testing/guides/${file,,}" "Test documentation"
                ;;
            *migration*|*MIGRATION*)
                move_file "$file" "docs/migrations/${file,,}" "Migration documentation"
                ;;
            *security*|*SECURITY*)
                move_file "$file" "docs/security/${file,,}" "Security documentation"
                ;;
            *task*|*TASK*)
                move_file "$file" "docs/tasks/${file,,}" "Task documentation"
                ;;
            *review*|*REVIEW*)
                move_file "$file" "docs/reviews/${file,,}" "Review documentation"
                ;;
            *)
                move_file "$file" "docs/migrations/${file,,}" "General documentation"
                ;;
        esac
    fi
done

# HTML test files in root
for file in *.html; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "tests/html/${file,,}" "HTML test file"
    fi
done

# Script files in root
for file in *.sh *.bat *.ps1; do
    # Skip this script itself
    if [[ "$file" == "organize-files.sh" ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        
        case "$file" in
            *test*|*TEST*)
                move_file "$file" "scripts/testing/${file,,}" "Test script"
                ;;
            *deploy*|*DEPLOY*)
                move_file "$file" "scripts/deployment/${file,,}" "Deployment script"
                ;;
            *)
                move_file "$file" "scripts/utilities/${file,,}" "Utility script"
                ;;
        esac
    fi
done

# SQL files in root
for file in *.sql; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "scripts/database/${file,,}" "Database script"
    fi
done

# Check client directory for misplaced files
echo -e "\n${BLUE}Checking client directory...${NC}"

# Documentation files in client/
for file in client/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        # Skip essential files
        if [[ "$filename" == "README.md" ]]; then
            continue
        fi
        
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        
        case "$filename" in
            *test*|*TEST*|*verification*|*VERIFICATION*)
                move_file "$file" "docs/testing/test-results/${filename,,}" "Test result documentation"
                ;;
            *guide*|*GUIDE*)
                move_file "$file" "docs/testing/guides/${filename,,}" "Test guide"
                ;;
            *quality*|*QUALITY*)
                move_file "$file" "docs/reviews/${filename,,}" "Code quality documentation"
                ;;
            *task*|*TASK*)
                move_file "$file" "docs/tasks/${filename,,}" "Task documentation"
                ;;
            *)
                move_file "$file" "docs/features/${filename,,}" "Feature documentation"
                ;;
        esac
    fi
done

# HTML files in client/
for file in client/*.html; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "tests/html/$(basename "$file")" "HTML test file"
    fi
done

# Report files in client/ (only .report.html files)
for file in client/*.report.html; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "tests/reports/$(basename "$file")" "Test report"
    fi
done

# Only move JSON files that are clearly test reports (eslint-report.json, etc.)
for file in client/*-report.json; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "tests/reports/$(basename "$file")" "Test report"
    fi
done

# Scripts in client/
for file in client/*.sh client/*.bat client/*.ps1; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        filename=$(basename "$file")
        
        case "$filename" in
            *test*|*TEST*)
                move_file "$file" "scripts/testing/$filename" "Test script"
                ;;
            *deploy*|*DEPLOY*|*install*|*INSTALL*)
                move_file "$file" "scripts/deployment/$filename" "Deployment script"
                ;;
            *)
                move_file "$file" "scripts/utilities/$filename" "Utility script"
                ;;
        esac
    fi
done

# SQL files in client/
for file in client/*.sql; do
    if [ -f "$file" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "scripts/database/$(basename "$file")" "Database script"
    fi
done

# JavaScript test files in client/ (only files with "test" in name)
for file in client/*test*.js; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        # Skip config files
        if [[ "$filename" == *"config"* ]]; then
            continue
        fi
        
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        move_file "$file" "tests/scripts/$filename" "Test script"
    fi
done

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $MOVED_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ All files are in the correct locations!${NC}"
else
    echo -e "${GREEN}✅ Organized $MOVED_COUNT file(s)${NC}"
    echo -e "${YELLOW}⚠️  Please review the changes and commit them.${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit 0

#!/bin/bash
# File Organization Script - Hybrid Feature-First Structure
# Automatically moves non-code files to their correct locations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}>> Checking for misplaced non-code files...${NC}"

MOVED_COUNT=0

# Protected files that should never be moved
PROTECTED_FILES=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "next.config.ts"
    "next.config.js"
    "tailwind.config.js"
    "tailwind.config.ts"
    "postcss.config.js"
    "postcss.config.mjs"
    "jest.config.js"
    "jest.setup.js"
    "eslint.config.mjs"
    ".eslintrc.json"
    ".prettierrc"
    "vercel.json"
    ".env"
    ".env.local"
    ".env.production"
    ".gitignore"
    ".gitattributes"
    "README.md"
    "CHANGELOG.md"
)

# Function to check if file is protected
is_protected() {
    local filename=$(basename "$1")
    for protected in "${PROTECTED_FILES[@]}"; do
        if [[ "$filename" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to move file and report
move_file() {
    local source=$1
    local dest=$2
    local reason=$3
    
    if [ -f "$source" ]; then
        # Check if file is protected
        if is_protected "$source"; then
            echo -e "${RED}[PROTECTED] Skipping: $source${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}Moving: $source${NC}"
        echo -e "${GREEN}     -> $dest${NC}"
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

# Function to determine feature from filename
get_feature_from_filename() {
    local filename=$1
    
    # Check for feature keywords in filename
    if [[ "$filename" == *"analytics"* || "$filename" == *"metric"* ]]; then
        echo "analytics"
    elif [[ "$filename" == *"comment"* || "$filename" == *"reply"* ]]; then
        echo "comments"
    elif [[ "$filename" == *"load-more"* || "$filename" == *"pagination"* ]]; then
        echo "load-more"
    elif [[ "$filename" == *"social"* || "$filename" == *"follow"* || "$filename" == *"like"* ]]; then
        echo "social"
    elif [[ "$filename" == *"auth"* || "$filename" == *"login"* || "$filename" == *"signup"* ]]; then
        echo "auth"
    else
        echo "project"
    fi
}

# Function to determine document type from filename
get_doc_type() {
    local filename=$1
    
    if [[ "$filename" == *"guide"* ]]; then
        echo "guides"
    elif [[ "$filename" == *"task"* ]]; then
        echo "tasks"
    elif [[ "$filename" == *"test"* || "$filename" == *"validation"* || "$filename" == *"verification"* ]]; then
        echo "testing"
    elif [[ "$filename" == *"review"* ]]; then
        echo "reviews"
    elif [[ "$filename" == *"security"* || "$filename" == *"audit"* ]]; then
        echo "security"
    elif [[ "$filename" == *"migration"* ]]; then
        echo "migrations"
    elif [[ "$filename" == *"spec"* || "$filename" == *"design"* || "$filename" == *"requirement"* ]]; then
        echo "specs"
    else
        echo "notes"
    fi
}

# Check root directory for misplaced files
echo -e "\n${BLUE}Checking root directory...${NC}"

# Documentation files in root
for file in *.md; do
    # Skip if no files match
    [ -e "$file" ] || continue
    
    # Skip essential files
    if [[ "$file" == "README.md" || "$file" == "CHANGELOG.md" ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        feature=$(get_feature_from_filename "$file")
        doc_type=$(get_doc_type "$file")
        
        if [[ "$feature" == "project" ]]; then
            # Project-wide documentation
            move_file "$file" "docs/project/${doc_type}/${file,,}" "Project documentation"
        else
            # Feature-specific documentation
            move_file "$file" "docs/features/${feature}/${doc_type}/${file,,}" "Feature documentation"
        fi
    fi
done

# HTML test files in root
for file in *.html; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        move_file "$file" "tests/html/${file,,}" "HTML test file"
    fi
done

# Script files in root
for file in *.sh *.bat *.ps1; do
    [ -e "$file" ] || continue
    
    # Skip this script itself
    if [[ "$file" == "organize-files-hybrid.sh" || "$file" == "organize-files.sh" ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        if [[ "$file" == *"test"* ]]; then
            move_file "$file" "scripts/testing/${file,,}" "Test script"
        elif [[ "$file" == *"deploy"* ]]; then
            move_file "$file" "scripts/deployment/${file,,}" "Deployment script"
        else
            move_file "$file" "scripts/utilities/${file,,}" "Utility script"
        fi
    fi
done

# SQL files in root
for file in *.sql; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        move_file "$file" "scripts/database/${file,,}" "Database script"
    fi
done

# Check client directory for misplaced files
echo -e "\n${BLUE}Checking client directory...${NC}"

# Documentation files in client/
for file in client/*.md; do
    [ -e "$file" ] || continue
    
    filename=$(basename "$file")
    
    # Skip essential files
    if [[ "$filename" == "README.md" ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        feature=$(get_feature_from_filename "$filename")
        doc_type=$(get_doc_type "$filename")
        
        if [[ "$feature" == "project" ]]; then
            move_file "$file" "docs/project/${doc_type}/${filename,,}" "Project documentation"
        else
            move_file "$file" "docs/features/${feature}/${doc_type}/${filename,,}" "Feature documentation"
        fi
    fi
done

# HTML files in client/
for file in client/*.html; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        move_file "$file" "tests/html/$(basename "$file")" "HTML test file"
    fi
done

# Report files in client/
for file in client/*.report.html client/*-report.json; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        move_file "$file" "tests/reports/$(basename "$file")" "Test report"
    fi
done

# Scripts in client/
for file in client/*.sh client/*.bat client/*.ps1; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        if [[ "$filename" == *"test"* ]]; then
            move_file "$file" "scripts/testing/$filename" "Test script"
        elif [[ "$filename" == *"deploy"* || "$filename" == *"install"* ]]; then
            move_file "$file" "scripts/deployment/$filename" "Deployment script"
        else
            move_file "$file" "scripts/utilities/$filename" "Utility script"
        fi
    fi
done

# SQL files in client/
for file in client/*.sql; do
    [ -e "$file" ] || continue
    
    if [ -f "$file" ]; then
        move_file "$file" "scripts/database/$(basename "$file")" "Database script"
    fi
done

# JavaScript test files in client/
for file in client/*test*.js; do
    [ -e "$file" ] || continue
    
    filename=$(basename "$file")
    
    # Skip config files
    if [[ "$filename" == *"config"* ]]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        move_file "$file" "tests/scripts/$filename" "Test script"
    fi
done

# Check docs/features root for misplaced files
echo -e "\n${BLUE}Checking docs/features directory...${NC}"

for file in docs/features/*.md; do
    [ -e "$file" ] || continue
    
    filename=$(basename "$file")
    
    if [ -f "$file" ]; then
        feature=$(get_feature_from_filename "$filename")
        doc_type=$(get_doc_type "$filename")
        
        if [[ "$feature" == "project" ]]; then
            move_file "$file" "docs/project/${doc_type}/${filename,,}" "Project documentation"
        else
            move_file "$file" "docs/features/${feature}/${doc_type}/${filename,,}" "Feature documentation"
        fi
    fi
done

# Check for files in feature root directories (should be in subdirectories)
for feature_dir in docs/features/*/; do
    [ -d "$feature_dir" ] || continue
    
    feature_name=$(basename "$feature_dir")
    
    for file in "${feature_dir}"*.md; do
        [ -e "$file" ] || continue
        
        filename=$(basename "$file")
        
        # Skip README.md files (they belong in feature root)
        if [[ "$filename" == "README.md" ]]; then
            continue
        fi
        
        if [ -f "$file" ]; then
            doc_type=$(get_doc_type "$filename")
            move_file "$file" "${feature_dir}${doc_type}/${filename,,}" "Feature documentation organization"
        fi
    done
done

# Summary
echo -e "\n${BLUE}========================================${NC}"
if [ $MOVED_COUNT -eq 0 ]; then
    echo -e "${GREEN}[OK] All files are in the correct locations!${NC}"
else
    echo -e "${GREEN}[OK] Organized $MOVED_COUNT file(s)${NC}"
    echo -e "${YELLOW}[!] Please review the changes and commit them.${NC}"
fi
echo -e "${BLUE}========================================${NC}"

exit 0

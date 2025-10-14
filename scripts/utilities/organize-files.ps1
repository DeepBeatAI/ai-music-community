# File Organization Script - Hybrid Feature-First Structure (PowerShell)
# Automatically moves non-code files to their correct locations

Write-Host ">> Checking for misplaced non-code files..." -ForegroundColor Blue

$movedCount = 0

# Protected files that should never be moved
$protectedFiles = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "next.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    "jest.config.js",
    "jest.setup.js",
    "eslint.config.mjs",
    ".eslintrc.json",
    ".prettierrc",
    "vercel.json",
    ".env",
    ".env.local",
    ".env.production",
    ".gitignore",
    ".gitattributes",
    "README.md",
    "CHANGELOG.md"
)

# Function to check if file is protected
function Test-ProtectedFile {
    param([string]$FilePath)
    
    $filename = Split-Path -Leaf $FilePath
    return $protectedFiles -contains $filename
}

# Function to determine feature from filename
function Get-FeatureFromFilename {
    param([string]$Filename)
    
    $lower = $Filename.ToLower()
    
    if ($lower -match "analytics|metric") { return "analytics" }
    elseif ($lower -match "comment|reply") { return "comments" }
    elseif ($lower -match "load-more|pagination") { return "load-more" }
    elseif ($lower -match "social|follow|like") { return "social" }
    elseif ($lower -match "auth|login|signup") { return "auth" }
    else { return "project" }
}

# Function to determine document type from filename
function Get-DocType {
    param([string]$Filename)
    
    $lower = $Filename.ToLower()
    
    if ($lower -match "guide") { return "guides" }
    elseif ($lower -match "task") { return "tasks" }
    elseif ($lower -match "test|validation|verification") { return "testing" }
    elseif ($lower -match "review") { return "reviews" }
    elseif ($lower -match "security|audit") { return "security" }
    elseif ($lower -match "migration") { return "migrations" }
    elseif ($lower -match "spec|design|requirement") { return "specs" }
    else { return "notes" }
}

# Function to move file and report
function Move-FileToCorrectLocation {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Reason
    )
    
    if (Test-Path $Source) {
        # Check if file is protected
        if (Test-ProtectedFile $Source) {
            Write-Host "[PROTECTED] Skipping: $Source" -ForegroundColor Red
            return $false
        }
        
        Write-Host "Moving: $Source" -ForegroundColor Yellow
        Write-Host "     -> $Destination" -ForegroundColor Green
        Write-Host "   Reason: $Reason" -ForegroundColor Gray
        
        # Create destination directory if it doesn't exist
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Move the file
        Move-Item -Path $Source -Destination $Destination -Force
        
        $script:movedCount++
        return $true
    }
    return $false
}

# Check root directory for misplaced files
Write-Host "`n[Checking root directory]" -ForegroundColor Blue

# Documentation files in root
Get-ChildItem -Path "." -Filter "*.md" -File | Where-Object {
    $_.Name -ne "README.md" -and $_.Name -ne "CHANGELOG.md"
} | ForEach-Object {
    $filename = $_.Name.ToLower()
    $feature = Get-FeatureFromFilename $filename
    $docType = Get-DocType $filename
    
    if ($feature -eq "project") {
        Move-FileToCorrectLocation $_.FullName "docs/project/$docType/$filename" "Project documentation"
    } else {
        Move-FileToCorrectLocation $_.FullName "docs/features/$feature/$docType/$filename" "Feature documentation"
    }
}

# HTML test files in root
Get-ChildItem -Path "." -Filter "*.html" -File | ForEach-Object {
    Move-FileToCorrectLocation $_.FullName "tests/html/$($_.Name.ToLower())" "HTML test file"
}

# Script files in root
Get-ChildItem -Path "." -Include "*.sh","*.bat","*.ps1" -File | Where-Object {
    $_.Name -ne "organize-files-hybrid.sh" -and 
    $_.Name -ne "organize-files-hybrid.ps1" -and
    $_.Name -ne "organize-files.sh" -and 
    $_.Name -ne "organize-files.ps1"
} | ForEach-Object {
    $filename = $_.Name.ToLower()
    
    if ($filename -match "test") {
        Move-FileToCorrectLocation $_.FullName "scripts/testing/$($_.Name)" "Test script"
    } elseif ($filename -match "deploy") {
        Move-FileToCorrectLocation $_.FullName "scripts/deployment/$($_.Name)" "Deployment script"
    } else {
        Move-FileToCorrectLocation $_.FullName "scripts/utilities/$($_.Name)" "Utility script"
    }
}

# SQL files in root
Get-ChildItem -Path "." -Filter "*.sql" -File | ForEach-Object {
    Move-FileToCorrectLocation $_.FullName "scripts/database/$($_.Name.ToLower())" "Database script"
}

# Check client directory for misplaced files
Write-Host "`n[Checking client directory]" -ForegroundColor Blue

if (Test-Path "client") {
    # Documentation files in client/
    Get-ChildItem -Path "client" -Filter "*.md" -File | Where-Object {
        $_.Name -ne "README.md"
    } | ForEach-Object {
        $filename = $_.Name.ToLower()
        $feature = Get-FeatureFromFilename $filename
        $docType = Get-DocType $filename
        
        if ($feature -eq "project") {
            Move-FileToCorrectLocation $_.FullName "docs/project/$docType/$filename" "Project documentation"
        } else {
            Move-FileToCorrectLocation $_.FullName "docs/features/$feature/$docType/$filename" "Feature documentation"
        }
    }
    
    # HTML files in client/
    Get-ChildItem -Path "client" -Filter "*.html" -File | ForEach-Object {
        Move-FileToCorrectLocation $_.FullName "tests/html/$($_.Name)" "HTML test file"
    }
    
    # Report files in client/
    Get-ChildItem -Path "client" -Filter "*.report.html" -File | ForEach-Object {
        Move-FileToCorrectLocation $_.FullName "tests/reports/$($_.Name)" "Test report"
    }
    
    Get-ChildItem -Path "client" -Filter "*-report.json" -File | ForEach-Object {
        Move-FileToCorrectLocation $_.FullName "tests/reports/$($_.Name)" "Test report"
    }
    
    # Scripts in client/
    Get-ChildItem -Path "client" -Include "*.sh","*.bat","*.ps1" -File | ForEach-Object {
        $filename = $_.Name.ToLower()
        
        if ($filename -match "test") {
            Move-FileToCorrectLocation $_.FullName "scripts/testing/$($_.Name)" "Test script"
        } elseif ($filename -match "deploy|install") {
            Move-FileToCorrectLocation $_.FullName "scripts/deployment/$($_.Name)" "Deployment script"
        } else {
            Move-FileToCorrectLocation $_.FullName "scripts/utilities/$($_.Name)" "Utility script"
        }
    }
    
    # SQL files in client/
    Get-ChildItem -Path "client" -Filter "*.sql" -File | ForEach-Object {
        Move-FileToCorrectLocation $_.FullName "scripts/database/$($_.Name)" "Database script"
    }
    
    # JavaScript test files in client/
    Get-ChildItem -Path "client" -Filter "*test*.js" -File | Where-Object {
        $_.Name -notlike "*config*"
    } | ForEach-Object {
        Move-FileToCorrectLocation $_.FullName "tests/scripts/$($_.Name)" "Test script"
    }
}

# Check docs/features root for misplaced files
Write-Host "`n[Checking docs/features directory]" -ForegroundColor Blue

if (Test-Path "docs/features") {
    Get-ChildItem -Path "docs/features" -Filter "*.md" -File | ForEach-Object {
        $filename = $_.Name.ToLower()
        $feature = Get-FeatureFromFilename $filename
        $docType = Get-DocType $filename
        
        if ($feature -eq "project") {
            Move-FileToCorrectLocation $_.FullName "docs/project/$docType/$filename" "Project documentation"
        } else {
            Move-FileToCorrectLocation $_.FullName "docs/features/$feature/$docType/$filename" "Feature documentation"
        }
    }
    
    # Check for files in feature root directories (should be in subdirectories)
    Get-ChildItem -Path "docs/features" -Directory | ForEach-Object {
        $featureDir = $_.FullName
        $featureName = $_.Name
        
        Get-ChildItem -Path $featureDir -Filter "*.md" -File | Where-Object {
            $_.Name -ne "README.md"
        } | ForEach-Object {
            $filename = $_.Name.ToLower()
            $docType = Get-DocType $filename
            Move-FileToCorrectLocation $_.FullName "$featureDir\$docType\$filename" "Feature documentation organization"
        }
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Blue
if ($movedCount -eq 0) {
    Write-Host "[OK] All files are in the correct locations!" -ForegroundColor Green
} else {
    Write-Host "[OK] Organized $movedCount file(s)" -ForegroundColor Green
    Write-Host "[!] Please review the changes and commit them." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Blue

exit 0

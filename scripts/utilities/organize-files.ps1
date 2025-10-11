# File Organization Script (PowerShell)
# Automatically moves non-code files to their correct locations

Write-Host "🔍 Checking for misplaced non-code files..." -ForegroundColor Blue

$movedCount = 0
$issuesFound = 0

# Function to move file and report
function Move-FileToCorrectLocation {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Reason
    )
    
    if (Test-Path $Source) {
        Write-Host "📦 Moving: $Source → $Destination" -ForegroundColor Yellow
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
Write-Host "`nChecking root directory..." -ForegroundColor Blue

# Documentation files
Get-ChildItem -Path "." -Filter "*.md" -File | Where-Object {
    $_.Name -ne "README.md" -and $_.Name -ne "CHANGELOG.md"
} | ForEach-Object {
    $issuesFound++
    $filename = $_.Name.ToLower()
    
    switch -Regex ($filename) {
        "test" {
            Move-FileToCorrectLocation $_.FullName "docs/testing/guides/$filename" "Test documentation"
        }
        "migration" {
            Move-FileToCorrectLocation $_.FullName "docs/migrations/$filename" "Migration documentation"
        }
        "security" {
            Move-FileToCorrectLocation $_.FullName "docs/security/$filename" "Security documentation"
        }
        "task" {
            Move-FileToCorrectLocation $_.FullName "docs/tasks/$filename" "Task documentation"
        }
        "review" {
            Move-FileToCorrectLocation $_.FullName "docs/reviews/$filename" "Review documentation"
        }
        default {
            Move-FileToCorrectLocation $_.FullName "docs/migrations/$filename" "General documentation"
        }
    }
}

# HTML test files in root
Get-ChildItem -Path "." -Filter "*.html" -File | ForEach-Object {
    $issuesFound++
    Move-FileToCorrectLocation $_.FullName "tests/html/$($_.Name.ToLower())" "HTML test file"
}

# Script files in root
Get-ChildItem -Path "." -Include "*.sh","*.bat","*.ps1" -File | Where-Object {
    $_.Name -ne "organize-files.sh" -and $_.Name -ne "organize-files.ps1"
} | ForEach-Object {
    $issuesFound++
    $filename = $_.Name.ToLower()
    
    switch -Regex ($filename) {
        "test" {
            Move-FileToCorrectLocation $_.FullName "scripts/testing/$filename" "Test script"
        }
        "deploy" {
            Move-FileToCorrectLocation $_.FullName "scripts/deployment/$filename" "Deployment script"
        }
        default {
            Move-FileToCorrectLocation $_.FullName "scripts/utilities/$filename" "Utility script"
        }
    }
}

# SQL files in root
Get-ChildItem -Path "." -Filter "*.sql" -File | ForEach-Object {
    $issuesFound++
    Move-FileToCorrectLocation $_.FullName "scripts/database/$($_.Name.ToLower())" "Database script"
}

# Check client directory for misplaced files
Write-Host "`nChecking client directory..." -ForegroundColor Blue

if (Test-Path "client") {
    # Documentation files in client/
    Get-ChildItem -Path "client" -Filter "*.md" -File | Where-Object {
        $_.Name -ne "README.md"
    } | ForEach-Object {
        $issuesFound++
        $filename = $_.Name.ToLower()
        
        switch -Regex ($filename) {
            "test|verification" {
                Move-FileToCorrectLocation $_.FullName "docs/testing/test-results/$filename" "Test result documentation"
            }
            "guide" {
                Move-FileToCorrectLocation $_.FullName "docs/testing/guides/$filename" "Test guide"
            }
            "quality" {
                Move-FileToCorrectLocation $_.FullName "docs/reviews/$filename" "Code quality documentation"
            }
            "task" {
                Move-FileToCorrectLocation $_.FullName "docs/tasks/$filename" "Task documentation"
            }
            default {
                Move-FileToCorrectLocation $_.FullName "docs/features/$filename" "Feature documentation"
            }
        }
    }
    
    # HTML files in client/
    Get-ChildItem -Path "client" -Filter "*.html" -File | ForEach-Object {
        $issuesFound++
        Move-FileToCorrectLocation $_.FullName "tests/html/$($_.Name)" "HTML test file"
    }
    
    # Report files in client/ (only .report.html and specific test reports)
    Get-ChildItem -Path "client" -Filter "*.report.html" -File | ForEach-Object {
        $issuesFound++
        Move-FileToCorrectLocation $_.FullName "tests/reports/$($_.Name)" "Test report"
    }
    
    # Only move JSON files that are clearly test reports (eslint-report.json, etc.)
    Get-ChildItem -Path "client" -Filter "*-report.json" -File | ForEach-Object {
        $issuesFound++
        Move-FileToCorrectLocation $_.FullName "tests/reports/$($_.Name)" "Test report"
    }
    
    # Scripts in client/
    Get-ChildItem -Path "client" -Include "*.sh","*.bat","*.ps1" -File | ForEach-Object {
        $issuesFound++
        $filename = $_.Name.ToLower()
        
        switch -Regex ($filename) {
            "test" {
                Move-FileToCorrectLocation $_.FullName "scripts/testing/$($_.Name)" "Test script"
            }
            "deploy|install" {
                Move-FileToCorrectLocation $_.FullName "scripts/deployment/$($_.Name)" "Deployment script"
            }
            default {
                Move-FileToCorrectLocation $_.FullName "scripts/utilities/$($_.Name)" "Utility script"
            }
        }
    }
    
    # SQL files in client/
    Get-ChildItem -Path "client" -Filter "*.sql" -File | ForEach-Object {
        $issuesFound++
        Move-FileToCorrectLocation $_.FullName "scripts/database/$($_.Name)" "Database script"
    }
    
    # JavaScript test files in client/ (only files with "test" in name)
    Get-ChildItem -Path "client" -Filter "*test*.js" -File | Where-Object {
        $_.Name -ne "next.config.js" -and 
        $_.Name -ne "jest.config.js" -and 
        $_.Name -ne "jest.setup.js" -and
        $_.Name -notlike "*config*"
    } | ForEach-Object {
        $issuesFound++
        Move-FileToCorrectLocation $_.FullName "tests/scripts/$($_.Name)" "Test script"
    }
}

# Summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
if ($movedCount -eq 0) {
    Write-Host "✅ All files are in the correct locations!" -ForegroundColor Green
} else {
    Write-Host "✅ Organized $movedCount file(s)" -ForegroundColor Green
    Write-Host "⚠️  Please review the changes and commit them." -ForegroundColor Yellow
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

exit 0

# File Organization Enforcement - How It Works

## Overview

The file organization system ensures all documentation follows the hybrid feature-first structure with consistent naming conventions. This is enforced through multiple layers.

---

## Enforcement Layers

### 1. Kiro AI Steering File ✅

**File:** `.kiro/steering/file-organization.md`

**What it does:**
- Guides Kiro AI to always follow the naming convention
- Instructs Kiro to create files in correct locations
- Prevents Kiro from using ALL CAPS filenames
- Provides examples and rules for every file creation

**Status:** Active (always included in Kiro's context)

### 2. Pre-Commit Hook ✅

**File:** `.husky/pre-commit`

**What it does:**
- Runs automatically before every git commit
- Checks for misplaced files
- Moves files to correct locations
- Applies proper naming conventions
- Protects config files from being moved

**Status:** Active (runs on every commit)

### 3. Organization Scripts ✅

**Files:**
- `scripts/utilities/organize-files.sh` (Bash)
- `scripts/utilities/organize-files.ps1` (PowerShell)

**What they do:**
- Can be run manually anytime
- Detect feature from filename keywords
- Detect document type from filename
- Move files to correct locations
- Apply naming conventions
- Protect config files

**Status:** Active (can be run manually)

### 4. Structure Steering File ✅

**File:** `.kiro/steering/structure.md`

**What it does:**
- References the file organization standards
- Provides quick rules for documentation naming
- Guides overall project structure

**Status:** Active (always included in Kiro's context)

---

## How It Prevents Issues

### Issue: ALL CAPS Filenames

**Prevention:**
1. Kiro steering file explicitly forbids ALL CAPS
2. Pre-commit hook converts to lowercase
3. Organization scripts convert to lowercase

**Example:**
```
Created: DEPLOYMENT_GUIDE.md
On commit: → guide-deployment.md
```

### Issue: Files in Wrong Location

**Prevention:**
1. Kiro steering file provides correct paths
2. Pre-commit hook detects and moves files
3. Organization scripts can fix manually

**Example:**
```
Created: docs/analytics-guide.md
On commit: → docs/features/analytics/guides/guide-analytics.md
```

### Issue: Wrong Naming Format

**Prevention:**
1. Kiro steering file enforces [type]-[descriptor].md format
2. Scripts detect type from filename
3. Files are renamed to match convention

**Example:**
```
Created: deployment_guide.md
On commit: → guide-deployment.md
```

### Issue: Files in Feature Root

**Prevention:**
1. Scripts check feature root directories
2. Move files to appropriate subdirectories
3. Keep only README.md in feature root

**Example:**
```
Created: docs/features/analytics/deployment.md
On commit: → docs/features/analytics/guides/guide-deployment.md
```

---

## What Happens When You Create a File

### Scenario 1: Kiro Creates a File

1. Kiro reads steering file
2. Kiro follows naming convention
3. Kiro creates file in correct location
4. File is already correct ✅

### Scenario 2: You Create a File Manually (Wrong Location)

1. You create: `analytics-guide.md` in root
2. You run: `git add .`
3. You run: `git commit -m "message"`
4. Pre-commit hook runs
5. File is moved to: `docs/features/analytics/guides/guide-analytics.md`
6. File is added to commit automatically
7. Commit completes ✅

### Scenario 3: You Create a File Manually (Wrong Name)

1. You create: `docs/features/analytics/DEPLOYMENT_GUIDE.md`
2. You run: `git commit -m "message"`
3. Pre-commit hook runs
4. File is moved to: `docs/features/analytics/guides/guide-deployment.md`
5. File is renamed to lowercase
6. Commit completes ✅

---

## Manual Organization

If you want to organize files without committing:

**Bash:**
```bash
bash scripts/utilities/organize-files.sh
```

**PowerShell:**
```powershell
.\scripts\utilities\organize-files.ps1
```

**Output:**
```
>> Checking for misplaced non-code files...

[Checking root directory]
Moving: analytics-guide.md
     -> docs/features/analytics/guides/guide-analytics.md
   Reason: Feature documentation

[OK] Organized 1 file(s)
[!] Please review the changes and commit them.
```

---

## Protected Files

These files will NEVER be moved or renamed:

**Config Files:**
- package.json, tsconfig.json, vercel.json, etc.

**Environment Files:**
- .env, .env.local, .env.production

**Essential Docs:**
- README.md (root), CHANGELOG.md

**Git Files:**
- .gitignore, .gitattributes

---

## Testing the System

### Test 1: Create a File in Wrong Location
```bash
# Create a test file
echo "# Test" > test-guide.md

# Try to commit
git add test-guide.md
git commit -m "test"

# Result: File moved to correct location automatically
```

### Test 2: Create a File with ALL CAPS
```bash
# Create a test file
echo "# Test" > docs/features/analytics/TEST_GUIDE.md

# Try to commit
git add .
git commit -m "test"

# Result: File renamed to lowercase automatically
```

### Test 3: Run Manual Organization
```bash
# Create test files
echo "# Test" > analytics.md
echo "# Test" > GUIDE.md

# Run organization
bash scripts/utilities/organize-files.sh

# Result: Files moved and renamed
```

---

## Summary

**Kiro will always:**
- ✅ Use lowercase filenames
- ✅ Follow [type]-[descriptor].md format
- ✅ Create files in correct feature directories
- ✅ Use proper subdirectories (guides/, tasks/, etc.)
- ✅ Never use ALL CAPS

**Pre-commit hook will always:**
- ✅ Check for misplaced files
- ✅ Move files to correct locations
- ✅ Convert to lowercase
- ✅ Protect config files
- ✅ Add moved files to commit

**You can always:**
- ✅ Run organization scripts manually
- ✅ Trust that files will be organized automatically
- ✅ Create files anywhere (they'll be moved)
- ✅ Use any naming (it'll be fixed)

---

**The system is self-correcting. Even if mistakes are made, they'll be fixed automatically!**
